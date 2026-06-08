import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  where, 
  limit, 
  deleteDoc 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK and modern multi-tab Firestore local cache persistence
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Dynamic Shared API Proxy backend state
let cachedApiUrl = (typeof window !== 'undefined' && localStorage.getItem('exon_backend_api_url')) || '';

// Detect if we are running in the backend host (Cloud Run or locally hosted dev server)
const isBackendHost = typeof window !== 'undefined' && (
  window.location.origin.includes('run.app') || 
  window.location.origin.includes('localhost') || 
  window.location.origin.includes('127.0.0.1')
);

if (isBackendHost && typeof window !== 'undefined') {
  cachedApiUrl = window.location.origin;
  localStorage.setItem('exon_backend_api_url', window.location.origin);
  
  // Register the cloud proxy URL live in Firestore under the open "broadcasts" write rules
  setTimeout(async () => {
    try {
      await setDoc(doc(db, 'broadcasts', 'backend_config'), {
        apiBaseUrl: window.location.origin,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to auto-register backend URL in Firestore:", e);
    }
  }, 2000);
}

// Subscribe to active backend configurations to sync the Vercel deployments
if (typeof window !== 'undefined') {
  try {
    onSnapshot(doc(db, 'broadcasts', 'backend_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.apiBaseUrl) {
          cachedApiUrl = data.apiBaseUrl;
          localStorage.setItem('exon_backend_api_url', data.apiBaseUrl);
        }
      }
    });
  } catch (e) {
    console.warn("Failed to subscribe to backend config:", e);
  }
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // If we have a cached API URL and we are not on the backend host itself, redirect API requests to the cloud run backend
  if (cachedApiUrl && !isBackendHost) {
    return `${cachedApiUrl}${cleanPath}`;
  }
  return cleanPath;
}
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();
export { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadBytesResumable,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteDoc
};

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorStr = error instanceof Error ? error.message : String(error);
  const isQuota = 
    errorStr.toLowerCase().includes('quota') || 
    errorStr.toLowerCase().includes('resource_exhausted') || 
    errorStr.toLowerCase().includes('limit exceeded') ||
    errorStr.toLowerCase().includes('exhausted');

  const errInfo: FirestoreErrorInfo = {
    error: errorStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (!isQuota) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export async function ensureUserDocument(user: User, referredBy?: string | null, additionalData?: { country?: string, currency?: string }) {
  const userRef = doc(db, 'users', user.uid);
  const isAdminEmail = user.email === 'musstaphamusa@gmail.com';
  
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const data = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || null,
        role: isAdminEmail ? 'admin' : 'user',
        following: [],
        createdAt: serverTimestamp(),
        referredBy: referredBy || null,
        invitesCount: 0,
        isLifetimeFree: false,
        hasCreatedInstitution: false,
        ...additionalData
      };
      await setDoc(userRef, data);
      return data;
    } else {
      const data = userSnap.data();
      if (additionalData) {
        await setDoc(userRef, additionalData, { merge: true });
        return { ...data, ...additionalData };
      }
      if (isAdminEmail && data.role !== 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
        return { ...data, role: 'admin' };
      }
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

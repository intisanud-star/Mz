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

export async function ensureUserDocument(user: User, referredBy?: string | null, additionalData?: { country?: string, currency?: string, username?: string, [key: string]: any }) {
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

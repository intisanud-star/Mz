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
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, where, limit, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function ensureUserDocument(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const isAdminEmail = user.email === 'musstaphamusa@gmail.com';
  
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const data = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: isAdminEmail ? 'admin' : 'student',
        schoolId: isAdminEmail ? 'EX-ADMIN' : 'EX-2024-001',
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, data);
      return data;
    } else {
      const data = userSnap.data();
      // If it's the admin email but the role is NOT admin, fix it.
      if (isAdminEmail && data.role !== 'admin') {
        await setDoc(userRef, { role: 'admin', schoolId: 'EX-ADMIN' }, { merge: true });
        return { ...data, role: 'admin', schoolId: 'EX-ADMIN' };
      }
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Seeding helper for demo
export async function seedInitialData() {
  const path = 'schools/twins-academy';
  try {
    const schoolsSnap = await getDoc(doc(db, 'schools', 'twins-academy'));
    
    if (!schoolsSnap.exists()) {
      const schools = [
        { id: 'twins-academy', name: 'Twins Academy', description: 'Official feed for Twins Academy', logo: 'https://picsum.photos/seed/twins/200' },
        { id: 'darul-furqan', name: 'Darul Furqan', description: 'Official feed for Darul Furqan', logo: 'https://picsum.photos/seed/darul/200' },
        { id: 'city-capital', name: 'City Capital School', description: 'Official feed for City Capital School', logo: 'https://picsum.photos/seed/city/200' }
      ];

      for (const school of schools) {
        await setDoc(doc(db, 'schools', school.id), school);
        await setDoc(doc(db, 'finance', school.id), {
          schoolId: school.id,
          institutionBalance: 50000,
          bankName: 'Exona Trust Bank',
          accountNumber: '0022334455',
          accountName: `${school.name} General`
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

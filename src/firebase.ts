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
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, where, limit } from 'firebase/firestore';
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
  updateProfile
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
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const isAdminEmail = user.email === 'musstaphamusa@gmail.com';
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: isAdminEmail ? 'admin' : 'student',
        schoolId: isAdminEmail ? 'EX-ADMIN' : 'EX-2024-001',
        createdAt: serverTimestamp(),
      });
    }
    return userSnap.exists() ? userSnap.data() : { role: user.email === 'musstaphamusa@gmail.com' ? 'admin' : 'student' };
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

      // Add some initial posts
      const postsRef = collection(db, 'posts');
      await addDoc(postsRef, {
        authorUid: 'system',
        authorName: 'Mustapha mz',
        authorPhoto: 'https://picsum.photos/seed/mustapha/200',
        content: 'Welcome to Exon — where advancing schooling starts. As the CEO of Exona, I present a smart educational app designed to modernize how schools operate and learn.',
        likes: 9,
        comments: 2,
        timestamp: serverTimestamp(),
        isOfficial: true
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

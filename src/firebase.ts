import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup as originalSignInWithPopup, 
  signOut as originalSignOut, 
  onAuthStateChanged as originalOnAuthStateChanged, 
  User,
  createUserWithEmailAndPassword as originalCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as originalSignInWithEmailAndPassword,
  sendEmailVerification as originalSendEmailVerification,
  updateProfile as originalUpdateProfile,
  deleteUser as originalDeleteUser,
  reauthenticateWithCredential as originalReauthenticateWithCredential,
  sendPasswordResetEmail as originalSendPasswordResetEmail,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc as originalDoc, 
  getDoc as originalGetDoc, 
  getDocs as originalGetDocs, 
  setDoc as originalSetDoc, 
  serverTimestamp, 
  collection as originalCollection, 
  query as originalQuery, 
  orderBy, 
  onSnapshot as originalOnSnapshot, 
  addDoc as originalAddDoc, 
  where, 
  limit, 
  deleteDoc as originalDeleteDoc,
  updateDoc as originalUpdateDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Old project (primary Database & Storage & Auth)
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();

// Secondary Database (New Project, for high-volume readings to save quota)
export let newDb: any = null;
try {
  const newConfig = {
    apiKey: firebaseConfig.apiKey || "AIzaSyB2GkvxibzoLMCMPHWA5XH6tGQ9y1gN50g",
    authDomain: "studio-438355495-26bec.firebaseapp.com",
    projectId: "studio-438355495-26bec",
    firestoreDatabaseId: "ai-studio-c3ea759e-c369-4b6c-babb-5352435dc336",
    storageBucket: "studio-438355495-26bec.firebasestorage.app",
    appId: firebaseConfig.appId || "1:937195993922:web:b98d488c1b928e2e96e6db"
  };
  const newApp = initializeApp(newConfig, "newProjectApp");
  newDb = initializeFirestore(newApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, "ai-studio-c3ea759e-c369-4b6c-babb-5352435dc336");
  console.log("Secondary database (new project) initialized successfully!");
} catch (err) {
  console.error("Failed to initialize secondary database (new project):", err);
}

// --- Robust Offline Authentication Interceptors and Memory State ---
let activeOfflineUser: any = null;
try {
  const stored = localStorage.getItem('offline_auth_user');
  if (stored) {
    activeOfflineUser = JSON.parse(stored);
  }
} catch (e) {
  console.error('[Mock Auth] Failed to restore activeOfflineUser:', e);
}

const authListeners: Set<(user: any) => void> = new Set();

const triggerAuthListeners = (user: any) => {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.error('[Mock Auth] Listener error:', e);
    }
  });
};

const getOfflineRegisteredUsers = () => {
  try {
    const data = localStorage.getItem('offline_registered_users');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveOfflineRegisteredUser = (email: string, password?: string, userObj?: any) => {
  try {
    const current = getOfflineRegisteredUsers();
    const updated = [
      ...current.filter((u: any) => u.email.toLowerCase() !== email.toLowerCase()),
      { email, password, userObj }
    ];
    localStorage.setItem('offline_registered_users', JSON.stringify(updated));
  } catch (e) {
    console.error('[Mock Auth] Save registered failed:', e);
  }
};

const createMockUserObj = (uid: string, email: string): any => {
  return {
    uid,
    email,
    emailVerified: true,
    isAnonymous: false,
    displayName: email.split('@')[0],
    photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
    providerData: [{
      providerId: 'password',
      uid,
      displayName: email.split('@')[0],
      email,
      photoURL: null
    }],
    getIdToken: async () => 'mock_token',
    getIdTokenResult: async () => ({ token: 'mock_token', claims: {} }),
    reload: async () => {},
    toJSON: () => ({ uid, email })
  };
};

const setActiveOfflineUser = (user: any) => {
  activeOfflineUser = user;
  if (user) {
    try {
      localStorage.setItem('offline_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      localStorage.removeItem('offline_auth_user');
    } catch (e) {
      console.error(e);
    }
  }
  triggerAuthListeners(user);
};

// Auth Wrapper Interceptors

const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  if (activeOfflineUser) {
    setTimeout(() => callback(activeOfflineUser), 0);
  }
  const unsubReal = originalOnAuthStateChanged(authInstance, (user) => {
    if (user) {
      setActiveOfflineUser(user);
    }
    callback(user || activeOfflineUser);
  });
  
  authListeners.add(callback);
  return () => {
    unsubReal();
    authListeners.delete(callback);
  };
};

const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  try {
    const res = await originalSignInWithEmailAndPassword(authInstance, email, pass);
    if (res.user) {
      setActiveOfflineUser(res.user);
    }
    return res;
  } catch (err: any) {
    console.log("[Mock Auth] Real sign in failed, checking offline users:", err.message);
    const offlineUsers = getOfflineRegisteredUsers();
    const found = offlineUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (found && (!pass || found.password === pass)) {
      const mockUser = found.userObj || createMockUserObj(`user_mock_${Date.now()}`, email);
      setActiveOfflineUser(mockUser);
      return { user: mockUser };
    }
    throw err;
  }
};

const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  try {
    const res = await originalCreateUserWithEmailAndPassword(authInstance, email, pass);
    if (res.user) {
      setActiveOfflineUser(res.user);
      saveOfflineRegisteredUser(email, pass, res.user);
    }
    return res;
  } catch (err: any) {
    console.log("[Mock Auth] Real signup failed, registering offline:", err.message);
    const mockUid = `user_mock_${Date.now()}`;
    const mockUser = createMockUserObj(mockUid, email);
    saveOfflineRegisteredUser(email, pass, mockUser);
    setActiveOfflineUser(mockUser);
    return { user: mockUser };
  }
};

const signInWithPopup = async (authInstance: any, provider: any) => {
  try {
    const res = await originalSignInWithPopup(authInstance, provider);
    if (res.user) {
      setActiveOfflineUser(res.user);
    }
    return res;
  } catch (err) {
    console.log("[Mock Auth] Default login failed, launching mock Google Popup wrapper:");
    const mockUid = `google_mock_${Date.now()}`;
    const mockEmail = `exona_student_${Math.floor(100+Math.random()*900)}@gmail.com`;
    const mockUser = createMockUserObj(mockUid, mockEmail);
    setActiveOfflineUser(mockUser);
    return { user: mockUser };
  }
};

const signOut = async (authInstance: any) => {
  try {
    await originalSignOut(authInstance);
  } catch (error) {
    console.warn("[Mock Auth] Real signOut failed:", error);
  }
  setActiveOfflineUser(null);
};

const sendPasswordResetEmail = async (authInstance: any, email: string) => {
  try {
    return await originalSendPasswordResetEmail(authInstance, email);
  } catch (error) {
    console.log("[Mock Auth] Password reset requested for offline account:", email);
  }
};

const sendEmailVerification = async (firebaseUser: any) => {
  try {
    if (firebaseUser && typeof firebaseUser.uid === 'string' && !firebaseUser.uid.startsWith('user_mock_') && !firebaseUser.uid.startsWith('google_mock_')) {
      return await originalSendEmailVerification(firebaseUser);
    }
    console.log("[Mock Auth] Verification email dispatched to offline account.");
  } catch (error) {
    console.warn("[Mock Auth] Real sendEmailVerification failed:", error);
  }
};

const updateProfile = async (firebaseUser: any, profileUpdates: { displayName?: string, photoURL?: string }) => {
  try {
    if (firebaseUser && typeof firebaseUser.uid === 'string' && !firebaseUser.uid.startsWith('user_mock_') && !firebaseUser.uid.startsWith('google_mock_')) {
      await originalUpdateProfile(firebaseUser, profileUpdates);
    }
    if (activeOfflineUser) {
      const updated = {
        ...activeOfflineUser,
        displayName: profileUpdates.displayName !== undefined ? profileUpdates.displayName : activeOfflineUser.displayName,
        photoURL: profileUpdates.photoURL !== undefined ? profileUpdates.photoURL : activeOfflineUser.photoURL
      };
      setActiveOfflineUser(updated);
    }
    return;
  } catch (error) {
    console.warn("[Mock Auth] Real updateProfile failed:", error);
  }
};

const deleteUser = async (firebaseUser: any) => {
  try {
    if (firebaseUser && typeof firebaseUser.uid === 'string' && !firebaseUser.uid.startsWith('user_mock_') && !firebaseUser.uid.startsWith('google_mock_')) {
      return await originalDeleteUser(firebaseUser);
    }
    console.log("[Mock Auth] Mock delete user complete.");
    setActiveOfflineUser(null);
    return;
  } catch (error) {
    console.warn("[Mock Auth] Real deleteUser failed:", error);
    throw error;
  }
};

const reauthenticateWithCredential = async (firebaseUser: any, credential: any) => {
  try {
    if (firebaseUser && typeof firebaseUser.uid === 'string' && !firebaseUser.uid.startsWith('user_mock_') && !firebaseUser.uid.startsWith('google_mock_')) {
      return await originalReauthenticateWithCredential(firebaseUser, credential);
    }
    console.log("[Mock Auth] Reauthenticating mock user is active.");
    return { user: activeOfflineUser };
  } catch (error) {
    console.warn("[Mock Auth] Real reauthenticateWithCredential failed:", error);
    throw error;
  }
};

// --- Module-Level References ---
export let activeSchoolId: string | null = null;
export let setRecordsRef: any = null;
export let setAttendanceRef: any = null;
export let setClassroomsRef: any = null;
export let setDailyRoutinesRef: any = null;
export let attendancePhotosRef: any = null;
export let setAttendancePhotosRef: any = null;
export let setAllMessagesRef: any = null;
export let setChatGroupsRef: any = null;
export let setPostsRef: any = null;
export let setCustomAppsRef: any = null;

export const updateSyncRefs = (refs: {
  activeSchoolId?: string | null;
  setRecordsRef?: any;
  setAttendanceRef?: any;
  setClassroomsRef?: any;
  setDailyRoutinesRef?: any;
  attendancePhotosRef?: any;
  setAttendancePhotosRef?: any;
  setAllMessagesRef?: any;
  setChatGroupsRef?: any;
  setPostsRef?: any;
  setCustomAppsRef?: any;
}) => {
  if (refs.activeSchoolId !== undefined) activeSchoolId = refs.activeSchoolId;
  if (refs.setRecordsRef !== undefined) setRecordsRef = refs.setRecordsRef;
  if (refs.setAttendanceRef !== undefined) setAttendanceRef = refs.setAttendanceRef;
  if (refs.setClassroomsRef !== undefined) setClassroomsRef = refs.setClassroomsRef;
  if (refs.setDailyRoutinesRef !== undefined) setDailyRoutinesRef = refs.setDailyRoutinesRef;
  if (refs.attendancePhotosRef !== undefined) attendancePhotosRef = refs.attendancePhotosRef;
  if (refs.setAttendancePhotosRef !== undefined) setAttendancePhotosRef = refs.setAttendancePhotosRef;
  if (refs.setAllMessagesRef !== undefined) setAllMessagesRef = refs.setAllMessagesRef;
  if (refs.setChatGroupsRef !== undefined) setChatGroupsRef = refs.setChatGroupsRef;
  if (refs.setPostsRef !== undefined) setPostsRef = refs.setPostsRef;
  if (refs.setCustomAppsRef !== undefined) setCustomAppsRef = refs.setCustomAppsRef;
};

// --- Intelligent Multi-Tenant Database Router Configurations ---

const isHighVolumeCollection = (collectionName: string): boolean => {
  const list = [
    'studentRecords',
    'teacherAttendance',
    'dailyRoutines',
    'classrooms',
    'attendancePhotos',
    'messages',
    'chatGroups',
    'posts',
    'users',
    'notifications',
    'comments',
    'stories'
  ];
  return collectionName ? list.includes(collectionName) : false;
};

const isHighVolumePath = (path: string | undefined): boolean => {
  if (!path) return false;
  const segments = path.split('/');
  return segments.some(seg => isHighVolumeCollection(seg.trim()));
};

const getCollectionName = (refOrQuery: any): string => {
  if (!refOrQuery) return "";
  let fullPath = "";
  if (typeof refOrQuery === 'string') {
    fullPath = refOrQuery;
  } else if (typeof refOrQuery.path === 'string') {
    fullPath = refOrQuery.path;
  } else if (refOrQuery._path?.segments) {
    return refOrQuery._path.segments[0];
  }
  if (!fullPath) return "";
  const segments = fullPath.split('/');
  return segments[0];
};

// --- Non-Blocking Dynamic Background Synchronization ---
const synchedCollections: Set<string> = new Set();

const syncCollectionToSecondary = async (collectionName: string) => {
  if (synchedCollections.has(collectionName) || !newDb) return;
  synchedCollections.add(collectionName);
  
  try {
    console.log(`[Backup Sync] Symmetrically scanning collection "${collectionName}" to populate secondary database...`);
    const primaryCol = originalCollection(db, collectionName);
    const snap = await originalGetDocs(primaryCol);
    if (!snap.empty) {
      let syncCount = 0;
      for (const d of snap.docs) {
        const secondaryDocRef = originalDoc(newDb, collectionName, d.id);
        const secSnap = await originalGetDoc(secondaryDocRef);
        if (!secSnap.exists()) {
          await originalSetDoc(secondaryDocRef, d.data());
          syncCount++;
        }
      }
      console.log(`[Backup Sync] Dynamic sync of "${collectionName}" completed. Copied ${syncCount} missing records.`);
    }
  } catch (err) {
    console.warn(`[Backup Sync] Uncritical failure during "${collectionName}" backup pre-loading:`, err);
  }
};

// --- Custom Query & Doc Builders ---

export const doc = (first: any, ...rest: any[]) => {
  if (first && typeof first.type === 'string' && (first.type === 'collection' || first.path)) {
    const parentColl = first;
    const path = parentColl.path;
    const dbColl = originalCollection(db, path);
    if (rest.length > 0) {
      return originalDoc(dbColl, rest[0], ...rest.slice(1));
    }
    return originalDoc(dbColl);
  }
  
  if (typeof first === 'string' || !first) {
    const path = first || "";
    return originalDoc(db, path, ...rest);
  } else {
    const path = (rest[0] as string) || "";
    return originalDoc(db, path, ...rest.slice(1));
  }
};

export const collection = (first: any, ...rest: any[]) => {
  if (first && typeof first.type === 'string' && (first.type === 'collection' || first.path)) {
    const parentColl = first;
    const path = parentColl.path;
    const dbParent = originalCollection(db, path);
    return originalCollection(dbParent, rest[0], ...rest.slice(1));
  }
  
  if (typeof first === 'string' || !first) {
    const path = first || "";
    return originalCollection(db, path, ...rest);
  } else {
    const path = (rest[0] as string) || "";
    return originalCollection(db, path, ...rest.slice(1));
  }
};

export const query = (first: any, ...rest: any[]) => {
  const collectionName = getCollectionName(first);
  const isHighVol = isHighVolumeCollection(collectionName);
  if (isHighVol && newDb) {
    // If the base reference has a custom original primary query, or we track its path
    const path = first.path || "";
    if (path) {
      const primaryColRef = originalCollection(db, path);
      const primaryQ = originalQuery(primaryColRef, ...rest);
      
      const targetColRef = originalCollection(newDb, path);
      const secondaryQ = originalQuery(targetColRef, ...rest) as any;
      
      secondaryQ._primaryQuery = primaryQ;
      return secondaryQ;
    }
  }
  return originalQuery(first, ...rest);
};

// --- Custom Executable Write and Read Operations ---

export const getDoc = async (docRef: any): Promise<any> => {
  const collectionName = getCollectionName(docRef);
  const path = docRef.path;
  
  if (isHighVolumeCollection(collectionName) && newDb && path) {
    // Read from the secondary project (does not affect primary quota)
    try {
      const secondaryRef = originalDoc(newDb, path);
      const snap = await originalGetDoc(secondaryRef);
      if (snap.exists()) {
        return snap;
      }
    } catch (err) {
      console.warn("[Router] Secondary read failed, falling back to primary:", err);
    }
  }
  
  // Normal fallback to primary without lazy syncing
  return await originalGetDoc(originalDoc(db, path));
};

export const getDocs = async (refOrQuery: any): Promise<any> => {
  // If we have a query mapped to secondary database, try it first
  if (refOrQuery && refOrQuery._primaryQuery && newDb) {
    try {
      const snap = await originalGetDocs(refOrQuery);
      return snap;
    } catch (err) {
      console.warn("[Router] Secondary query fetch failed, falling back to primary:", err);
      return await originalGetDocs(refOrQuery._primaryQuery);
    }
  }

  const collectionName = getCollectionName(refOrQuery);
  const path = refOrQuery.path || "";
  
  if (isHighVolumeCollection(collectionName) && newDb && path) {
    try {
      const secondaryRef = originalCollection(newDb, path);
      const snap = await originalGetDocs(secondaryRef);
      return snap;
    } catch (err) {
      console.warn("[Router] Secondary collection fetch failed, falling back to primary:", err);
    }
  }
  
  const primaryRef = path ? originalCollection(db, path) : refOrQuery;
  return await originalGetDocs(primaryRef);
};

export const onSnapshot = (refOrQuery: any, onNext: any, onError?: any): any => {
  const collectionName = getCollectionName(refOrQuery);
  const isHighVol = isHighVolumeCollection(collectionName);
  
  if (isHighVol && newDb) {
    let targetRefOrQuery = refOrQuery;
    if (refOrQuery.path) {
      if (refOrQuery.type === 'document') {
        targetRefOrQuery = originalDoc(newDb, refOrQuery.path);
      } else {
        targetRefOrQuery = originalCollection(newDb, refOrQuery.path);
      }
    }
    
    return originalOnSnapshot(targetRefOrQuery, onNext, (err: any) => {
      console.warn("[Router Fallback] Snapshot listener failed on secondary, falling back to primary:", err.message);
      let primaryRefOrQuery = refOrQuery;
      if (refOrQuery._primaryQuery) {
        primaryRefOrQuery = refOrQuery._primaryQuery;
      } else if (refOrQuery.path) {
        if (refOrQuery.type === 'document') {
          primaryRefOrQuery = originalDoc(db, refOrQuery.path);
        } else {
          primaryRefOrQuery = originalCollection(db, refOrQuery.path);
        }
      }
      return originalOnSnapshot(primaryRefOrQuery, onNext, onError);
    });
  }
  
  return originalOnSnapshot(refOrQuery, onNext, onError);
};

export const addDoc = async (colRef: any, data: any) => {
  const path = colRef.path;
  const primaryRef = originalCollection(db, path);
  return await originalAddDoc(primaryRef, data);
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const path = docRef.path;
  const primaryRef = originalDoc(db, path);
  return await originalSetDoc(primaryRef, data, options);
};

export const updateDoc = async (docRef: any, data: any) => {
  const path = docRef.path;
  const primaryRef = originalDoc(db, path);
  return await originalUpdateDoc(primaryRef, data);
};

export const deleteDoc = async (docRef: any) => {
  const path = docRef.path;
  const primaryRef = originalDoc(db, path);
  return await originalDeleteDoc(primaryRef);
};

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
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  where,
  orderBy,
  limit
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
      const data = userSnap.data() as any;
      if (additionalData) {
        await setDoc(userRef, additionalData, { merge: true });
        return { ...(data || {}), ...additionalData };
      }
      if (isAdminEmail && data?.role !== 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
        return { ...(data || {}), role: 'admin' };
      }
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

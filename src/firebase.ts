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
  setDoc as originalSetDoc, 
  serverTimestamp, 
  collection, 
  query, 
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

// --- Module-Level References to tie file-level wrappers to Active React State/Hooks ---
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

// Cloud Storage Storage Engine for High Volume Collections
const storageLoad = async <T,>(schoolId: string, type: string, fallback: T[]): Promise<T[]> => {
  try {
    const fileRef = ref(storage, `cloud_datasets/${schoolId}/${type}.json`);
    const url = await getDownloadURL(fileRef);
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch not OK");
    const parsed = await res.json();
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.log(`[Cloud Storage Cache] Brand new database initialized for ${type} in school ${schoolId}`);
    return fallback;
  }
};

const storageSave = async <T,>(schoolId: string, type: string, data: T[]) => {
  try {
    const fileRef = ref(storage, `cloud_datasets/${schoolId}/${type}.json`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await uploadBytes(fileRef, blob);
    console.log(`[Cloud Storage Cache] Saved ${type} data representing ${data.length} records successfully.`);
  } catch (err) {
    console.error(`[Cloud Storage Cache] Error writing ${type} dataset:`, err);
  }
};

const PATH_MAPS: { [key: string]: string } = {
  studentRecords: 'studentRecords',
  teacherAttendance: 'teacherAttendance',
  dailyRoutines: 'dailyRoutines',
  classrooms: 'classrooms',
  attendancePhotos: 'attendancePhotos',
  messages: 'messages',
  chatGroups: 'chatGroups',
  posts: 'posts',
  workspaceCustomApps: 'workspaceCustomApps'
};

const getStorageTargetType = (refOrPath: any): string | null => {
  if (!refOrPath) return null;
  let fullPath = "";
  if (typeof refOrPath === 'string') {
    fullPath = refOrPath;
  } else if (typeof refOrPath.path === 'string') {
    fullPath = refOrPath.path;
  }
  if (!fullPath) return null;
  const segments = fullPath.split('/');
  const collectionName = segments[0];
  if (PATH_MAPS[collectionName]) {
    return PATH_MAPS[collectionName];
  }
  return null;
};

const getPartitionId = (targetType: string): string => {
  if (['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType)) {
    return 'global';
  }
  return activeSchoolId || 'global';
};

const createMockSnapshot = (recordsArray: any[]) => {
  return {
    exists: () => recordsArray.length > 0,
    docs: recordsArray.map(item => ({
      id: item.id || '',
      data: () => item
    })),
    forEach: (callback: any) => {
      recordsArray.forEach(item => {
        callback({
          id: item.id || '',
          data: () => item
        });
      });
    }
  };
};

export const onSnapshot = (refOrQuery: any, onNext: any, onError?: any) => {
  const targetType = getStorageTargetType(refOrQuery);
  const partition = targetType ? getPartitionId(targetType) : '';
  if (targetType && (activeSchoolId || ['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType))) {
    storageLoad(partition, targetType, []).then(data => {
      onNext(createMockSnapshot(data));
    }).catch(err => {
      if (onError) onError(err);
    });
    return () => {};
  }
  return originalOnSnapshot(refOrQuery, onNext, onError);
};

export const addDoc = async (colRef: any, data: any) => {
  const targetType = getStorageTargetType(colRef);
  const partition = targetType ? getPartitionId(targetType) : '';
  if (targetType && (activeSchoolId || ['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType))) {
    const currentList = await storageLoad(partition, targetType, []);
    const newId = `${targetType.substring(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = { ...data, id: newId, timestamp: new Date().toISOString() };
    const updatedList = [newItem, ...currentList];
    await storageSave(partition, targetType, updatedList);
    
    if (targetType === 'studentRecords' && setRecordsRef) setRecordsRef(updatedList as any);
    else if (targetType === 'teacherAttendance' && setAttendanceRef) setAttendanceRef(updatedList as any);
    else if (targetType === 'classrooms' && setClassroomsRef) setClassroomsRef(updatedList as any);
    else if (targetType === 'dailyRoutines' && setDailyRoutinesRef) setDailyRoutinesRef(updatedList as any);
    else if (targetType === 'messages' && setAllMessagesRef) setAllMessagesRef(updatedList as any);
    else if (targetType === 'chatGroups' && setChatGroupsRef) setChatGroupsRef(updatedList as any);
    else if (targetType === 'posts' && setPostsRef) setPostsRef(updatedList as any);
    else if (targetType === 'workspaceCustomApps' && setCustomAppsRef) setCustomAppsRef(updatedList as any);
    
    return { id: newId };
  }
  return await originalAddDoc(colRef, data);
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const targetType = getStorageTargetType(docRef);
  const partition = targetType ? getPartitionId(targetType) : '';
  if (targetType && (activeSchoolId || ['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType))) {
    const docId = docRef.id;
    const currentList = await storageLoad(partition, targetType, []);
    let updatedList = [];
    const existingIdx = currentList.findIndex((item: any) => item.id === docId);
    
    if (existingIdx > -1) {
      let merged = {};
      if (options && options.merge) {
        merged = { ...currentList[existingIdx], ...data };
      } else {
        merged = { ...data, id: docId };
      }
      updatedList = [...currentList];
      updatedList[existingIdx] = merged;
    } else {
      updatedList = [{ ...data, id: docId, timestamp: new Date().toISOString() }, ...currentList];
    }
    
    await storageSave(partition, targetType, updatedList);
    
    if (targetType === 'studentRecords' && setRecordsRef) setRecordsRef(updatedList as any);
    else if (targetType === 'teacherAttendance' && setAttendanceRef) setAttendanceRef(updatedList as any);
    else if (targetType === 'classrooms' && setClassroomsRef) setClassroomsRef(updatedList as any);
    else if (targetType === 'dailyRoutines' && setDailyRoutinesRef) setDailyRoutinesRef(updatedList as any);
    else if (targetType === 'messages' && setAllMessagesRef) setAllMessagesRef(updatedList as any);
    else if (targetType === 'chatGroups' && setChatGroupsRef) setChatGroupsRef(updatedList as any);
    else if (targetType === 'posts' && setPostsRef) setPostsRef(updatedList as any);
    else if (targetType === 'workspaceCustomApps' && setCustomAppsRef) setCustomAppsRef(updatedList as any);
    else if (targetType === 'attendancePhotos') {
      if (attendancePhotosRef && setAttendancePhotosRef) {
        const photosMap = { ...attendancePhotosRef };
        if (data.name && data.photoURL) {
          photosMap[data.name] = data.photoURL;
          setAttendancePhotosRef(photosMap);
        }
      }
    }
    return;
  }
  return await originalSetDoc(docRef, data, options);
};

export const updateDoc = async (docRef: any, data: any) => {
  const targetType = getStorageTargetType(docRef);
  const partition = targetType ? getPartitionId(targetType) : '';
  if (targetType && (activeSchoolId || ['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType))) {
    const docId = docRef.id;
    const currentList = await storageLoad(partition, targetType, []);
    const existingIdx = currentList.findIndex((item: any) => item.id === docId);
    if (existingIdx > -1) {
      const updatedList = [...currentList];
      updatedList[existingIdx] = { ...currentList[existingIdx], ...data };
      await storageSave(partition, targetType, updatedList);
      
      if (targetType === 'studentRecords' && setRecordsRef) setRecordsRef(updatedList as any);
      else if (targetType === 'teacherAttendance' && setAttendanceRef) setAttendanceRef(updatedList as any);
      else if (targetType === 'classrooms' && setClassroomsRef) setClassroomsRef(updatedList as any);
      else if (targetType === 'dailyRoutines' && setDailyRoutinesRef) setDailyRoutinesRef(updatedList as any);
      else if (targetType === 'messages' && setAllMessagesRef) setAllMessagesRef(updatedList as any);
      else if (targetType === 'chatGroups' && setChatGroupsRef) setChatGroupsRef(updatedList as any);
      else if (targetType === 'posts' && setPostsRef) setPostsRef(updatedList as any);
      else if (targetType === 'workspaceCustomApps' && setCustomAppsRef) setCustomAppsRef(updatedList as any);
      
      return;
    }
  }
  return await originalUpdateDoc(docRef, data);
};

export const deleteDoc = async (docRef: any) => {
  const targetType = getStorageTargetType(docRef);
  const partition = targetType ? getPartitionId(targetType) : '';
  if (targetType && (activeSchoolId || ['messages', 'chatGroups', 'posts', 'workspaceCustomApps'].includes(targetType))) {
    const docId = docRef.id;
    const currentList = await storageLoad(partition, targetType, []);
    const updatedList = currentList.filter((item: any) => item.id !== docId);
    await storageSave(partition, targetType, updatedList);
    
    if (targetType === 'studentRecords' && setRecordsRef) setRecordsRef(updatedList as any);
    else if (targetType === 'teacherAttendance' && setAttendanceRef) setAttendanceRef(updatedList as any);
    else if (targetType === 'classrooms' && setClassroomsRef) setClassroomsRef(updatedList as any);
    else if (targetType === 'dailyRoutines' && setDailyRoutinesRef) setDailyRoutinesRef(updatedList as any);
    else if (targetType === 'messages' && setAllMessagesRef) setAllMessagesRef(updatedList as any);
    else if (targetType === 'chatGroups' && setChatGroupsRef) setChatGroupsRef(updatedList as any);
    else if (targetType === 'posts' && setPostsRef) setPostsRef(updatedList as any);
    else if (targetType === 'workspaceCustomApps' && setCustomAppsRef) setCustomAppsRef(updatedList as any);
    
    return;
  }
  return await originalDeleteDoc(docRef);
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
  EmailAuthProvider
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

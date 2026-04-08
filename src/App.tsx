import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { 
  GraduationCap, ShieldCheck, LogOut, LogIn, User as UserIcon, 
  BookOpen, Calendar, Bell, Search, Menu, X, 
  Home, Users, MessageSquare, Wallet, Settings, 
  AlertCircle, Cpu, ChevronDown, ChevronRight,
  Heart, MessageCircle, Share2, Plus, Filter, Send, Repeat, PlusSquare,
  Image as ImageIcon, Video as VideoIcon, Paperclip,
  MoreVertical, Trash2, Edit2, UserPlus, UserMinus,
  MoreHorizontal, ArrowUpRight, CreditCard, Fingerprint,
  BadgeCheck, AlertTriangle, Smile, TrendingUp, TrendingDown, ShieldAlert,
  DollarSign, Clock, FileText, Upload, LayoutGrid, Database, Sparkles, Shield,
  ClipboardList, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  googleProvider, 
  db, 
  ensureUserDocument, 
  handleFirestoreError, 
  OperationType, 
  storage, 
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
} from './firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- TYPES ---
interface Place {
  id: string;
  name: string;
  type: 'place';
  category: 'School' | 'Business' | 'Community' | 'Personal' | 'Other';
  logo: string;
  description: string;
  creatorUid: string;
  timestamp: any;
  isOfficial?: boolean;
  subAdmins?: string[];
  followers?: string[];
  pendingFollowers?: string[];
}

interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: number;
  likedBy: string[];
  commentsCount: number;
  reshares: number;
  timestamp: any;
  isOfficial?: boolean;
  schoolId?: string;
  resharedFrom?: {
    id: string;
    authorName: string;
    content: string;
  };
}

interface TeacherAttendance {
  id: string;
  teacherName: string;
  schoolId: string;
  status: 'present' | 'absent' | 'late';
  date: string;
  timestamp: any;
  addedBy: string;
}

interface School {
  id: string;
  name: string;
  description: string;
  logo: string;
  type: 'school';
  creatorUid: string;
  timestamp: any;
  educationalLevels?: string[];
  subAdmins?: string[]; // Array of user emails
  followers?: string[];
  pendingFollowers?: string[];
}

interface StudentRecord {
  id: string;
  studentName: string;
  category: string;
  paid: number;
  balance: number;
  type: 'general' | 'books' | 'uniforms' | 'services' | 'products';
  visibility: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  schoolId?: string;
  creatorUid: string;
  addedBy: string;
  timestamp: any;
}

interface Record {
  id: string;
  studentName: string;
  category: string;
  paid: number;
  balance: number;
  type: 'general' | 'books' | 'uniforms' | 'services' | 'products';
  visibility: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  placeId?: string;
  creatorUid: string;
  addedBy: string;
  timestamp: any;
}

interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  schoolId?: string;
  following?: string[];
}

interface SchoolFinance {
  institutionBalance: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md bg-white p-12 rounded-[3rem] premium-shadow border border-gray-100"
          >
            <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-serif italic text-ink mb-4 tracking-tight">System Interruption</h1>
            <p className="text-muted text-sm font-medium mb-8 leading-relaxed">An unexpected error has occurred within the Exona core. Our engineers have been notified.</p>
            <pre className="text-[10px] font-mono bg-gray-50 p-6 rounded-2xl overflow-auto max-h-40 text-left mb-10 text-muted border border-gray-100">{this.state.error?.message}</pre>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 transition-all active:scale-[0.98]"
            >
              Restart Core
            </button>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UTILS ---
const formatTime = (timestamp: any) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- COMPONENTS ---

  const NavIcon = ({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) => (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all relative group ${active ? 'text-ink' : 'text-muted hover:text-ink hover:bg-gray-50'}`}
      title={label}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      {active && <motion.div layoutId="nav-pill" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 bg-ink rounded-full" />}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest">
        {label}
      </span>
    </button>
  );

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
      active 
        ? 'bg-ink text-white shadow-2xl shadow-ink/10' 
        : 'text-muted hover:bg-gray-50 hover:text-ink'
    }`}
  >
    {active && (
      <motion.div 
        layoutId="sidebar-active-bg"
        className="absolute inset-0 bg-ink"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
    <div className="flex items-center gap-4 relative z-10">
      <Icon size={20} className={`${active ? 'text-white' : 'text-muted group-hover:text-ink'} transition-colors duration-300`} />
      <span className="font-bold text-[13px] tracking-tight">{label}</span>
    </div>
    {badge && (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full relative z-10 ${
        active ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

const FeedPost = ({ post, onUserClick, onLike, onComment, onReshare, onForward, onEdit, onDelete, currentUserId }: any) => {
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = post.likedBy?.includes(currentUserId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="py-6 border-b border-gray-100 flex gap-4"
    >
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
          className="hover:opacity-80 transition-opacity"
        >
          {post.authorPhoto ? (
            <img src={post.authorPhoto} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-ink font-bold text-xs">
              {post.authorName?.charAt(0)}
            </div>
          )}
        </button>
        <div className="w-0.5 flex-1 bg-transparent rounded-full" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-ink text-[14px] hover:underline cursor-pointer" onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}>
              {post.authorName}
            </h4>
            {post.isOfficial && <ShieldCheck size={14} className="text-blue-500 fill-blue-500/10" />}
            <span className="text-muted text-[13px]">{formatTime(post.timestamp)}</span>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-muted hover:text-ink p-1 rounded-full hover:bg-gray-100 transition-all"
            >
              <MoreHorizontal size={18} />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-2"
                >
                  {post.authorUid === currentUserId && (
                    <>
                      <button 
                        onClick={() => { onEdit?.(post); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button 
                        onClick={() => { onDelete?.(post); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-muted hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Bell size={16} />
                    Mute
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-ink text-[14px] leading-normal mb-3 whitespace-pre-wrap">
          {post.content}
        </p>

        {post.mediaUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-md">
            {post.mediaType === 'image' ? (
              <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-[400px]" referrerPolicy="no-referrer" />
            ) : (
              <video src={post.mediaUrl} controls className="w-full h-auto max-h-[400px]" />
            )}
          </div>
        )}

        {post.resharedFrom && (
          <div className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[12px] font-bold text-ink mb-1">{post.resharedFrom.authorName}</p>
            <p className="text-[13px] text-muted leading-snug">{post.resharedFrom.content}</p>
          </div>
        )}

        <div className="flex items-center gap-5 mt-2">
          <button 
            onClick={() => onLike?.(post.id, post.likedBy || [])}
            className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'text-ink hover:text-red-500'}`}
          >
            <Heart size={20} className={isLiked ? 'fill-red-500' : ''} />
            {post.likes > 0 && <span className="text-[13px] font-medium">{post.likes}</span>}
          </button>
          <button 
            onClick={() => onComment?.(post)}
            className="flex items-center gap-1.5 text-ink hover:text-blue-500 transition-colors"
          >
            <MessageCircle size={20} />
            {post.commentsCount > 0 && <span className="text-[13px] font-medium">{post.commentsCount}</span>}
          </button>
          <button 
            onClick={() => onReshare?.(post)}
            className="flex items-center gap-1.5 text-ink hover:text-green-600 transition-colors"
          >
            <Repeat size={20} />
            {post.reshares > 0 && <span className="text-[13px] font-medium">{post.reshares}</span>}
          </button>
          <button 
            onClick={() => onForward?.(post)}
            className="text-ink hover:text-blue-500 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN DASHBOARD ---
function ExonaApp() {
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'ai' | 'penalty' | 'profile' | 'user-profile' | 'admin' | 'school-feed' | 'attendance' | 'sub-admin'>('splash');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ uid: string, name: string, photo: string } | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [selectedUserProfileDoc, setSelectedUserProfileDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const [allFinance, setAllFinance] = useState<any[]>([]);
  const [finance, setFinance] = useState<SchoolFinance | null>(null);
  const [recordTab, setRecordTab] = useState<'general' | 'books' | 'uniforms' | 'services' | 'products'>('general');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [newAttendance, setNewAttendance] = useState({ teacherName: '', status: 'present' as TeacherAttendance['status'] });
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleteSchoolModalOpen, setIsDeleteSchoolModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);
  const [isDeletePlaceModalOpen, setIsDeletePlaceModalOpen] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<string | null>(null);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState<'all' | 'School' | 'Business' | 'Community' | 'Personal'>('all');
  const [newPlace, setNewPlace] = useState({ name: '', description: '', logo: '', category: 'School' as Place['category'], type: 'place' as const });
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [subAdminEmail, setSubAdminEmail] = useState('');
  const [schoolToManageSubAdmins, setSchoolToManageSubAdmins] = useState<School | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({ 
    name: '', 
    description: '', 
    logo: '', 
    type: 'school' as const,
    educationalLevels: [] as string[]
  });
  const [newRecord, setNewRecord] = useState({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private' as Record['visibility'], sharedWith: '' });

  const subAdminInstitutions = [
    ...schools.filter(s => s.subAdmins?.some(email => email.toLowerCase() === user?.email?.toLowerCase())),
    ...places.filter(p => p.subAdmins?.some(email => email.toLowerCase() === user?.email?.toLowerCase()))
  ];
  const isSubAdmin = subAdminInstitutions.length > 0;

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [uploadingInstitutionId, setUploadingInstitutionId] = useState<string | null>(null);
  const [pendingFollowerNames, setPendingFollowerNames] = useState<{[uid: string]: string}>({});

  useEffect(() => {
    const pendingUids = subAdminInstitutions.flatMap(s => s.pendingFollowers || []);
    const uniqueUids = [...new Set(pendingUids)].filter(uid => !pendingFollowerNames[uid]);
    
    uniqueUids.forEach(async (uid) => {
      try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          setPendingFollowerNames(prev => ({ ...prev, [uid]: userSnap.data().displayName || 'Anonymous' }));
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    });
  }, [subAdminInstitutions]);

  const handleUpdateProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingProfile(true);
    setUploadProgress(0);
    try {
      const fileRef = ref(storage, `users/${user.uid}/profile_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, 
          (error) => reject(error), 
          () => resolve(null)
        );
      });

      const photoURL = await getDownloadURL(fileRef);
      
      // Update Firebase Auth profile
      await updateProfile(user, { photoURL });
      
      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });
      
      // Refresh userDoc state
      const updatedDoc = await getDoc(doc(db, 'users', user.uid));
      if (updatedDoc.exists()) setUserDoc(updatedDoc.data() as UserDoc);

      // Update user's posts with new photoURL for consistency
      const userPostsQuery = query(collection(db, 'posts'), where('authorUid', '==', user.uid));
      const userPostsSnap = await getDocs(userPostsQuery);
      const updatePromises = userPostsSnap.docs.map(postDoc => 
        setDoc(postDoc.ref, { authorPhoto: photoURL }, { merge: true })
      );
      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error('Error updating profile picture:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUploadingProfile(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateInstitutionLogo = async (institution: School | Place, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setUploadingInstitutionId(institution.id);
    setUploadProgress(0);
    try {
      const collectionName = institution.type === 'school' ? 'schools' : 'places';
      const fileRef = ref(storage, `${collectionName}/${institution.id}/logo_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, 
          (error) => reject(error), 
          () => resolve(null)
        );
      });

      const logoURL = await getDownloadURL(fileRef);
      
      // Update Firestore institution document
      await setDoc(doc(db, collectionName, institution.id), { logo: logoURL }, { merge: true });
      
    } catch (error) {
      console.error('Error updating institution logo:', error);
      handleFirestoreError(error, OperationType.UPDATE, `${institution.type === 'school' ? 'schools' : 'places'}/${institution.id}`);
    } finally {
      setUploadingInstitutionId(null);
      setUploadProgress(0);
    }
  };

  const handleCreateSchool = async () => {
    console.log('handleCreateSchool started', { newSchool, user: user?.uid, editingSchool: editingSchool?.id });
    if (!newSchool.name.trim() || !user) {
      console.warn('handleCreateSchool aborted: missing name or user', { name: newSchool.name, user: user?.uid });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      let logoUrl = newSchool.logo.trim();
      
      if (selectedFile) {
        console.log('Uploading logo file...', selectedFile.name);
        const fileRef = ref(storage, `schools/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log(`Upload progress: ${progress}%`);
          }, (error) => {
            console.error('Upload failed:', error);
            reject(error);
          }, () => {
            console.log('Upload complete');
            resolve(null);
          });
        });
        logoUrl = await getDownloadURL(fileRef);
        console.log('Logo URL obtained:', logoUrl);
      }

      if (editingSchool) {
        console.log('Updating existing school:', editingSchool.id);
        await setDoc(doc(db, 'schools', editingSchool.id), {
          ...editingSchool,
          name: newSchool.name.trim(),
          description: newSchool.description.trim(),
          logo: logoUrl,
          type: newSchool.type,
          educationalLevels: newSchool.educationalLevels
        }, { merge: true });
        console.log('School updated successfully');
      } else {
        console.log('Creating new school...');
        const schoolId = newSchool.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        await setDoc(doc(db, 'schools', schoolId), {
          id: schoolId,
          name: newSchool.name.trim(),
          description: newSchool.description.trim() || `Official space for ${newSchool.name}`,
          logo: logoUrl,
          type: newSchool.type,
          educationalLevels: newSchool.educationalLevels,
          creatorUid: user.uid,
          timestamp: serverTimestamp()
        });
        console.log('School created successfully:', schoolId);
        
        // Initialize finance for the school
        await setDoc(doc(db, 'finance', schoolId), {
          schoolId: schoolId,
          institutionBalance: 0,
          bankName: 'Exona Trust Bank',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newSchool.name} General`
        });
        console.log('Finance initialized for school');
      }
      setNewSchool({ name: '', description: '', logo: '', type: 'school', educationalLevels: [] });
      setEditingSchool(null);
      setIsSchoolModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error in handleCreateSchool:', error);
      handleFirestoreError(error, OperationType.CREATE, 'schools');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSchool = async () => {
    if (!user || !schoolToDelete) return;
    setIsUploading(true);
    try {
      await deleteDoc(doc(db, 'schools', schoolToDelete));
      setIsDeleteSchoolModalOpen(false);
      setSchoolToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schools/${schoolToDelete}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePlace = async () => {
    console.log('handleCreatePlace started', { newPlace, user: user?.uid, editingPlace: editingPlace?.id });
    if (!newPlace.name.trim() || !user) {
      console.warn('handleCreatePlace aborted: missing name or user', { name: newPlace.name, user: user?.uid });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      let logoUrl = newPlace.logo.trim();
      
      if (selectedFile) {
        console.log('Uploading logo file...', selectedFile.name);
        const fileRef = ref(storage, `places/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log(`Upload progress: ${progress}%`);
          }, (error) => {
            console.error('Upload failed:', error);
            reject(error);
          }, () => {
            console.log('Upload complete');
            resolve(null);
          });
        });
        logoUrl = await getDownloadURL(fileRef);
        console.log('Logo URL obtained:', logoUrl);
      }

      if (editingPlace) {
        console.log('Updating existing place:', editingPlace.id);
        await setDoc(doc(db, 'places', editingPlace.id), {
          ...editingPlace,
          name: newPlace.name.trim(),
          description: newPlace.description.trim(),
          logo: logoUrl,
          category: newPlace.category
        }, { merge: true });
        console.log('Place updated successfully');
      } else {
        console.log('Creating new place...');
        const placeId = newPlace.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        await setDoc(doc(db, 'places', placeId), {
          id: placeId,
          name: newPlace.name.trim(),
          description: newPlace.description.trim() || `Official space for ${newPlace.name}`,
          logo: logoUrl,
          category: newPlace.category,
          creatorUid: user.uid,
          timestamp: serverTimestamp()
        });
        console.log('Place created successfully:', placeId);
        
        // Initialize finance for the place
        await setDoc(doc(db, 'finance', placeId), {
          placeId: placeId,
          institutionBalance: 0,
          bankName: 'Exona Trust Bank',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newPlace.name} General`
        });
        console.log('Finance initialized for place');
      }
      setNewPlace({ name: '', description: '', logo: '', category: 'School' });
      setEditingPlace(null);
      setIsPlaceModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error in handleCreatePlace:', error);
      handleFirestoreError(error, OperationType.CREATE, 'places');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePlace = async () => {
    if (!user || !placeToDelete) return;
    setIsUploading(true);
    try {
      await deleteDoc(doc(db, 'places', placeToDelete));
      setIsDeletePlaceModalOpen(false);
      setPlaceToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `places/${placeToDelete}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateRecord = async () => {
    console.log('handleCreateRecord started', { user: !!user, studentName: newRecord.studentName, selectedSchool: !!selectedSchool });
    if (!user) { setView('login'); return; }
    if (!newRecord.studentName.trim() || !selectedSchool) {
      console.warn('handleCreateRecord: missing required fields', { studentName: newRecord.studentName, selectedSchool: !!selectedSchool });
      return;
    }
    setIsUploading(true);
    const path = 'studentRecords';
    try {
      if (editingRecord) {
        console.log('Updating record', editingRecord.id);
        await setDoc(doc(db, path, editingRecord.id), {
          studentName: newRecord.studentName.trim(),
          category: newRecord.category.trim() || 'General',
          paid: Number(newRecord.paid),
          balance: Number(newRecord.balance),
          visibility: newRecord.visibility,
          sharedWith: newRecord.sharedWith.split(',').map(e => e.trim()).filter(e => e),
        }, { merge: true });
      } else {
        console.log('Adding new record');
        await addDoc(collection(db, path), {
          schoolId: selectedSchool.id,
          studentName: newRecord.studentName.trim(),
          category: newRecord.category.trim() || 'General',
          creatorUid: user.uid,
          addedBy: user.displayName || 'Anonymous',
          paid: Number(newRecord.paid),
          balance: Number(newRecord.balance),
          type: recordTab,
          visibility: newRecord.visibility,
          sharedWith: newRecord.sharedWith.split(',').map(e => e.trim()).filter(e => e),
          timestamp: serverTimestamp()
        });
      }
      console.log('Record operation successful');
      setNewRecord({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private', sharedWith: '' });
      setIsRecordModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Record operation failed', error);
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAttendance = async () => {
    console.log('handleCreateAttendance started', { user: !!user, selectedSchool: !!selectedSchool, teacherName: newAttendance.teacherName });
    if (!user || !selectedSchool || !newAttendance.teacherName.trim()) {
      console.warn('handleCreateAttendance aborted: missing required fields', { user: !!user, selectedSchool: !!selectedSchool, teacherName: newAttendance.teacherName });
      return;
    }
    setIsUploading(true);
    const path = 'teacherAttendance';
    try {
      console.log('Adding attendance record to:', path);
      await addDoc(collection(db, path), {
        schoolId: selectedSchool.id,
        teacherName: newAttendance.teacherName.trim(),
        status: newAttendance.status,
        date: new Date().toISOString().split('T')[0],
        addedBy: user.displayName || 'Anonymous',
        timestamp: serverTimestamp()
      });
      console.log('Attendance record added successfully');
      setNewAttendance({ teacherName: '', status: 'present' });
      setIsAttendanceModalOpen(false);
    } catch (error) {
      console.error('Attendance operation failed', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditRecord = (record: StudentRecord) => {
    setEditingRecord(record);
    setNewRecord({
      studentName: record.studentName,
      category: record.category,
      paid: record.paid,
      balance: record.balance,
      visibility: record.visibility,
      sharedWith: record.sharedWith?.join(', ') || ''
    });
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!user || !recordToDelete) return;
    setIsUploading(true);
    try {
      await deleteDoc(doc(db, 'studentRecords', recordToDelete));
      setIsDeleteRecordModalOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studentRecords/${recordToDelete}`);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleCreatePost = async () => {
    console.log('handleCreatePost started', { user: !!user, content: !!newPostContent.trim() });
    if (!user) { setView('login'); return; }
    if (!newPostContent.trim()) return;
    const path = 'posts';
    setIsUploading(true);
    setUploadProgress(0);
    try {
      let mediaUrl = editingPost?.mediaUrl || '';
      let mediaType: 'image' | 'video' | undefined = editingPost?.mediaType;

      if (!previewUrl) {
        mediaUrl = '';
        mediaType = undefined;
      }

      if (selectedFile) {
        console.log('Uploading media', selectedFile.name);
        mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
        const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => {
              console.error('Upload failed', error);
              reject(error);
            }, 
            () => resolve(null)
          );
        });
        
        mediaUrl = await getDownloadURL(fileRef);
        console.log('Media upload successful', mediaUrl);
      }

      if (editingPost) {
        console.log('Updating post', editingPost.id);
        await setDoc(doc(db, 'posts', editingPost.id), {
          content: newPostContent.trim(),
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        console.log('Adding new post');
        await addDoc(collection(db, path), {
          authorUid: user.uid,
          authorName: user.displayName || 'Anonymous',
          authorPhoto: user.photoURL || '',
          content: newPostContent.trim(),
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          likes: 0,
          likedBy: [],
          commentsCount: 0,
          reshares: 0,
          timestamp: serverTimestamp(),
          isOfficial: canManageInstitution(view === 'school-feed' ? selectedSchool : null),
          schoolId: (view === 'school-feed' && selectedSchool) ? selectedSchool.id : 'horizon'
        });
      }
      console.log('Post operation successful');
      setNewPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setIsPostModalOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Post operation failed', error);
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setNewPostContent(post.content);
    // Note: We don't set selectedFile here because we use the existing mediaUrl if no new file is selected
    setPreviewUrl(post.mediaUrl || null);
    setIsPostModalOpen(true);
  };

  const openNewPostModal = () => {
    setEditingPost(null);
    setNewPostContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPostModalOpen(true);
  };

  const onDeletePostClick = (post: Post) => {
    setPostToDelete(post);
    setIsDeletePostModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!user || !postToDelete) return;
    try {
      await deleteDoc(doc(db, 'posts', postToDelete.id));
      setIsDeletePostModalOpen(false);
      setPostToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  };

  const handleLikePost = async (postId: string, likedBy: string[]) => {
    if (!user) { setView('login'); return; }
    const isLiked = likedBy.includes(user.uid);
    const newLikedBy = isLiked ? likedBy.filter(id => id !== user.uid) : [...likedBy, user.uid];
    try {
      await setDoc(doc(db, 'posts', postId), { 
        likedBy: newLikedBy, 
        likes: newLikedBy.length 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleResharePost = async (post: Post) => {
    if (!user) { setView('login'); return; }
    try {
      await addDoc(collection(db, 'posts'), {
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        content: `Reshared: ${post.content.slice(0, 50)}...`,
        resharedFrom: {
          id: post.id,
          authorName: post.authorName,
          content: post.content
        },
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        reshares: 0,
        timestamp: serverTimestamp(),
        isOfficial: false
      });
      // Increment reshare count on original post
      await setDoc(doc(db, 'posts', post.id), { 
        reshares: (post.reshares || 0) + 1 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const handleForwardPost = async (post: Post) => {
    const shareData = {
      title: 'Exona Post',
      text: `${post.authorName}: ${post.content}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(`${post.authorName}: ${post.content}\n\nShared via Exona`);
      alert('Post content copied to clipboard!');
    }
  };

  const handleAddComment = async () => {
    if (!user || !activePostForComments || !commentText.trim()) return;
    try {
      await addDoc(collection(db, `posts/${activePostForComments.id}/comments`), {
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        text: commentText.trim(),
        timestamp: serverTimestamp()
      });
      // Increment comment count on post
      await setDoc(doc(db, 'posts', activePostForComments.id), { 
        commentsCount: (activePostForComments.commentsCount || 0) + 1 
      }, { merge: true });
      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${activePostForComments.id}/comments`);
    }
  };

  useEffect(() => {
    if (!activePostForComments) {
      setPostComments([]);
      return;
    }
    const q = query(collection(db, `posts/${activePostForComments.id}/comments`), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPostComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [activePostForComments]);

  const handleAiSend = async () => {
    if (!user) { setView('login'); return; }
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `You are Exona AI, a helpful assistant for the Exona school management platform. Help the user with their queries about school records, finance, or general school life. User says: ${userMsg}` }] }]
      });
      setAiMessages(prev => [...prev, { role: 'ai', text: result.text || "I'm not sure how to respond to that." }]);
    } catch (error) {
      console.error('AI Error:', error);
      setAiMessages(prev => [...prev, { role: 'ai', text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check for email verification
        if (!currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === 'password')) {
          setUser(currentUser);
          setLoading(false);
          return;
        }

        try {
          // Ensure doc exists and role is correct
          await ensureUserDocument(currentUser);
          
          // Listen real-time to user document
          userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserDoc(data);
              
              // Bootstrap admin role for owner email if not set
              if (currentUser.email === 'musstaphamusa@gmail.com' && data.role !== 'admin') {
                await setDoc(doc(db, 'users', currentUser.uid), { role: 'admin' }, { merge: true });
              }
            } else {
              // Create user doc if it doesn't exist
              const initialData = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || 'User',
                role: currentUser.email === 'musstaphamusa@gmail.com' ? 'admin' : 'user'
              };
              await setDoc(doc(db, 'users', currentUser.uid), initialData);
              setUserDoc(initialData);
            }
          });

          setUser(currentUser);
          // Only transition if we are already at the login screen. 
          // If we are at 'splash', let the splash timer handle the transition.
          setView(prev => (prev === 'login') ? 'feed' : prev);
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      } else {
        if (userUnsubscribe) userUnsubscribe();
        setUser(null);
        setUserDoc(null);
        setVerificationSent(false);
        // Allow guest to see feed by default
        setView(prev => prev !== 'splash' ? 'feed' : prev);
      }
      setLoading(false);
    });
    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (splashDone && !loading && view === 'splash') {
      if (userDoc?.role === 'admin') {
        setView('admin');
      } else if (isSubAdmin) {
        setView('sub-admin');
      } else {
        setView('feed');
      }
    }
  }, [splashDone, loading, user, userDoc, isSubAdmin, view]);

  // Data listeners
  useEffect(() => {
    // Public data listeners (no user check)
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
    }, (error) => {
      // Only log if it's not a permission error for guest
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'schools');
      }
    });

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('timestamp', 'desc')), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    });

    let unsubAllRecords = () => {};
    let unsubAllFinance = () => {};

    if (user && userDoc?.role === 'admin') {
      unsubAllRecords = onSnapshot(collection(db, 'studentRecords'), (snap) => {
        setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
      });
      unsubAllFinance = onSnapshot(collection(db, 'finance'), (snap) => {
        setAllFinance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => { unsubSchools(); unsubPosts(); unsubAllRecords(); unsubAllFinance(); };
  }, [user, userDoc]);

  useEffect(() => {
    if (!selectedSchool) return;
    
    const q = query(collection(db, 'studentRecords'), where('schoolId', '==', selectedSchool.id));
    const unsubRecords = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
    }, (error) => {
      console.error('Error fetching student records:', error);
      // Only show error if it's not a permission error (which might happen if some records are private)
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'studentRecords');
      }
    });

    const unsubFinance = onSnapshot(doc(db, 'finance', selectedSchool.id), (snap) => {
      if (snap.exists()) setFinance(snap.data() as SchoolFinance);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `finance/${selectedSchool.id}`);
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'teacherAttendance'), where('schoolId', '==', selectedSchool.id), orderBy('timestamp', 'desc')), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAttendance)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'teacherAttendance');
      }
    });

    return () => { unsubRecords(); unsubFinance(); unsubAttendance(); };
  }, [selectedSchool]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e: any) { 
      console.error('Google Login Error:', e);
      setAuthError(e.message || 'Failed to sign in with Google.');
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !displayName) {
      setAuthError('Please fill in all fields.');
      return;
    }
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
      // The user is signed in but not verified. We'll handle this in the auth listener.
    } catch (e: any) {
      console.error('Sign Up Error:', e);
      setAuthError(e.message || 'Failed to create account.');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      console.error('Sign In Error:', e);
      setAuthError(e.message || 'Invalid email or password.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setAuthError(null);
    try {
      // Re-authenticate if it's a password user
      if (user.providerData.some(p => p.providerId === 'password')) {
        if (!deletePassword) {
          setAuthError('Please enter your password to confirm deletion.');
          setIsDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete user from Auth
      await deleteUser(user);
      
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setView('login');
    } catch (e: any) {
      console.error('Delete Account Error:', e);
      if (e.code === 'auth/requires-recent-login') {
        setAuthError('Please sign out and sign in again to delete your account.');
      } else {
        setAuthError(e.message || 'Failed to delete account.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      setView('login'); 
    } catch (e) { 
      console.error('Logout Error:', e);
    }
  };

  const handleUserClick = async (profile: { uid: string, name: string, photo: string }) => {
    setSelectedUserProfile(profile);
    setSelectedUserProfileDoc(null); // Reset while loading
    setView('user-profile');
    
    try {
      const docSnap = await getDoc(doc(db, 'users', profile.uid));
      if (docSnap.exists()) {
        setSelectedUserProfileDoc(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleFollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }
    if (user.uid === targetUid) return;

    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUid);

      const currentFollowing = userDoc.following || [];
      if (currentFollowing.includes(targetUid)) return;

      const newFollowing = [...currentFollowing, targetUid];
      await setDoc(currentUserRef, { following: newFollowing }, { merge: true });
      setUserDoc({ ...userDoc, following: newFollowing });

      const targetDoc = await getDoc(targetUserRef);
      if (targetDoc.exists()) {
        const targetData = targetDoc.data();
        const targetFollowers = targetData.followers || [];
        const newTargetFollowers = [...targetFollowers, user.uid];
        await setDoc(targetUserRef, { followers: newTargetFollowers }, { merge: true });
        if (selectedUserProfile?.uid === targetUid) {
          setSelectedUserProfileDoc({ ...targetData, followers: newTargetFollowers });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUnfollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }

    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUid);

      const currentFollowing = userDoc.following || [];
      const newFollowing = currentFollowing.filter((id: string) => id !== targetUid);
      await setDoc(currentUserRef, { following: newFollowing }, { merge: true });
      setUserDoc({ ...userDoc, following: newFollowing });

      const targetDoc = await getDoc(targetUserRef);
      if (targetDoc.exists()) {
        const targetData = targetDoc.data();
        const targetFollowers = targetData.followers || [];
        const newTargetFollowers = targetFollowers.filter((id: string) => id !== user.uid);
        await setDoc(targetUserRef, { followers: newTargetFollowers }, { merge: true });
        if (selectedUserProfile?.uid === targetUid) {
          setSelectedUserProfileDoc({ ...targetData, followers: newTargetFollowers });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const canManageInstitution = (school: School | Place | null) => {
    if (!user || !userDoc) return false;
    if (userDoc.role === 'admin') return true;
    if (!school) return false;
    if (school.creatorUid === user.uid) return true;
    if (school.subAdmins && school.subAdmins.some(email => email.toLowerCase() === user.email?.toLowerCase())) return true;
    return false;
  };

  const handleAddSubAdmin = async () => {
    if (!subAdminEmail.trim() || !schoolToManageSubAdmins) return;

    try {
      const currentSubAdmins = schoolToManageSubAdmins.subAdmins || [];
      const newEmail = subAdminEmail.trim().toLowerCase();
      if (currentSubAdmins.map(e => e.toLowerCase()).includes(newEmail)) {
        alert('This user is already a sub-admin.');
        return;
      }

      const collectionName = schoolToManageSubAdmins.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, schoolToManageSubAdmins.id);
      const newSubAdmins = [...currentSubAdmins, newEmail];
      
      await setDoc(schoolRef, { subAdmins: newSubAdmins }, { merge: true });
      setSchoolToManageSubAdmins({ ...schoolToManageSubAdmins, subAdmins: newSubAdmins });
      setSubAdminEmail('');
    } catch (error) {
      console.error('Error adding sub-admin:', error);
      const collectionName = schoolToManageSubAdmins?.type === 'school' ? 'schools' : 'places';
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${schoolToManageSubAdmins?.id}`);
    }
  };

  const handleRemoveSubAdmin = async (email: string) => {
    if (!schoolToManageSubAdmins) return;

    try {
      const currentSubAdmins = schoolToManageSubAdmins.subAdmins || [];
      const newSubAdmins = currentSubAdmins.filter(e => e.toLowerCase() !== email.toLowerCase());
      
      const collectionName = schoolToManageSubAdmins.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, schoolToManageSubAdmins.id);
      await setDoc(schoolRef, { subAdmins: newSubAdmins }, { merge: true });
      setSchoolToManageSubAdmins({ ...schoolToManageSubAdmins, subAdmins: newSubAdmins });
    } catch (error) {
      console.error('Error removing sub-admin:', error);
      const collectionName = schoolToManageSubAdmins?.type === 'school' ? 'schools' : 'places';
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${schoolToManageSubAdmins?.id}`);
    }
  };

  const handleFollowInstitution = async (school: School | Place) => {
    if (!user) { setView('login'); return; }
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      if (school.followers?.includes(user.uid) || school.pendingFollowers?.includes(user.uid)) return;

      await setDoc(schoolRef, { 
        pendingFollowers: arrayUnion(user.uid) 
      }, { merge: true });
      
      alert('Follow request sent. Waiting for approval from sub-admin.');
    } catch (error) {
      console.error('Error following institution:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleUnfollowInstitution = async (school: School | Place) => {
    if (!user || !userDoc) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      const userRef = doc(db, 'users', user.uid);
      
      await Promise.all([
        setDoc(schoolRef, { 
          followers: arrayRemove(user.uid),
          pendingFollowers: arrayRemove(user.uid)
        }, { merge: true }),
        setDoc(userRef, { 
          following: arrayRemove(school.id) 
        }, { merge: true })
      ]);
    } catch (error) {
      console.error('Error unfollowing institution:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleApproveFollower = async (school: School | Place, followerUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      const userRef = doc(db, 'users', followerUid);
      
      await Promise.all([
        setDoc(schoolRef, { 
          followers: arrayUnion(followerUid),
          pendingFollowers: arrayRemove(followerUid)
        }, { merge: true }),
        setDoc(userRef, { 
          following: arrayUnion(school.id) 
        }, { merge: true })
      ]);
    } catch (error) {
      console.error('Error approving follower:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleRejectFollower = async (school: School | Place, followerUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await setDoc(schoolRef, { 
        pendingFollowers: arrayRemove(followerUid)
      }, { merge: true });
    } catch (error) {
      console.error('Error rejecting follower:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'sub-admin': {
        if (!isSubAdmin) { setView('feed'); return null; }
        
        const subAdminRecords = allRecords.filter(r => subAdminInstitutions.some(s => s.id === r.schoolId));
        const subAdminFinance = allFinance.filter(f => subAdminInstitutions.some(s => s.id === f.schoolId));
        
        const totalRevenue = subAdminFinance.reduce((acc, f) => acc + (f.institutionBalance || 0), 0);
        const totalPaid = subAdminRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = subAdminRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <div className="w-full max-w-[1600px] mx-auto py-12 px-8 pb-32 lg:pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-serif italic text-ink tracking-tight mb-2"
                >
                  Sub-Admin Console
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.4em]"
                >
                  Management for your assigned institutions
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {[
                { label: 'Assigned Institutions', value: subAdminInstitutions.length, color: 'accent' },
                { label: 'Total Students', value: subAdminRecords.length, color: 'green-600' },
                { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString()}`, color: 'ink' },
                { label: 'Pending Balance', value: `₦${totalBalance.toLocaleString()}`, color: 'red-600' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-gray-100 premium-shadow group hover:border-accent/20 transition-all"
                >
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{stat.label}</p>
                  <h3 className={`text-3xl font-serif italic text-${stat.color}`}>{stat.value}</h3>
                  <div className="mt-8 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className={`h-full bg-${stat.color}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pending Follow Requests */}
            {subAdminInstitutions.some(s => s.pendingFollowers && s.pendingFollowers.length > 0) && (
              <div className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-ink">Pending Follow Requests</h3>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-widest">Approve users to see your content</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subAdminInstitutions.map(school => 
                    (school.pendingFollowers || []).map(followerUid => (
                      <motion.div 
                        key={`${school.id}-${followerUid}`} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-accent/20 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-ink font-bold">
                            {pendingFollowerNames[followerUid]?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink">{pendingFollowerNames[followerUid] || 'Loading...'}</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Requesting to follow {school.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleApproveFollower(school, followerUid)}
                            className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all active:scale-90"
                            title="Approve"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleRejectFollower(school, followerUid)}
                            className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90"
                            title="Reject"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-serif italic text-ink">Your Institutions</h3>
                </div>
                <div className="grid gap-6">
                  {subAdminInstitutions.map(school => (
                    <motion.div 
                      key={school.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-8 rounded-[2rem] border border-gray-100 premium-shadow flex items-center justify-between group hover:border-accent/20 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="relative group h-16 w-16">
                          <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center text-ink font-bold text-2xl overflow-hidden border border-gray-100">
                            {uploadingInstitutionId === school.id ? (
                              <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center">
                                <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-ink"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                                <p className="text-[8px] font-bold text-ink mt-2">{Math.round(uploadProgress)}%</p>
                              </div>
                            ) : school.logo ? (
                              <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              school.name.charAt(0)
                            )}
                          </div>
                          {uploadingInstitutionId !== school.id && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                              <Upload size={16} />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleUpdateInstitutionLogo(school, e)}
                              />
                            </label>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-ink text-lg">{school.name}</h4>
                          <p className="text-muted text-xs font-medium uppercase tracking-widest">{school.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                          className="px-6 py-3 bg-gray-50 text-ink rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                        >
                          Feed
                        </button>
                        <button 
                          onClick={() => { setSelectedSchool(school); setView('records'); }}
                          className="px-6 py-3 bg-gray-50 text-ink rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                        >
                          Records
                        </button>
                        <button 
                          onClick={() => { setSelectedSchool(school); setView('finance'); }}
                          className="px-6 py-3 bg-ink text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
                        >
                          Finance
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-2xl font-serif italic text-ink">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setView('records')}
                    className="p-8 bg-accent/5 border border-accent/10 rounded-[2.5rem] text-left group hover:bg-accent/10 transition-all"
                  >
                    <div className="h-14 w-14 bg-accent text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                      <Users size={28} />
                    </div>
                    <h4 className="font-bold text-ink text-lg mb-2">Student Directory</h4>
                    <p className="text-muted text-xs font-medium leading-relaxed">Access and manage student profiles across your institutions.</p>
                  </button>

                  <button 
                    onClick={() => setView('finance')}
                    className="p-8 bg-green-50 border border-green-100 rounded-[2.5rem] text-left group hover:bg-green-100 transition-all"
                  >
                    <div className="h-14 w-14 bg-green-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-600/20">
                      <Wallet size={28} />
                    </div>
                    <h4 className="font-bold text-ink text-lg mb-2">Financial Hub</h4>
                    <p className="text-muted text-xs font-medium leading-relaxed">Monitor revenue and balances for your assigned schools.</p>
                  </button>

                  <button 
                    onClick={() => setView('attendance')}
                    className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] text-left group hover:bg-blue-100 transition-all"
                  >
                    <div className="h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
                      <Calendar size={28} />
                    </div>
                    <h4 className="font-bold text-ink text-lg mb-2">Attendance</h4>
                    <p className="text-muted text-xs font-medium leading-relaxed">Track teacher and staff attendance records.</p>
                  </button>

                  <button 
                    onClick={() => setView('ai')}
                    className="p-8 bg-purple-50 border border-purple-100 rounded-[2.5rem] text-left group hover:bg-purple-100 transition-all"
                  >
                    <div className="h-14 w-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="font-bold text-ink text-lg mb-2">AI Assistant</h4>
                    <p className="text-muted text-xs font-medium leading-relaxed">Get insights and help with institutional management.</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'admin': {
        if (userDoc?.role !== 'admin') { setView('feed'); return null; }
        const totalRevenue = allFinance.reduce((acc, f) => acc + (f.institutionBalance || 0), 0);
        const totalPaid = allRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = allRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <div className="w-full max-w-[1600px] mx-auto py-12 px-8 pb-32 lg:pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-serif italic text-ink tracking-tight mb-2"
                >
                  Admin Terminal
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.4em]"
                >
                  Global system oversight & management
                </motion.p>
              </div>
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSchoolModalOpen(true)}
                className="flex items-center gap-3 px-10 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 transition-all"
              >
                <Plus size={20} />
                Register Institution
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {[
                { label: 'Total Schools', value: schools.length, color: 'accent' },
                { label: 'Total Students', value: allRecords.length, color: 'green-600' },
                { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString()}`, color: 'ink' },
                { label: 'Pending Balance', value: `₦${totalBalance.toLocaleString()}`, color: 'red-600' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-gray-100 premium-shadow group hover:border-accent/20 transition-all"
                >
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{stat.label}</p>
                  <h3 className={`text-3xl font-serif italic text-${stat.color}`}>{stat.value}</h3>
                  <div className="mt-8 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className={`h-full bg-${stat.color}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-[3rem] border border-gray-100 premium-shadow overflow-hidden"
                >
                  <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <h4 className="font-serif italic text-2xl text-ink tracking-tight">Registered Institutions</h4>
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-muted">
                      <Search size={20} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">School</th>
                          <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Balance</th>
                          <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {schools.map(school => {
                          const schoolFin = allFinance.find(f => f.schoolId === school.id);
                          return (
                            <tr key={school.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-10 py-8">
                                <div className="flex items-center gap-6">
                                  <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center">
                                    {school.logo ? (
                                      <img src={school.logo} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-muted text-[10px] font-bold">{school.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-ink text-[15px] tracking-tight">{school.name}</p>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1">{school.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-8 font-mono font-bold text-ink text-sm">₦{schoolFin?.institutionBalance.toLocaleString() || '0'}</td>
                              <td className="px-10 py-8">
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => { setSelectedSchool(school); setView('finance'); }}
                                    className="px-6 py-2.5 bg-gray-50 text-muted rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-ink hover:text-white transition-all shadow-sm"
                                  >
                                    Manage
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSchoolToManageSubAdmins(school);
                                      setIsSubAdminModalOpen(true);
                                    }}
                                    className="px-6 py-2.5 bg-accent/5 text-accent rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all shadow-sm flex items-center gap-2"
                                    title="Appoint Sub-Admins"
                                  >
                                    <UserPlus size={14} />
                                    Appoint
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSchoolToDelete(school.id);
                                      setIsDeleteSchoolModalOpen(true);
                                    }}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="Delete Institution"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-1">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-white p-10 rounded-[3rem] border border-gray-100 premium-shadow"
                >
                  <h4 className="font-serif italic text-2xl text-ink tracking-tight mb-10">System Activity</h4>
                  <div className="space-y-10">
                    {posts.slice(0, 5).map((post, i) => (
                      <div key={post.id} className="flex gap-6 relative">
                        {i < 4 && <div className="absolute left-6 top-10 bottom-[-2.5rem] w-px bg-gray-100"></div>}
                        <div className="relative">
                          {post.authorPhoto ? (
                            <img src={post.authorPhoto} className="h-12 w-12 rounded-2xl object-cover shadow-sm border border-gray-100" />
                          ) : (
                            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-ink font-bold text-xs border border-gray-100">
                              {post.authorName?.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div className="h-2 w-2 bg-accent rounded-full"></div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-ink leading-snug">
                            {post.authorName} <span className="text-muted font-medium">broadcasted an update</span>
                          </p>
                          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                            <Clock size={10} />
                            {formatTime(post.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-12 py-5 bg-gray-50 text-muted rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100">
                    View Audit Logs
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        );
      }
      case 'feed': {
        return (
          <div className="w-full max-w-xl mx-auto py-4 px-4">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setView('schools')}
                className="p-6 bg-white border border-gray-100 rounded-[2rem] hover:shadow-xl hover:shadow-ink/5 transition-all text-left group"
              >
                <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-ink mb-4 group-hover:bg-ink group-hover:text-white transition-colors">
                  <GraduationCap size={24} />
                </div>
                <h3 className="font-bold text-ink text-sm">Institutions</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Manage Schools & Places</p>
              </button>
              <button 
                onClick={() => setView('records')}
                className="p-6 bg-white border border-gray-100 rounded-[2rem] hover:shadow-xl hover:shadow-ink/5 transition-all text-left group"
              >
                <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-ink mb-4 group-hover:bg-ink group-hover:text-white transition-colors">
                  <ClipboardList size={24} />
                </div>
                <h3 className="font-bold text-ink text-sm">Student Records</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">View & Edit Profiles</p>
              </button>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif italic text-ink">Featured Institutions</h2>
                <button onClick={() => setView('schools')} className="text-[12px] font-bold text-muted hover:text-ink transition-colors">View All</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {schools.slice(0, 5).map(school => (
                  <button 
                    key={school.id}
                    onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                    className="flex-shrink-0 w-32 text-center group"
                  >
                    <div className="h-20 w-20 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:shadow-lg transition-all overflow-hidden">
                      {school.logo ? (
                        <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-2xl font-bold text-gray-200">{school.name.charAt(0)}</span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-ink truncate w-full">{school.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {user && (
              <div className="py-6 border-b border-gray-100 flex gap-4 items-start">
                <div className="flex flex-col items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-ink font-bold text-xs">
                      {user.displayName?.charAt(0)}
                    </div>
                  )}
                  <div className="w-0.5 h-8 bg-transparent rounded-full" />
                </div>
                <div className="flex-1">
                  <button 
                    onClick={openNewPostModal}
                    className="w-full text-left py-2 text-muted font-medium text-[14px]"
                  >
                    What's new?
                  </button>
                </div>
                <button 
                  onClick={openNewPostModal}
                  className="px-4 py-1.5 bg-gray-100 text-ink rounded-full font-bold text-[13px] hover:bg-gray-200 transition-colors"
                >
                  Post
                </button>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {posts.filter(p => 
                (userDoc?.role === 'admin') ||
                (p.schoolId && userDoc?.following?.includes(p.schoolId)) ||
                (p.authorUid === user?.uid)
              ).map((post, idx) => (
                <FeedPost 
                  key={post.id} 
                  post={post} 
                  onUserClick={handleUserClick}
                  onLike={handleLikePost}
                  onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                  onReshare={handleResharePost}
                  onForward={handleForwardPost}
                  onEdit={handleEditPost}
                  onDelete={onDeletePostClick}
                  currentUserId={user?.uid}
                />
              ))}
              {posts.filter(p => 
                (userDoc?.role === 'admin') ||
                (p.schoolId && userDoc?.following?.includes(p.schoolId)) ||
                (p.authorUid === user?.uid)
              ).length === 0 && (
                <div className="py-20 text-center">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-muted mx-auto mb-6">
                    <Users size={32} />
                  </div>
                  <h3 className="text-xl font-serif italic text-ink mb-2">Your feed is empty</h3>
                  <p className="text-sm text-muted mb-8">Follow institutions to see their updates here.</p>
                  <button 
                    onClick={() => setView('schools')}
                    className="px-8 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
                  >
                    Explore Institutions
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'school-feed': {
        if (!selectedSchool) { setView('schools'); return null; }
        const schoolPosts = posts.filter(p => p.schoolId === selectedSchool.id);
        const isFollowing = selectedSchool.followers?.includes(user?.uid || '');
        const isManager = canManageInstitution(selectedSchool);
        const isAdmin = userDoc?.role === 'admin';
        const canSeeContent = isFollowing || isManager || isAdmin;

        return (
          <div className="w-full max-w-xl mx-auto py-4 px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('schools')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                    {selectedSchool.logo ? (
                      <img src={selectedSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-muted text-[10px] font-bold">{selectedSchool.name.charAt(0)}</span>
                    )}
                  </div>
                  <h2 className="font-bold text-ink text-lg">{selectedSchool.name}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && !isManager && !isAdmin && (
                  <>
                    {isFollowing ? (
                      <button 
                        onClick={() => handleUnfollowInstitution(selectedSchool)}
                        className="px-4 py-2 bg-gray-100 text-muted rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        Unfollow
                      </button>
                    ) : selectedSchool.pendingFollowers?.includes(user.uid) ? (
                      <button 
                        disabled
                        className="px-4 py-2 bg-gray-50 text-muted/50 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed"
                      >
                        Pending
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleFollowInstitution(selectedSchool)}
                        className="px-4 py-2 bg-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-colors"
                      >
                        Follow
                      </button>
                    )}
                  </>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setSchoolToManageSubAdmins(selectedSchool);
                      setIsSubAdminModalOpen(true);
                    }}
                    className="px-4 py-2 bg-accent/5 text-accent rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                  >
                    <UserPlus size={14} />
                    Appoint
                  </button>
                )}
              </div>
            </div>

            {!canSeeContent ? (
              <div className="py-20 text-center bg-white border border-gray-100 rounded-[2.5rem] px-8 shadow-sm">
                <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-muted mx-auto mb-6">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-serif italic text-ink mb-2">Follow to see content</h3>
                <p className="text-sm text-muted mb-8">This institution's posts are only visible to approved followers.</p>
                {!selectedSchool.pendingFollowers?.includes(user?.uid || '') && (
                  <button 
                    onClick={() => handleFollowInstitution(selectedSchool)}
                    className="px-8 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
                  >
                    Request Access
                  </button>
                )}
              </div>
            ) : (
              <>
                {user && (
                  <div className="py-6 border-b border-gray-100 flex gap-4 items-start">
                    <div className="flex flex-col items-center gap-2">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-ink font-bold text-xs">
                          {user.displayName?.charAt(0)}
                        </div>
                      )}
                      <div className="w-0.5 h-8 bg-gray-100 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <button 
                        onClick={openNewPostModal}
                        className="w-full text-left py-2 text-muted font-medium text-[14px]"
                      >
                        Post to {selectedSchool.name}...
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {schoolPosts.map(post => (
                    <FeedPost 
                      key={post.id} 
                      post={post} 
                      onUserClick={handleUserClick}
                      onLike={handleLikePost}
                      onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                      onReshare={handleResharePost}
                      onForward={handleForwardPost}
                      onEdit={handleEditPost}
                      onDelete={onDeletePostClick}
                      currentUserId={user?.uid}
                    />
                  ))}
                  {schoolPosts.length === 0 && (
                    <div className="py-20 text-center text-muted">
                      <p className="text-sm font-medium">No posts yet from this institution.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }
      case 'user-profile': {
        if (!selectedUserProfile) { setView('feed'); return null; }
        const profilePosts = posts.filter(p => p.authorUid === selectedUserProfile.uid);
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-ink mb-1">{selectedUserProfile.name}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-ink text-[14px]">{selectedUserProfile.name?.toLowerCase().replace(/\s+/g, '')}</p>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-muted text-[11px] font-medium">exona.io</span>
                </div>
              </div>
              <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                {selectedUserProfile.photo ? (
                  <img src={selectedUserProfile.photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full bg-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
                    {selectedUserProfile.name?.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <p className="text-ink text-[14px] mb-6 whitespace-pre-wrap">
              {selectedUserProfileDoc?.bio || "No bio yet."}
            </p>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-5 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <p className="text-muted text-[14px] hover:underline cursor-pointer">
                {selectedUserProfileDoc?.followers?.length || 0} followers
              </p>
            </div>

            <div className="flex gap-3 mb-10">
              {user && user.uid !== selectedUserProfile.uid && (
                <button 
                  onClick={() => {
                    const isFollowing = userDoc?.following?.includes(selectedUserProfile.uid);
                    if (isFollowing) {
                      handleUnfollowUser(selectedUserProfile.uid);
                    } else {
                      handleFollowUser(selectedUserProfile.uid);
                    }
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-[14px] transition-all ${
                    userDoc?.following?.includes(selectedUserProfile.uid)
                    ? 'bg-white text-ink border border-gray-200 hover:bg-gray-50'
                    : 'bg-ink text-white hover:bg-ink/90'
                  }`}
                >
                  {userDoc?.following?.includes(selectedUserProfile.uid) ? 'Following' : 'Follow'}
                </button>
              )}
              <button className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-colors">
                Mention
              </button>
            </div>

            <div className="flex border-b border-gray-100 mb-4">
              <button className="flex-1 py-3 text-[14px] font-bold text-ink border-b-2 border-ink">Broadcasts</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Replies</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Reposts</button>
            </div>

            <div className="divide-y divide-gray-100">
              {profilePosts.map(post => (
                <FeedPost 
                  key={post.id} 
                  post={post} 
                  onUserClick={handleUserClick}
                  onLike={handleLikePost}
                  onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                  onReshare={handleResharePost}
                  onForward={handleForwardPost}
                  onEdit={handleEditPost}
                  onDelete={onDeletePostClick}
                  currentUserId={user?.uid}
                />
              ))}
            </div>
          </div>
        );
      }
      case 'schools': {
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-ink tracking-tight">Institutions</h2>
              {userDoc?.role === 'admin' && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-10 w-10 bg-ink text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="relative mb-8 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search institutions..." 
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-0 outline-none transition-all text-ink font-medium placeholder:text-gray-400" 
              />
            </div>

            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'school', 'place'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSchoolFilter(f as any)}
                  className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                    schoolFilter === f 
                      ? 'bg-ink text-white' 
                      : 'bg-white text-muted border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'school' ? 'Schools' : 'Places'}
                </button>
              ))}
            </div>

            <div className="divide-y divide-gray-100">
              {schools
                .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                .map(school => (
                <div 
                  key={school.id}
                  className="py-6 border-b border-gray-50 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                    >
                      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden border border-gray-100 shadow-sm ${
                        school.logo ? 'bg-white' : 'bg-gray-200'
                      }`}>
                        {school.logo ? (
                          <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-ink">{school.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h4 className="text-[16px] font-bold text-ink truncate">{school.name}</h4>
                          <BadgeCheck size={14} className="text-blue-500 fill-blue-500" />
                        </div>
                        <p className="text-[13px] text-muted line-clamp-1">{school.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[11px] font-bold text-muted uppercase tracking-widest">{(school.followers?.length || 0).toLocaleString()} followers</p>
                          <div className="h-1 w-1 bg-gray-200 rounded-full"></div>
                          <p className="text-[11px] font-bold text-muted uppercase tracking-widest">{school.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user && !canManageInstitution(school) && (
                        <>
                          {school.followers?.includes(user.uid) ? (
                            <button 
                              onClick={() => handleUnfollowInstitution(school)}
                              className="px-4 py-2 bg-gray-100 text-muted rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              Unfollow
                            </button>
                          ) : school.pendingFollowers?.includes(user.uid) ? (
                            <button 
                              disabled
                              className="px-4 py-2 bg-gray-50 text-muted/50 rounded-xl text-[12px] font-bold uppercase tracking-widest cursor-not-allowed"
                            >
                              Pending
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleFollowInstitution(school)}
                              className="px-4 py-2 bg-ink text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-colors"
                            >
                              Follow
                            </button>
                          )}
                        </>
                      )}
                      <button 
                        onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                        className="px-6 py-2 bg-ink text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10 active:scale-95"
                      >
                        Visit
                      </button>
                      {userDoc?.role === 'admin' && (
                        <>
                          <button 
                            onClick={() => {
                              setSchoolToManageSubAdmins(school);
                              setIsSubAdminModalOpen(true);
                            }}
                            className="px-4 py-2 bg-accent/5 text-accent rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                            title="Manage Sub-Admins"
                          >
                            <UserPlus size={16} />
                            Appoint
                          </button>
                          <button 
                            onClick={() => {
                              setSchoolToDelete(school.id);
                              setIsDeleteSchoolModalOpen(true);
                            }}
                            className="p-2 text-muted hover:text-red-600 transition-colors"
                            title="Delete Institution"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Institution Action Buttons */}
                  <div className="flex items-center gap-2 ml-20">
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('records'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-muted hover:bg-ink hover:text-white rounded-xl transition-all duration-300 group/btn"
                    >
                      <ClipboardList size={14} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Records</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('attendance'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-muted hover:bg-ink hover:text-white rounded-xl transition-all duration-300 group/btn"
                    >
                      <Calendar size={14} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Attendance</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('finance'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-muted hover:bg-ink hover:text-white rounded-xl transition-all duration-300 group/btn"
                    >
                      <Wallet size={14} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Finance</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'records': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) { setView('schools'); return null; }
        const filteredRecords = records
          .filter(r => r.type === recordTab)
          .filter(r => r.studentName.toLowerCase().includes(recordSearch.toLowerCase()));
        const totalPaid = filteredRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = filteredRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <div className="w-full max-w-full mx-auto py-8 px-4 md:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="text-center md:text-left">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-5xl font-serif italic text-ink tracking-tight mb-2"
                >
                  {selectedSchool.name} Records
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
                >
                  Official Student Information System
                </motion.p>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search students..." 
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-0 outline-none transition-all text-ink font-medium placeholder:text-gray-400 w-64 premium-shadow" 
                  />
                </div>
                {canManageInstitution(selectedSchool) && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsRecordModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all"
                  >
                    <Plus size={20} />
                    Add Student Record
                  </motion.button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Total Students', value: filteredRecords.length, icon: Users, color: 'text-ink', bg: 'bg-gray-50' },
                { label: 'Total Paid', value: `₦${totalPaid.toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50/30' },
                { label: 'Total Balance', value: `₦${totalBalance.toLocaleString()}`, icon: Wallet, color: 'text-red-600', bg: 'bg-red-50/30' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 premium-shadow flex items-center gap-6 group hover:border-accent/20 transition-all"
                >
                  <div className={`h-16 w-16 rounded-[1.5rem] ${stat.bg} flex items-center justify-center text-ink group-hover:scale-110 transition-transform`}>
                    <stat.icon size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <p className={`text-3xl font-serif italic ${stat.color}`}>{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 mb-10 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-fit">
              {(['general', 'books', 'uniforms'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setRecordTab(tab)}
                  className={`px-8 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${recordTab === tab ? 'bg-white text-ink shadow-sm border border-gray-100' : 'text-muted hover:text-ink'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[3rem] premium-shadow border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Student & Details</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Category</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Added By</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Paid</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Balance</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-20">
                            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                              <Filter size={48} strokeWidth={1} />
                            </div>
                            <p className="font-serif italic text-2xl">No records found</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Try adjusting your search or filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record, idx) => (
                        <motion.tr 
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent font-bold text-xs">
                                {record.studentName.charAt(0)}
                              </div>
                              <span className="font-bold text-ink text-sm">{record.studentName}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex flex-wrap gap-2">
                              {record.category.split(',').map(c => c.trim()).filter(c => c).map((cat, i) => (
                                <span key={i} className="px-3 py-1 bg-accent/5 text-accent rounded-lg text-[9px] font-bold uppercase tracking-wider border border-accent/10">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-10 py-6 text-[12px] font-medium text-muted">{record.addedBy}</td>
                          <td className="px-10 py-6 font-mono font-bold text-green-600 text-sm">₦{record.paid.toLocaleString()}</td>
                          <td className="px-10 py-6 font-mono font-bold text-red-600 text-sm">₦{record.balance.toLocaleString()}</td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                              {(record.creatorUid === user?.uid || canManageInstitution(selectedSchool)) && (
                                <>
                                  <button 
                                    onClick={() => handleEditRecord(record)}
                                    className="p-2.5 text-muted hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setRecordToDelete(record.id);
                                      setIsDeleteRecordModalOpen(true);
                                    }}
                                    className="p-2.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      case 'finance': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) { setView('schools'); return null; }
        return (
          <div className="w-full max-w-full mx-auto py-8 px-4 md:px-12">
            <div className="flex flex-col mb-12 items-center text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-serif italic text-ink tracking-tight mb-2"
              >
                {selectedSchool.name} Finance
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
              >
                Institutional Financial Terminal
              </motion.p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
              <div className="xl:col-span-3 space-y-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-ink rounded-[3.5rem] p-16 text-white shadow-2xl shadow-ink/20 relative overflow-hidden group"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-12">
                      <div>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.4em] mb-4">Institution Balance</p>
                        <h3 className="text-8xl font-mono font-medium tracking-tighter">₦{finance?.institutionBalance.toLocaleString() || '0'}</h3>
                      </div>
                      <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                        <TrendingUp size={32} className="text-green-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-3 text-white/60 text-[10px] font-bold uppercase tracking-widest bg-white/5 w-fit px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                        <ShieldCheck size={16} className="text-green-400" />
                        Verified & Encrypted
                      </div>
                      <div className="flex items-center gap-3 text-white/60 text-[10px] font-bold uppercase tracking-widest bg-white/5 w-fit px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                        <Clock size={16} className="text-accent" />
                        Last Updated: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute -right-20 -bottom-20 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Sparkles size={500} strokeWidth={1} />
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Deposit', icon: ArrowUpRight, color: 'bg-green-500' },
                    { label: 'Withdraw', icon: TrendingDown, color: 'bg-red-500' },
                    { label: 'Transfer', icon: Send, color: 'bg-blue-500' }
                  ].map((action, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 flex flex-col items-center gap-4 hover:border-accent/20 transition-all group"
                    >
                      <div className={`h-14 w-14 rounded-2xl ${action.color} text-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <action.icon size={24} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink">{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white p-12 rounded-[3rem] premium-shadow border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-12">
                    <h4 className="font-serif italic text-3xl text-ink tracking-tight">Transaction History</h4>
                    <div className="flex gap-4">
                      <button className="h-12 w-12 bg-gray-50 rounded-2xl text-muted hover:text-ink transition-all flex items-center justify-center"><Search size={20} /></button>
                      <button className="h-12 w-12 bg-gray-50 rounded-2xl text-muted hover:text-ink transition-all flex items-center justify-center"><Filter size={20} /></button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-40">
                    <div className="h-32 w-32 rounded-full bg-gray-50 flex items-center justify-center mb-10 relative">
                      <Database size={56} className="text-gray-200" strokeWidth={1} />
                      <div className="absolute -right-2 -bottom-2 h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Sparkles size={20} className="text-accent" />
                      </div>
                    </div>
                    <p className="font-serif italic text-3xl text-ink mb-4">No transactions yet</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted">Your financial journey starts here</p>
                  </div>
                </motion.div>
              </div>

              <div className="xl:col-span-1 space-y-10">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-12 rounded-[3rem] premium-shadow border border-gray-100"
                >
                  <div className="flex items-center gap-5 mb-12">
                    <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center text-ink">
                      <CreditCard size={32} />
                    </div>
                    <h4 className="font-serif italic text-2xl text-ink tracking-tight">Bank Details</h4>
                  </div>
                  <div className="space-y-10">
                    <div className="group">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Bank Name</p>
                      <p className="font-bold text-ink text-lg group-hover:text-accent transition-colors">{finance?.bankName || '---'}</p>
                    </div>
                    <div className="group">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Account Number</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-ink text-2xl tracking-[0.2em]">{finance?.accountNumber || '---'}</p>
                        <button className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-muted hover:text-accent transition-all"><Plus size={18} /></button>
                      </div>
                    </div>
                    <div className="group">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Account Name</p>
                      <p className="font-bold text-ink text-lg group-hover:text-accent transition-colors">{finance?.accountName || '---'}</p>
                    </div>
                  </div>
                    {canManageInstitution(selectedSchool) && (
                      <button className="w-full mt-12 py-6 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/20 hover:bg-ink/90 transition-all">
                        Update Details
                      </button>
                    )}
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-accent/5 p-10 rounded-[2.5rem] border border-accent/10 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6 text-accent">
                      <ShieldCheck size={24} />
                      <p className="font-bold text-[12px] uppercase tracking-widest">Security Protocol</p>
                    </div>
                    <p className="text-[14px] text-accent/80 leading-relaxed font-medium">
                      All financial data is encrypted and stored securely. Only authorized administrators can access detailed transaction logs.
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-5">
                    <Fingerprint size={100} />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        );
      }
      case 'attendance': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) { setView('schools'); return null; }
        const filteredAttendance = attendance.filter(r => 
          r.teacherName.toLowerCase().includes(attendanceSearch.toLowerCase())
        );
        const presentToday = filteredAttendance.filter(r => r.status === 'present').length;
        const absentToday = filteredAttendance.filter(r => r.status === 'absent').length;

        return (
          <div className="w-full max-w-full mx-auto py-8 px-4 md:px-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
              <div className="flex flex-col text-center md:text-left">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-serif italic text-ink tracking-tight mb-2"
                >
                  {selectedSchool.name} Attendance
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
                >
                  Teacher Presence Log
                </motion.p>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search teachers..." 
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-0 outline-none transition-all text-ink font-medium placeholder:text-gray-400 w-64 premium-shadow" 
                  />
                </div>
                {canManageInstitution(selectedSchool) && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all"
                  >
                    <Plus size={20} />
                    Record Attendance
                  </motion.button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Total Records', value: filteredAttendance.length, icon: ClipboardList, color: 'text-ink', bg: 'bg-gray-50' },
                { label: 'Present Today', value: presentToday, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50/30' },
                { label: 'Absent Today', value: absentToday, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50/30' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 premium-shadow flex items-center gap-6 group hover:border-accent/20 transition-all"
                >
                  <div className={`h-16 w-16 rounded-[1.5rem] ${stat.bg} flex items-center justify-center text-ink group-hover:scale-110 transition-transform`}>
                    <stat.icon size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <p className={`text-3xl font-serif italic ${stat.color}`}>{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-white rounded-[3rem] premium-shadow border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Teacher Name</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Status</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Date</th>
                      <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-20">
                            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                              <Users size={48} strokeWidth={1} />
                            </div>
                            <p className="font-serif italic text-2xl">No records found</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Try adjusting your search</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record, idx) => (
                        <motion.tr 
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent font-bold text-xs">
                                {record.teacherName.charAt(0)}
                              </div>
                              <span className="font-bold text-ink text-sm">{record.teacherName}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
                              record.status === 'present' ? 'bg-green-50 text-green-600 border-green-100' :
                              record.status === 'absent' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-[12px] font-medium text-muted">{record.date}</td>
                          <td className="px-10 py-6 text-[12px] font-medium text-muted">{record.addedBy}</td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      case 'ai': {
        return (
          <div className="flex flex-col h-full w-full max-w-4xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12 items-center text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-serif italic text-ink tracking-tight mb-2"
              >
                Exona AI
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
              >
                Intelligent Institutional Intelligence
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 bg-white rounded-[3rem] premium-shadow border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                {aiMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                    <Cpu size={80} strokeWidth={1} className="mb-8" />
                    <h3 className="font-serif italic text-2xl text-ink mb-4">How can I assist you?</h3>
                    <p className="text-sm font-medium max-w-sm">Inquire about student records, financial status, or institutional policies. I am here to provide precision data.</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed ${
                      msg.role === 'user' ? 'bg-ink text-white rounded-tr-none' : 'bg-gray-50 text-ink rounded-tl-none border border-gray-100'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 p-6 rounded-[2rem] rounded-tl-none flex gap-1.5 border border-gray-100">
                      <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce"></span>
                      <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiSend()}
                  placeholder="Inquire with Exona AI..." 
                  className="flex-1 px-8 py-5 bg-white rounded-2xl outline-none focus:ring-2 focus:ring-ink/5 transition-all text-sm font-semibold premium-shadow border border-gray-100"
                />
                <button 
                  onClick={handleAiSend}
                  disabled={!aiInput.trim() || isAiTyping}
                  className="h-16 w-16 bg-ink text-white rounded-2xl flex items-center justify-center shadow-xl shadow-ink/10 hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <Send size={24} />
                </button>
              </div>
            </motion.div>
          </div>
        );
      }
      case 'penalty': {
        return (
          <div className="w-full max-w-4xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12 items-center text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-serif italic text-ink tracking-tight mb-2"
              >
                Penalty Board
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
              >
                Disciplinary Records & Notices
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-16 rounded-[3rem] premium-shadow border border-gray-100 text-center"
            >
              <div className="h-24 w-24 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                <ShieldCheck size={48} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif italic text-3xl text-ink mb-4">Exemplary Record</h3>
              <p className="text-muted text-sm font-medium max-w-sm mx-auto leading-relaxed">
                You have no active penalties or disciplinary notices. Your commitment to institutional standards is noted and appreciated.
              </p>
            </motion.div>
          </div>
        );
      }
      case 'profile': {
        if (!user) { setView('login'); return null; }
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-ink mb-1">{user.displayName}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-ink text-[14px]">{user.email?.split('@')[0]}</p>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-muted text-[11px] font-medium">exona.io</span>
                </div>
              </div>
              <div className="relative group h-20 w-20">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                  {isUploadingProfile ? (
                    <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center">
                      <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-ink"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[8px] font-bold text-ink mt-2">{Math.round(uploadProgress)}%</p>
                    </div>
                  ) : user.photoURL ? (
                    <img src={user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
                      {user.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                {!isUploadingProfile && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Upload size={20} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleUpdateProfilePicture}
                    />
                  </label>
                )}
              </div>
            </div>

            <p className="text-ink text-[14px] mb-6 whitespace-pre-wrap">
              {userDoc?.bio || "No bio yet."}
            </p>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-5 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <p className="text-muted text-[14px] hover:underline cursor-pointer">1.2k followers</p>
            </div>

            <div className="flex gap-3 mb-10">
              <button className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-colors">
                Edit profile
              </button>
              <button className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-colors">
                Share profile
              </button>
            </div>

            <div className="flex border-b border-gray-100 mb-4">
              <button className="flex-1 py-3 text-[14px] font-bold text-ink border-b-2 border-ink">Broadcasts</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Replies</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Reposts</button>
            </div>

            <div className="divide-y divide-gray-100">
              {posts.filter(p => p.authorUid === user.uid).map(post => (
                <FeedPost 
                  key={post.id} 
                  post={post} 
                  onUserClick={handleUserClick}
                  onLike={handleLikePost}
                  onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                  onReshare={handleResharePost}
                  onForward={handleForwardPost}
                  onEdit={handleEditPost}
                  onDelete={onDeletePostClick}
                  currentUserId={user?.uid}
                />
              ))}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  if (view === 'splash') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-ink text-white overflow-hidden relative">
        {/* Immersive background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[100px] rounded-full animate-pulse [animation-delay:1s]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 2 }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <h1 className="text-7xl font-serif italic tracking-tighter text-white mb-2">Exona</h1>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent mb-8"></div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col items-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-white/40 mb-12">Mastering Records</p>
            
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 bg-white/20 rounded-full animate-bounce"></div>
              <div className="h-1 w-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="h-1 w-1 bg-white/20 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-12 text-[9px] font-mono tracking-widest uppercase"
        >
          System Initializing v4.0.2
        </motion.div>
      </div>
    );
  }

  if (loading) return null;

  if (view === 'login') {
    if (verificationSent || (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password'))) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-paper p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]"></div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center relative z-10"
          >
            <div className="h-20 w-20 bg-ink text-white rounded-[2rem] flex items-center justify-center font-serif italic text-4xl mb-10 mx-auto shadow-2xl shadow-ink/20">Ex</div>
            <h2 className="text-4xl font-serif italic text-ink mb-4 tracking-tight">Verify Identity</h2>
            <p className="text-muted font-medium mb-10 leading-relaxed">
              An authentication link has been dispatched to <span className="text-ink font-bold">{user?.email || email}</span>. Please authorize via your inbox to proceed.
            </p>
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  if (auth.currentUser) {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                      const docData = await ensureUserDocument(auth.currentUser);
                      setUserDoc(docData);
                      setUser(auth.currentUser);
                      setView('feed');
                    } else {
                      setAuthError('Identity not yet verified. Please check your secure inbox.');
                    }
                  }
                }} 
                className="w-full py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all"
              >
                Confirm Verification
              </button>
              <button 
                onClick={() => {
                  setVerificationSent(false);
                  signOut(auth);
                }} 
                className="w-full py-5 bg-gray-50 text-muted rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100"
              >
                Return to Portal
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center bg-paper p-6 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md bg-white rounded-[3.5rem] premium-shadow p-12 md:p-16 border border-gray-100 my-8 relative overflow-hidden z-10"
        >
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <ShieldCheck size={200} strokeWidth={1} />
          </div>
          
          <div className="h-20 w-20 bg-ink text-white rounded-[2rem] flex items-center justify-center font-serif italic text-4xl mb-12 shadow-2xl shadow-ink/20">Ex</div>
          
          <div className="mb-12">
            <h2 className="text-5xl font-serif italic text-ink mb-4 tracking-tight leading-tight">
              {authMode === 'signin' ? 'Institutional Access' : 'Establish Identity'}
            </h2>
            <p className="text-muted font-medium text-sm leading-relaxed max-w-[280px]">
              {authMode === 'signin' ? 'Enter the Exona mainframe to manage your academic and social presence.' : 'Join the next generation of institutional management and community.'}
            </p>
          </div>

          {authError && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 p-5 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-[11px] font-bold flex items-center gap-3"
            >
              <AlertCircle size={18} />
              {authError}
            </motion.div>
          )}

          <div className="space-y-6 mb-10">
            {authMode === 'signup' && (
              <div className="group">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Full Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alexander Pierce"
                  className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium placeholder:text-gray-300"
                />
              </div>
            )}
            <div className="group">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Credential Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu"
                className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium placeholder:text-gray-300"
              />
            </div>
            <div className="group">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Security Key</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium placeholder:text-gray-300"
              />
            </div>
          </div>

          <button 
            onClick={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp} 
            className="w-full py-6 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] shadow-2xl shadow-ink/20 hover:bg-ink/90 transition-all mb-8 active:scale-[0.98]"
          >
            {authMode === 'signin' ? 'Authorize Access' : 'Initialize Account'}
          </button>

          <div className="relative mb-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase font-bold text-muted tracking-[0.4em]"><span className="bg-white px-6">Third-Party Gateway</span></div>
          </div>

          <button 
            onClick={handleGoogleSignIn} 
            className="w-full py-5 bg-white border border-gray-100 text-ink rounded-[2rem] font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-4 mb-10 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" />
            Continue with Google
          </button>

          <p className="text-center text-[11px] text-muted font-bold uppercase tracking-widest">
            {authMode === 'signin' ? "New to the mainframe?" : "Already registered?"}{' '}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setAuthError(null);
              }} 
              className="text-ink hover:underline underline-offset-4 decoration-ink/20"
            >
              {authMode === 'signin' ? 'Create Identity' : 'Sign In'}
            </button>
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-[10px] font-mono text-muted uppercase tracking-[0.5em] text-center"
        >
          Secure Institutional Network • v4.0.2
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Modals */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="h-20 w-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-600 mb-8 shadow-xl shadow-red-100">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-3xl font-serif italic text-ink mb-3 tracking-tight">Terminate Identity?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">
                This protocol is permanent and cannot be reversed. Are you absolutely certain you wish to purge your Exona identity from the mainframe?
              </p>

              {authError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-8 p-5 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-[11px] font-bold flex items-center gap-3"
                >
                  <AlertCircle size={18} />
                  {authError}
                </motion.div>
              )}

              {user?.providerData.some(p => p.providerId === 'password') && (
                <div className="mb-10">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4">Security Key Confirmation</label>
                  <input 
                    type="password" 
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter key to authorize"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-red-500/10 focus:bg-white border border-transparent focus:border-red-100 transition-all text-sm font-medium"
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isDeleting ? 'Purging...' : 'Confirm Termination'}
                </button>
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword('');
                    setAuthError(null);
                  }}
                  disabled={isDeleting}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 disabled:opacity-50 transition-all border border-gray-100"
                >
                  Abort Protocol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/20 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">{editingPost ? 'Refine Broadcast' : 'Initialize Broadcast'}</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Horizon Network Transmission</p>
                </div>
                <button 
                  onClick={() => setIsPostModalOpen(false)} 
                  className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
              
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening in your school?"
                className="w-full h-56 p-8 bg-gray-50 rounded-[2.5rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-lg font-medium resize-none mb-6 placeholder:text-gray-300 leading-relaxed"
              />

              {previewUrl && (
                <div className="mb-8 bg-gray-50 rounded-[2.5rem] overflow-hidden border border-gray-100 relative group premium-shadow">
                  {/* Try to determine media type from selectedFile or editingPost */}
                  {(selectedFile?.type.startsWith('image/') || (editingPost?.mediaType === 'image' && !selectedFile)) ? (
                    <img src={previewUrl} className="w-full h-64 object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-64 object-cover" />
                  )}
                  <button 
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                    className="absolute top-6 right-6 h-12 w-12 bg-white/90 backdrop-blur-md text-ink rounded-2xl flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                  >
                    <X size={20} />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm flex flex-col items-center justify-center p-12">
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-4 max-w-xs">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-white"
                        />
                      </div>
                      <p className="text-white text-[10px] font-bold uppercase tracking-[0.4em]">{Math.round(uploadProgress)}% Transmission Complete</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <label className="h-14 w-14 bg-gray-50 text-muted rounded-2xl hover:bg-gray-100 cursor-pointer transition-all flex items-center justify-center border border-gray-100 active:scale-90">
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                  <label className="h-14 w-14 bg-gray-50 text-muted rounded-2xl hover:bg-gray-100 cursor-pointer transition-all flex items-center justify-center border border-gray-100 active:scale-90">
                    <VideoIcon size={22} />
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button 
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isUploading}
                  className="px-12 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] shadow-2xl shadow-ink/20 hover:bg-ink/90 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-[0.98]"
                >
                  {isUploading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {editingPost ? 'Synchronizing...' : 'Transmitting...'}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {editingPost ? 'Update Broadcast' : 'Post to Horizon'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeletePostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-serif italic text-ink mb-3 tracking-tight">Retract Broadcast?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the transmission from the Horizon network. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeletePost}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Retraction
                </button>
                <button 
                  onClick={() => {
                    setIsDeletePostModalOpen(false);
                    setPostToDelete(null);
                  }}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isRecordModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">{editingRecord ? `Edit ${recordTab} Record` : `Add ${recordTab} Record`}</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Data Entry</p>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Student Name</label>
                  <input 
                    type="text" 
                    value={newRecord.studentName}
                    onChange={(e) => setNewRecord({...newRecord, studentName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Category/Class</label>
                  {selectedSchool?.educationalLevels && selectedSchool.educationalLevels.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 px-2">
                        {selectedSchool.educationalLevels.map(level => {
                          const currentCategories = newRecord.category.split(',').map(c => c.trim()).filter(c => c);
                          const isSelected = currentCategories.includes(level);
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                let newCategories;
                                if (isSelected) {
                                  newCategories = currentCategories.filter(c => c !== level);
                                } else {
                                  newCategories = [...currentCategories, level];
                                }
                                setNewRecord({...newRecord, category: newCategories.join(', ')});
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                isSelected
                                  ? 'bg-ink text-white border-ink shadow-md'
                                  : 'bg-gray-50 text-muted border-transparent hover:bg-gray-100'
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                      <input 
                        type="text" 
                        value={newRecord.category}
                        onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                        placeholder="Or specify exact class (e.g. SS3 A)"
                        className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                      />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={newRecord.category}
                      onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                      placeholder="e.g. JSS1, SS3"
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Paid (₦)</label>
                    <input 
                      type="number" 
                      value={newRecord.paid}
                      onChange={(e) => setNewRecord({...newRecord, paid: Number(e.target.value)})}
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Balance (₦)</label>
                    <input 
                      type="number" 
                      value={newRecord.balance}
                      onChange={(e) => setNewRecord({...newRecord, balance: Number(e.target.value)})}
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateRecord}
                  disabled={!newRecord.studentName.trim() || isUploading}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      {editingRecord ? 'Synchronizing...' : 'Authorizing...'}
                    </>
                  ) : (
                    editingRecord ? 'Update Record' : 'Synchronize Record'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeleteRecordModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-serif italic text-ink mb-3 tracking-tight">Erase Record?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the student information from the institutional database. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteRecord}
                  disabled={isUploading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Erasing...
                    </>
                  ) : (
                    'Confirm Erasure'
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsDeleteRecordModalOpen(false);
                    setRecordToDelete(null);
                  }}
                  disabled={isUploading}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeleteSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-serif italic text-ink mb-3 tracking-tight">Erase Institution?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove this institution and all its associated data from the system. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteSchool}
                  disabled={isUploading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Erasing...
                    </>
                  ) : (
                    'Confirm Deletion'
                  )}
                </button>
                <button 
                  onClick={() => { setIsDeleteSchoolModalOpen(false); setSchoolToDelete(null); }}
                  disabled={isUploading}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeletePlaceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-serif italic text-ink mb-3 tracking-tight">Erase Place?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove this place from the system. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeletePlace}
                  disabled={isUploading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Erasing...
                    </>
                  ) : (
                    'Confirm Deletion'
                  )}
                </button>
                <button 
                  onClick={() => { setIsDeletePlaceModalOpen(false); setPlaceToDelete(null); }}
                  disabled={isUploading}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">{editingSchool ? 'Refine Institution' : 'Register Institution'}</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Global Network Expansion</p>
                </div>
                <button onClick={() => { setIsSchoolModalOpen(false); setEditingSchool(null); setNewSchool({ name: '', description: '', logo: '', type: 'school' }); }} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Classification</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['school', 'place'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewSchool({ ...newSchool, type: t as any })}
                        className={`py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          newSchool.type === t 
                            ? 'bg-ink text-white shadow-xl shadow-ink/10' 
                            : 'bg-gray-50 text-muted border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {newSchool.type === 'school' && (
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Educational Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {['Pre-Nursery', 'Nursery', 'Primary', 'Secondary', 'Tertiary'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            const levels = newSchool.educationalLevels || [];
                            if (levels.includes(level)) {
                              setNewSchool({ ...newSchool, educationalLevels: levels.filter(l => l !== level) });
                            } else {
                              setNewSchool({ ...newSchool, educationalLevels: [...levels, level] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            (newSchool.educationalLevels || []).includes(level)
                              ? 'bg-ink text-white border-ink shadow-lg shadow-ink/10'
                              : 'bg-gray-50 text-muted border-transparent hover:bg-gray-100'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Institution Name</label>
                  <input 
                    type="text" 
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                    placeholder="e.g. Horizon International"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Description</label>
                  <textarea 
                    value={newSchool.description}
                    onChange={(e) => setNewSchool({...newSchool, description: e.target.value})}
                    placeholder="Brief institutional overview..."
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium resize-none h-32 leading-relaxed"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Visual Identity</label>
                  <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-100 transition-all">
                    <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                      {previewUrl || newSchool.logo ? (
                        <img src={previewUrl || newSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={24} className="text-muted/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-ink shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100">
                        <Upload size={14} />
                        Upload Logo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <p className="text-[9px] text-muted mt-2 ml-1 font-medium">Recommended: 400x400px PNG/JPG</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name.trim() || isUploading}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      {editingSchool ? 'Synchronizing...' : 'Authorizing...'}
                    </>
                  ) : (
                    editingSchool ? 'Synchronize Updates' : 'Authorize Registration'
                  )}
                </button>
              </div>
              {isUploading && (
                <div className="mt-6">
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                  <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-2 text-center">{Math.round(uploadProgress)}% Transmission Complete</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {isAttendanceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">Record Attendance</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Presence Log</p>
                </div>
                <button onClick={() => setIsAttendanceModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Teacher Name</label>
                  <input 
                    type="text" 
                    value={newAttendance.teacherName}
                    onChange={(e) => setNewAttendance({...newAttendance, teacherName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Presence Status</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['present', 'absent', 'late'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewAttendance({ ...newAttendance, status: s })}
                        className={`py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                          newAttendance.status === s 
                            ? 'bg-ink text-white border-ink shadow-xl shadow-ink/10' 
                            : 'bg-gray-50 text-muted border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateAttendance}
                  disabled={!newAttendance.teacherName.trim() || isUploading}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Recording...
                    </>
                  ) : (
                    'Authorize Presence'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSubAdminModalOpen && schoolToManageSubAdmins && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">Appoint Sub-Admins</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">{schoolToManageSubAdmins.name} Authority Management</p>
                </div>
                <button onClick={() => setIsSubAdminModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">User Email Address</label>
                  <div className="flex gap-4">
                    <input 
                      type="email" 
                      value={subAdminEmail}
                      onChange={(e) => setSubAdminEmail(e.target.value)}
                      placeholder="e.g. intisanud@gmail.com"
                      className="flex-1 px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                    <button 
                      onClick={handleAddSubAdmin}
                      disabled={!subAdminEmail.trim()}
                      className="px-8 bg-ink text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-90 flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Appoint
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-6 ml-4">Current Sub-Admins</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {schoolToManageSubAdmins.subAdmins && schoolToManageSubAdmins.subAdmins.length > 0 ? (
                      schoolToManageSubAdmins.subAdmins.map((email, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={idx} 
                          className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-ink font-bold text-xs shadow-sm">
                              {email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-ink">{email}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveSubAdmin(email)}
                            className="p-2.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <UserMinus size={18} />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <p className="text-sm text-muted italic">No sub-admins appointed yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCommentModalOpen && activePostForComments && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] premium-shadow flex flex-col max-h-[85vh] border border-gray-100"
            >
              <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-serif italic text-ink mb-1">Broadcast Replies</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Community Interactions</p>
                </div>
                <button onClick={() => setIsCommentModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {postComments.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle size={64} strokeWidth={1} className="mx-auto mb-6" />
                    <p className="font-serif italic text-xl">No replies yet. Start the conversation.</p>
                  </div>
                ) : (
                  postComments.map(comment => (
                    <div key={comment.id} className="flex gap-6 group">
                      <div className="relative">
                        {comment.authorPhoto ? (
                          <img src={comment.authorPhoto} className="h-14 w-14 rounded-2xl object-cover shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-accent/5 flex items-center justify-center text-accent font-serif italic text-2xl border border-accent/10">
                            {comment.authorName?.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 group-hover:bg-white group-hover:premium-shadow transition-all duration-500">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[15px] font-bold text-ink tracking-tight">{comment.authorName}</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                              {comment.timestamp ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </p>
                          </div>
                          <p className="text-[14px] text-ink/70 leading-relaxed font-medium">{comment.text}</p>
                        </div>
                        <div className="flex items-center gap-6 mt-4 ml-6">
                          <button className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors">Approve</button>
                          <button className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-10 border-t border-gray-100 bg-white">
                <div className="flex gap-5 items-center">
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your perspective..."
                      className="w-full pl-10 pr-20 py-6 bg-gray-50 rounded-[2rem] border border-transparent outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-100 transition-all text-[15px] font-medium placeholder:text-gray-300"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button className="p-2 text-muted hover:text-accent transition-colors"><Smile size={20} /></button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="h-16 w-16 bg-ink text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-90"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Sidebar Navigation */}
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[150]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl z-[160] flex flex-col border-r border-gray-100"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-ink text-white rounded-xl flex items-center justify-center font-serif italic text-xl shadow-lg shadow-ink/10">Ex</div>
                  <h2 className="text-xl font-serif italic text-ink tracking-tight">Exona Mainframe</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-muted hover:bg-gray-50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="px-4 py-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Navigation</p>
                </div>
                <SidebarItem 
                  icon={Home} 
                  label="Horizon Feed" 
                  active={view === 'feed'} 
                  onClick={() => { setView('feed'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={GraduationCap} 
                  label="Institutions" 
                  active={view === 'schools'} 
                  onClick={() => { setView('schools'); setSidebarOpen(false); }} 
                />
                
                <div className="px-4 py-6">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Management</p>
                </div>
                <SidebarItem 
                  icon={ClipboardList} 
                  label="Student Records" 
                  active={view === 'records'} 
                  onClick={() => { setView('records'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Calendar} 
                  label="Attendance" 
                  active={view === 'attendance'} 
                  onClick={() => { setView('attendance'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Wallet} 
                  label="Finance Hub" 
                  active={view === 'finance'} 
                  onClick={() => { setView('finance'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Shield} 
                  label="Penalty System" 
                  active={view === 'penalty'} 
                  onClick={() => { setView('penalty'); setSidebarOpen(false); }} 
                />

                <div className="px-4 py-6">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">System</p>
                </div>
                <SidebarItem 
                  icon={UserIcon} 
                  label="User Profile" 
                  active={view === 'profile'} 
                  onClick={() => { setView(user ? 'profile' : 'login'); setSidebarOpen(false); }} 
                />
                {userDoc?.role === 'admin' && (
                  <SidebarItem 
                    icon={ShieldCheck} 
                    label="Admin Console" 
                    active={view === 'admin'} 
                    onClick={() => { setView('admin'); setSidebarOpen(false); }} 
                  />
                )}
                {isSubAdmin && (
                  <SidebarItem 
                    icon={LayoutGrid} 
                    label="Sub-Admin Dashboard" 
                    active={view === 'sub-admin'} 
                    onClick={() => { setView('sub-admin'); setSidebarOpen(false); }} 
                  />
                )}
              </div>

              <div className="p-6 border-t border-gray-50">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  Terminate Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Navigation (Threads Style) */}
      <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center w-1/3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-ink hover:bg-gray-50 rounded-full transition-colors">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex items-center justify-center w-1/3">
          <h1 className="text-xl font-serif italic text-ink cursor-pointer" onClick={() => setView('feed')}>Exona</h1>
        </div>

        <div className="flex items-center justify-end w-1/3 gap-4">
          <button onClick={() => setView('schools')} className="p-2 text-ink hover:bg-gray-50 rounded-full transition-colors">
            <Search size={24} />
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto bg-paper">
        {renderView()}
      </main>

      {/* Bottom Nav (Threads Style) */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex items-center justify-between sticky bottom-0 z-40">
        <button onClick={() => setView('feed')} className={`p-2 transition-all ${view === 'feed' ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          <Home size={28} strokeWidth={view === 'feed' ? 2.5 : 2} />
        </button>
        <button onClick={() => setView('schools')} className={`p-2 transition-all ${view === 'schools' ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          <Search size={28} strokeWidth={view === 'schools' ? 2.5 : 2} />
        </button>
        <button 
          onClick={() => {
            if (!user) { setView('login'); return; }
            openNewPostModal();
          }} 
          className="p-2 text-muted hover:text-ink transition-all"
        >
          <PlusSquare size={28} />
        </button>
        <button onClick={() => setView('penalty')} className={`p-2 transition-all ${view === 'penalty' ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          <Bell size={28} strokeWidth={view === 'penalty' ? 2.5 : 2} />
        </button>
        <button onClick={() => user ? setView('profile') : setView('login')} className={`p-2 transition-all ${view === 'profile' ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          <UserIcon size={28} strokeWidth={view === 'profile' ? 2.5 : 2} />
        </button>
      </div>
      </div>
    );
  }

export default function App() {
  return (
    <ErrorBoundary>
      <ExonaApp />
    </ErrorBoundary>
  );
}

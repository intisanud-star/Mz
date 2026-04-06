import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { 
  GraduationCap, ShieldCheck, LogOut, LogIn, User as UserIcon, 
  BookOpen, Calendar, Bell, Search, Menu, X, 
  Home, Users, MessageSquare, Wallet, Settings, 
  AlertCircle, Cpu, ChevronDown, ChevronRight,
  Heart, MessageCircle, Share2, Plus, Filter, Send,
  Image as ImageIcon, Video as VideoIcon, Paperclip,
  MoreVertical, Trash2, Edit2, UserPlus, UserMinus,
  MoreHorizontal, ArrowUpRight, CreditCard, Fingerprint,
  BadgeCheck, AlertTriangle, Smile, TrendingUp, TrendingDown,
  DollarSign, Clock, FileText, Upload, LayoutGrid, Database, Sparkles, Shield
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
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, where } from 'firebase/firestore';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- TYPES ---
interface Place {
  id: string;
  name: string;
  category: 'School' | 'Business' | 'Community' | 'Personal' | 'Other';
  logo: string;
  description: string;
  creatorUid: string;
  timestamp: any;
  isOfficial?: boolean;
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

interface School {
  id: string;
  name: string;
  description: string;
  logo: string;
  type: 'school' | 'place';
  creatorUid: string;
  timestamp: any;
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] p-8 premium-shadow border border-gray-100 mb-8 group transition-all hover:border-accent/20"
    >
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
          className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left"
        >
          <div className="relative">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} className="h-12 w-12 rounded-2xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent font-bold text-sm">
                {post.authorName?.charAt(0)}
              </div>
            )}
            {post.isOfficial && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <ShieldCheck size={14} className="text-accent fill-accent/10" />
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-ink text-[15px] tracking-tight">{post.authorName}</h4>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.15em] mt-0.5">{formatTime(post.timestamp)}</p>
          </div>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-muted hover:text-ink p-2.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <MoreVertical size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-3 w-56 bg-white rounded-[1.5rem] premium-shadow border border-gray-100 z-50 overflow-hidden py-3"
              >
                {post.authorUid === currentUserId && (
                  <>
                    <button 
                      onClick={() => { onEdit?.(post); setShowMenu(false); }}
                      className="w-full px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-gray-50 flex items-center gap-4 transition-colors"
                    >
                      <Edit2 size={16} className="text-accent" />
                      Edit Broadcast
                    </button>
                    <button 
                      onClick={() => { onDelete?.(post); setShowMenu(false); }}
                      className="w-full px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 flex items-center gap-4 transition-colors"
                    >
                      <Trash2 size={16} />
                      Retract
                    </button>
                    <div className="h-px bg-gray-50 my-3 mx-6" />
                  </>
                )}
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted hover:bg-gray-50 flex items-center gap-4 transition-colors"
                >
                  <Bell size={16} />
                  Mute Thread
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <p className="text-ink/80 text-[15px] leading-[1.6] mb-8 whitespace-pre-wrap font-medium tracking-tight">
        {post.content}
      </p>
      
      {post.mediaUrl && (
        <div className="mb-8 rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50">
          {post.mediaType === 'image' ? (
            <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-[500px] transition-transform duration-700 hover:scale-105" referrerPolicy="no-referrer" />
          ) : (
            <video src={post.mediaUrl} controls className="w-full h-auto max-h-[500px]" />
          )}
        </div>
      )}

      {post.resharedFrom && (
        <div className="mb-8 p-8 bg-gray-50/50 rounded-[2rem] border border-gray-100 border-l-[4px] border-l-accent">
          <p className="text-[10px] text-accent font-bold uppercase tracking-[0.25em] mb-4">Reshared from {post.resharedFrom.authorName}</p>
          <p className="text-[14px] text-muted leading-relaxed italic font-serif">"{post.resharedFrom.content}"</p>
        </div>
      )}

      <div className="flex items-center gap-8 pt-6 border-t border-gray-50">
        <button 
          onClick={() => onLike?.(post.id, post.likedBy || [])}
          className={`flex items-center gap-2.5 transition-all duration-300 ${isLiked ? 'text-red-500 scale-110' : 'text-muted hover:text-red-500 hover:scale-110'}`}
        >
          <Heart size={20} className={isLiked ? 'fill-red-500' : ''} />
          <span className="text-[13px] font-bold tracking-tight">{post.likes || 0}</span>
        </button>
        <button 
          onClick={() => onComment?.(post)}
          className="flex items-center gap-2.5 text-muted hover:text-accent hover:scale-110 transition-all duration-300"
        >
          <MessageCircle size={20} />
          <span className="text-[13px] font-bold tracking-tight">{post.commentsCount || 0}</span>
        </button>
        <button 
          onClick={() => onReshare?.(post)}
          className="flex items-center gap-2.5 text-muted hover:text-green-600 hover:scale-110 transition-all duration-300"
        >
          <Share2 size={20} />
          <span className="text-[13px] font-bold tracking-tight">{post.reshares || 0}</span>
        </button>
        <button 
          onClick={() => onForward?.(post)}
          className="flex items-center gap-2 text-muted hover:text-ink transition-colors ml-auto group/forward"
        >
          <Plus size={18} className="rotate-45 group-hover/forward:rotate-0 transition-transform duration-500" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Forward</span>
        </button>
      </div>
    </motion.div>
  );
};

// --- MAIN DASHBOARD ---
function ExonaApp() {
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'ai' | 'penalty' | 'profile' | 'user-profile' | 'admin' | 'school-feed'>('splash');
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
  const [userDoc, setUserDoc] = useState<any>(null);
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
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState<'all' | 'School' | 'Business' | 'Community' | 'Personal'>('all');
  const [newPlace, setNewPlace] = useState({ name: '', description: '', logo: '', category: 'School' as Place['category'] });
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
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({ name: '', description: '', logo: '', type: 'school' as School['type'] });
  const [newRecord, setNewRecord] = useState({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private' as Record['visibility'], sharedWith: '' });

  const handleCreateSchool = async () => {
    if (!newSchool.name.trim() || !user) return;
    setIsUploading(true);
    try {
      let logoUrl = newSchool.logo.trim() || `https://picsum.photos/seed/${newSchool.name.toLowerCase().replace(/\s+/g, '-')}/200`;
      
      if (selectedFile) {
        const fileRef = ref(storage, `schools/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, (error) => reject(error), () => resolve(null));
        });
        logoUrl = await getDownloadURL(fileRef);
      }

      if (editingSchool) {
        await setDoc(doc(db, 'schools', editingSchool.id), {
          ...editingSchool,
          name: newSchool.name.trim(),
          description: newSchool.description.trim(),
          logo: logoUrl,
          type: newSchool.type
        }, { merge: true });
      } else {
        const schoolId = newSchool.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        await setDoc(doc(db, 'schools', schoolId), {
          id: schoolId,
          name: newSchool.name.trim(),
          description: newSchool.description.trim() || `Official space for ${newSchool.name}`,
          logo: logoUrl,
          type: newSchool.type,
          creatorUid: user.uid,
          timestamp: serverTimestamp()
        });
        
        // Initialize finance for the school
        await setDoc(doc(db, 'finance', schoolId), {
          schoolId: schoolId,
          institutionBalance: 0,
          bankName: 'Exona Trust Bank',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newSchool.name} General`
        });
      }
      setNewSchool({ name: '', description: '', logo: '', type: 'school' });
      setEditingSchool(null);
      setIsSchoolModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schools');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePlace = async () => {
    if (!newPlace.name.trim() || !user) return;
    setIsUploading(true);
    try {
      let logoUrl = newPlace.logo.trim() || `https://picsum.photos/seed/${newPlace.name.toLowerCase().replace(/\s+/g, '-')}/200`;
      
      if (selectedFile) {
        const fileRef = ref(storage, `places/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, (error) => reject(error), () => resolve(null));
        });
        logoUrl = await getDownloadURL(fileRef);
      }

      if (editingPlace) {
        await setDoc(doc(db, 'places', editingPlace.id), {
          ...editingPlace,
          name: newPlace.name.trim(),
          description: newPlace.description.trim(),
          logo: logoUrl,
          category: newPlace.category
        }, { merge: true });
      } else {
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
        
        // Initialize finance for the place
        await setDoc(doc(db, 'finance', placeId), {
          placeId: placeId,
          institutionBalance: 0,
          bankName: 'Exona Trust Bank',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newPlace.name} General`
        });
      }
      setNewPlace({ name: '', description: '', logo: '', category: 'School' });
      setEditingPlace(null);
      setIsPlaceModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'places');
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

  const handleDeleteRecord = async (recordId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'studentRecords', recordId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studentRecords/${recordId}`);
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
          isOfficial: userDoc?.role === 'admin',
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
          userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUserDoc(docSnap.data());
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
      // Always go to feed first, even if not logged in
      setView('feed');
    }
  }, [splashDone, loading, user, view]);

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

    return () => { unsubRecords(); unsubFinance(); };
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

  const renderView = () => {
    switch (view) {
      case 'admin':
        if (userDoc?.role !== 'admin') { setView('feed'); return null; }
        const totalRevenue = allFinance.reduce((acc, f) => acc + (f.institutionBalance || 0), 0);
        const totalPaid = allRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = allRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <div className="max-w-6xl mx-auto py-12 px-8 pb-32 lg:pb-12">
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
                                  <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <img src={school.logo} className="h-full w-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-ink text-[15px] tracking-tight">{school.name}</p>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1">{school.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-8 font-mono font-bold text-ink text-sm">₦{schoolFin?.institutionBalance.toLocaleString() || '0'}</td>
                              <td className="px-10 py-8">
                                <button 
                                  onClick={() => { setSelectedSchool(school); setView('finance'); }}
                                  className="px-6 py-2.5 bg-gray-50 text-muted rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-ink hover:text-white transition-all shadow-sm"
                                >
                                  Manage
                                </button>
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
                          <img src={post.authorPhoto} className="h-12 w-12 rounded-2xl object-cover shadow-sm border border-gray-100" />
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
      case 'feed':
        return (
          <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="flex flex-col mb-12">
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-serif italic text-ink tracking-tight mb-2"
              >
                Horizon Feed
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted text-[13px] font-bold uppercase tracking-[0.2em]"
              >
                The heartbeat of your community
              </motion.p>
            </div>

            {user && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-[2rem] premium-shadow p-8 mb-12 flex items-center gap-6 border border-gray-100"
              >
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                    className="h-14 w-14 rounded-2xl bg-accent/5 object-cover shadow-sm" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <button 
                  onClick={openNewPostModal}
                  className="flex-1 text-left px-8 py-4.5 bg-gray-50 rounded-2xl text-muted font-semibold hover:bg-gray-100 hover:text-ink transition-all text-sm border border-transparent hover:border-gray-200"
                >
                  Share something with the community, {user.displayName?.split(' ')[0]}...
                </button>
                <button 
                  onClick={openNewPostModal}
                  className="h-14 w-14 bg-ink text-white rounded-2xl flex items-center justify-center shadow-xl shadow-ink/10 hover:scale-105 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </motion.div>
            )}

            {!user && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent/5 border border-accent/10 rounded-[2rem] p-10 mb-12 flex flex-col md:flex-row items-center justify-between gap-8"
              >
                <div className="text-center md:text-left">
                  <h4 className="font-bold text-ink text-lg mb-2">Join the Exona Community</h4>
                  <p className="text-sm text-muted font-medium max-w-sm">Sign in to share updates, interact with peers, and stay connected with your school.</p>
                </div>
                <button 
                  onClick={() => setView('login')}
                  className="px-10 py-4 bg-accent text-white rounded-2xl font-bold text-sm shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all whitespace-nowrap"
                >
                  Get Started
                </button>
              </motion.div>
            )}

            <div className="space-y-2">
              {posts.filter(p => p.schoolId === 'horizon' || !p.schoolId).map((post, idx) => (
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
      case 'school-feed':
        if (!selectedSchool) { setView('schools'); return null; }
        const schoolPosts = posts.filter(p => p.schoolId === selectedSchool.id);
        return (
          <div className="max-w-2xl mx-auto py-8 px-4 pb-24 lg:pb-8">
            <button 
              onClick={() => setView('schools')}
              className="flex items-center gap-2 text-muted font-bold mb-8 hover:text-accent transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Institutions
            </button>
            
            <div className="bg-white rounded-[3rem] border border-gray-100 premium-shadow overflow-hidden mb-12 p-10 flex items-center gap-8">
              <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center text-white font-serif italic text-3xl shadow-2xl ${
                selectedSchool.name.toLowerCase().includes('darul') ? 'bg-orange-600 shadow-orange-100' : 'bg-accent shadow-accent/20'
              }`}>
                {selectedSchool.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h2 className="text-3xl font-serif italic text-ink tracking-tight mb-2">{selectedSchool.name}</h2>
                <p className="text-sm text-muted font-medium tracking-wide leading-relaxed">{selectedSchool.description}</p>
              </div>
            </div>

            {user && (
              <div className="bg-white rounded-[2rem] border border-gray-100 premium-shadow p-8 mb-12 flex items-center gap-6">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="h-14 w-14 rounded-2xl bg-accent/5 object-cover shadow-sm" 
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={openNewPostModal}
                  className="flex-1 text-left px-8 py-4.5 bg-gray-50 rounded-2xl text-muted font-semibold hover:bg-gray-100 transition-all text-sm"
                >
                  Post an update to {selectedSchool.name}...
                </button>
              </div>
            )}

            {schoolPosts.length === 0 && (
              <div className="bg-white rounded-[3rem] p-20 text-center border border-gray-100 premium-shadow">
                <div className="h-24 w-24 bg-gray-50 text-muted/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <ImageIcon size={48} />
                </div>
                <h3 className="text-2xl font-serif italic text-ink mb-3">No Broadcasts Yet</h3>
                <p className="text-muted text-sm font-medium">Be the first to share an update from this institution!</p>
              </div>
            )}

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
          </div>
        );
      case 'user-profile':
        if (!selectedUserProfile) { setView('feed'); return null; }
        const profilePosts = posts.filter(p => p.authorUid === selectedUserProfile.uid);
        return (
          <div className="max-w-2xl mx-auto py-8 px-4 pb-24 lg:pb-8">
            <button 
              onClick={() => setView('feed')}
              className="flex items-center gap-2 text-muted font-bold mb-8 hover:text-accent transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Feed
            </button>
            
            <div className="bg-white rounded-[3rem] border border-gray-100 premium-shadow overflow-hidden mb-12">
              <div className="h-40 bg-ink relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-50"></div>
              </div>
              <div className="px-10 pb-10">
                <div className="relative -mt-16 mb-8">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl">
                    <div className="h-full w-full rounded-[2rem] bg-accent/5 flex items-center justify-center text-accent font-serif italic text-4xl overflow-hidden border border-accent/10">
                      {selectedUserProfile.photo ? <img src={selectedUserProfile.photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : selectedUserProfile.name?.charAt(0)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-3xl font-serif italic text-ink tracking-tight">{selectedUserProfile.name}</h3>
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
                      className={`px-8 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-3 ${
                        userDoc?.following?.includes(selectedUserProfile.uid)
                        ? 'bg-gray-100 text-muted hover:bg-gray-200'
                        : 'bg-accent text-white shadow-xl shadow-accent/20 hover:bg-accent/90'
                      }`}
                    >
                      {userDoc?.following?.includes(selectedUserProfile.uid) ? (
                        <>
                          <UserMinus size={16} />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-muted font-bold text-[10px] uppercase tracking-[0.25em] mb-8">Horizon Member</p>
                
                <div className="flex gap-10">
                  <div>
                    <p className="text-2xl font-serif italic text-ink">{profilePosts.length}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Posts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-serif italic text-ink">{selectedUserProfileDoc?.followers?.length || 0}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Followers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-serif italic text-ink">{selectedUserProfileDoc?.following?.length || 0}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Following</p>
                  </div>
                  <div>
                    <p className="text-2xl font-serif italic text-ink">{profilePosts.reduce((acc, p) => acc + p.likes, 0)}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Total Likes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-xl font-serif italic text-ink tracking-tight mb-6">Recent Activity</h4>
              {profilePosts.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] border border-gray-100 premium-shadow text-center">
                  <p className="text-muted font-medium">No broadcasts yet.</p>
                </div>
              ) : (
                profilePosts.map(post => (
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
                ))
              )}
            </div>
          </div>
        );
      case 'schools':
        return (
          <div className="max-w-3xl mx-auto py-12 px-6 pb-24 lg:pb-12">
            <div className="flex items-center justify-between mb-12 bg-white p-8 rounded-[3rem] border border-gray-100 premium-shadow">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-accent/5 rounded-[1.5rem] flex items-center justify-center text-accent shadow-sm border border-accent/10">
                  <Wallet size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic text-ink tracking-tight">Executive Finance</h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1">Revenue and projections</p>
                </div>
              </div>
              {userDoc?.role === 'admin' && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-14 w-14 bg-ink text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-ink/10 hover:scale-105 transition-transform"
                >
                  <Plus size={28} />
                </button>
              )}
            </div>

            <div className="relative mb-12 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search institutions..." 
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full pl-16 pr-8 py-5 bg-white border border-gray-100 rounded-[2rem] premium-shadow focus:ring-2 focus:ring-accent/5 outline-none transition-all text-ink font-medium placeholder:text-gray-300" 
              />
            </div>

            <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
              {['all', 'school', 'place'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSchoolFilter(f as any)}
                  className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                    schoolFilter === f 
                      ? 'bg-ink text-white shadow-2xl shadow-ink/10' 
                      : 'bg-white text-muted border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All Institutions' : f === 'school' ? 'Schools' : 'Places'}
                </button>
              ))}
            </div>

            <div className="space-y-8">
              {schools
                .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                .map(school => (
                <div 
                  key={school.id}
                  className="bg-white rounded-[3rem] p-10 border border-gray-100 premium-shadow relative overflow-hidden group hover:border-accent/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-10">
                    <div 
                      className="flex items-center gap-6 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                    >
                      <div className="relative">
                        <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center text-white font-serif italic text-3xl shadow-2xl ${
                          school.name.toLowerCase().includes('darul') ? 'bg-orange-600 shadow-orange-100' : 'bg-accent shadow-accent/20'
                        }`}>
                          {school.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-4">
                          <h4 className="text-2xl font-serif italic text-ink tracking-tight">{school.name}</h4>
                          <div className="h-8 w-8 bg-accent text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xl shadow-accent/20">2</div>
                        </div>
                        <p className="text-sm text-muted font-medium tracking-wide mt-1 line-clamp-1">{school.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {userDoc?.role === 'admin' && (
                        <button 
                          onClick={() => {
                            setEditingSchool(school);
                            setNewSchool({ name: school.name, description: school.description, logo: school.logo, type: school.type });
                            setIsSchoolModalOpen(true);
                          }}
                          className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-muted hover:text-accent hover:bg-accent/5 transition-all"
                        >
                          <Settings size={22} />
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                        className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-ink hover:bg-ink hover:text-white transition-all shadow-sm"
                      >
                        <ChevronRight size={28} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('records'); }}
                      className="flex items-center justify-center gap-4 py-5 bg-gray-50 rounded-2xl font-bold text-ink hover:bg-accent hover:text-white transition-all text-[11px] uppercase tracking-widest shadow-sm"
                    >
                      <BookOpen size={18} />
                      Records
                    </button>
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('finance'); }}
                      className="flex items-center justify-center gap-4 py-5 bg-gray-50 rounded-2xl font-bold text-ink hover:bg-accent hover:text-white transition-all text-[11px] uppercase tracking-widest shadow-sm"
                    >
                      <Wallet size={18} />
                      Finance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'records':
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) { setView('schools'); return null; }
        return (
          <div className="max-w-6xl mx-auto py-12 px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-4xl font-serif italic text-ink tracking-tight mb-2"
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

            <div className="bg-white rounded-[2.5rem] premium-shadow border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Student & Details</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Category</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Added By</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Paid</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Balance</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.filter(r => r.type === recordTab).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-20">
                            <Filter size={64} strokeWidth={1} />
                            <p className="font-serif italic text-xl">No records found for this category</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.filter(r => r.type === recordTab).map((record, idx) => (
                        <motion.tr 
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent font-bold text-xs">
                                {record.studentName.charAt(0)}
                              </div>
                              <span className="font-semibold text-ink text-sm">{record.studentName}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-medium text-muted">{record.category}</td>
                          <td className="px-8 py-6 text-sm font-medium text-muted">{record.addedBy}</td>
                          <td className="px-8 py-6 font-mono font-bold text-green-600 text-sm">₦{record.paid.toLocaleString()}</td>
                          <td className="px-8 py-6 font-mono font-bold text-red-600 text-sm">₦{record.balance.toLocaleString()}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              {record.creatorUid === user?.uid && (
                                <>
                                  <button 
                                    onClick={() => handleEditRecord(record)}
                                    className="p-2 text-muted hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                                    title="Edit Record"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete Record"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                              <button className="p-2 text-muted hover:text-ink hover:bg-gray-50 rounded-xl transition-all"><MoreHorizontal size={18} /></button>
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
      case 'finance':
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) { setView('schools'); return null; }
        return (
          <div className="max-w-6xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-serif italic text-ink tracking-tight mb-2"
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

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-ink rounded-[3rem] p-12 text-white shadow-2xl shadow-ink/20 mb-12 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em] mb-4">Institution Balance</p>
                <h3 className="text-7xl font-mono font-medium tracking-tighter mb-8">₦{finance?.institutionBalance.toLocaleString() || '0'}</h3>
                <div className="flex items-center gap-3 text-white/60 text-[10px] font-bold uppercase tracking-widest bg-white/5 w-fit px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10">
                  <ShieldCheck size={14} className="text-green-400" />
                  Verified & Encrypted
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                <Wallet size={400} strokeWidth={1} />
              </div>
              <div className="absolute top-0 right-0 p-12">
                <div className="h-16 w-16 rounded-full border border-white/10 flex items-center justify-center">
                  <ArrowUpRight size={32} className="text-white/20" />
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-10 rounded-[2.5rem] premium-shadow border border-gray-100"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-ink">
                      <CreditCard size={24} />
                    </div>
                    <h4 className="font-serif italic text-xl text-ink">Bank Details</h4>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Bank Name</p>
                      <p className="font-bold text-ink text-sm">{finance?.bankName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Account Number</p>
                      <p className="font-mono font-bold text-ink text-lg tracking-widest">{finance?.accountNumber || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Account Name</p>
                      <p className="font-bold text-ink text-sm">{finance?.accountName || '---'}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-2">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-10 rounded-[2.5rem] premium-shadow border border-gray-100 h-full"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h4 className="font-serif italic text-xl text-ink">Transaction History</h4>
                    <button className="p-3 bg-gray-50 rounded-xl text-muted hover:text-ink transition-all"><Filter size={18} /></button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-24 opacity-20">
                    <MessageSquare size={64} strokeWidth={1} />
                    <p className="font-serif italic text-xl mt-6">No transaction history found</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="flex flex-col h-full max-w-5xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12">
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
      case 'penalty':
        return (
          <div className="max-w-4xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12">
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
      case 'profile':
        if (!user) { setView('login'); return null; }
        return (
          <div className="max-w-4xl mx-auto py-12 px-8">
            <div className="flex flex-col mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-serif italic text-ink tracking-tight mb-2"
              >
                Institutional Profile
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted text-[11px] font-bold uppercase tracking-[0.3em]"
              >
                Personal Identity & Credentials
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[3rem] premium-shadow border border-gray-100 overflow-hidden"
            >
              <div className="h-48 bg-ink relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent"></div>
                <div className="absolute inset-0 overflow-hidden opacity-10">
                  <div className="absolute top-0 right-0 h-64 w-64 bg-white blur-3xl rounded-full -mr-32 -mt-32"></div>
                </div>
              </div>
              <div className="px-12 pb-12">
                <div className="relative -mt-20 mb-8">
                  <div className="h-40 w-40 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                    <div className="h-full w-full rounded-[2rem] bg-gray-50 flex items-center justify-center text-ink font-serif italic text-6xl overflow-hidden border border-gray-100">
                      {user?.photoURL ? <img src={user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : user?.displayName?.charAt(0)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <h3 className="text-4xl font-serif italic text-ink mb-2">{user?.displayName}</h3>
                    <p className="text-muted font-bold text-sm tracking-wide">{user?.email}</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-8 py-3.5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all">Edit Profile</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  {[
                    { label: 'Institutional Role', value: userDoc?.role || 'Student', icon: ShieldCheck },
                    { label: 'Identification ID', value: userDoc?.schoolId || 'EX-2024-001', icon: Fingerprint },
                    { label: 'Account Status', value: 'Verified', icon: BadgeCheck }
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-3 text-muted">
                        <item.icon size={16} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                      </div>
                      <p className="font-bold text-ink text-lg">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-16 pt-12 border-t border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle size={20} className="text-red-500" />
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-[0.3em]">Security Protocol</h4>
                  </div>
                  <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100/50">
                    <p className="text-sm text-red-900/60 mb-8 font-medium leading-relaxed max-w-2xl">
                      Account termination is an irreversible procedure. All institutional records, financial history, and community interactions associated with this identity will be permanently purged from the Exona mainframe.
                    </p>
                    <button 
                      onClick={() => {
                        setAuthError(null);
                        setIsDeleteModalOpen(true);
                      }}
                      className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-xs uppercase tracking-widest shadow-xl shadow-red-100"
                    >
                      Terminate Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
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
            <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-white/40 mb-12">Mastering Education</p>
            
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
              className="w-full max-w-2xl bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
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
              className="w-full max-w-lg bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
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
                  <input 
                    type="text" 
                    value={newRecord.category}
                    onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                    placeholder="e.g. JSS1, SS3"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                  />
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
                  disabled={!newRecord.studentName.trim()}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {editingRecord ? 'Update Record' : 'Synchronize Record'}
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
              className="w-full max-w-lg bg-white rounded-[3.5rem] premium-shadow p-12 border border-gray-100"
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
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Visual Identity URL</label>
                  <input 
                    type="text" 
                    value={newSchool.logo}
                    onChange={(e) => setNewSchool({...newSchool, logo: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name.trim()}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {editingSchool ? 'Synchronize Updates' : 'Authorize Registration'}
                </button>
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
              className="w-full max-w-lg bg-white rounded-[3.5rem] premium-shadow flex flex-col max-h-[85vh] border border-gray-100"
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
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside 
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            className="fixed lg:static inset-y-0 left-0 w-80 bg-white border-r border-gray-100 z-50 flex flex-col premium-shadow lg:shadow-none"
          >
            <div className="p-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-ink rounded-2xl flex items-center justify-center text-white font-serif italic text-2xl shadow-2xl shadow-ink/20">H</div>
                <div>
                  <h1 className="text-2xl font-serif italic text-ink tracking-tighter leading-none">Horizon</h1>
                  <p className="text-[9px] font-bold text-muted uppercase tracking-[0.4em] mt-1">Intelligence</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-12 pb-10">
              <div className="space-y-2">
                <p className="px-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">Horizon Network</p>
                <SidebarItem icon={LayoutGrid} label="Main Feed" active={view === 'feed'} onClick={() => { setView('feed'); setSidebarOpen(false); }} />
                <SidebarItem icon={GraduationCap} label="Institutions" active={view === 'schools' || (view === 'schools' && !selectedSchool)} onClick={() => { setView('schools'); setSidebarOpen(false); }} />
                <SidebarItem icon={Database} label="Data Records" active={view === 'records'} onClick={() => { setView('records'); setSidebarOpen(false); }} />
                <SidebarItem icon={Sparkles} label="Horizon AI" active={view === 'ai'} onClick={() => { setView('ai'); setSidebarOpen(false); }} />
              </div>

              <div className="space-y-2">
                <p className="px-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">Governance</p>
                {userDoc?.role === 'admin' && (
                  <SidebarItem icon={Shield} label="Admin Terminal" active={view === 'admin'} onClick={() => { setView('admin'); setSidebarOpen(false); }} />
                )}
                <SidebarItem icon={CreditCard} label="Finance Hub" active={view === 'finance'} onClick={() => { setView('finance'); setSidebarOpen(false); }} />
                <SidebarItem icon={Fingerprint} label="Security Board" active={view === 'penalty'} onClick={() => { setView('penalty'); setSidebarOpen(false); }} />
              </div>

              <div className="space-y-2">
                <p className="px-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">Identity</p>
                <SidebarItem icon={UserIcon} label="My Profile" active={view === 'profile'} onClick={() => { if (user) setView('profile'); else setView('login'); setSidebarOpen(false); }} />
                <SidebarItem icon={Settings} label="System Settings" />
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-gray-50/30">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <img src={user?.photoURL || ''} className="h-10 w-10 rounded-xl object-cover shadow-sm border border-gray-100" />
                    <div className="overflow-hidden">
                      <p className="text-[13px] font-bold text-ink truncate tracking-tight">{userDoc?.name}</p>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest truncate">{userDoc?.role}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all duration-300 border border-transparent hover:border-red-100">
                    <LogOut size={16} /> 
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Terminate Session</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => { setView('login'); setSidebarOpen(false); }} className="w-full flex items-center justify-center gap-3 py-4 bg-ink text-white rounded-2xl font-bold transition-all duration-300 shadow-2xl shadow-ink/10">
                  <LogIn size={16} /> 
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Authorize Access</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-paper">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-10 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden h-12 w-12 bg-gray-50 text-ink rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90"><Menu size={24} /></button>
            <div className="relative hidden md:block group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search the network..." 
                className="pl-14 pr-8 py-4 bg-gray-50/50 border border-transparent rounded-[1.5rem] text-[14px] font-medium outline-none w-96 focus:ring-4 focus:ring-ink/5 focus:bg-white focus:border-gray-100 transition-all placeholder:text-gray-300" 
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            {user ? (
              <>
                <button className="h-12 w-12 bg-gray-50 text-muted hover:text-ink rounded-2xl flex items-center justify-center relative transition-all border border-gray-100 active:scale-90">
                  <Bell size={22} />
                  <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-accent rounded-full border-2 border-white"></span>
                </button>
                <button 
                  onClick={() => setView('profile')}
                  className="flex items-center gap-4 p-1.5 pr-6 bg-gray-50 rounded-[1.5rem] hover:bg-gray-100 transition-all border border-gray-100 group active:scale-[0.98]"
                >
                  <div className="h-11 w-11 rounded-2xl bg-accent/5 flex items-center justify-center text-accent font-bold border border-accent/10 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                    {user?.photoURL ? <img src={user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : user?.displayName?.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[13px] font-bold text-ink leading-none">{userDoc?.name?.split(' ')[0]}</p>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1.5">Operator</p>
                  </div>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="px-7 py-2.5 bg-ink text-white rounded-2xl font-bold hover:bg-ink/90 transition-all text-[13px] shadow-xl shadow-ink/10"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-paper">
          {renderView()}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden bg-white/80 backdrop-blur-xl border-t border-gray-100 px-8 py-6 flex items-center justify-between pb-10 z-40">
          <button onClick={() => setView('feed')} className={`p-4 rounded-2xl transition-all relative ${view === 'feed' ? 'text-accent' : 'text-muted hover:bg-gray-50'}`}>
            <LayoutGrid size={24} strokeWidth={view === 'feed' ? 2.5 : 2} />
            {view === 'feed' && <motion.div layoutId="mobile-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 bg-accent rounded-full" />}
          </button>
          <button onClick={() => setView('schools')} className={`p-4 rounded-2xl transition-all relative ${view === 'schools' ? 'text-accent' : 'text-muted hover:bg-gray-50'}`}>
            <GraduationCap size={24} strokeWidth={view === 'schools' ? 2.5 : 2} />
            {view === 'schools' && <motion.div layoutId="mobile-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 bg-accent rounded-full" />}
          </button>
          <button 
            onClick={() => {
              if (!user) { setView('login'); return; }
              if (view === 'feed') openNewPostModal();
              else if (view === 'records') setIsRecordModalOpen(true);
              else openNewPostModal();
            }} 
            className="h-16 w-16 bg-ink text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-ink/20 active:scale-90 transition-all"
          >
            <Plus size={28} />
          </button>
          <button onClick={() => setView('ai')} className={`p-4 rounded-2xl transition-all relative ${view === 'ai' ? 'text-accent' : 'text-muted hover:bg-gray-50'}`}>
            <Sparkles size={24} strokeWidth={view === 'ai' ? 2.5 : 2} />
            {view === 'ai' && <motion.div layoutId="mobile-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 bg-accent rounded-full" />}
          </button>
          <button onClick={() => user ? setView('profile') : setView('login')} className={`p-4 rounded-2xl transition-all relative ${view === 'profile' ? 'text-accent' : 'text-muted hover:bg-gray-50'}`}>
            <UserIcon size={24} strokeWidth={view === 'profile' ? 2.5 : 2} />
            {view === 'profile' && <motion.div layoutId="mobile-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 bg-accent rounded-full" />}
          </button>
        </div>
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

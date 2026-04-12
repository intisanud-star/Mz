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
  ClipboardList, CheckCircle2, XCircle, Compass, Check, Camera, Circle, Phone,
  Calculator, FileBarChart, IdCard, Gift
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
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, where, getDocs, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';

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
  followers?: string[];
  pendingFollowers?: string[];
  replyPermission?: 'everyone' | 'followers' | 'none';
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
  followers?: string[];
  pendingFollowers?: string[];
  replyPermission?: 'everyone' | 'followers' | 'none';
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
  invitesCount?: number;
  referredBy?: string | null;
  isLifetimeFree?: boolean;
  hasCreatedInstitution?: boolean;
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md bg-white p-12 rounded-[3rem] border border-gray-100"
          >
            <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-ink mb-4 tracking-tight">System Interruption</h1>
            <p className="text-muted text-sm font-medium mb-8 leading-relaxed">An unexpected error has occurred within the Exona core. Our engineers have been notified.</p>
            <pre className="text-[10px] font-mono bg-white p-6 rounded-2xl overflow-auto max-h-40 text-left mb-10 text-muted border border-gray-100">{this.state.error?.message}</pre>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all active:scale-[0.98]"
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

// --- HELPERS ---
const getLabels = (type?: 'school' | 'place') => {
  if (type === 'place') {
    return {
      student: 'Member',
      students: 'Members',
      teacher: 'Staff',
      teachers: 'Staff',
      books: 'Services',
      uniforms: 'Products',
      general: 'General',
      school: 'Place',
      attendance: 'Presence Log',
      system: 'Management System',
      educationalLevel: 'Category'
    };
  }
  return {
    student: 'Student',
    students: 'Students',
    teacher: 'Teacher',
    teachers: 'Teachers',
    books: 'Books',
    uniforms: 'Uniforms',
    general: 'General',
    school: 'School',
    attendance: 'Attendance',
    system: 'School Management System',
    educationalLevel: 'Class/Level'
  };
};

// --- COMPONENTS ---

  const NavIcon = ({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) => (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all relative group ${active ? 'text-ink' : 'text-muted hover:text-ink hover:bg-white border border-transparent hover:border-gray-100'}`}
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
  <motion.button 
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
      active 
        ? 'bg-accent/5 text-accent' 
        : 'text-muted hover:bg-white border border-transparent hover:border-gray-100 hover:text-ink'
    }`}
  >
    <div className="flex items-center gap-4 relative z-10">
      <Icon size={20} className={`${active ? 'text-accent' : 'text-muted group-hover:text-ink'} transition-colors duration-300`} />
      <span className={`text-[14px] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-accent' : 'text-muted group-hover:text-ink'}`}>{label}</span>
    </div>
    {badge && (
      <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full relative z-10">
        {badge}
      </span>
    )}
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
      />
    )}
  </motion.button>
);

const WordLayout = ({ title, subtitle, icon: Icon, children, toolbar }: { title: string, subtitle: string, icon: any, children: React.ReactNode, toolbar?: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Ribbon Header */}
      <div className="bg-white border-b border-gray-200 z-20">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-8 w-8 bg-ink rounded-lg flex items-center justify-center text-white shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink leading-none truncate font-display">{title}</h2>
              <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <div className="hidden sm:flex h-6 w-6 rounded-full bg-white border border-gray-100 items-center justify-center text-[10px] font-bold text-muted">?</div>
            <div className="h-6 w-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-muted">_</div>
            <div className="h-6 w-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-muted">□</div>
            <div className="h-6 w-6 rounded-full bg-white border border-red-100 flex items-center justify-center text-[10px] font-bold text-red-400">×</div>
          </div>
        </div>
        {/* Toolbar / Ribbon Tabs */}
        <div className="px-4 md:px-6 py-2 flex flex-wrap items-center gap-2 sm:gap-4 bg-white">
          {toolbar}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-y-auto p-0 md:p-8 lg:p-12 flex justify-center custom-scrollbar">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full md:max-w-[1000px] bg-white min-h-screen md:min-h-[1200px] p-4 sm:p-8 md:p-16 lg:p-20 rounded-none md:rounded-sm border-x-0 md:border-x border-gray-200 relative mb-0 md:mb-20"
        >
          {/* Page Header Decor */}
          <div className="absolute top-0 left-0 w-full h-1 bg-ink/5" />
          {children}
        </motion.div>
      </div>
    </div>
  );
};

const FeedPost = ({ post, onUserClick, onLike, onComment, onReshare, onForward, onEdit, onDelete, currentUserId, canManage, canReply = true }: any) => {
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = post.likedBy?.includes(currentUserId);
  const isOwnPost = post.authorUid === currentUserId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`flex flex-col mb-4 px-4 ${isOwnPost ? 'items-end' : 'items-start'}`}
    >
      {!isOwnPost && (
        <div className="flex items-center gap-1 ml-2 mb-1">
          <span className="text-[11px] font-bold text-accent uppercase tracking-widest">
            {post.authorName}
          </span>
        </div>
      )}
      
      <div className="flex items-end gap-2 max-w-[85%]">
        {!isOwnPost && (
          <button 
            onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
            className="shrink-0 mb-1"
          >
            {post.authorPhoto ? (
              <img src={post.authorPhoto} className="h-8 w-8 rounded-lg object-cover shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-accent font-bold text-[10px] shadow-sm">
                {post.authorName?.charAt(0)}
              </div>
            )}
          </button>
        )}

        <div 
          className={`relative p-4 rounded-[1.5rem] border border-gray-100 shadow-sm ${
            isOwnPost 
              ? 'bg-white rounded-tr-none text-ink' 
              : 'bg-white rounded-tl-none text-ink'
          }`}
        >
          {post.mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden bg-white border border-gray-100 -mx-1 -mt-1">
              {post.mediaType === 'image' ? (
                <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-[300px]" referrerPolicy="no-referrer" />
              ) : (
                <video src={post.mediaUrl} controls className="w-full h-auto max-h-[300px]" />
              )}
            </div>
          )}

          {post.resharedFrom && (
            <div className="mb-2 p-2 bg-paper border border-gray-100 rounded-lg border-l-4 border-accent">
              <p className="text-[11px] font-bold text-accent mb-0.5">{post.resharedFrom.authorName}</p>
              <p className="text-[12px] text-muted leading-tight line-clamp-2">{post.resharedFrom.content}</p>
            </div>
          )}

          <p className="text-[14px] leading-relaxed whitespace-pre-wrap pb-4 font-bold">
            {post.content}
          </p>

          <div className="absolute bottom-1 right-2 flex items-center gap-1">
            <span className="text-[10px] text-muted/70 font-medium">
              {formatTime(post.timestamp)}
            </span>
            {isOwnPost && (
              <div className="flex text-accent/20">
                {/* Ticks removed as per user request */}
              </div>
            )}
          </div>

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-muted hover:text-ink p-1 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100"
            >
              <MoreHorizontal size={14} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-20">
                {(isOwnPost || currentUserId === post.schoolId || canManage) && (
                  <>
                    <button 
                      onClick={() => { onEdit?.(post); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-[11px] font-bold text-ink hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button 
                      onClick={() => { onDelete?.(post); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-[11px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-2 px-4">
        <button 
          onClick={() => onLike?.(post.id, post.likedBy || [])}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${isLiked ? 'text-accent scale-110' : 'text-muted hover:text-accent'}`}
        >
          <Heart size={14} className={isLiked ? 'fill-accent' : ''} />
          {post.likes > 0 && <span>{post.likes}</span>}
        </button>
        <button 
          onClick={() => canReply && onComment?.(post)}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${canReply ? 'text-muted hover:text-accent' : 'text-muted/30 cursor-not-allowed'}`}
          disabled={!canReply}
        >
          <MessageCircle size={14} />
          {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
        </button>
        <button 
          onClick={() => onForward?.(post)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted hover:text-accent transition-all"
        >
          <Send size={14} />
        </button>
      </div>
    </motion.div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick} 
    className="flex flex-col items-center justify-center flex-1 h-full gap-1 group relative"
  >
    <div className={`transition-all duration-300 ${active ? 'text-accent scale-110' : 'text-muted group-hover:text-ink'}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-accent' : 'text-muted group-hover:text-ink'}`}>{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-active"
        className="absolute bottom-0 w-1 h-1 bg-accent rounded-full"
      />
    )}
  </button>
);

// --- MAIN DASHBOARD ---
function ExonaApp() {
  const [feedTab, setFeedTab] = useState<'institutions' | 'broadcasts'>('institutions');
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'ai' | 'penalty' | 'profile' | 'user-profile' | 'admin' | 'school-feed' | 'attendance'>('splash');
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
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState({ displayName: '', bio: '' });

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({ 
    name: '', 
    description: '', 
    logo: '', 
    type: 'school' as 'school' | 'place',
    category: 'School' as Place['category'],
    educationalLevels: [] as string[],
    replyPermission: 'everyone' as 'everyone' | 'followers' | 'none'
  });
  const [newRecord, setNewRecord] = useState({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private' as Record['visibility'], sharedWith: '' });

  const labels = getLabels(selectedSchool?.type);

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingInstitutionId, setUploadingInstitutionId] = useState<string | null>(null);
  const [pendingFollowerNames, setPendingFollowerNames] = useState<{[uid: string]: string}>({});
  const [schoolFeedTab, setSchoolFeedTab] = useState<'feed' | 'manage'>('feed');

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('exona_ref', refCode);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const managedInstitutions = [...schools, ...places].filter(s => s.creatorUid === user?.uid);

  useEffect(() => {
    const pendingUids = managedInstitutions.flatMap(s => s.pendingFollowers || []);
    const uniqueUids = [...new Set(pendingUids)].filter(uid => !pendingFollowerNames[uid]);
    
    uniqueUids.forEach(async (uid) => {
      try {
        const userSnap = await getDoc(doc(db, 'users', uid as string));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPendingFollowerNames(prev => ({ ...prev, [uid as string]: data.displayName || 'Anonymous' }));
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    });
  }, [managedInstitutions]);

  const handleEditSchool = (school: School | Place) => {
    setEditingSchool(school as School);
    setNewSchool({
      name: school.name,
      description: school.description,
      logo: school.logo,
      type: school.type,
      educationalLevels: (school as School).educationalLevels || [],
      category: (school as Place).category || 'Other'
    });
    setIsSchoolModalOpen(true);
  };

  const checkReferralQualification = async (currentUserDoc: UserDoc) => {
    if (currentUserDoc.hasCreatedInstitution || !currentUserDoc.referredBy) return;

    try {
      const referrerRef = doc(db, 'users', currentUserDoc.referredBy);
      const referrerSnap = await getDoc(referrerRef);
      
      if (referrerSnap.exists()) {
        const referrerData = referrerSnap.data() as UserDoc;
        const newInvitesCount = (referrerData.invitesCount || 0) + 1;
        
        await setDoc(referrerRef, { 
          invitesCount: newInvitesCount,
          isLifetimeFree: newInvitesCount >= 3
        }, { merge: true });
        console.log('Referrer invitesCount updated:', newInvitesCount);
      }

      // Mark current user as having created an institution
      await setDoc(doc(db, 'users', currentUserDoc.uid), { 
        hasCreatedInstitution: true 
      }, { merge: true });
      console.log('Current user marked as institution creator');
    } catch (error) {
      console.error('Error in checkReferralQualification:', error);
    }
  };

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
      showNotification('Profile picture updated');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      showNotification('Failed to update picture', 'error');
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

  const handleUpdateReplyPermission = async (schoolId: string, permission: 'everyone' | 'followers' | 'none') => {
    try {
      const collectionName = selectedSchool?.type === 'school' ? 'schools' : 'places';
      await updateDoc(doc(db, collectionName, schoolId), {
        replyPermission: permission
      });
      showNotification('Reply permissions updated');
    } catch (error) {
      showNotification('Failed to update permissions', 'error');
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
        const fileRef = ref(storage, `${newSchool.type === 'school' ? 'schools' : 'places'}/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, (error) => {
            console.error('Upload failed:', error);
            reject(error);
          }, () => {
            resolve(null);
          });
        });
        logoUrl = await getDownloadURL(fileRef);
      }

      const collectionName = newSchool.type === 'school' ? 'schools' : 'places';
      const batch = writeBatch(db);
      
      if (editingSchool) {
        console.log('Updating existing institution:', editingSchool.id);
        batch.set(doc(db, collectionName, editingSchool.id), {
          ...editingSchool,
          name: newSchool.name.trim(),
          description: newSchool.description.trim(),
          logo: logoUrl,
          type: newSchool.type,
          category: newSchool.type === 'place' ? newSchool.category : null,
          educationalLevels: newSchool.type === 'school' ? newSchool.educationalLevels : [],
          replyPermission: newSchool.replyPermission || 'everyone'
        }, { merge: true });
        console.log('Institution update queued');
      } else {
        console.log('Creating new institution...');
        const slug = newSchool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const schoolId = `${slug}-${Math.random().toString(36).substr(2, 5)}`;
        
        const institutionData = {
          id: schoolId,
          name: newSchool.name.trim(),
          description: newSchool.description.trim() || `Space for ${newSchool.name}`,
          logo: logoUrl,
          type: newSchool.type,
          category: newSchool.type === 'place' ? newSchool.category : null,
          educationalLevels: newSchool.type === 'school' ? (newSchool.educationalLevels || []) : [],
          creatorUid: user.uid,
          followers: [user.uid],
          replyPermission: newSchool.replyPermission || 'everyone',
          timestamp: serverTimestamp()
        };

        batch.set(doc(db, collectionName, schoolId), institutionData);
        
        // Initialize finance
        batch.set(doc(db, 'finance', schoolId), {
          schoolId: schoolId,
          placeId: schoolId, // For compatibility
          institutionBalance: 0,
          bankName: 'Exona Trust Bank',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newSchool.name} General`
        });
        
        // Update user document
        batch.set(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          hasCreatedInstitution: true
        }, { merge: true });

        console.log('Institution creation queued:', schoolId);
        
        // Set as selected and view (will be applied after commit)
        setSelectedSchool(institutionData as any);
        setView('school-feed');
      }

      await batch.commit();
      console.log('Batch committed successfully');
      showNotification(editingSchool ? 'Institution updated successfully' : 'Institution authorized successfully');

      // Check for referral qualification after commit
      if (userDoc) {
        await checkReferralQualification(userDoc);
      }

      setNewSchool({ name: '', description: '', logo: '', type: 'school', category: 'School', educationalLevels: [] });
      setEditingSchool(null);
      setIsSchoolModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error in handleCreateSchool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Authorization failed: ${errorMessage}`, 'error');
      handleFirestoreError(error, OperationType.CREATE, 'institutions');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSchool = async () => {
    if (!user || !schoolToDelete) return;
    setIsUploading(true);
    try {
      // Check both collections
      await Promise.all([
        deleteDoc(doc(db, 'schools', schoolToDelete)),
        deleteDoc(doc(db, 'places', schoolToDelete))
      ]);
      showNotification('Institution deleted');
      setIsDeleteSchoolModalOpen(false);
      setSchoolToDelete(null);
    } catch (error) {
      showNotification('Failed to delete institution', 'error');
      handleFirestoreError(error, OperationType.DELETE, `institutions/${schoolToDelete}`);
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
      showNotification(editingRecord ? 'Record updated' : 'Record synchronized');
      setNewRecord({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private', sharedWith: '' });
      setIsRecordModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Record operation failed', error);
      showNotification('Record operation failed', 'error');
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
      showNotification('Record deleted');
      setIsDeleteRecordModalOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      showNotification('Failed to delete record', 'error');
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

      const isOfficial = canManageInstitution(view === 'school-feed' ? selectedSchool : null);
      const schoolId = (view === 'school-feed' && selectedSchool) ? selectedSchool.id : 'horizon';
      
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
          authorName: isOfficial && selectedSchool ? selectedSchool.name : (user.displayName || 'Anonymous'),
          authorPhoto: isOfficial && selectedSchool ? selectedSchool.logo : (user.photoURL || ''),
          content: newPostContent.trim(),
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          likes: 0,
          likedBy: [],
          commentsCount: 0,
          reshares: 0,
          timestamp: serverTimestamp(),
          isOfficial,
          schoolId
        });
      }
      console.log('Post operation successful');
      showNotification(editingPost ? 'Broadcast updated' : 'Broadcast transmitted');
      setNewPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setIsPostModalOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Post operation failed', error);
      showNotification('Transmission failed. Please check connection.', 'error');
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
      showNotification('Broadcast deleted');
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
      showNotification(isLiked ? 'Unliked' : 'Liked');
    } catch (error) {
      showNotification('Failed to update like', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleEditProfile = () => {
    setEditingProfile({
      displayName: user?.displayName || '',
      bio: userDoc?.bio || ''
    });
    setIsProfileModalOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: editingProfile.displayName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: editingProfile.displayName,
        bio: editingProfile.bio
      }, { merge: true });
      showNotification('Profile updated');
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile', 'error');
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
      showNotification('Broadcast reshared');
    } catch (error) {
      showNotification('Failed to reshare', 'error');
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
      showNotification('Comment added');
      setCommentText('');
    } catch (error) {
      showNotification('Failed to add comment', 'error');
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
          const storedRef = localStorage.getItem('exona_ref');
          await ensureUserDocument(currentUser, storedRef);
          
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
      } else {
        setView('feed');
      }
    }
  }, [splashDone, loading, user, userDoc, view]);

  // Data listeners
  useEffect(() => {
    // Public data listeners (no user check)
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'schools');
      }
    });

    const unsubPlaces = onSnapshot(collection(db, 'places'), (snap) => {
      setPlaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Place)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'places');
      }
    });

    let unsubPosts = () => {};
    if (user && userDoc) {
      if (userDoc.role === 'admin') {
        unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('timestamp', 'desc')), (snap) => {
          setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        }, (error) => {
          if (!error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'posts');
          }
        });
      } else {
        // Personalized Feed for regular users
        const following = userDoc.following || [];
        const managedIds = [
          ...schools.filter(s => s.creatorUid === user.uid).map(s => s.id),
          ...places.filter(p => p.creatorUid === user.uid).map(p => p.id)
        ];
        const relevantIds = [...new Set([user.uid, ...following, ...managedIds, selectedSchool?.id].filter(Boolean))];
        
        // We need to fetch:
        // 1. Posts where authorUid is in relevantIds (covers own posts and followed users)
        // 2. Posts where schoolId is in relevantIds (covers followed institutions)
        
        // Firestore 'in' limit is 30. If following > 29, we'd need to chunk.
        // For now, we'll use the first 30 relevant IDs.
        const limitedIds = relevantIds.slice(0, 30);
        
        const qAuthor = query(collection(db, 'posts'), where('authorUid', 'in', limitedIds), orderBy('timestamp', 'desc'));
        const qSchool = query(collection(db, 'posts'), where('schoolId', 'in', limitedIds), orderBy('timestamp', 'desc'));
        
        const unsubAuthor = onSnapshot(qAuthor, (snap) => {
          const authorPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          setPosts(prev => {
            const otherPosts = prev.filter(p => !authorPosts.find(ap => ap.id === p.id));
            return [...otherPosts, ...authorPosts].sort((a, b) => {
              const tA = a.timestamp?.toMillis?.() || 0;
              const tB = b.timestamp?.toMillis?.() || 0;
              return tB - tA;
            });
          });
        }, (error) => {
          if (!error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'posts (author)');
          }
        });

        const unsubSchool = onSnapshot(qSchool, (snap) => {
          const schoolPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          setPosts(prev => {
            const otherPosts = prev.filter(p => !schoolPosts.find(sp => sp.id === p.id));
            return [...otherPosts, ...schoolPosts].sort((a, b) => {
              const tA = a.timestamp?.toMillis?.() || 0;
              const tB = b.timestamp?.toMillis?.() || 0;
              return tB - tA;
            });
          });
        }, (error) => {
          if (!error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'posts (school)');
          }
        });

        unsubPosts = () => { unsubAuthor(); unsubSchool(); };
      }
    } else {
      // Guest view: No posts or only public posts if we had a public flag
      setPosts([]);
    }

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

    return () => { unsubSchools(); unsubPlaces(); unsubPosts(); unsubAllRecords(); unsubAllFinance(); };
  }, [user, userDoc]);

  useEffect(() => {
    if (!selectedSchool) return;
    
    const q = query(collection(db, 'studentRecords'), where('schoolId', '==', selectedSchool.id));
    const unsubRecords = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
    }, (error) => {
      console.error(`Error fetching ${labels.student.toLowerCase()} records:`, error);
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
      setAuthError('Please enter your name, email, and a password.');
      return;
    }
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
    } catch (e: any) {
      console.error('Sign Up Error:', e);
      if (e.code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Try signing in instead.');
      } else if (e.code === 'auth/weak-password') {
        setAuthError('Your password is too weak. Please use at least 6 characters.');
      } else if (e.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError('Something went wrong. Please try again.');
      }
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      console.error('Sign In Error:', e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setAuthError('Incorrect email or password. Please try again.');
      } else if (e.code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please try again later.');
      } else {
        setAuthError('Failed to sign in. Please check your connection.');
      }
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
      
      showNotification('Account terminated');
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setView('login');
    } catch (e: any) {
      console.error('Delete Account Error:', e);
      showNotification('Termination failed', 'error');
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
      showNotification('Logged out successfully');
    } catch (e) { 
      console.error('Logout Error:', e);
      showNotification('Logout failed', 'error');
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
      showNotification('Following user');
    } catch (error) {
      showNotification('Failed to follow user', 'error');
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
      showNotification('Unfollowed user');
    } catch (error) {
      showNotification('Failed to unfollow user', 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const canManageInstitution = (school: School | Place | null) => {
    if (!user || !userDoc) return false;
    if (userDoc.role === 'admin') return true;
    if (!school) return false;
    if (school.creatorUid === user.uid) return true;
    return false;
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
      
      showNotification('Follow request sent');
    } catch (error) {
      console.error('Error following institution:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleUnfollowInstitution = async (school: School | Place, targetUid?: string) => {
    if (!user || !userDoc) return;
    const uidToRemove = targetUid || user.uid;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      const userRef = doc(db, 'users', uidToRemove);
      
      await Promise.all([
        setDoc(schoolRef, { 
          followers: arrayRemove(uidToRemove),
          pendingFollowers: arrayRemove(uidToRemove)
        }, { merge: true }),
        setDoc(userRef, { 
          following: arrayRemove(school.id) 
        }, { merge: true })
      ]);
      showNotification('Unfollowed successfully');
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
      showNotification('Member approved');
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
      showNotification('Request rejected');
    } catch (error) {
      console.error('Error rejecting follower:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const canUserReply = (post: Post, school: any) => {
    if (!user) return false;
    if (canManageInstitution(school) || userDoc?.role === 'admin') return true;
    const permission = school?.replyPermission || 'everyone';
    if (permission === 'everyone') return true;
    if (permission === 'followers') return school?.followers?.includes(user.uid);
    return false;
  };

  const canAccessInstitutionData = (school: School | Place | null) => {
    if (!user || !school) return false;
    if (canManageInstitution(school) || userDoc?.role === 'admin') return true;
    return school.followers?.includes(user.uid);
  };

  const handleNavigateToData = (targetView: string) => {
    if (!selectedSchool) {
      showNotification('Please select an institution first', 'error');
      setView('schools');
      setSidebarOpen(false);
      return;
    }
    if (canAccessInstitutionData(selectedSchool)) {
      setView(targetView as any);
      setSidebarOpen(false);
    } else {
      showNotification('Access denied. You must be an approved member.', 'error');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'admin': {
        if (userDoc?.role !== 'admin') { setView('feed'); return null; }
        const schoolCount = schools.length;
        const placeCount = places.length;
        const totalMembers = allRecords.length;

        return (
          <div className="w-full max-w-[1600px] mx-auto py-12 px-8 pb-32 lg:pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-bold text-ink tracking-tight mb-2 font-display"
                >
                  Admin Terminal
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.4em]"
                >
                  System Statistics & Oversight
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {[
                { label: 'Total Schools', value: schoolCount, color: 'accent' },
                { label: 'Total Places', value: placeCount, color: 'purple-600' },
                { label: 'Total Members', value: totalMembers, color: 'green-600' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-gray-100 group hover:border-accent/20 transition-all"
                >
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{stat.label}</p>
                  <h3 className={`text-3xl font-bold font-display text-${stat.color}`}>{stat.value}</h3>
                  <div className="mt-8 h-1.5 w-full bg-white border border-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className={`h-full bg-ink`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden"
              >
                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                  <h4 className="font-extrabold text-2xl text-ink tracking-tight">Institution Directory</h4>
                  <div className="h-12 w-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-muted">
                    <LayoutGrid size={20} />
                  </div>
                </div>
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institution</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Type</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Member Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...schools, ...places].map(school => {
                        const memberCount = allRecords.filter(r => r.schoolId === school.id).length;
                        return (
                          <tr key={school.id} className="hover:bg-white transition-colors group border-b border-gray-100">
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center">
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
                            <td className="px-10 py-8">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${school.type === 'school' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                {school.type}
                              </span>
                            </td>
                            <td className="px-10 py-8 font-mono font-bold text-ink text-sm">{memberCount} Members</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Admin Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-50">
                  {[...schools, ...places].map(school => {
                    const memberCount = allRecords.filter(r => r.schoolId === school.id).length;
                    return (
                      <div key={school.id} className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-12 w-12 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                            {school.logo ? (
                              <img src={school.logo} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-muted text-[10px] font-bold">{school.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-ink text-sm truncate">{school.name}</p>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest">{school.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Members</p>
                            <p className="font-mono font-bold text-ink text-sm">{memberCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        );
      }
      case 'feed': {
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                <button 
                  onClick={() => setFeedTab('institutions')}
                  className={`px-6 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${feedTab === 'institutions' ? 'bg-ink text-white shadow-lg' : 'text-muted hover:bg-white'}`}
                >
                  Institutions
                </button>
                <button 
                  onClick={() => setFeedTab('broadcasts')}
                  className={`px-6 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${feedTab === 'broadcasts' ? 'bg-ink text-white shadow-lg' : 'text-muted hover:bg-white'}`}
                >
                  Broadcasts
                </button>
              </div>
              {user && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-12 w-12 bg-accent text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>

            {feedTab === 'institutions' ? (
              <>
                <div className="relative mb-8 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search institutions..." 
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-2 focus:ring-accent/5 focus:border-accent/20 outline-none transition-all text-ink font-bold placeholder:text-gray-400 shadow-sm" 
                  />
                </div>

                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'school', 'place'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSchoolFilter(f as any)}
                      className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                        schoolFilter === f 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'bg-white text-muted border border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'school' ? 'Schools' : 'Places'}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-gray-100">
                  {[...schools, ...places]
                    .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                    .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                    .filter(s => {
                      // If searching, show all matching
                      if (schoolSearch.trim() !== '') return true;
                      // Admins see all
                      if (userDoc?.role === 'admin') return true;
                      // Otherwise only show followed or created
                      return s.followers?.includes(user?.uid || '') || 
                             s.creatorUid === user?.uid;
                    })
                    .map(school => {
                      const latestAnnouncement = posts.find(p => p.schoolId === school.id && p.authorUid === school.creatorUid);
                      return (
                        <div 
                          key={school.id}
                          className="py-6 border-b border-gray-50 group"
                        >
                          <div 
                            className="cursor-pointer mb-4 flex items-start gap-3"
                            onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                          >
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden border border-gray-100 bg-white shrink-0">
                              {school.logo ? (
                                <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-ink">{school.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[17px] font-extrabold text-ink mb-1">{school.name}</h4>
                              {latestAnnouncement ? (
                                <p className="text-[13px] text-muted line-clamp-2 leading-relaxed">
                                  {latestAnnouncement.content}
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted/40 font-bold uppercase tracking-widest">No announcements yet</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Institution Action Buttons */}
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button 
                              onClick={() => { setSelectedSchool(school); handleNavigateToData('records'); }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                            >
                              <ClipboardList size={12} className="group-hover/btn:scale-110 transition-transform" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">{getLabels(school.type).student} Records</span>
                            </button>
                            <button 
                              onClick={() => { setSelectedSchool(school); handleNavigateToData('attendance'); }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                            >
                              <Calendar size={12} className="group-hover/btn:scale-110 transition-transform" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Attendance</span>
                            </button>
                            <button 
                              onClick={() => { setSelectedSchool(school); handleNavigateToData('finance'); }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                            >
                              <Wallet size={12} className="group-hover/btn:scale-110 transition-transform" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Finance</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {posts.length === 0 ? (
                  <div className="py-20 text-center text-muted">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                      <MessageSquare size={32} className="opacity-20" />
                    </div>
                    <p className="text-sm font-bold">No broadcasts yet from followed institutions.</p>
                  </div>
                ) : (
                  posts.map(post => {
                    const school = schools.find(s => s.id === post.schoolId) || places.find(p => p.id === post.schoolId);
                    return (
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
                        canManage={userDoc?.role === 'admin'}
                        canReply={canUserReply(post, school)}
                      />
                    );
                  })
                )}
              </div>
            )}
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
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('schools')} className="p-2 hover:bg-white border border-transparent hover:border-gray-100 rounded-full transition-colors text-accent">
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-100 bg-white flex items-center justify-center">
                      {selectedSchool.logo ? (
                        <img src={selectedSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-muted text-[10px] font-bold">{selectedSchool.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-ink text-base leading-tight">{selectedSchool.name}</h2>
                      <p className="text-[10px] text-muted font-bold">Online</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user && !isManager && !isAdmin && (
                    <>
                      {isFollowing ? (
                        <button 
                          onClick={() => handleUnfollowInstitution(selectedSchool)}
                          className="px-4 py-2 bg-white border border-gray-100 text-muted rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          Unfollow
                        </button>
                      ) : selectedSchool.pendingFollowers?.includes(user.uid) ? (
                        <button 
                          disabled
                          className="px-4 py-2 bg-white border border-gray-100 text-muted/50 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed"
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
                  {isManager && (
                    <button 
                      onClick={() => openNewPostModal()}
                      className="h-10 w-10 bg-accent text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {isManager && (
                <div className="flex bg-white p-1 rounded-xl border border-gray-100">
                  <button 
                    onClick={() => setSchoolFeedTab('feed')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${schoolFeedTab === 'feed' ? 'bg-ink text-white' : 'text-muted hover:bg-gray-50'}`}
                  >
                    Feed
                  </button>
                  <button 
                    onClick={() => setSchoolFeedTab('manage')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${schoolFeedTab === 'manage' ? 'bg-ink text-white' : 'text-muted hover:bg-gray-50'}`}
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>

            {schoolFeedTab === 'feed' && isManager && (
              <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl overflow-hidden bg-accent/5 flex items-center justify-center text-accent font-bold border border-gray-100">
                    {selectedSchool.logo ? (
                      <img src={selectedSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-accent">{selectedSchool.name.charAt(0)}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => openNewPostModal()}
                    className="flex-1 text-left px-4 py-2.5 bg-gray-50 rounded-xl text-muted text-[13px] font-medium hover:bg-gray-100 transition-colors"
                  >
                    Post an official update...
                  </button>
                </div>
              </div>
            )}

            {!canSeeContent ? (
              <div className="py-20 text-center bg-white border border-gray-100 rounded-[2.5rem] px-8">
                <div className="h-20 w-20 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-center text-muted mx-auto mb-6">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Follow to see content</h3>
                <p className="text-sm text-muted font-bold mb-8">This institution's posts are only visible to approved followers.</p>
                {!selectedSchool.pendingFollowers?.includes(user?.uid || '') && (
                  <button 
                    onClick={() => handleFollowInstitution(selectedSchool)}
                    className="px-8 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 transition-all"
                  >
                    Request Access
                  </button>
                )}
              </div>
            ) : schoolFeedTab === 'manage' ? (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-extrabold text-ink">Pending Approvals</h3>
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {selectedSchool.pendingFollowers?.length || 0} Requests
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {(!selectedSchool.pendingFollowers || selectedSchool.pendingFollowers.length === 0) ? (
                      <div className="py-10 text-center opacity-30">
                        <Users size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold">No pending requests</p>
                      </div>
                    ) : (
                      selectedSchool.pendingFollowers.map(uid => (
                        <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100">
                              {pendingFollowerNames[uid]?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerNames[uid] || 'Loading...'}</p>
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Wants to follow</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleRejectFollower(selectedSchool, uid)}
                              className="h-10 w-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-red-50 transition-colors"
                            >
                              <X size={18} />
                            </button>
                            <button 
                              onClick={() => handleApproveFollower(selectedSchool, uid)}
                              className="h-10 w-10 bg-ink text-white rounded-xl flex items-center justify-center hover:bg-ink/90 transition-colors"
                            >
                              <Check size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-extrabold text-ink">Approved Members</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {(!selectedSchool.followers || selectedSchool.followers.length === 0) ? (
                      <div className="py-10 text-center opacity-30">
                        <Users size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold">No members yet</p>
                      </div>
                    ) : (
                      selectedSchool.followers.map(uid => (
                        <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100">
                              {pendingFollowerNames[uid]?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerNames[uid] || 'Loading...'}</p>
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Member</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleUnfollowInstitution(selectedSchool, uid)}
                            className="h-10 w-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-red-50 transition-colors"
                            title="Remove Member"
                          >
                            <UserMinus size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <h3 className="text-xl font-extrabold text-ink mb-8">Quick Management</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => handleNavigateToData('records')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Database size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Records</span>
                    </button>
                    <button 
                      onClick={() => handleNavigateToData('attendance')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Attendance</span>
                    </button>
                    <button 
                      onClick={() => handleNavigateToData('finance')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Wallet size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Finance</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <h3 className="text-xl font-extrabold text-ink mb-8">Institution Controls</h3>
                  
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Who can reply to posts</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['everyone', 'followers', 'none'] as const).map((perm) => (
                        <button
                          key={perm}
                          onClick={() => handleUpdateReplyPermission(selectedSchool.id, perm)}
                          className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            (selectedSchool.replyPermission || 'everyone') === perm
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:border-accent'
                          }`}
                        >
                          {perm}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleEditSchool(selectedSchool)}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-ink shadow-sm group-hover:scale-110 transition-transform">
                        <Edit2 size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Edit Details</span>
                    </button>
                    <button 
                      onClick={() => { setSchoolToDelete(selectedSchool.id); setIsDeleteSchoolModalOpen(true); }}
                      className="flex flex-col items-center gap-3 p-6 bg-red-50/30 rounded-2xl border border-transparent hover:border-red-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                        <Trash2 size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-600/70">Delete Space</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                      canManage={isManager || isAdmin}
                      canReply={canUserReply(post, selectedSchool)}
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
                  <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-full text-muted text-[11px] font-bold">exona.io</span>
                </div>
              </div>
              <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                {selectedUserProfile.photo ? (
                  <img src={selectedUserProfile.photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full bg-white border border-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
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
                  <div key={i} className="h-5 w-5 rounded-full border-2 border-white bg-white border border-gray-100" />
                ))}
              </div>
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
              {profilePosts.map(post => {
                const school = post.schoolId ? (schools.find(s => s.id === post.schoolId) || places.find(p => p.id === post.schoolId)) : null;
                return (
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
                    canReply={canUserReply(post, school)}
                  />
                );
              })}
            </div>
          </div>
        );
      }
      case 'schools': {
        const invitesCount = userDoc?.invitesCount || 0;
        const isQualified = userDoc?.isLifetimeFree || invitesCount >= 3;
        const inviteProgress = Math.min(invitesCount, 3);
        const myInstitutions = [...schools, ...places].filter(s => s.creatorUid === user?.uid);

        return (
          <div className="w-full max-w-xl mx-auto pb-32">
            <div className="flex items-center justify-between py-8 px-4">
              <h2 className="text-3xl font-bold text-ink tracking-tight font-display">Institutions</h2>
              {user && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-12 w-12 bg-accent text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>

            {/* WhatsApp Style Chat List */}
            <div className="bg-white">
              {myInstitutions.length > 0 && (
                <div className="py-4 px-4 border-b border-gray-100 bg-accent/5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[13px] font-bold text-accent uppercase tracking-widest">My Institutions</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {myInstitutions.map(school => (
                      <button 
                        key={school.id}
                        onClick={() => { setSelectedSchool(school); setView('school-feed'); setSchoolFeedTab('manage'); }}
                        className="flex-shrink-0 w-16 text-center group"
                      >
                        <div className="h-14 w-14 p-0.5 rounded-2xl border-2 border-accent flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-all overflow-hidden bg-white shadow-sm">
                          <div className="h-full w-full rounded-[0.85rem] overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                            {school.logo ? (
                              <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-lg font-bold text-gray-300">{school.name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] font-medium text-ink truncate w-full">{school.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Status (WhatsApp Style) */}
              <div className="py-4 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[13px] font-bold text-accent uppercase tracking-widest">Followed Institutions</h2>
                  <button onClick={() => setView('feed')} className="text-[11px] font-bold text-muted hover:text-accent transition-colors">View All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {[...schools, ...places]
                    .filter(s => s.followers?.includes(user?.uid || ''))
                    .slice(0, 8).map(school => (
                    <button 
                      key={school.id}
                      onClick={() => { setSelectedSchool(school); setView('school-feed'); setSchoolFeedTab('feed'); }}
                      className="flex-shrink-0 w-16 text-center group"
                    >
                      <div className="h-14 w-14 p-0.5 rounded-2xl border-2 border-accent flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-all overflow-hidden bg-white shadow-sm">
                        <div className="h-full w-full rounded-[0.85rem] overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                          {school.logo ? (
                            <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg font-bold text-gray-300">{school.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-medium text-ink truncate w-full">{school.name}</p>
                    </button>
                  ))}
                  {[...schools, ...places].filter(s => s.followers?.includes(user?.uid || '')).length === 0 && (
                    <p className="text-[11px] text-muted font-medium py-4">You haven't followed any institutions yet.</p>
                  )}
                </div>
              </div>

              {/* Referral Offer as a Pinned Chat */}
              <button 
                onClick={() => {
                  const vercelLink = `https://mz-rosy.vercel.app/?ref=${user?.uid || ''}`;
                  const inviteText = `Join Exona - The premium institution management system. Use my link to get started: ${vercelLink}`;
                  navigator.clipboard.writeText(inviteText);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 3000);
                }}
                className={`w-full p-4 transition-all text-left flex items-center gap-4 border-b border-gray-100 bg-white`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
                  isQualified ? 'bg-green-600 shadow-green-600/20' : 'bg-accent shadow-accent/20'
                }`}>
                  {isQualified ? <BadgeCheck size={24} /> : <Sparkles size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ink text-[15px]">
                      {isQualified ? 'Lifetime Access Unlocked' : 'Lifetime Free Offer'}
                    </h3>
                    <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Pinned</span>
                  </div>
                  <p className="text-[13px] text-muted truncate">
                    {linkCopied ? 'Link Copied to Clipboard!' : isQualified ? 'You have earned lifetime access!' : `Progress: ${inviteProgress}/3 invites. Click to share link.`}
                  </p>
                </div>
              </button>

              {/* Special Items */}
              <button 
                onClick={() => setView('feed')}
                className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
              >
                <div className="h-12 w-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ink text-[15px]">Institutions Directory</h3>
                    <span className="text-[10px] text-muted font-medium">9:41 AM</span>
                  </div>
                  <p className="text-[13px] text-muted truncate">Explore and follow schools</p>
                </div>
              </button>
              <button 
                onClick={() => handleNavigateToData('records')}
                className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
              >
                <div className="h-12 w-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center shrink-0">
                  <Search size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ink text-[15px]">{labels.student} Records</h3>
                    <span className="text-[10px] text-muted font-medium">Yesterday</span>
                  </div>
                  <p className="text-[13px] text-muted truncate">Access all digitized profiles</p>
                </div>
              </button>

              {/* Followed & Managed Institutions as Home Feed */}
              {[...schools, ...places].filter(s => 
                userDoc?.following?.includes(s.id) || 
                s.creatorUid === user?.uid
              ).map(school => {
                const lastPost = posts.filter(p => p.schoolId === school.id).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
                return (
                  <button 
                    key={school.id}
                    onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                    className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                      {school.logo ? (
                        <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-muted text-[10px] font-bold">{school.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-ink text-[15px] truncate">{school.name}</h3>
                        <span className="text-[10px] text-muted font-medium">
                          {lastPost ? formatTime(lastPost.timestamp) : '9:41 AM'}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted truncate">
                        {lastPost ? lastPost.content : `Welcome to ${school.name}`}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Empty State / Explore */}
              {(!userDoc?.following || userDoc.following.length === 0) && (
                <div className="py-12 px-8 text-center bg-white border border-gray-100 rounded-3xl mt-4">
                  <div className="h-16 w-16 bg-white border border-gray-100 rounded-full flex items-center justify-center text-muted mx-auto mb-4">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">No active updates</h3>
                  <p className="text-sm text-muted mb-6">Follow institutions to see their updates here on your home feed.</p>
                  <button 
                    onClick={() => setView('feed')}
                    className="px-6 py-2.5 bg-accent text-white rounded-full font-bold text-sm shadow-md hover:bg-accent/90 transition-all"
                  >
                    Explore Institutions
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'records': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-full flex items-center justify-center text-accent mb-8">
                <Database size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-3">Select an Institution</h2>
              <p className="text-muted text-[14px] font-bold max-w-xs mb-10 leading-relaxed">
                To access institutional records, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-4 bg-accent text-white rounded-full font-bold text-sm hover:bg-accent/90 transition-all"
              >
                Open Directory
              </button>
            </div>
          );
        }
        const labels = getLabels(selectedSchool?.type);
        const filteredRecords = records
          .filter(r => r.type === recordTab)
          .filter(r => r.studentName.toLowerCase().includes(recordSearch.toLowerCase()));
        const totalPaid = filteredRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = filteredRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <WordLayout 
            title={`${selectedSchool.name} Records`}
            subtitle={labels.system}
            icon={Database}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap gap-1 bg-white border border-gray-100 p-1 rounded-lg">
                  {(['general', 'books', 'uniforms'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setRecordTab(tab)}
                      className={`px-3 sm:px-4 py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${recordTab === tab ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                    >
                      {tab === 'general' ? labels.general : tab === 'books' ? labels.books : labels.uniforms}
                    </button>
                  ))}
                </div>
                <div className="hidden sm:block h-6 w-[1px] bg-gray-100" />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-0 outline-none transition-all text-[11px] font-medium placeholder:text-gray-400 w-32 sm:w-48" 
                    />
                  </div>
                  {canManageInstitution(selectedSchool) && (
                    <button 
                      onClick={() => setIsRecordModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-ink/90 transition-all"
                    >
                      <Plus size={14} />
                      New Record
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-bold text-ink mb-2 font-display">{selectedSchool.name}</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-[0.3em]">{recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Records • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              {[
                { label: `Total ${labels.students}`, value: filteredRecords.length, icon: Users },
                { label: 'Total Paid', value: `₦${totalPaid.toLocaleString()}`, icon: CreditCard },
                { label: 'Total Balance', value: `₦${totalBalance.toLocaleString()}`, icon: Wallet }
              ].map((stat, i) => (
                <div key={i} className="border-l-2 border-accent/20 pl-6">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-ink font-display">{stat.value}</p>
                </div>
              ))}
            </div>

            {canManageInstitution(selectedSchool) && (
              <div className="md:hidden mb-12">
                <button 
                  onClick={() => setIsRecordModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 active:scale-[0.98] transition-all"
                >
                  <Plus size={20} />
                  New Record
                </button>
              </div>
            )}

            <div className="hidden md:block overflow-x-auto custom-scrollbar border border-gray-200 rounded-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">{labels.student}</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Category</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Paid</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Balance</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Added By</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Date</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <p className="font-bold text-lg text-muted">No records found in this section</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-white border-b border-gray-100 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-ink text-sm">{record.studentName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{record.category}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-green-600 text-[13px]">₦{record.paid.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono font-bold text-red-600 text-[13px]">₦{record.balance.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[8px] font-bold text-ink">
                              {record.addedBy?.charAt(0) || 'A'}
                            </div>
                            <span className="text-[10px] font-medium text-ink">{record.addedBy || 'Admin'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-medium text-muted">
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(record.creatorUid === user?.uid || canManageInstitution(selectedSchool)) && (
                              <>
                                <button onClick={() => handleEditRecord(record)} className="p-2 text-muted hover:text-ink transition-all">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-2 text-muted hover:text-red-600 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredRecords.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="font-bold text-muted">No records found</p>
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div key={record.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-ink">{record.studentName}</h4>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{record.category}</p>
                      </div>
                      <div className="flex gap-1">
                        {(record.creatorUid === user?.uid || canManageInstitution(selectedSchool)) && (
                          <>
                            <button onClick={() => handleEditRecord(record)} className="p-2 text-muted hover:text-ink transition-all">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-2 text-muted hover:text-red-600 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Paid</p>
                        <p className="font-mono font-bold text-green-600 text-sm">₦{record.paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Balance</p>
                        <p className="font-mono font-bold text-red-600 text-sm">₦{record.balance.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[7px] font-bold text-ink">
                          {record.addedBy?.charAt(0) || 'A'}
                        </div>
                        <span className="text-[10px] font-medium text-muted">{record.addedBy || 'Admin'}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted">
                        {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Authorized Signature</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'finance': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center text-muted mb-8">
                <Wallet size={48} strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-extrabold text-ink mb-4">Select an Institution</h2>
              <p className="text-muted text-sm font-bold max-w-xs mb-10 leading-relaxed">
                To access financial data, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
              >
                Open Directory
              </button>
            </div>
          );
        }
        return (
          <WordLayout 
            title={`${selectedSchool.name} Finance`}
            subtitle="Institutional Financial Terminal"
            icon={Wallet}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-ink/90 transition-all flex items-center gap-2">
                    <ArrowUpRight size={14} />
                    Deposit
                  </button>
                  <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all flex items-center gap-2">
                    <TrendingDown size={14} />
                    Withdraw
                  </button>
                </div>
                <div className="hidden sm:block h-6 w-[1px] bg-gray-200" />
                <div className="flex items-center gap-2">
                  <button className="p-2 text-muted hover:text-ink transition-all"><Search size={16} /></button>
                  <button className="p-2 text-muted hover:text-ink transition-all"><Filter size={16} /></button>
                </div>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">{selectedSchool.name}</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Financial Statement • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-ink rounded-sm p-12 text-white mb-12 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Institution Balance</p>
                <h3 className="text-6xl font-mono font-medium tracking-tighter mb-8">₦{finance?.institutionBalance.toLocaleString() || '0'}</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-white/60 text-[9px] font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <ShieldCheck size={14} className="text-green-400" />
                    Verified
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-[9px] font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <Clock size={14} className="text-accent" />
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-5">
                <Sparkles size={300} strokeWidth={1} />
              </div>
            </div>

            {canManageInstitution(selectedSchool) && (
              <div className="md:hidden grid grid-cols-2 gap-4 mb-12">
                <button 
                  className="flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 active:scale-[0.98] transition-all"
                >
                  <ArrowUpRight size={20} />
                  Deposit
                </button>
                <button 
                  className="flex items-center justify-center gap-3 py-5 bg-white border border-gray-100 text-ink rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/5 active:scale-[0.98] transition-all"
                >
                  <TrendingDown size={20} />
                  Withdraw
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
              <div className="space-y-8">
                <h4 className="font-extrabold text-2xl text-ink border-b border-gray-100 pb-4">Bank Information</h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Bank Name</p>
                    <p className="font-bold text-ink text-sm">{finance?.bankName || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Account Number</p>
                    <p className="font-mono font-bold text-ink text-xl tracking-widest">{finance?.accountNumber || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Account Name</p>
                    <p className="font-bold text-ink text-sm">{finance?.accountName || '---'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="font-extrabold text-2xl text-ink border-b border-gray-100 pb-4">Recent Activity</h4>
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-sm border border-dashed border-gray-200">
                  <Database size={32} className="text-gray-200 mb-4" />
                  <p className="font-bold text-lg text-muted">No recent transactions</p>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Authorized Signature</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'attendance': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center text-muted mb-8">
                <Compass size={48} strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-extrabold text-ink mb-4">Select an Institution</h2>
              <p className="text-muted text-sm font-bold max-w-xs mb-10 leading-relaxed">
                To view or record attendance, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
              >
                Open Directory
              </button>
            </div>
          );
        }
        const labels = getLabels(selectedSchool.type);
        const filteredAttendance = attendance.filter(r => 
          r.teacherName.toLowerCase().includes(attendanceSearch.toLowerCase())
        );
        const presentToday = filteredAttendance.filter(r => r.status === 'present').length;
        const absentToday = filteredAttendance.filter(r => r.status === 'absent').length;

        return (
          <WordLayout 
            title={`${selectedSchool.name} Attendance`}
            subtitle={labels.attendance}
            icon={Compass}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder={`Search ${labels.teachers.toLowerCase()}...`} 
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-0 outline-none transition-all text-[11px] font-medium placeholder:text-gray-400 w-32 sm:w-48" 
                    />
                  </div>
                  {canManageInstitution(selectedSchool) && (
                    <button 
                      onClick={() => setIsAttendanceModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-ink/90 transition-all"
                    >
                      <Plus size={14} />
                      Record Attendance
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">{selectedSchool.name}</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">{labels.attendance} Log • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              {[
                { label: 'Total Records', value: filteredAttendance.length, icon: ClipboardList },
                { label: 'Present Today', value: presentToday, icon: CheckCircle2 },
                { label: 'Absent Today', value: absentToday, icon: XCircle }
              ].map((stat, i) => (
                <div key={i} className="border-l border-gray-100 pl-6">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-ink">{stat.value}</p>
                </div>
              ))}
            </div>

            {canManageInstitution(selectedSchool) && (
              <div className="md:hidden mb-12">
                <button 
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 active:scale-[0.98] transition-all"
                >
                  <Plus size={20} />
                  Record Attendance
                </button>
              </div>
            )}

            <div className="hidden md:block overflow-x-auto custom-scrollbar border border-gray-200 rounded-sm">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">{labels.teacher} Name</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Status</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Date</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <p className="font-bold text-lg text-muted">No attendance records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-white border-b border-gray-100 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-ink text-sm">{record.teacherName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            record.status === 'present' ? 'bg-white text-green-600 border border-gray-100' : 'bg-white text-red-600 border border-gray-100'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-muted">{record.date}</td>
                        <td className="px-6 py-4 text-right text-[12px] font-medium text-muted">{record.addedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredAttendance.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="font-bold text-muted">No attendance records found</p>
                </div>
              ) : (
                filteredAttendance.map((record) => (
                  <div key={record.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-ink">{record.teacherName}</h4>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        record.status === 'present' ? 'bg-white text-green-600 border border-gray-100' : 'bg-white text-red-600 border border-gray-100'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Recorded By</span>
                        <span className="text-[10px] font-medium text-ink">{record.addedBy}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted">{record.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Authorized Signature</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'ai': {
        const tools = [
          { id: 'ai', name: 'Exona AI', description: 'Intelligent assistant for institutional queries', icon: Cpu, color: 'ink' },
          { id: 'calculator', name: 'Fee Calculator', description: 'Quickly calculate student fees and balances', icon: Calculator, color: 'accent' },
          { id: 'penalty', name: 'Penalty Board', description: 'View disciplinary records and notices', icon: ShieldAlert, color: 'red-600' },
          { id: 'referral', name: 'Referral Hub', description: 'Manage your referrals and rewards', icon: Gift, color: 'green-600' },
          { id: 'id-gen', name: 'ID Generator', description: 'Generate student and staff ID cards', icon: IdCard, color: 'blue-600' },
          { id: 'reports', name: 'Report Center', description: 'Generate financial and academic reports', icon: FileBarChart, color: 'purple-600' },
        ];

        if (activeTool === 'ai') {
          return (
            <WordLayout 
              title="Exona AI"
              subtitle="Intelligent Institutional Intelligence"
              icon={Cpu}
              toolbar={
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
                  <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">New Chat</button>
                </div>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Exona AI Terminal</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Active Session • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="space-y-8 mb-20">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <Cpu size={64} strokeWidth={1} className="mb-6" />
                    <p className="font-bold text-xl">System Ready</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">{msg.role === 'user' ? 'User Query' : 'AI Response'}</p>
                    <div className={`max-w-[85%] p-6 border ${
                      msg.role === 'user' ? 'bg-white border-gray-200 text-ink' : 'bg-white border-ink/10 text-ink font-extrabold text-lg'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 bg-ink/20 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-12 border-t border-gray-100">
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAiSend()}
                    placeholder="Type your inquiry here..." 
                    className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-sm outline-none focus:border-ink transition-all text-sm font-bold"
                  />
                  <button 
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || isAiTyping}
                    className="px-8 py-4 bg-ink text-white rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-ink/90 transition-all disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'calculator') {
          return (
            <WordLayout 
              title="Fee Calculator"
              subtitle="Institutional Financial Utility"
              icon={Calculator}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Fee Calculator</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Financial Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] border border-gray-100">
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Total Tuition Fee</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">₦</span>
                      <input type="number" className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Amount Paid</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">₦</span>
                      <input type="number" className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="pt-8 border-t border-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-bold text-muted uppercase tracking-widest">Outstanding Balance</p>
                      <p className="text-3xl font-extrabold text-red-600">₦0.00</p>
                    </div>
                    <button className="w-full py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all">Generate Invoice Preview</button>
                  </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'penalty') {
          return (
            <WordLayout 
              title="Penalty Board"
              subtitle="Disciplinary Records & Notices"
              icon={ShieldAlert}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12 text-center">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Conduct Report</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Confidential • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-green-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <ShieldCheck size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Exemplary Record</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  No disciplinary actions or penalties have been recorded for your account. Maintain this standard of excellence.
                </p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'referral') {
          return (
            <WordLayout 
              title="Referral Hub"
              subtitle="Growth & Rewards Program"
              icon={Gift}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Referral Program</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Rewards Terminal • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100">
                  <h4 className="font-extrabold text-2xl text-ink mb-8">Your Referral Link</h4>
                  <div className="flex gap-4 mb-8">
                    <input 
                      readOnly 
                      value={`https://exona.app/ref/${user?.uid?.slice(0, 8)}`}
                      className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl font-mono text-xs text-ink outline-none" 
                    />
                    <button className="px-6 py-4 bg-ink text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all">Copy</button>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10">
                    <p className="text-xs font-bold text-accent leading-relaxed">
                      Share this link with other institutions. For every successful registration, you earn ₦5,000 in credits.
                    </p>
                  </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100">
                  <h4 className="font-extrabold text-2xl text-ink mb-8">Performance</h4>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Referrals</p>
                      <p className="text-2xl font-extrabold text-ink">0</p>
                    </div>
                    <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Earned Rewards</p>
                      <p className="text-2xl font-extrabold text-green-600">₦0.00</p>
                    </div>
                  </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'id-gen') {
          return (
            <WordLayout 
              title="ID Generator"
              subtitle="Institutional Identity Utility"
              icon={IdCard}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">ID Card Generator</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Identity Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-blue-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <IdCard size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Coming Soon</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  The digital ID card generator is currently under development. Soon you will be able to generate and print official identification cards for all members.
                </p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'reports') {
          return (
            <WordLayout 
              title="Report Center"
              subtitle="Analytical Intelligence Utility"
              icon={FileBarChart}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Report Center</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Analytical Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-purple-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <FileBarChart size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Coming Soon</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  Advanced financial and academic reporting tools are being integrated. You will soon be able to export comprehensive institutional data.
                </p>
              </div>
            </WordLayout>
          );
        }

        return (
          <WordLayout 
            title="Tools Hub"
            subtitle="Institutional Utility Suite"
            icon={LayoutGrid}
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">Utility Terminal</h1>
              <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">System Tools • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTool(tool.id)}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 text-left group hover:border-accent/20 transition-all"
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-${tool.color} mb-6 group-hover:scale-110 transition-transform`}>
                    <tool.icon size={28} />
                  </div>
                  <h3 className="text-xl font-extrabold text-ink mb-2 tracking-tight">{tool.name}</h3>
                  <p className="text-muted text-xs font-medium leading-relaxed">{tool.description}</p>
                </motion.button>
              ))}
            </div>
          </WordLayout>
        );
      }
      case 'penalty': {
        return (
          <WordLayout 
            title="Penalty Board"
            subtitle="Disciplinary Records & Notices"
            icon={ShieldCheck}
            toolbar={
              <div className="flex items-center gap-4">
                <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all">Filter</button>
                <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all">Export</button>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12 text-center">
              <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Conduct Report</h1>
              <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Confidential • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="h-24 w-24 bg-white text-green-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                <ShieldCheck size={48} strokeWidth={1.5} />
              </div>
              <h3 className="font-extrabold text-3xl text-ink mb-4">Exemplary Record</h3>
              <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                You have no active penalties or disciplinary notices. Your commitment to institutional standards is noted and appreciated.
              </p>
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona Security</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Office of Conduct</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
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
                  <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-full text-muted text-[11px] font-bold">exona.io</span>
                </div>
              </div>
              <div className="relative group h-20 w-20">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                  {isUploadingProfile ? (
                    <div className="h-full w-full bg-white border border-gray-100 flex flex-col items-center justify-center">
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
                    <div className="h-full w-full bg-white border border-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
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
            </div>

            <div className="flex gap-3 mb-10">
              <button 
                onClick={handleEditProfile}
                className="flex-1 py-3 bg-ink text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
              >
                Edit profile
              </button>
              <button className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-gray-50 transition-all">
                Share profile
              </button>
            </div>

            <div className="space-y-12 mt-12">
              <section>
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Workspace Settings</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: Shield, label: 'Security & Privacy', desc: 'Manage your account protection', color: 'blue-600' },
                    { icon: Bell, label: 'Notification Center', desc: 'Configure your alert preferences', color: 'orange-500' },
                    { icon: Sparkles, label: 'Appearance', desc: 'Customize your visual experience', color: 'purple-600' },
                    { icon: Database, label: 'Data & Storage', desc: 'Manage your institutional data', color: 'accent' }
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-white hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className={`h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-bold text-ink tracking-tight">{item.label}</p>
                          <p className="text-[11px] text-muted font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={14} className="text-ink" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Support & Legal</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: AlertCircle, label: 'Help Center', desc: 'Get assistance and documentation' },
                    { icon: FileText, label: 'Terms of Service', desc: 'Review our legal agreements' }
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-white hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-muted group-hover:text-ink transition-colors">
                          <item.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-bold text-ink tracking-tight">{item.label}</p>
                          <p className="text-[11px] text-muted font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={14} className="text-ink" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-gray-100">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full py-5 bg-red-50 text-red-600 rounded-[2rem] font-bold text-xs uppercase tracking-[0.3em] hover:bg-red-100 transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                >
                  <LogOut size={20} />
                  Sign Out from Exona
                </button>
                <p className="text-center text-[10px] text-muted font-bold uppercase tracking-[0.4em] mt-8 opacity-30">Exona Terminal v1.0.4</p>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  if (view === 'splash') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white text-ink overflow-hidden relative">
        {/* Immersive background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gray-100 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-50 blur-[100px] rounded-full animate-pulse [animation-delay:1s]"></div>
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
            <h1 className="text-8xl font-bold tracking-tight text-ink mb-2 font-display">Exona</h1>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-ink/10 to-transparent mb-8"></div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col items-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.8em] text-muted mb-12">Mastering Records</p>
            
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 bg-ink/10 rounded-full animate-bounce"></div>
              <div className="h-1 w-1 bg-ink/20 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="h-1 w-1 bg-ink/10 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (loading) return null;

  if (view === 'login') {
    if (verificationSent || (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password'))) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-white p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-sm text-center"
          >
            <h1 className="text-4xl font-extrabold mb-8">Exona</h1>
            <div className="bg-white border border-border p-10 rounded-xl mb-4">
              <h2 className="text-xl font-bold mb-4">Check your email</h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                We've sent a verification link to <span className="text-ink font-bold">{user?.email || email}</span>. Please click the link in your email to verify your account.
              </p>
              <div className="space-y-3">
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
                        setAuthError('Email not verified yet. Please check your inbox.');
                      }
                    }
                  }} 
                  className="w-full py-2 bg-accent text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all"
                >
                  I've verified my email
                </button>
                <button 
                  onClick={() => {
                    setVerificationSent(false);
                    signOut(auth);
                  }} 
                  className="w-full py-2 text-accent font-bold text-sm hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-sm"
        >
          <div className="bg-white border border-gray-100 p-12 rounded-[2.5rem] mb-4 flex flex-col items-center shadow-xl shadow-ink/5">
            <h1 className="text-6xl font-bold mb-12 mt-4 font-display">Exona</h1>
            
            {authError && (
              <div className="mb-6 p-4 w-full bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs text-center font-bold">
                {authError}
              </div>
            )}

            <div className="w-full space-y-3 mb-6">
              {authMode === 'signup' && (
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                />
              )}
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                />
            </div>

            <button 
              onClick={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp} 
              className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-sm hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all mb-8 active:scale-[0.98]"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="w-full flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs font-bold text-muted uppercase">OR</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <button 
              onClick={handleGoogleSignIn} 
              className="w-full py-4 bg-white border border-gray-100 text-ink rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm mb-6"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              {authMode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
            </button>

            {authMode === 'signin' && (
              <button className="text-xs text-[#00376b] hover:underline">Forgot password?</button>
            )}
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] text-center shadow-xl shadow-ink/5">
            <p className="text-sm font-medium text-muted">
              {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthError(null);
                }} 
                className="text-accent font-bold hover:underline"
              >
                {authMode === 'signin' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-muted">Exona from Antigravity</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden overflow-x-hidden">
      {/* Global Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-ink text-white border-white/10' 
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-12 border border-gray-100"
            >
              <div className="h-20 w-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-600 mb-8">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Terminate Identity?</h3>
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
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-700 disabled:opacity-50 transition-all active:scale-[0.98]"
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
                  className="w-full py-5 bg-white text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 disabled:opacity-50 transition-all border border-gray-100"
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
            className="fixed inset-0 bg-ink/20 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl bg-white rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">{editingPost ? 'Refine Broadcast' : 'Initialize Broadcast'}</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Horizon Network Transmission</p>
                </div>
                <button 
                  onClick={() => setIsPostModalOpen(false)} 
                  className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative mb-6">
                <textarea 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's happening in your school?"
                  className="w-full h-56 p-8 bg-white rounded-[2.5rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-gray-100 transition-all text-lg font-bold resize-none placeholder:text-gray-300 leading-relaxed"
                />
                <div className="absolute bottom-6 right-8 flex items-center gap-3">
                  <div className={`text-[10px] font-bold tracking-widest uppercase ${newPostContent.length > 450 ? 'text-red-500' : 'text-muted'}`}>
                    {newPostContent.length} / 500
                  </div>
                  <div className="h-4 w-4 rounded-full border border-gray-100 flex items-center justify-center p-[2px]">
                    <motion.div 
                      initial={false}
                      animate={{ 
                        height: `${Math.min((newPostContent.length / 500) * 100, 100)}%`,
                        backgroundColor: newPostContent.length > 450 ? '#ef4444' : '#0095F6'
                      }}
                      className="w-full rounded-full"
                    />
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="mb-8 bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 relative group ring-4 ring-accent/5">
                  {/* Try to determine media type from selectedFile or editingPost */}
                  {(selectedFile?.type.startsWith('image/') || (editingPost?.mediaType === 'image' && !selectedFile)) ? (
                    <img src={previewUrl} className="w-full h-72 object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-72 object-cover" controls={!isUploading} />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <button 
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                    className="absolute top-6 right-6 h-12 w-12 bg-white/90 backdrop-blur-md text-ink rounded-2xl flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 z-20"
                  >
                    <X size={20} />
                  </button>

                  {isUploading && (
                    <div className="absolute inset-0 bg-ink/80 backdrop-blur-md flex flex-col items-center justify-center p-12 z-30">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-8 relative"
                      >
                        <svg className="h-24 w-24 -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-white/10"
                          />
                          <motion.circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray="251.2"
                            animate={{ strokeDashoffset: 251.2 - (251.2 * uploadProgress) / 100 }}
                            className="text-accent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{Math.round(uploadProgress)}%</span>
                        </div>
                      </motion.div>
                      <h4 className="text-white text-sm font-extrabold mb-2">Uploading Media...</h4>
                      <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.4em]">Horizon Network Transmission</p>
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
                  className="px-12 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-[0.98]"
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
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Retract Broadcast?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the transmission from the Horizon network. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeletePost}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Retraction
                </button>
                <button 
                  onClick={() => {
                    setIsDeletePostModalOpen(false);
                    setPostToDelete(null);
                  }}
                  className="w-full py-5 bg-white text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all border border-gray-100"
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
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">
                    {editingRecord 
                      ? `Edit ${recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Record` 
                      : `Add ${recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Record`}
                  </h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Data Entry</p>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">{labels.student} Name</label>
                  <input 
                    type="text" 
                    value={newRecord.studentName}
                    onChange={(e) => setNewRecord({...newRecord, studentName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Category/{labels.educationalLevel}</label>
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
                                  ? 'bg-ink text-white border-ink'
                                  : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
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
                        className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
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
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-12 border border-gray-100 text-center my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Erase Record?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the {labels.student.toLowerCase()} information from the institutional database. Are you sure?</p>
              
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
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-12 border border-gray-100 text-center my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Erase Institution?</h3>
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

        {isSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">{editingSchool ? 'Refine Institution' : 'Register Institution'}</h3>
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
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newSchool.type === 'place' && (
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Space Category</label>
                    <div className="flex flex-wrap gap-2">
                      {['School', 'Business', 'Community', 'Personal', 'Other'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSchool({ ...newSchool, category: c as any })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            newSchool.category === c
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {c}
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
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Description</label>
                  <textarea 
                    value={newSchool.description}
                    onChange={(e) => setNewSchool({...newSchool, description: e.target.value})}
                    placeholder="Brief institutional overview..."
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold resize-none h-32 leading-relaxed"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Visual Identity</label>
                  <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-[2rem] transition-all">
                    <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-gray-100">
                      {previewUrl || newSchool.logo ? (
                        <img src={previewUrl || newSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={24} className="text-muted/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-ink transition-all cursor-pointer border border-gray-100">
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
              <div className="flex flex-col sm:flex-row gap-4 mt-12">
                <button 
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name.trim() || isUploading}
                  className="flex-1 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
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
                {editingSchool && (
                  <button 
                    onClick={() => {
                      setSchoolToDelete(editingSchool.id);
                      setIsDeleteSchoolModalOpen(true);
                    }}
                    className="px-10 py-5 bg-red-50 text-red-600 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Trash2 size={18} />
                    Delete Institution
                  </button>
                )}
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

        {isProfileModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-ink rounded-2xl flex items-center justify-center text-white">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-ink tracking-tight">Edit Profile</h2>
                    <p className="text-muted text-[10px] font-bold uppercase tracking-[0.3em]">Personal Identity Terminal</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Display Name</label>
                  <input 
                    type="text" 
                    value={editingProfile.displayName}
                    onChange={(e) => setEditingProfile({...editingProfile, displayName: e.target.value})}
                    placeholder="Your name..."
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Bio</label>
                  <textarea 
                    value={editingProfile.bio}
                    onChange={(e) => setEditingProfile({...editingProfile, bio: e.target.value})}
                    placeholder="Tell the world about yourself..."
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold resize-none h-32 leading-relaxed"
                  />
                </div>
              </div>

              <div className="mt-12">
                <button 
                  onClick={handleUpdateProfile}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Synchronize Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isAttendanceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">Record Attendance</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Presence Log</p>
                </div>
                <button onClick={() => setIsAttendanceModalOpen(false)} className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">{labels.teacher} Name</label>
                  <input 
                    type="text" 
                    value={newAttendance.teacherName}
                    onChange={(e) => setNewAttendance({...newAttendance, teacherName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
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
                            ? 'bg-ink text-white border-ink' 
                            : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
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
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
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

        {isCommentModalOpen && activePostForComments && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] flex flex-col max-h-[85vh] border border-gray-100"
            >
              <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">Broadcast Replies</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Community Interactions</p>
                </div>
                <button onClick={() => setIsCommentModalOpen(false)} className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {postComments.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle size={64} strokeWidth={1} className="mx-auto mb-6" />
                    <p className="font-bold text-xl">No replies yet. Start the conversation.</p>
                  </div>
                ) : (
                  postComments.map(comment => (
                    <div key={comment.id} className="flex gap-6 group">
                      <div className="relative">
                        {comment.authorPhoto ? (
                          <img src={comment.authorPhoto} className="h-14 w-14 rounded-2xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-accent/5 flex items-center justify-center text-accent font-extrabold text-2xl border border-accent/10">
                            {comment.authorName?.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center border border-gray-100">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 group-hover:border-gray-200 transition-all duration-500">
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
                      className="w-full pl-10 pr-20 py-6 bg-white rounded-[2rem] border border-gray-100 outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-[15px] font-bold placeholder:text-gray-300"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button className="p-2 text-muted hover:text-accent transition-colors"><Smile size={20} /></button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="h-16 w-16 bg-ink text-white rounded-2xl flex items-center justify-center hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-90"
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
              className="fixed inset-y-0 left-0 w-80 bg-white z-[160] flex flex-col border-r border-gray-100"
            >
              <div className="p-6 bg-ink text-white flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Menu</h2>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                {user && (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-white/20">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full bg-accent flex items-center justify-center text-xl font-bold">
                          {user.displayName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-base">{user.displayName}</p>
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="px-4 py-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Navigation</p>
                </div>
                <SidebarItem 
                  icon={Home} 
                  label="Chats" 
                  active={view === 'feed'} 
                  onClick={() => { setView('feed'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={GraduationCap} 
                  label="Institutions" 
                  active={view === 'schools'} 
                  onClick={() => { setView('schools'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={LayoutGrid} 
                  label="Tools Hub" 
                  active={view === 'ai'} 
                  onClick={() => { setView('ai'); setSidebarOpen(false); }} 
                />
                
                <div className="px-4 py-4">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Management</p>
                </div>
                <SidebarItem 
                  icon={ClipboardList} 
                  label={`${labels.student} Records`} 
                  active={view === 'records'} 
                  onClick={() => handleNavigateToData('records')} 
                />
                <SidebarItem 
                  icon={Calendar} 
                  label="Attendance" 
                  active={view === 'attendance'} 
                  onClick={() => handleNavigateToData('attendance')} 
                />
                <SidebarItem 
                  icon={Wallet} 
                  label="Finance Hub" 
                  active={view === 'finance'} 
                  onClick={() => handleNavigateToData('finance')} 
                />
                <SidebarItem 
                  icon={Shield} 
                  label="Penalty System" 
                  active={view === 'penalty'} 
                  onClick={() => { setView('penalty'); setSidebarOpen(false); }} 
                />

                <div className="px-4 py-4">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">System</p>
                </div>
                <SidebarItem 
                  icon={UserIcon} 
                  label="Settings" 
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

              </div>

              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <header className="h-16 bg-white/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <motion.h1 
            whileHover={{ scale: 1.02 }}
            className="text-2xl font-bold text-ink cursor-pointer tracking-tight font-display" 
            onClick={() => setView('feed')}
          >
            Exona
          </motion.h1>
        </div>

        <div className="flex items-center gap-2 text-ink">
          <button className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-muted hover:text-ink">
            <Search size={20} />
          </button>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-muted hover:text-ink"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto bg-white">
        {renderView()}
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl border border-gray-100 h-16 px-4 flex items-center justify-around rounded-[2rem] shadow-2xl shadow-ink/5 w-[90%] max-w-md">
        <NavButton 
          active={view === 'feed'} 
          onClick={() => setView('feed')} 
          icon={Home} 
          label="Home"
        />
        <NavButton 
          active={view === 'schools'} 
          onClick={() => setView('schools')} 
          icon={Circle} 
          label="Status"
        />
        
        <NavButton 
          active={view === 'ai'} 
          onClick={() => setView('ai')} 
          icon={LayoutGrid} 
          label="Tools"
        />
        <NavButton 
          active={view === 'profile'} 
          onClick={() => user ? setView('profile') : setView('login')} 
          icon={UserIcon} 
          label="Settings"
        />
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

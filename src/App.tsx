import React, { useEffect, useState, Component, ErrorInfo, ReactNode, useMemo, useRef } from 'react';
import { 
  GraduationCap, ShieldCheck, LogOut, LogIn, User as UserIcon, 
  BookOpen, Calendar, Bell, Search, Menu, X, 
  Home, Users, MessageSquare, Wallet, Settings, 
  AlertCircle, Cpu, ChevronDown, ChevronRight, ChevronLeft,
  Heart, MessageCircle, Share2, Plus, Filter, Send, Repeat, PlusSquare,
  Image as ImageIcon, Video as VideoIcon, Paperclip,
  MoreVertical, Trash2, Edit2, UserPlus, UserMinus,
  MoreHorizontal, ArrowUpRight, CreditCard, Fingerprint,
  BadgeCheck, AlertTriangle, Smile, TrendingUp, TrendingDown, ShieldAlert,
  DollarSign, Clock, FileText, Upload, LayoutGrid, Database, Sparkles, Shield,
  ClipboardList, CheckCircle2, XCircle, Compass, Check, Camera, Circle, Phone,
  Calculator, FileBarChart, IdCard, Gift, ArrowUpDown, CheckCheck, Download, ArrowLeft
} from 'lucide-react';
import { toPng } from 'html-to-image';
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
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, where, getDocs, arrayUnion, arrayRemove, writeBatch, limit } from 'firebase/firestore';

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
  administrativeViewers?: string[];
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
  administrativeViewers?: string[];
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

interface Message {
  id: string;
  senderUid: string;
  receiverUid: string;
  participants: string[];
  text: string;
  timestamp: any;
  chatId: string;
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
}

interface Notification {
  id: string;
  type: 'message' | 'follower_request' | 'system' | 'like' | 'comment';
  title: string;
  text: string;
  timestamp: any;
  isRead: boolean;
  link?: string;
  senderUid?: string;
  targetId?: string; // id of post, chat etc
}

interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  schoolId?: string;
  following?: string[];
  followers?: string[];
  pendingFollowers?: string[];
  invitesCount?: number;
  referredBy?: string | null;
  isLifetimeFree?: boolean;
  hasCreatedInstitution?: boolean;
  bio?: string;
  isPrivate?: boolean;
  country?: string;
  currency?: string;
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
const COUNTRIES = [
  { name: 'Nigeria', code: 'NG', currency: '₦' },
  { name: 'United States', code: 'US', currency: '$' },
  { name: 'United Kingdom', code: 'GB', currency: '£' },
  { name: 'Ghana', code: 'GH', currency: 'GH₵' },
  { name: 'Kenya', code: 'KE', currency: 'KSh' },
  { name: 'South Africa', code: 'ZA', currency: 'R' },
  { name: 'Canada', code: 'CA', currency: '$' },
  { name: 'India', code: 'IN', currency: '₹' },
  { name: 'European Union', code: 'EU', currency: '€' },
];

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
      attendance: 'Participation',
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

const WordLayout = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  toolbar,
  branding
}: { 
  title: string, 
  subtitle: string, 
  icon: any, 
  children: React.ReactNode, 
  toolbar?: React.ReactNode,
  branding?: { logo?: string, name?: string }
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSaveAsImage = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: contentRef.current.offsetWidth + 'px',
          height: contentRef.current.offsetHeight + 'px',
        }
      });
      const link = document.createElement('a');
      link.download = `${branding?.name?.toLowerCase().replace(/\s+/g, '-') || 'exona'}-${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save as image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white">
      {/* Ribbon Header */}
      <div className="bg-white border-b border-gray-200 z-20 sticky top-0 no-print">
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
            <button 
              onClick={handleSaveAsImage}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <div className="h-3 w-3 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isExporting ? 'Exporting...' : 'Save as Image'}
            </button>
          </div>
        </div>
        {/* Toolbar / Ribbon Tabs */}
        <div className="px-4 md:px-6 py-2 flex flex-wrap items-center gap-2 sm:gap-4 bg-white">
          {toolbar}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="p-0 md:p-8 lg:p-12 flex justify-center bg-gray-50/30">
        <motion.div 
          ref={contentRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full md:max-w-[1000px] bg-white min-h-screen md:min-h-[1200px] p-4 sm:p-8 md:p-16 lg:p-20 rounded-none md:rounded-sm border-x-0 md:border-x border-gray-200 relative mb-0 md:mb-20 shadow-2xl shadow-gray-200/50"
        >
          {/* Page Header Decor */}
          <div className="absolute top-0 left-0 w-full h-1 bg-ink/5" />
          <div className="flex justify-between items-start mb-20">
            <div className="flex items-center gap-3">
              {branding?.logo ? (
                <img src={branding.logo} className="h-12 w-12 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-12 w-12 bg-ink text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                  {branding?.name?.charAt(0) || 'E'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-ink tracking-tighter leading-none uppercase">{branding?.name || 'EXONA'}</h1>
                <p className="text-[8px] font-bold text-muted uppercase tracking-[0.4em] mt-1">Official Document</p>
                {branding && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[7px] font-bold text-muted uppercase tracking-widest">Powered by</span>
                    <span className="text-[7px] font-black text-ink tracking-tighter">EXONA</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Document ID</div>
              <div className="text-sm font-mono font-bold text-ink">#{Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
            </div>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
};

const FeedPost = ({ post, onUserClick, onLike, onComment, onMessage, onReshare, onForward, onEdit, onDelete, currentUserId, canManage, canReply = true }: any) => {
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = post.likedBy?.includes(currentUserId);
  const isOwnPost = post.authorUid === currentUserId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex gap-3 px-6 py-6 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group relative"
    >
      {/* Left Column: Avatar */}
      <button 
        onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
        className="shrink-0 pt-1"
      >
        {post.authorPhoto ? (
          <img src={post.authorPhoto} className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-white shadow-sm hover:ring-accent/20 transition-all" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-accent font-bold text-sm md:text-base">
            {post.authorName?.charAt(0)}
          </div>
        )}
      </button>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <button 
            onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
            className="flex items-center gap-1.5 min-w-0 group/author"
          >
            <span className="text-[14px] font-extrabold text-ink truncate group-hover/author:text-accent transition-colors">
              {post.authorName}
            </span>
            <span className="text-[12px] text-muted truncate">
              @{post.authorName?.toLowerCase().replace(/\s+/g, '')}
            </span>
            <span className="text-muted/30 text-[12px] shrink-0">·</span>
            <span className="text-[12px] text-muted/60 shrink-0">
              {formatTime(post.timestamp)}
            </span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-muted hover:text-ink hover:bg-gray-100 rounded-full transition-all"
            >
              <MoreHorizontal size={16} />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-30 overflow-hidden"
                >
                  {(isOwnPost || canManage) && (
                    <>
                      <button 
                        onClick={() => { onEdit?.(post); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-ink hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <Edit2 size={14} className="text-muted" /> Edit Post
                      </button>
                      <button 
                        onClick={() => { onDelete?.(post); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <div className="h-px bg-gray-50 my-2" />
                    </>
                  )}
                  <button className="w-full px-4 py-2 text-left text-xs font-bold text-ink hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <Share2 size={14} className="text-muted" /> Share Post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap mb-4 font-medium tracking-tight">
          {post.content}
        </p>

        {post.resharedFrom && (
          <div className="mb-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl border-l-4 border-accent/30 group/repost hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-4 bg-accent/10 rounded-full flex items-center justify-center">
                <Repeat size={8} className="text-accent" />
              </div>
              <p className="text-[11px] font-bold text-accent uppercase tracking-widest">{post.resharedFrom.authorName}</p>
            </div>
            <p className="text-[13px] text-muted leading-relaxed line-clamp-3">{post.resharedFrom.content}</p>
          </div>
        )}

        {post.mediaUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-black/5 aspect-video flex items-center justify-center">
            {post.mediaType === 'image' ? (
              <img src={post.mediaUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
            ) : (
              <video src={post.mediaUrl} controls className="w-full h-full object-contain bg-black" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between max-w-sm">
          <button 
            onClick={() => onLike?.(post.id, post.likedBy || [])}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${isLiked ? 'text-accent' : 'text-muted hover:text-accent'}`}
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isLiked ? 'bg-accent/10' : 'hover:bg-accent/5'}`}>
              <Heart size={18} className={isLiked ? 'fill-accent' : ''} />
            </div>
            {post.likes > 0 && <span className="tabular-nums">{post.likes}</span>}
          </button>

          <button 
            onClick={() => canReply && onComment?.(post)}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${canReply ? 'text-muted hover:text-blue-500' : 'text-muted/30 cursor-not-allowed'}`}
            disabled={!canReply}
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${canReply ? 'hover:bg-blue-50' : ''}`}>
              <MessageCircle size={18} />
            </div>
            {post.commentsCount > 0 && <span className="tabular-nums">{post.commentsCount}</span>}
          </button>

          <button 
            onClick={() => onForward?.(post)}
            className="flex items-center gap-2 text-xs font-bold text-muted hover:text-green-500 transition-all"
          >
            <div className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-green-50 transition-colors">
              <Repeat size={18} />
            </div>
          </button>

          <button 
            className="flex items-center gap-2 text-xs font-bold text-muted hover:text-accent transition-all"
          >
            <div className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/5 transition-colors">
              <Share2 size={18} />
            </div>
          </button>

          {!isOwnPost && (
            <button 
              onClick={() => onMessage?.(post)}
              className="flex items-center text-muted hover:text-accent transition-all h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/5"
              title="Message Author"
            >
              <MessageSquare size={18} />
            </button>
          )}
        </div>
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
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'tools' | 'penalty' | 'profile' | 'user-profile' | 'admin' | 'school-feed' | 'attendance' | 'chat' | 'notifications' | 'search' | 'onboarding'>('splash');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedSignupCountry, setSelectedSignupCountry] = useState(COUNTRIES[0]);
  const [onboardingCountry, setOnboardingCountry] = useState(COUNTRIES[0]);
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
  const currencySymbol = useMemo(() => userDoc?.currency || '₦', [userDoc?.currency]);
  const [selectedUserProfileDoc, setSelectedUserProfileDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const [allAttendance, setAllAttendance] = useState<TeacherAttendance[]>([]);
  const [allFinance, setAllFinance] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<'all' | 'message' | 'follower_request' | 'system' | 'like' | 'comment'>('all');
  const [notificationReadFilter, setNotificationReadFilter] = useState<'all' | 'unread'>('all');
  const [chatTab, setChatTab] = useState<'chats' | 'requests'>('chats');
  const [chatInput, setChatInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [finance, setFinance] = useState<SchoolFinance | null>(null);
  const [recordTab, setRecordTab] = useState<'general' | 'books' | 'uniforms' | 'services' | 'products'>('general');
  const [calcTuition, setCalcTuition] = useState<string>('');
  const [calcPaid, setCalcPaid] = useState<string>('');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportCategory, setExportCategory] = useState<'all' | 'general' | 'books' | 'uniforms' | 'services' | 'products'>('all');
  const [auditorSearch, setAuditorSearch] = useState('');
  const [auditorResults, setAuditorResults] = useState<UserDoc[]>([]);
  const [isAuditorSearching, setIsAuditorSearching] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [recordForReceipt, setRecordForReceipt] = useState<Record | StudentRecord | null>(null);
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<UserDoc[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [recordSort, setRecordSort] = useState<'alphabet' | 'amount' | 'date'>('alphabet');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isEditingProfileInline, setIsEditingProfileInline] = useState(false);
  const [editingProfile, setEditingProfile] = useState({ displayName: '', bio: '', isPrivate: false });
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'blue' | 'purple'>('light');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<UserDoc[]>([]);
  const [chatUsers, setChatUsers] = useState<UserDoc[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 4, // High quality
      });
      const link = document.createElement('a');
      link.download = `exona-receipt-${recordForReceipt?.studentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate receipt:', err);
    } finally {
      setIsExporting(false);
    }
  };
  const [pendingFollowerProfiles, setPendingFollowerProfiles] = useState<UserDoc[]>([]);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingState, setTypingState] = useState<{ [chatId: string]: boolean }>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('Reconnected to internet');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('Running in offline mode', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTyping = (chatId: string, isTyping: boolean) => {
    if (!user) return;
    const typingDocRef = doc(db, 'typingStates', `${chatId}_${user.uid}`);
    setDoc(typingDocRef, {
      isTyping,
      updatedAt: serverTimestamp(),
      chatId,
      uid: user.uid
    }, { merge: true }).catch(err => console.error("Typing state error:", err));
  };

  useEffect(() => {
    let timeout: any;
    if (chatInput.trim() && activeChat) {
      const chatId = [user?.uid, activeChat.uid].sort().join('_');
      handleTyping(chatId, true);
      
      timeout = setTimeout(() => {
        handleTyping(chatId, false);
      }, 3000);
    }
    return () => {
      clearTimeout(timeout);
      if (activeChat && user) {
        const chatId = [user.uid, activeChat.uid].sort().join('_');
        handleTyping(chatId, false);
      }
    };
  }, [chatInput, view]);

  useEffect(() => {
    if (!user || !activeChat) {
      setIsOtherTyping(false);
      return;
    }
    const chatId = [user.uid, activeChat.uid].sort().join('_');
    const q = query(
      collection(db, 'typingStates'),
      where('chatId', '==', chatId),
      where('uid', '==', activeChat.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      let typingStatus = false;
      snap.forEach(doc => {
        const data = doc.data();
        // Only show if updated recently (within 5 seconds)
        if (data.isTyping) {
          const now = new Date().getTime();
          const lastUpdate = data.updatedAt?.toDate().getTime() || now; // Default to now if timestamp pending
          if (now - lastUpdate < 5000) {
            typingStatus = true;
          }
        }
      });
      setIsOtherTyping(typingStatus);
    });
    
    return () => unsub();
  }, [user?.uid, activeChat?.uid]);

  const recentChats = useMemo(() => {
    if (!user || allMessages.length === 0) return [];
    const chatsMap: { [chatId: string]: { lastMessage: any, otherUid: string } } = {};
    allMessages.forEach(msg => {
      const existing = chatsMap[msg.chatId];
      const msgTime = (msg.timestamp?.seconds || Date.now() / 1000);
      if (!existing || msgTime > (existing.lastMessage.timestamp?.seconds || 0)) {
        const otherUid = msg.participants.find(p => p !== user.uid) || user.uid;
        chatsMap[msg.chatId] = { lastMessage: msg, otherUid };
      }
    });
    return Object.values(chatsMap).sort((a, b) => 
      ((b.lastMessage.timestamp?.seconds || Date.now() / 1000) - (a.lastMessage.timestamp?.seconds || Date.now() / 1000))
    );
  }, [allMessages, user?.uid]);

  useEffect(() => {
    if (!user || recentChats.length === 0) return;
    const fetchChatUsers = async () => {
      const uidsToFetch = recentChats
        .map(c => c.otherUid)
        .filter(uid => !chatUsers.find(u => u.uid === uid) && !connectedUsers.find(u => u.uid === uid));
      
      if (uidsToFetch.length === 0) return;

      const chunks = [];
      for (let i = 0; i < uidsToFetch.length; i += 30) {
        chunks.push(uidsToFetch.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        try {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          const newUsers = snap.docs.map(d => d.data() as UserDoc);
          setChatUsers(prev => [...prev, ...newUsers]);
        } catch (error) {
          console.error('Error fetching chat users:', error);
        }
      }
    };
    fetchChatUsers();
  }, [recentChats, user?.uid]);

  useEffect(() => {
    if (view === 'chat' && activeChat && allMessages.length > 0) {
      markChatAsRead(activeChat.uid);
    }
  }, [view, activeChat?.uid, allMessages.length]);

  useEffect(() => {
    if (!user || allMessages.length === 0) return;
    const sentMessagesForMe = allMessages.filter(m => m.receiverUid === user.uid && m.status === 'sent');
    if (sentMessagesForMe.length === 0) return;

    const updateDelivered = async () => {
      try {
        const batch = writeBatch(db);
        sentMessagesForMe.forEach(msg => {
          batch.update(doc(db, 'messages', msg.id), { status: 'delivered' });
        });
        await batch.commit();
      } catch (error) {
        console.error('Error updating delivered status:', error);
      }
    };
    updateDelivered();
  }, [allMessages.length, user?.uid]);

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

  const isRecentlyActive = (institutionId: string) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return posts.some(p => p.schoolId === institutionId && (p.timestamp?.seconds * 1000 || 0) > twentyFourHoursAgo);
  };

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingInstitutionId, setUploadingInstitutionId] = useState<string | null>(null);
  const [pendingFollowerProfilesMap, setPendingFollowerProfilesMap] = useState<{[uid: string]: { displayName: string, photoURL?: string }}>({});
  const [schoolFeedTab, setSchoolFeedTab] = useState<'feed' | 'manage'>('feed');

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const groupedNotifications = useMemo(() => {
    let filtered = notifications;
    if (notificationReadFilter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }
    if (notificationTypeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === notificationTypeFilter);
    }

    const groups: { [key: string]: Notification[] } = {};
    filtered.forEach(notif => {
      let key = 'single_' + notif.id;
      if (notif.type === 'like' || notif.type === 'comment') {
        key = `${notif.type}_${notif.targetId}`;
      } else if (notif.type === 'message') {
        key = `message_${notif.senderUid}`;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });

    return Object.values(groups).sort((a, b) => {
      const timeA = a[0].timestamp?.seconds || 0;
      const timeB = b[0].timestamp?.seconds || 0;
      return timeB - timeA;
    });
  }, [notifications, notificationReadFilter, notificationTypeFilter]);

  const handleCreateNotification = async (targetUid: string, notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    try {
      await addDoc(collection(db, `users/${targetUid}/notifications`), {
        ...notification,
        timestamp: serverTimestamp(),
        isRead: false
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, `users/${user.uid}/notifications`, n.id), { isRead: true });
    });
    try {
      await batch.commit();
      showNotification('All notifications seen');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notifications`, notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const clearNotifications = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, `users/${user.uid}/notifications`, n.id));
    });
    try {
      await batch.commit();
      setNotifications([]);
      showNotification('Inbox cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!user || !userDoc?.following || userDoc.following.length === 0) {
      setConnectedUsers([]);
      return;
    }

    const fetchConnectedUsers = async () => {
      try {
        const followingUids = userDoc.following || [];
        // Fetch all users the current user follows
        const usersData: UserDoc[] = [];
        
        // Firestore 'in' query limit is 30
        const chunks = [];
        for (let i = 0; i < followingUids.length; i += 30) {
          chunks.push(followingUids.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const data = doc.data() as UserDoc;
            // A user is "connected" if they also follow the current user back
            if (data.following?.includes(user.uid)) {
              usersData.push(data);
            }
          });
        }
        setConnectedUsers(usersData);
      } catch (error) {
        console.error('Error fetching connected users:', error);
      }
    };

      fetchConnectedUsers();
  }, [user, userDoc?.following]);

  const fetchConnectedUsers = async () => {
    if (!user || !userDoc?.following || userDoc.following.length === 0) {
      setConnectedUsers([]);
      return;
    }
    try {
      const followingUids = userDoc.following || [];
      const usersData: UserDoc[] = [];
      const chunks = [];
      for (let i = 0; i < followingUids.length; i += 30) {
        chunks.push(followingUids.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const data = doc.data() as UserDoc;
          if (data.following?.includes(user.uid)) {
            usersData.push(data);
          }
        });
      }
      setConnectedUsers(usersData);
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  };

  useEffect(() => {
    fetchPendingFollowers();
  }, [user, userDoc?.pendingFollowers]);

  const fetchPendingFollowers = async () => {
    if (!user || !userDoc?.pendingFollowers || userDoc.pendingFollowers.length === 0) {
      setPendingFollowerProfiles([]);
      return;
    }
    try {
      const pendingUids = userDoc.pendingFollowers || [];
      const usersData: UserDoc[] = [];
      const chunks = [];
      for (let i = 0; i < pendingUids.length; i += 30) {
        chunks.push(pendingUids.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          usersData.push(doc.data() as UserDoc);
        });
      }
      setPendingFollowerProfiles(usersData);
    } catch (error) {
      console.error('Error fetching pending followers:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPullDistance(0);
    try {
      // Re-fetch all non-realtime or critical data
      if (user) {
        await Promise.all([
          fetchConnectedUsers(),
          fetchPendingFollowers()
        ]);
      }
      // Add a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification('Content refreshed');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
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
    const fetchProfiles = async () => {
      const pendingUids = managedInstitutions.flatMap(s => [
        ...(s.pendingFollowers || []),
        ...((s as any).pendingAuditors || [])
      ]);
      const uniqueUids = [...new Set(pendingUids)].filter(uid => !pendingFollowerProfilesMap[uid]);
      
      if (uniqueUids.length === 0) return;

      const newProfiles: {[uid: string]: { displayName: string, photoURL?: string }} = {};
      
      for (const uid of uniqueUids) {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid as string));
          if (userSnap.exists()) {
            const data = userSnap.data();
            newProfiles[uid as string] = { 
              displayName: data.displayName || 'Anonymous',
              photoURL: data.photoURL 
            };
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }

      if (Object.keys(newProfiles).length > 0) {
        setPendingFollowerProfilesMap(prev => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [managedInstitutions]);

  const unifiedFollowRequests = useMemo(() => {
    const list: any[] = [];
    
    // 1. Personal Follow Requests
    pendingFollowerProfiles.forEach(p => {
      list.push({
        id: `user_${p.uid}`,
        type: 'user_follow',
        requesterUid: p.uid,
        requesterName: p.displayName,
        requesterPhoto: p.photoURL,
        timestamp: Date.now()
      });
    });

    // 2. Institution Follow Requests
    managedInstitutions.forEach(inst => {
      if (inst.pendingFollowers) {
        inst.pendingFollowers.forEach(uid => {
          const profile = pendingFollowerProfilesMap[uid];
          list.push({
            id: `inst_${inst.id}_${uid}`,
            type: 'institution_follow',
            requesterUid: uid,
            requesterName: profile?.displayName || 'Loading...',
            requesterPhoto: profile?.photoURL,
            institutionId: inst.id,
            institutionName: inst.name,
            institution: inst,
            timestamp: Date.now()
          });
        });
      }

      // 3. Management (Auditor) Requests
      const pendingAuditors = (inst as any).pendingAuditors || [];
      pendingAuditors.forEach((uid: string) => {
        const profile = pendingFollowerProfilesMap[uid];
        list.push({
          id: `audit_${inst.id}_${uid}`,
          type: 'auditor_request',
          requesterUid: uid,
          requesterName: profile?.displayName || 'Loading...',
          requesterPhoto: profile?.photoURL,
          institutionId: inst.id,
          institutionName: inst.name,
          institution: inst,
          timestamp: Date.now()
        });
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [pendingFollowerProfiles, managedInstitutions, pendingFollowerProfilesMap]);

  const unreadRequestsCount = useMemo(() => unifiedFollowRequests.length, [unifiedFollowRequests]);

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

  const handleUpdateAdminPermission = async (institutionId: string, permission: 'owner' | 'followers' | 'everyone') => {
    // Deprecated in favor of handleToggleAdminViewer
  };

  const handleToggleAdminViewer = async (institutionId: string, viewerUid: string, action: 'add' | 'remove') => {
    if (!selectedSchool) return;
    try {
      const collectionName = selectedSchool.type === 'school' ? 'schools' : 'places';
      const docRef = doc(db, collectionName, institutionId);
      await updateDoc(docRef, {
        administrativeViewers: action === 'add' ? arrayUnion(viewerUid) : arrayRemove(viewerUid)
      });
      showNotification(action === 'add' ? 'Access granted' : 'Access revoked');
    } catch (error) {
      showNotification('Failed to update access', 'error');
    }
  };

  const handleSearchAuditors = async (term: string) => {
    setAuditorSearch(term);
    if (term.length < 3) { setAuditorResults([]); return; }
    setIsAuditorSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('displayName', '>=', term), 
        where('displayName', '<=', term + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setAuditorResults(snap.docs.map(d => d.data() as UserDoc).filter(u => u.uid !== user?.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditorSearching(false);
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
          bankName: 'Exona trust wallet',
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

  const handleSendMessage = async (receiverUid: string, text: string) => {
    if (!user || !text.trim()) return;
    const chatId = [user.uid, receiverUid].sort().join('_');
    try {
      await addDoc(collection(db, 'messages'), {
        senderUid: user.uid,
        receiverUid,
        participants: [user.uid, receiverUid],
        text: text.trim(),
        timestamp: serverTimestamp(),
        chatId,
        status: 'sent'
      });
      // Create notification for receiver
      await handleCreateNotification(receiverUid, {
        type: 'message',
        title: 'New Message',
        text: `${user.displayName}: ${text.trim().slice(0, 50)}...`,
        senderUid: user.uid,
        targetId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  const handleUpdateMessage = async (messageId: string, newText: string) => {
    if (!user || !newText.trim()) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: newText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  const markChatAsRead = async (otherUid: string) => {
    if (!user) return;
    const chatId = [user.uid, otherUid].sort().join('_');
    const unreadMessages = allMessages.filter(
      m => m.chatId === chatId && m.receiverUid === user.uid && m.status !== 'read'
    );
    
    if (unreadMessages.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        batch.update(doc(db, 'messages', msg.id), { status: 'read' });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking as read:', error);
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
    if (!user) { setView('login'); return; }
    if (!newPostContent.trim()) return;

    const isEditing = !!editingPost;
    const content = newPostContent.trim();
    if (!selectedFile) {
      setIsPostModalOpen(false);
      setNewPostContent('');
      setPreviewUrl(null);
      setEditingPost(null);
    }
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
      
      if (isEditing) {
        await setDoc(doc(db, 'posts', editingPost!.id), {
          content,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, path), {
          authorUid: user.uid,
          authorName: isOfficial && selectedSchool ? selectedSchool.name : (user.displayName || 'Anonymous'),
          authorPhoto: isOfficial && selectedSchool ? selectedSchool.logo : (user.photoURL || ''),
          content,
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
      if (selectedFile) {
        setNewPostContent('');
        setPreviewUrl(null);
        setSelectedFile(null);
        setEditingPost(null);
        setIsPostModalOpen(false);
      }
      showNotification(isEditing ? 'Broadcast updated' : 'Broadcast transmitted');
    } catch (error) {
      console.error('Post operation failed', error);
      showNotification('Transmission failed. Re-opening editor...', 'error');
      setNewPostContent(content);
      setIsPostModalOpen(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
    
    // Optimistic Update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likedBy: newLikedBy, likes: newLikedBy.length } : p));
    showNotification(isLiked ? 'Unliked' : 'Liked');

    try {
      await setDoc(doc(db, 'posts', postId), { 
        likedBy: newLikedBy, 
        likes: newLikedBy.length 
      }, { merge: true });

      if (!isLiked) {
        // Trigger notification for post author
        const post = posts.find(p => p.id === postId);
        if (post && post.authorUid !== user.uid) {
           await handleCreateNotification(post.authorUid, {
              type: 'like',
              title: 'New Like',
              text: `${user.displayName} liked your broadcast`,
              senderUid: user.uid,
              targetId: postId
           });
        }
      }
    } catch (error) {
      // Rollback
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likedBy, likes: likedBy.length } : p));
      showNotification('Failed to update like', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleEditProfile = () => {
    setEditingProfile({
      displayName: user?.displayName || '',
      bio: userDoc?.bio || '',
      isPrivate: userDoc?.isPrivate || false
    });
    setIsEditingProfileInline(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: editingProfile.displayName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: editingProfile.displayName,
        bio: editingProfile.bio,
        isPrivate: editingProfile.isPrivate
      }, { merge: true });
      showNotification('Profile updated');
      setIsEditingProfileInline(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile', 'error');
    }
  };

  const handleResharePost = async (post: Post) => {
    if (!user) { setView('login'); return; }
    showNotification('Broadcasting reshare...');
    try {
      // Optimistically update reshare count on original post
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, reshares: (p.reshares || 0) + 1 } : p));

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
      // Rollback
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, reshares: (p.reshares || 0) } : p));
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

      // Create notification for post author
      if (activePostForComments.authorUid !== user.uid) {
        await handleCreateNotification(activePostForComments.authorUid, {
          type: 'comment',
          title: 'New Comment',
          text: `${user.displayName} commented on your broadcast`,
          senderUid: user.uid,
          targetId: activePostForComments.id
        });
      }
    } catch (error) {
      showNotification('Failed to add comment', 'error');
      handleFirestoreError(error, OperationType.CREATE, `posts/${activePostForComments.id}/comments`);
    }
  };

  const handleUpdateComment = async (postId: string, commentId: string, newText: string) => {
    if (!user || !newText.trim()) return;
    try {
      await updateDoc(doc(db, `posts/${postId}/comments`, commentId), {
        text: newText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      showNotification('Comment updated');
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      showNotification('Failed to update comment', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
      // Optionally decrement comment count on post
      if (activePostForComments) {
        await setDoc(doc(db, 'posts', activePostForComments.id), { 
          commentsCount: Math.max(0, (activePostForComments.commentsCount || 0) - 1) 
        }, { merge: true });
      }
      showNotification('Comment deleted');
    } catch (error) {
      showNotification('Failed to delete comment', 'error');
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
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
          const docData = await ensureUserDocument(currentUser, storedRef);
          
          if (!docData?.country) {
            setView('onboarding');
          }
          
          // Listen real-time to user document
          userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserDoc(data);
              
              if (!data.country && view !== 'splash') {
                setView('onboarding');
              }
              
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
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

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

  // Data listeners - Master data (Schools/Places)
  useEffect(() => {
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

    return () => { unsubSchools(); unsubPlaces(); };
  }, []);

  // Data listeners - Personalized data (Posts, Admin data, Messages)
  useEffect(() => {
    let unsubPosts = () => {};
    let unsubAllRecords = () => {};
    let unsubAllAttendance = () => {};
    let unsubAllFinance = () => {};
    let unsubAllMessages = () => {};
    let unsubNotifications = () => {};

    if (user && userDoc) {
      // Notifications
      const qNotifications = query(collection(db, `users/${user.uid}/notifications`), orderBy('timestamp', 'desc'), limit(50));
      unsubNotifications = onSnapshot(qNotifications, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      }, (error) => {
        console.error('Notifications listener error:', error);
        if (user) {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
        }
      });

      // Personalized Feed
      const following = userDoc.following || [];
      const managedIds = [
        ...schools.filter(s => s.creatorUid === user.uid).map(s => s.id),
        ...places.filter(p => p.creatorUid === user.uid).map(p => p.id)
      ];
      const relevantIds = [...new Set([user.uid, ...following, ...managedIds, selectedSchool?.id].filter(Boolean))];
      
      if (relevantIds.length > 0) {
        const limitedIds = relevantIds.slice(0, 30);
        
        const qAuthor = query(collection(db, 'posts'), where('authorUid', 'in', limitedIds), orderBy('timestamp', 'desc'));
        const qSchool = query(collection(db, 'posts'), where('schoolId', 'in', limitedIds), orderBy('timestamp', 'desc'));
        
        const unsubAuthor = onSnapshot(qAuthor, (snap) => {
          const authorPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          setPosts(prev => {
            const otherPosts = prev.filter(p => !authorPosts.find(ap => ap.id === p.id));
            return [...otherPosts, ...authorPosts].sort((a, b) => {
              const tA = (a.timestamp as any)?.toMillis?.() || Date.now();
              const tB = (b.timestamp as any)?.toMillis?.() || Date.now();
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
              const tA = (a.timestamp as any)?.toMillis?.() || Date.now();
              const tB = (b.timestamp as any)?.toMillis?.() || Date.now();
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

      // Data for Download Center / Reports
      if (userDoc.role === 'admin') {
        unsubAllRecords = onSnapshot(collection(db, 'studentRecords'), (snap) => {
          setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
        });
        unsubAllFinance = onSnapshot(collection(db, 'finance'), (snap) => {
          setAllFinance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'finance');
        });
      } else {
        // Non-admins see records for all institutions they own OR are specifically authorized to view
        const ownedIds = [...schools, ...places].filter(s => s.creatorUid === user.uid).map(s => s.id);
        const authorizedIds = [...ownedIds];
        
        if (selectedSchool && !authorizedIds.includes(selectedSchool.id)) {
          const isAuthorized = selectedSchool.administrativeViewers?.includes(user.uid);
          if (isAuthorized) {
            authorizedIds.push(selectedSchool.id);
          }
        }

        if (authorizedIds.length > 0) {
          const qRecords = query(collection(db, 'studentRecords'), where('schoolId', 'in', authorizedIds));
          unsubAllRecords = onSnapshot(qRecords, (snap) => {
            setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
          });

          const qAttendance = query(collection(db, 'teacherAttendance'), where('schoolId', 'in', authorizedIds));
          unsubAllAttendance = onSnapshot(qAttendance, (snap) => {
            setAllAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAttendance)));
          });
        }
      }

      // Messages
      const messagesQuery = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
      unsubAllMessages = onSnapshot(messagesQuery, (snap) => {
        setAllMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      });
    }

    return () => { unsubPosts(); unsubAllRecords(); unsubAllAttendance(); unsubAllFinance(); unsubAllMessages(); };
  }, [user?.uid, userDoc?.role, userDoc?.following, schools.length, places.length, selectedSchool?.id]);

  useEffect(() => {
    if (!selectedSchool) return;

    // Only set up listeners if user is authorized to see this data
    const canAccess = selectedSchool.creatorUid === user?.uid || 
                     userDoc?.role === 'admin' || 
                     selectedSchool.administrativeViewers?.includes(user?.uid || '');

    if (!canAccess) {
      setRecords([]);
      setFinance(null);
      setAttendance([]);
      return;
    }
    
    const q = query(collection(db, 'studentRecords'), where('schoolId', '==', selectedSchool.id));
    const unsubRecords = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
    }, (error) => {
      console.error(`Error fetching ${labels.student.toLowerCase()} records:`, error);
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
  }, [selectedSchool, user?.uid, userDoc?.role]);

  const renderIconForNotification = (type: Notification['type']) => {
    switch (type) {
      case 'message': return <MessageSquare size={16} />;
      case 'follower_request': return <Users size={16} />;
      case 'like': return <Heart size={16} className="fill-red-500 text-red-500" />;
      case 'comment': return <MessageCircle size={16} />;
      case 'system': return <Settings size={16} />;
      default: return <Bell size={16} />;
    }
  };

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
      await ensureUserDocument(userCredential.user, localStorage.getItem('exona_ref'), {
        country: selectedSignupCountry.name,
        currency: selectedSignupCountry.currency
      });
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

  const handleMessageAuthor = (post: any) => {
    setActiveChat({
      uid: post.authorUid,
      displayName: post.authorName,
      photoURL: post.authorPhoto
    });
    setView('chat');
  };

  const handleSearchUsers = async (queryText: string) => {
    setGlobalSearch(queryText);
    if (!queryText.trim()) {
      setGlobalSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', queryText),
        where('displayName', '<=', queryText + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      const results: UserDoc[] = [];
      snap.forEach(doc => {
        if (doc.id !== user?.uid) {
          results.push(doc.data() as UserDoc);
        }
      });
      setGlobalSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleFollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }
    if (user.uid === targetUid) return;

    try {
      // Quick check if we have data to avoid unnecessary delay if it's already in view
      let targetData = selectedUserProfile?.uid === targetUid ? selectedUserProfileDoc : null;
      let isPrivate = false;

      if (!targetData) {
        const targetDoc = await getDoc(doc(db, 'users', targetUid));
        if (!targetDoc.exists()) return;
        targetData = targetDoc.data() as UserDoc;
      }
      
      isPrivate = targetData.isPrivate || false;

      if (isPrivate) {
        const pending = targetData.pendingFollowers || [];
        if (pending.includes(user.uid)) {
          showNotification('Request already sent');
          return;
        }
        await setDoc(doc(db, 'users', targetUid), { pendingFollowers: [...pending, user.uid] }, { merge: true });
        showNotification('Follow request sent');
      } else {
        const currentFollowing = userDoc.following || [];
        if (currentFollowing.includes(targetUid)) return;

        const newFollowing = [...currentFollowing, targetUid];
        const newTargetFollowers = [...(targetData.followers || []), user.uid];

        // Optimistic update
        setUserDoc({ ...userDoc, following: newFollowing });
        if (selectedUserProfile?.uid === targetUid) {
          setSelectedUserProfileDoc({ ...targetData, followers: newTargetFollowers });
        }
        showNotification('Following user');

        await setDoc(doc(db, 'users', user.uid), { following: newFollowing }, { merge: true });
        await setDoc(doc(db, 'users', targetUid), { followers: newTargetFollowers }, { merge: true });
      }
    } catch (error) {
      showNotification('Failed to follow user', 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAcceptFollower = async (requesterUid: string) => {
    if (!user || !userDoc) return;
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const requesterRef = doc(db, 'users', requesterUid);

      const newFollowers = [...(userDoc.followers || []), requesterUid];
      const newPending = (userDoc.pendingFollowers || []).filter(uid => uid !== requesterUid);
      
      await setDoc(currentUserRef, { 
        followers: newFollowers, 
        pendingFollowers: newPending 
      }, { merge: true });
      setUserDoc({ ...userDoc, followers: newFollowers, pendingFollowers: newPending });

      const requesterDoc = await getDoc(requesterRef);
      if (requesterDoc.exists()) {
        const requesterData = requesterDoc.data() as UserDoc;
        const newFollowing = [...(requesterData.following || []), user.uid];
        await setDoc(requesterRef, { following: newFollowing }, { merge: true });
      }

      showNotification('Follower accepted');
    } catch (error) {
      console.error('Error accepting follower:', error);
      showNotification('Failed to accept follower', 'error');
    }
  };

  const handleUnfollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }

    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUid);

      const currentFollowing = userDoc.following || [];
      const newFollowing = currentFollowing.filter((id: string) => id !== targetUid);
      
      // Optimistic update
      setUserDoc({ ...userDoc, following: newFollowing });
      if (selectedUserProfile?.uid === targetUid && selectedUserProfileDoc) {
        setSelectedUserProfileDoc({ 
          ...selectedUserProfileDoc, 
          followers: (selectedUserProfileDoc.followers || []).filter(id => id !== user.uid),
          pendingFollowers: (selectedUserProfileDoc.pendingFollowers || []).filter(id => id !== user.uid)
        });
      }
      showNotification('Unfollowed user');

      await setDoc(currentUserRef, { following: newFollowing }, { merge: true });
      await setDoc(targetUserRef, { 
        followers: arrayRemove(user.uid),
        pendingFollowers: arrayRemove(user.uid)
      }, { merge: true });
    } catch (error) {
      showNotification('Failed to unfollow user', 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeclineFollower = async (requesterUid: string) => {
    if (!user || !userDoc) return;
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const newPending = (userDoc.pendingFollowers || []).filter(uid => uid !== requesterUid);
      await setDoc(currentUserRef, { pendingFollowers: newPending }, { merge: true });
      setUserDoc({ ...userDoc, pendingFollowers: newPending });
      showNotification('Follow request declined');
    } catch (error) {
      console.error('Error declining follower:', error);
      showNotification('Failed to decline follower', 'error');
    }
  };

  const canManageInstitution = (school: School | Place | null) => {
    if (!user || !userDoc) return false;
    if (userDoc.role === 'admin') return true;
    if (!school) return false;
    return school.creatorUid === user.uid || school.administrativeViewers?.includes(user.uid);
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
      
      // Notify institution owner
      if (school.creatorUid !== user.uid) {
        await handleCreateNotification(school.creatorUid, {
          type: 'follower_request',
          title: 'New Request',
          text: `${user.displayName} wants to join ${school.name}`,
          senderUid: user.uid,
          targetId: school.id
        });
      }

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
        }, { merge: true }),
        // Create notification for the new joiner
        handleCreateNotification(followerUid, {
          type: 'follower_request',
          title: 'Request Approved',
          text: `You have been approved by ${school.name}`,
          targetId: school.id
        })
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

  const handleRequestAuditorAccess = async (school: School | Place) => {
    if (!user) { setView('login'); return; }
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      // We'll use a new field 'pendingAuditors' to store these requests
      await updateDoc(schoolRef, {
        pendingAuditors: arrayUnion(user.uid)
      });
      
      showNotification('Management request sent');
      
      // Also notify the creator
      if (school.creatorUid) {
        await handleCreateNotification(school.creatorUid, {
          type: 'message', 
          title: 'Auditor Request',
          text: `${user.displayName || 'A user'} requested auditor access for ${school.name}`,
          senderUid: user.uid,
          targetId: school.id,
          link: 'manage'
        });
      }
    } catch (error) {
      console.error('Error requesting auditor access:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleApproveAuditor = async (school: School | Place, applicantUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await updateDoc(schoolRef, {
        pendingAuditors: arrayRemove(applicantUid),
        administrativeViewers: arrayUnion(applicantUid)
      });
      
      showNotification('Auditor approved');
      
      await handleCreateNotification(applicantUid, {
        type: 'message',
        title: 'Auditor Approved',
        text: `Your auditor request for ${school.name} was approved!`,
        senderUid: user.uid,
        targetId: school.id,
        link: 'records'
      });
    } catch (error) {
      console.error('Error approving auditor:', error);
    }
  };

  const handleRejectAuditor = async (school: School | Place, applicantUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await updateDoc(schoolRef, {
        pendingAuditors: arrayRemove(applicantUid)
      });
      
      showNotification('Request rejected');
    } catch (error) {
      console.error('Error rejecting auditor:', error);
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
    // Only creators, administrative viewers, and system admins can see sensitive institutional data
    return canManageInstitution(school) || userDoc?.role === 'admin';
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
                    .filter(s => s.name.toLowerCase().includes(globalSearch.toLowerCase()))
                    .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                    .filter(s => {
                      // If searching, show all matching
                      if (globalSearch.trim() !== '') return true;
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
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden border border-gray-100 bg-white shrink-0 relative">
                              {school.logo ? (
                                <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-ink">{school.name.charAt(0)}</span>
                              )}
                              {isRecentlyActive(school.id) && (
                                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full ring-2 ring-white animate-pulse shadow-lg shadow-green-500/50" />
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
                          {(school.creatorUid === user?.uid || userDoc?.role === 'admin' || school.administrativeViewers?.includes(user?.uid || '')) && (
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
                                <span className="text-[9px] font-bold uppercase tracking-widest">{getLabels(school.type).attendance}</span>
                              </button>
                              <button 
                                onClick={() => { setSelectedSchool(school); handleNavigateToData('finance'); }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                              >
                                <Wallet size={12} className="group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Wallet</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="flex flex-col">
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
                        onMessage={handleMessageAuthor}
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
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleFollowInstitution(selectedSchool)}
                      className="w-full px-8 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 transition-all"
                    >
                      Request to Join
                    </button>
                    {!selectedSchool.administrativeViewers?.includes(user?.uid || '') && !(selectedSchool as any).pendingAuditors?.includes(user?.uid || '') && (
                      <button 
                        onClick={() => handleRequestAuditorAccess(selectedSchool)}
                        className="w-full px-8 py-3 bg-white border border-gray-100 text-muted rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                      >
                        Request Management Access
                      </button>
                    )}
                    {(selectedSchool as any).pendingAuditors?.includes(user?.uid || '') && (
                      <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Management Request Pending</p>
                    )}
                  </div>
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
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100 overflow-hidden">
                              {pendingFollowerProfilesMap[uid]?.photoURL ? (
                                <img src={pendingFollowerProfilesMap[uid].photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                pendingFollowerProfilesMap[uid]?.displayName?.charAt(0) || '?'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerProfilesMap[uid]?.displayName || 'Loading...'}</p>
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
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100 overflow-hidden">
                              {pendingFollowerProfilesMap[uid]?.photoURL ? (
                                <img src={pendingFollowerProfilesMap[uid].photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                pendingFollowerProfilesMap[uid]?.displayName?.charAt(0) || '?'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerProfilesMap[uid]?.displayName || 'Loading...'}</p>
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
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{labels.attendance}</span>
                    </button>
                    <button 
                      onClick={() => handleNavigateToData('finance')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Wallet size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Wallet</span>
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

                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Grant Data Access (Specific Owner)</p>
                    <div className="relative mb-4">
                      <input 
                        type="text" 
                        placeholder="Search account name..."
                        value={auditorSearch}
                        onChange={(e) => handleSearchAuditors(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-accent/20"
                      />
                      {isAuditorSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2"><Search className="animate-pulse text-muted" size={14} /></div>}
                    </div>

                    {auditorResults.length > 0 && (
                      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
                        {auditorResults.map(u => (
                          <button
                            key={u.uid}
                            onClick={() => { handleToggleAdminViewer(selectedSchool!.id, u.uid, 'add'); setAuditorResults([]); setAuditorSearch(''); }}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-100 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full border border-white" referrerPolicy="no-referrer" />
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-ink">{u.displayName}</p>
                              <p className="text-[9px] text-muted uppercase tracking-wider">{u.email.split('@')[0]}</p>
                            </div>
                            <Plus size={14} className="ml-auto text-accent" />
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedSchool.administrativeViewers && selectedSchool.administrativeViewers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest ml-4">Current Authorized Viewers</p>
                        {selectedSchool.administrativeViewers.map(uid => (
                          <div key={uid} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
                            <span className="text-[10px] font-bold text-ink font-mono">{uid.substring(0, 8)}...</span>
                            <button 
                              onClick={() => handleToggleAdminViewer(selectedSchool.id, uid, 'remove')}
                              className="text-[9px] font-bold text-red-600 uppercase tracking-widest hover:underline"
                            >
                              Revoke Access
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                    {selectedSchool.creatorUid === user?.uid && (
                      <button 
                        onClick={() => { setSchoolToDelete(selectedSchool.id); setIsDeleteSchoolModalOpen(true); }}
                        className="flex flex-col items-center gap-3 p-6 bg-red-50/30 rounded-2xl border border-transparent hover:border-red-100 transition-all group"
                      >
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Trash2 size={20} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-600/70">Delete Space</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  {schoolPosts.map(post => (
                    <FeedPost 
                      key={post.id} 
                      post={post} 
                      onUserClick={handleUserClick}
                      onLike={handleLikePost}
                      onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                      onMessage={handleMessageAuthor}
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
              {user && user.uid !== selectedUserProfile.uid && (
                <button 
                  onClick={() => {
                    setActiveChat({
                      uid: selectedUserProfile.uid,
                      displayName: selectedUserProfile.name,
                      photoURL: selectedUserProfile.photo
                    });
                    setView('chat');
                  }}
                  className="flex-1 py-2 bg-accent text-white rounded-xl font-bold text-[14px] hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  Message
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

            <div className="flex flex-col">
              {profilePosts.map(post => {
                const school = post.schoolId ? (schools.find(s => s.id === post.schoolId) || places.find(p => p.id === post.schoolId)) : null;
                return (
                  <FeedPost 
                    key={post.id} 
                    post={post} 
                    onUserClick={handleUserClick}
                    onLike={handleLikePost}
                    onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                    onMessage={handleMessageAuthor}
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

               {(myInstitutions.length > 0 || userDoc?.role === 'admin' || schools.some(s => s.administrativeViewers?.includes(user?.uid || '')) || places.some(s => s.administrativeViewers?.includes(user?.uid || ''))) && (
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
               )}

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
          .filter(r => r.studentName.toLowerCase().includes(recordSearch.toLowerCase()))
          .sort((a, b) => {
            if (recordSort === 'alphabet') {
              return a.studentName.localeCompare(b.studentName);
            } else if (recordSort === 'amount') {
              return (b.paid || 0) - (a.paid || 0);
            } else if (recordSort === 'date') {
              const dateA = a.timestamp?.seconds || 0;
              const dateB = b.timestamp?.seconds || 0;
              return dateB - dateA;
            }
            return 0;
          });
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
                  <div className="flex items-center bg-white border border-gray-100 p-1 rounded-lg">
                    <div className="px-2 text-muted mr-1 border-r border-gray-50">
                      <ArrowUpDown size={10} />
                    </div>
                    {(['alphabet', 'amount', 'date'] as const).map(s => (
                      <button 
                        key={s}
                        onClick={() => setRecordSort(s)}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${recordSort === s ? 'bg-gray-50 text-ink' : 'text-muted hover:text-ink'}`}
                      >
                        {s === 'alphabet' ? 'A-Z' : s === 'amount' ? 'Paid' : 'Date'}
                      </button>
                    ))}
                  </div>
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
                { label: 'Total Paid', value: `${currencySymbol}${totalPaid.toLocaleString()}`, icon: CreditCard },
                { label: 'Total Balance', value: `${currencySymbol}${totalBalance.toLocaleString()}`, icon: Wallet }
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
                        <td className="px-6 py-4 font-mono font-bold text-green-600 text-[13px]">{currencySymbol}{record.paid.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono font-bold text-red-600 text-[13px]">{currencySymbol}{record.balance.toLocaleString()}</td>
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
                                <button 
                                  onClick={() => { setRecordForReceipt(record); setIsReceiptModalOpen(true); }}
                                  className="p-2 text-muted hover:text-accent transition-all"
                                  title="Export Receipt"
                                >
                                  <FileText size={14} />
                                </button>
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
                        <button 
                          onClick={() => { setRecordForReceipt(record); setIsReceiptModalOpen(true); }}
                          className="p-2 text-muted hover:text-accent transition-all"
                        >
                          <FileText size={14} />
                        </button>
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
                        <p className="font-mono font-bold text-green-600 text-sm">{currencySymbol}{record.paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Balance</p>
                        <p className="font-mono font-bold text-red-600 text-sm">{currencySymbol}{record.balance.toLocaleString()}</p>
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
            title={`${selectedSchool.name} Wallet`}
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
              <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Wallet Statement • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-ink rounded-sm p-12 text-white mb-12 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Institution Balance</p>
                <h3 className="text-6xl font-mono font-medium tracking-tighter mb-8">{currencySymbol}{finance?.institutionBalance.toLocaleString() || '0'}</h3>
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
                <h4 className="font-extrabold text-2xl text-ink border-b border-gray-100 pb-4">Wallet Information</h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Wallet Name</p>
                    <p className="font-bold text-ink text-sm">{(finance?.bankName === 'Exona Trust Bank' || !finance?.bankName) ? 'Exona trust wallet' : finance.bankName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Wallet ID</p>
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
        const labels = selectedSchool ? getLabels(selectedSchool.type) : getLabels();
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center text-muted mb-8">
                <Compass size={48} strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-extrabold text-ink mb-4">Select an Institution</h2>
              <p className="text-muted text-sm font-bold max-w-xs mb-10 leading-relaxed">
                To view or record {labels.attendance.toLowerCase()}, please first select an institution from your directory.
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
        const filteredAttendance = attendance.filter(r => 
          r.teacherName.toLowerCase().includes(attendanceSearch.toLowerCase())
        );
        const presentToday = filteredAttendance.filter(r => r.status === 'present').length;
        const absentToday = filteredAttendance.filter(r => r.status === 'absent').length;

        return (
          <WordLayout 
            title={`${selectedSchool.name} ${labels.attendance}`}
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
                          Record {labels.attendance}
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
                  Record {labels.attendance}
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
                        <p className="font-bold text-lg text-muted">No {labels.attendance.toLowerCase()} records found</p>
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
                  <p className="font-bold text-muted">No {labels.attendance.toLowerCase()} records found</p>
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
      case 'search': {
        const query = globalSearch.toLowerCase();
        const filteredInstitutions = [...schools, ...places].filter(inst => 
          inst.name.toLowerCase().includes(query)
        );

        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="md:hidden flex items-center gap-4 mb-8">
              <button 
                onClick={() => { setView('feed'); setGlobalSearch(''); }}
                className="h-12 w-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-muted hover:text-ink transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-accent/20 outline-none transition-all text-sm font-medium" 
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-8">
              {/* Institutions Section */}
              {filteredInstitutions.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 px-1">Institutions</p>
                  <div className="grid grid-cols-1 gap-3">
                    {filteredInstitutions.map(inst => (
                      <button 
                        key={inst.id}
                        onClick={() => {
                          if (inst.type === 'school') {
                            setSelectedSchool(inst as School);
                            setView('school-feed');
                          } else {
                            setSelectedPlace(inst as Place);
                            setView('place-feed');
                          }
                        }}
                        className="w-full p-4 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group flex items-center gap-4"
                      >
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-accent group-hover:scale-110 transition-transform overflow-hidden border border-gray-100">
                          {inst.logo ? (
                            <img src={inst.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <GraduationCap size={20} />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-ink tracking-tight truncate">{inst.name}</p>
                          <p className="text-[10px] text-muted font-medium uppercase tracking-widest">{inst.type}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* People Section */}
              {(globalSearchResults.length > 0 || isSearchingUsers) && (
                <section>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 px-1">People</p>
                  {isSearchingUsers ? (
                    <div className="p-8 text-center">
                      <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {globalSearchResults.map(result => (
                        <button 
                          key={result.uid}
                          onClick={() => handleUserClick({ uid: result.uid, name: result.displayName || 'User', photo: result.photoURL || '' })}
                          className="w-full p-4 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group flex items-center gap-4"
                        >
                          <div className="h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                            {result.photoURL ? (
                              <img src={result.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full bg-gray-50 flex items-center justify-center text-muted">
                                <UserIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-ink tracking-tight truncate">{result.displayName}</p>
                            <p className="text-[10px] text-muted font-medium truncate">@{result.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
                          </div>
                          <ChevronRight size={14} className="text-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {filteredInstitutions.length === 0 && globalSearchResults.length === 0 && !isSearchingUsers && (
                <div className="py-20 text-center px-8">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                    <Search size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">
                    {globalSearch ? `No results for "${globalSearch}"` : 'Search for anything'}
                  </h3>
                  <p className="text-sm text-muted">
                    {globalSearch ? 'Try a different keyword' : 'Search for schools, colleges, institutions, or people on Exona.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'chat': {
        if (!user) { setView('login'); return null; }
        
        if (activeChat) {
          const chatMessages = allMessages
            .filter(m => m.chatId === [user.uid, activeChat.uid].sort().join('_'))
            .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

          return (
            <div className="flex flex-col bg-card">
              <div className="flex items-center gap-4 p-4 border-b border-gray-100 sticky top-0 bg-card/80 backdrop-blur-md z-30">
                <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center">
                  {activeChat.photoURL ? (
                    <img src={activeChat.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-muted text-[10px] font-bold">{activeChat.displayName?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm leading-tight">{activeChat.displayName}</h3>
                  <div className="flex items-center gap-1">
                    {isOtherTyping ? (
                      <p className="text-[10px] text-accent font-bold animate-pulse uppercase tracking-widest">Typing...</p>
                    ) : (
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Connected</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 pb-48">
                {chatMessages.length === 0 ? (
                  <div className="py-20 text-center opacity-30">
                    <MessageSquare size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">No messages yet. Say hi!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className="relative group max-w-[80%]">
                        <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm relative ${
                          msg.senderUid === user.uid 
                            ? 'bg-ink text-white rounded-tr-none' 
                            : 'bg-gray-100 text-ink rounded-tl-none'
                        }`}>
                          {editingMessageId === msg.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                className="bg-white/10 text-white border-none outline-none rounded-lg p-2 resize-none h-20"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="text-[10px] font-bold uppercase py-1 px-2 border border-white/20 rounded">Cancel</button>
                                <button onClick={() => handleUpdateMessage(msg.id, editingMessageText)} className="text-[10px] font-bold uppercase py-1 px-2 bg-white text-black rounded">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                              <div className={`flex items-center gap-1 mt-1 opacity-70 ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}>
                                {msg.isEdited && <span className="text-[8px] italic mr-1">edited</span>}
                                <span className="text-[9px]">{formatTime(msg.timestamp)}</span>
                                {msg.senderUid === user.uid && (
                                  <span className={msg.status === 'read' ? 'text-blue-400' : 'text-gray-400'}>
                                    {msg.status === 'sent' ? <Check size={12} /> : <CheckCheck size={12} />}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {msg.senderUid === user.uid && editingMessageId !== msg.id && (
                          <div className="absolute top-1/2 -left-10 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                if (activeMessageMenuId === msg.id) {
                                  setActiveMessageMenuId(null);
                                } else {
                                  setActiveMessageMenuId(msg.id);
                                }
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-gray-100 rounded-full"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {activeMessageMenuId === msg.id && (
                              <div className="absolute bottom-full mb-2 left-0 w-32 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <button 
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingMessageText(msg.text);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-ink hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDeleteMessage(msg.id);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={12} /> Unsend
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-card border border-gray-100 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 z-40">
                {isOtherTyping && (
                  <div className="px-4 py-1 flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1 w-1 bg-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1 w-1 bg-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1 w-1 bg-accent rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest italic">{activeChat.displayName} is typing...</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (handleSendMessage(activeChat.uid, chatInput), setChatInput(''))}
                    className="flex-1 bg-gray-50 border-none outline-none px-4 py-3 rounded-xl text-sm font-medium"
                  />
                  <button 
                    onClick={() => { handleSendMessage(activeChat.uid, chatInput); setChatInput(''); }}
                    className="h-10 w-10 bg-ink text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="w-full max-w-xl mx-auto pb-32">
            <div className="flex items-center justify-between py-8 px-4">
              <h2 className="text-3xl font-bold text-ink tracking-tight font-display">Chats</h2>
            </div>
            
            <div className="flex border-b border-gray-100 mb-6 px-4">
              <button 
                onClick={() => setChatTab('chats')}
                className={`flex-1 py-3 text-[14px] font-bold transition-all border-b-2 ${chatTab === 'chats' ? 'text-ink border-ink' : 'text-muted border-transparent'}`}
              >
                Messages
              </button>
              <button 
                onClick={() => setChatTab('requests')}
                className={`flex-1 py-3 text-[14px] font-bold transition-all border-b-2 relative ${chatTab === 'requests' ? 'text-ink border-ink' : 'text-muted border-transparent'}`}
              >
                Requests
                {unreadRequestsCount > 0 && (
                  <span className="absolute top-2 right-4 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            </div>

            {chatTab === 'chats' ? (
              <div className="divide-y divide-gray-100">
                {recentChats.length === 0 ? (
                  <div className="py-20 text-center px-8">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">No messages yet</h3>
                    <p className="text-sm text-muted">Start a conversation by finding someone in the search bar or visiting their profile.</p>
                  </div>
                ) : (
                  recentChats.map(chat => {
                    const otherUser = connectedUsers.find(u => u.uid === chat.otherUid) || chatUsers.find(u => u.uid === chat.otherUid) || { uid: chat.otherUid, displayName: 'User', photoURL: null };
                    const unreadCount = allMessages.filter(m => m.chatId === chat.lastMessage.chatId && m.receiverUid === user.uid && m.status !== 'read').length;

                    return (
                      <button 
                        key={chat.lastMessage.chatId}
                        onClick={() => setActiveChat({
                          uid: otherUser.uid,
                          displayName: otherUser.displayName || (otherUser as any).name,
                          photoURL: otherUser.photoURL || (otherUser as any).photo
                        })}
                        className="w-full p-4 hover:bg-gray-50 transition-all text-left flex items-center gap-4 group"
                      >
                        <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                          {(otherUser.photoURL || (otherUser as any).photo) ? (
                            <img src={otherUser.photoURL || (otherUser as any).photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-muted text-xs font-bold">{(otherUser.displayName || (otherUser as any).name)?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-ink text-[15px] truncate">{otherUser.displayName || (otherUser as any).name}</h3>
                            <span className="text-[10px] text-muted font-medium ml-2">
                              {formatTime(chat.lastMessage.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-1 truncate">
                              {chat.lastMessage.senderUid === user.uid && (
                                <span className={chat.lastMessage.status === 'read' ? 'text-blue-400' : 'text-gray-400'}>
                                  {chat.lastMessage.status === 'sent' ? <Check size={12} /> : <CheckCheck size={12} />}
                                </span>
                              )}
                              <p className={`text-[13px] truncate ${unreadCount > 0 ? 'text-ink font-bold' : 'text-muted'}`}>
                                {chat.lastMessage.text}
                              </p>
                            </div>
                            {unreadCount > 0 && (
                              <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full ml-2">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {unifiedFollowRequests.length === 0 ? (
                  <div className="py-20 text-center px-8">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                      <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Inbox is empty</h3>
                    <p className="text-sm text-muted">Follow requests for you and your institutions will appear here.</p>
                  </div>
                ) : (
                  unifiedFollowRequests.map(req => (
                    <div key={req.id} className="w-full p-4 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                        {req.requesterPhoto ? (
                          <img src={req.requesterPhoto} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-muted text-xs font-bold">{req.requesterName?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-ink text-[15px] truncate">{req.requesterName}</h3>
                        <p className="text-[12px] text-muted truncate">
                          {req.type === 'user_follow' ? 'wants to follow you' : 
                           req.type === 'institution_follow' ? `wants to join ${req.institutionName}` :
                           `wants management access for ${req.institutionName}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (req.type === 'user_follow') handleAcceptFollower(req.requesterUid);
                            else if (req.type === 'institution_follow') handleApproveFollower(req.institution, req.requesterUid);
                            else handleApproveAuditor(req.institution, req.requesterUid);
                          }}
                          className="px-4 py-2 bg-ink text-white rounded-xl font-bold text-[12px] hover:bg-ink/90 transition-all"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => {
                            if (req.type === 'user_follow') handleDeclineFollower(req.requesterUid);
                            else if (req.type === 'institution_follow') handleRejectFollower(req.institution, req.requesterUid);
                            else handleRejectAuditor(req.institution, req.requesterUid);
                          }}
                          className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-[12px] hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      }
      case 'notifications': {
        if (!user) { setView('login'); return null; }
        return (
          <div className="w-full max-w-xl mx-auto py-8">
            <div className="px-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-ink tracking-tight font-display">Notice Center</h2>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{unreadNotificationsCount} unread alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMarkAllNotificationsRead}
                  className="p-2.5 text-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={20} />
                </button>
                <button 
                  onClick={clearNotifications}
                  className="p-2.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Clear all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 mb-6 space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['all', 'message', 'like', 'comment', 'follower_request'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setNotificationTypeFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      notificationTypeFilter === f 
                        ? 'bg-ink text-white shadow-lg' 
                        : 'bg-white border border-gray-100 text-muted hover:border-gray-300'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setNotificationReadFilter('all')}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      notificationReadFilter === 'all' ? 'bg-gray-100 text-ink' : 'text-muted'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setNotificationReadFilter('unread')}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      notificationReadFilter === 'unread' ? 'bg-gray-100 text-ink' : 'text-muted'
                    }`}
                  >
                    Unread
                  </button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 border-t border-gray-50">
              {groupedNotifications.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-muted/20">
                    <Bell size={40} />
                  </div>
                  <p className="text-muted font-bold">No notifications found.</p>
                </div>
              ) : (
                groupedNotifications.map((group, groupIdx) => {
                  const firstNotif = group[0];
                  const count = group.length;
                  const isRead = group.every(n => n.isRead);

                  return (
                    <div 
                      key={groupIdx}
                      className={`p-5 transition-all flex items-start gap-4 relative group ${!isRead ? 'bg-accent/5' : 'hover:bg-gray-50/50'}`}
                    >
                      <div className="shrink-0 pt-1">
                        {firstNotif.type === 'like' && <Heart className="text-red-500 fill-red-500" size={20} />}
                        {firstNotif.type === 'comment' && <MessageCircle className="text-blue-500" size={20} />}
                        {firstNotif.type === 'message' && <MessageSquare className="text-accent" size={20} />}
                        {firstNotif.type === 'follower_request' && <UserPlus className="text-purple-500" size={20} />}
                        {firstNotif.type === 'system' && <Settings className="text-gray-500" size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-[15px] ${!isRead ? 'font-bold' : 'font-medium'} text-ink truncate`}>
                            {firstNotif.title} {count > 1 && <span className="text-muted text-[13px] font-medium ml-1">and {count - 1} more</span>}
                          </h4>
                          <span className="text-[10px] text-muted font-medium shrink-0 ml-2">
                            {formatTime(firstNotif.timestamp)}
                          </span>
                        </div>
                        <p className="text-[13px] text-muted line-clamp-2 leading-relaxed">
                          {firstNotif.text}
                        </p>
                        
                        <div className="mt-3 flex items-center gap-3">
                          {!isRead && (
                            <button 
                              onClick={() => {
                                group.forEach(n => handleMarkNotificationRead(n.id));
                              }}
                              className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                            >
                              Mark seen
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              group.forEach(n => handleDismissNotification(n.id));
                            }}
                            className="text-[10px] font-bold text-muted uppercase tracking-widest hover:text-red-600"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>

                      {/* Dot for unread */}
                      {!isRead && (
                        <div className="absolute top-6 left-2 w-2 h-2 bg-accent rounded-full" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }
      case 'tools': {
        const isOwner = selectedSchool?.creatorUid === user?.uid;
        const canAccessAdmin = isOwner || selectedSchool?.administrativeViewers?.includes(user?.uid || '');

        const userInstitution = canAccessAdmin ? selectedSchool : (schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid));
        
        const tools = [
          { id: 'calculator', name: 'Fee Calculator', description: 'Quickly calculate student fees and balances', icon: Calculator, color: 'accent' },
          { id: 'export', name: 'Download Center', description: 'Download complete institutional records and full history', icon: Download, color: 'blue-600' },
          { id: 'export-attendance', name: 'Participation Hub', description: 'Export attendance and participation records', icon: Users, color: 'orange-600' },
          { id: 'export-wallet', name: 'Wallet Center', description: 'Download wallet statements and financial history', icon: Wallet, color: 'green-600' },
          { id: 'penalty', name: 'Penalty Board', description: 'View disciplinary records and notices', icon: ShieldAlert, color: 'red-600' },
          { id: 'referral', name: 'Referral Hub', description: 'Manage your referrals and rewards', icon: Gift, color: 'green-600' },
          { id: 'id-gen', name: 'ID Generator', description: 'Generate student and staff ID cards', icon: IdCard, color: 'blue-600' },
          { id: 'reports', name: 'Report Center', description: 'Generate financial and academic reports', icon: FileBarChart, color: 'purple-600' },
        ];

        if (activeTool === 'export-attendance') {
          const baseAttendance = allAttendance.length > 0 ? allAttendance : attendance;
          const filteredAttendance = baseAttendance.filter(a => {
            if (!exportStartDate && !exportEndDate) return true;
            const recordDate = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date);
            if (exportStartDate && recordDate < new Date(exportStartDate)) return false;
            if (exportEndDate) {
              const end = new Date(exportEndDate);
              end.setHours(23, 59, 59, 999);
              if (recordDate > end) return false;
            }
            return true;
          });

          return (
            <WordLayout 
              title="Participation records"
              subtitle="Attendance & Activity Export"
              icon={Users}
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
              toolbar={
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-sm"
                  >
                    All Participation
                  </button>
                </div>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Participation Archive</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Exona Attendance System • Generated on {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 mb-12 no-print">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Duration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Start Date</label>
                        <input 
                          type="date" 
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">End Date</label>
                        <input 
                          type="date" 
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-8 py-4 bg-white border border-gray-200 text-ink rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Date</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Name</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-20 text-center text-muted font-medium italic">No participation records found</td>
                      </tr>
                    ) : (
                      filteredAttendance.map((a, i) => (
                        <tr key={a.id} className="border-b border-gray-100">
                          <td className="py-4 text-xs font-mono text-muted">{new Date(a.timestamp?.toDate?.() || a.date).toLocaleDateString()}</td>
                          <td className="py-4 text-sm font-bold text-ink">{a.teacherName}</td>
                          <td className="py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              a.status === 'present' ? 'bg-green-100 text-green-600' :
                              a.status === 'late' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'export-wallet') {
          return (
            <WordLayout 
              title="Wallet statement"
              subtitle="Financial Position & Account Summary"
              icon={Wallet}
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Wallet Summary Statement</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Institutional Wallet Terminal • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Total Balance</p>
                    <p className="text-4xl font-black text-ink">{currencySymbol}{finance?.institutionBalance?.toLocaleString() || '0.00'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Account Name</p>
                    <p className="text-lg font-bold text-ink uppercase tracking-tight">{finance?.accountName || 'Not Set'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Wallet ID</p>
                    <p className="text-sm font-mono font-bold text-ink">{finance?.accountNumber || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-accent">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Asset Description</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 text-sm font-bold text-ink">Locked Balance (Fees Pending)</td>
                      <td className="py-4 text-sm font-bold text-ink text-right">{currencySymbol}{allRecords.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 text-sm font-bold text-ink">Settled Balance (Withdrawal Ready)</td>
                      <td className="py-4 text-sm font-bold text-green-600 text-right">{currencySymbol}{(finance?.institutionBalance || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-ink text-white">
                      <td className="py-6 px-6 text-xs font-black uppercase tracking-widest">Gross Institutional Worth</td>
                      <td className="py-6 px-6 text-xl font-black text-right">{currencySymbol}{( (finance?.institutionBalance || 0) + allRecords.reduce((acc, r) => acc + r.balance, 0) ).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'calculator') {
          const balance = (Number(calcTuition) || 0) - (Number(calcPaid) || 0);
          return (
            <WordLayout 
              title="Fee Calculator"
              subtitle="Institutional Financial Utility"
              icon={Calculator}
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
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
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={calcTuition}
                        onChange={(e) => setCalcTuition(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Amount Paid</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={calcPaid}
                        onChange={(e) => setCalcPaid(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                  <div className="pt-8 border-t border-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-bold text-muted uppercase tracking-widest">Outstanding Balance</p>
                      <p className="text-3xl font-extrabold text-red-600">{currencySymbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <button className="w-full py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all">Generate Invoice Preview</button>
                  </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'export') {
          const baseRecords = allRecords.length > 0 ? allRecords : records;
          const filteredRecords = baseRecords.filter(r => {
            // Category Filter
            if (exportCategory !== 'all' && r.type !== exportCategory) return false;
            
            // Date Filter
            if (!exportStartDate && !exportEndDate) return true;
            const recordDate = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
            if (exportStartDate && recordDate < new Date(exportStartDate)) return false;
            if (exportEndDate) {
              const end = new Date(exportEndDate);
              end.setHours(23, 59, 59, 999);
              if (recordDate > end) return false;
            }
            return true;
          });

          const categories: { id: typeof exportCategory, label: string }[] = [
            { id: 'all', label: 'All Records' },
            { id: 'general', label: 'General' },
            { id: 'books', label: 'Books' },
            { id: 'uniforms', label: 'Uniforms' },
            { id: 'services', label: 'Services' },
            { id: 'products', label: 'Products' },
          ];

          return (
            <WordLayout 
              title="Download Center"
              subtitle="Data Export & Archival"
              icon={Download}
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
              toolbar={
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-sm"
                  >
                    Load Full Record
                  </button>
                </div>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Record Summary</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Exona Data Terminal • Generated on {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 mb-12 no-print flex flex-col gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setExportCategory(cat.id)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          exportCategory === cat.id 
                            ? 'bg-ink text-white shadow-lg shadow-ink/20' 
                            : 'bg-white text-muted border border-gray-100 hover:border-accent/20 hover:text-ink'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Duration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Start Date</label>
                        <input 
                          type="date" 
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">End Date</label>
                        <input 
                          type="date" 
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); setExportCategory('all'); }} 
                    className="px-8 py-4 bg-white border border-gray-200 text-ink rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Date</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Name</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Category</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Paid</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-muted font-medium italic">No records found for the selected period</td>
                      </tr>
                    ) : (
                      filteredRecords.map((record, i) => (
                        <tr key={record.id} className="border-b border-gray-100">
                          <td className="py-4 text-xs font-mono text-muted">{new Date(record.timestamp?.toDate?.() || record.timestamp).toLocaleDateString()}</td>
                          <td className="py-4 text-sm font-bold text-ink">{record.studentName}</td>
                          <td className="py-4 text-[10px] font-bold text-muted uppercase tracking-widest">{record.category}</td>
                          <td className="py-4 text-sm font-bold text-ink text-right tabular-nums">{currencySymbol}{record.paid.toLocaleString()}</td>
                          <td className="py-4 text-sm font-bold text-red-600 text-right tabular-nums">{currencySymbol}{record.balance.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredRecords.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-ink">Institutional Total</td>
                        <td className="py-4 px-4 text-base font-black text-ink text-right tabular-nums">
                          {currencySymbol}{filteredRecords.reduce((acc, r) => acc + r.paid, 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-base font-black text-red-600 text-right tabular-nums">
                          {currencySymbol}{filteredRecords.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-[10px] font-medium text-muted uppercase tracking-[0.4em] mb-2">End of Official Record</p>
                <div className="flex items-center justify-center gap-2 opacity-50">
                  <div className="h-6 w-6 bg-ink rounded-lg flex items-center justify-center text-white font-black text-[10px]">E</div>
                  <span className="text-[10px] font-black text-ink tracking-tighter">EXONA SYSTEM CERTIFIED</span>
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
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
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
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
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
                      Share this link with other institutions. For every successful registration, you earn {currencySymbol}5,000 in credits.
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
                      <p className="text-2xl font-extrabold text-green-600">{currencySymbol}0.00</p>
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
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
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
              branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
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
            title={userInstitution ? userInstitution.name : "Tools Hub"}
            subtitle={canAccessAdmin && !isOwner ? "Authorized Access" : "Institutional Utility Suite"}
            icon={LayoutGrid}
            branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">Utility Terminal</h1>
              <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">
                {userInstitution ? `${userInstitution.name} Operations` : 'System Tools'} • {new Date().toLocaleDateString()}
              </p>
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
              <div className="flex-1 mr-4 min-h-[80px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {isEditingProfileInline ? (
                    <motion.div 
                      key="edit-name"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Display Name</label>
                      <input 
                        type="text" 
                        value={editingProfile.displayName}
                        onChange={(e) => setEditingProfile({...editingProfile, displayName: e.target.value})}
                        className="text-xl font-bold text-ink bg-gray-50 border border-gray-100 outline-none rounded-xl px-4 py-2 w-full focus:bg-white focus:border-accent/20 transition-all"
                        placeholder="Your name..."
                        autoFocus
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-name"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h2 className="text-2xl font-bold text-ink mb-1">{user.displayName}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-ink text-[14px]">{user.email?.split('@')[0]}</p>
                        <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-full text-muted text-[11px] font-bold">exona.io</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative group h-20 w-20 shrink-0">
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

            <div className="mb-6 min-h-[60px]">
              <AnimatePresence mode="wait">
                {isEditingProfileInline ? (
                  <motion.div 
                    key="edit-bio"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Bio</label>
                    <textarea 
                      value={editingProfile.bio}
                      onChange={(e) => setEditingProfile({...editingProfile, bio: e.target.value})}
                      className="w-full text-ink text-[14px] bg-gray-50 border border-gray-100 outline-none rounded-xl p-4 h-32 resize-none focus:bg-white focus:border-accent/20 transition-all leading-relaxed"
                      placeholder="Tell the world about yourself..."
                    />
                  </motion.div>
                ) : (
                  <motion.p 
                    key="view-bio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-ink text-[14px] whitespace-pre-wrap"
                  >
                    {userDoc?.bio || "No bio yet."}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3 mb-10">
              <AnimatePresence mode="wait">
                {isEditingProfileInline ? (
                  <motion.div 
                    key="edit-actions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4 w-full"
                  >
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-ink">Private Account</p>
                        <p className="text-[10px] text-muted font-medium">Only followers can see your broadcasts</p>
                      </div>
                      <button 
                        onClick={() => setEditingProfile({...editingProfile, isPrivate: !editingProfile.isPrivate} as any)}
                        className={`w-12 h-6 rounded-full transition-all relative ${editingProfile.isPrivate ? 'bg-accent' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full"
                          animate={{ x: editingProfile.isPrivate ? 24 : 0 }}
                        />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleUpdateProfile}
                        className="flex-1 py-3 bg-ink text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10 flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Save
                      </button>
                      <button 
                        onClick={() => setIsEditingProfileInline(false)}
                        className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="view-actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-3 w-full"
                  >
                    <button 
                      onClick={handleEditProfile}
                      className="flex-1 py-3 bg-ink text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
                    >
                      Edit profile
                    </button>
                    <button className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-gray-50 transition-all">
                      Share profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-12 mt-12">
              <section>
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Workspace Settings</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: Shield, label: 'Security & Privacy', desc: 'Manage your account protection', color: 'blue-600' },
                    { icon: Bell, label: 'Notification Center', desc: 'Configure your alert preferences', color: 'orange-500' },
                    { icon: Sparkles, label: 'Appearance', desc: `Current: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`, color: 'purple-600', onClick: () => setIsThemeModalOpen(true) },
                    { icon: Database, label: 'Data & Storage', desc: 'Manage your institutional data', color: 'accent' }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={item.onClick}
                      className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group"
                    >
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
      <div className="flex h-screen flex-col items-center justify-center bg-paper text-ink overflow-hidden relative">
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

  if (view === 'onboarding') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-sm text-center"
        >
          <div className="bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-2xl shadow-ink/5">
             <div className="h-20 w-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-8">
               <Compass size={32} />
             </div>
             <h2 className="text-3xl font-black text-ink mb-2 tracking-tight">Final Step</h2>
             <p className="text-muted text-sm font-medium mb-10 leading-relaxed uppercase tracking-[0.05em]">
               Initialize your localization preferences to complete registration.
             </p>
             
             <div className="space-y-4 mb-10 text-left">
               <div className="relative group">
                  <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 block ml-4">Country & Base Currency</label>
                  <select 
                    value={onboardingCountry.code}
                    onChange={(e) => {
                      const country = COUNTRIES.find(c => c.code === e.target.value);
                      if (country) setOnboardingCountry(country);
                    }}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-[38px] pointer-events-none text-muted">
                    <ChevronDown size={18} />
                  </div>
               </div>
             </div>

             <button 
               onClick={async () => {
                 if (!user) return;
                 setIsUploading(true);
                 try {
                   await setDoc(doc(db, 'users', user.uid), { 
                     country: onboardingCountry.name,
                     currency: onboardingCountry.currency
                   }, { merge: true });
                   setView('feed');
                   showNotification('Globalization protocol finalized');
                 } catch (error) {
                   showNotification('Handshake failed', 'error');
                 } finally {
                   setIsUploading(false);
                 }
               }}
               disabled={isUploading}
               className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-ink/90 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
             >
               {isUploading ? (
                 <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               ) : (
                 <BadgeCheck size={18} />
               )}
               Authorize Profile
             </button>
          </div>
          <div className="mt-8 text-center">
            <button onClick={handleLogout} className="text-xs font-bold text-muted hover:text-ink transition-colors uppercase tracking-[0.2em]">Abort & Sign Out</button>
          </div>
        </motion.div>
      </div>
    );
  }

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
                <>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                  />
                  <div className="relative group">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 block ml-4">Select Country (Currency)</label>
                    <select 
                      value={selectedSignupCountry.code}
                      onChange={(e) => {
                        const country = COUNTRIES.find(c => c.code === e.target.value);
                        if (country) setSelectedSignupCountry(country);
                      }}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold appearance-none cursor-pointer"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-[38px] pointer-events-none text-muted">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </>
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
      {!isOnline && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-orange-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl flex items-center gap-2"
        >
          <Clock size={12} className="animate-spin" />
          Offline Mode: Data will sync when back online
        </motion.div>
      )}
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
              className="w-full max-w-6xl bg-card rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
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
              className="w-full max-w-md bg-card rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
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
              className="w-full max-w-4xl bg-card rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
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
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Paid ({currencySymbol})</label>
                    <input 
                      type="number" 
                      value={newRecord.paid}
                      onChange={(e) => setNewRecord({...newRecord, paid: Number(e.target.value)})}
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Balance ({currencySymbol})</label>
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
              className="w-full max-w-4xl bg-card rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
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
                {editingSchool && editingSchool.creatorUid === user?.uid && (
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

        {isAttendanceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-card rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">Record {labels.attendance}</h3>
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

        {isThemeModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-card rounded-[3rem] p-10 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-ink mb-1">Appearance</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Visual Interface Protocol</p>
                </div>
                <button onClick={() => setIsThemeModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'light', name: 'Classic', color: '#F8FAFC', border: '#E2E8F0', text: '#0F172A' },
                  { id: 'dark', name: 'Midnight', color: '#020617', border: '#1E293B', text: '#F8FAFC' },
                  { id: 'blue', name: 'Cobalt', color: '#EFF6FF', border: '#DBEAFE', text: '#1E3A8A' },
                  { id: 'purple', name: 'Amethyst', color: '#FAF5FF', border: '#F3E8FF', text: '#581C87' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setCurrentTheme(theme.id as any);
                      setIsThemeModalOpen(false);
                      showNotification(`${theme.name} theme applied`);
                    }}
                    className={`p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group ${
                      currentTheme === theme.id ? 'border-accent bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-4 relative z-10">
                      <div 
                        className="h-10 w-10 rounded-xl border border-gray-200/20 shadow-sm"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <div>
                        <p className="text-sm font-bold text-ink">{theme.name}</p>
                        <p className="text-[10px] text-muted font-medium">Interface Mode</p>
                      </div>
                    </div>
                    {currentTheme === theme.id && (
                      <div className="absolute top-4 right-4 h-6 w-6 bg-accent rounded-full flex items-center justify-center text-white">
                        <Check size={12} />
                      </div>
                    )}
                  </button>
                ))}
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
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold text-ink tracking-tight">{comment.authorName}</p>
                              {comment.isEdited && <span className="text-[9px] text-muted italic font-medium px-1.5 py-0.5 bg-gray-50 rounded-md ring-1 ring-gray-100">edited</span>}
                            </div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                              {comment.timestamp ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </p>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-4">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent/20 transition-all text-sm font-medium resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-3">
                                <button 
                                  onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}
                                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleUpdateComment(activePostForComments.id, comment.id, editingCommentText)}
                                  className="px-6 py-2 bg-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-all"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[14px] text-ink/70 leading-relaxed font-medium">{comment.text}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 mt-4 ml-6">
                          {user && user.uid === comment.authorUid && !editingCommentId && (
                            <>
                              <button 
                                onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }}
                                className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors flex items-center gap-1.5"
                              >
                                <Edit2 size={10} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(activePostForComments.id, comment.id)}
                                className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] hover:text-red-600 transition-colors flex items-center gap-1.5"
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </>
                          )}
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

        {isReceiptModalOpen && recordForReceipt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              <div className="flex justify-between items-center px-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-[0.2em]">Preview Receipt</h3>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="h-10 w-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all font-display"
                >
                  <X size={20} />
                </button>
              </div>

              {/* The Receipt Captured Area */}
              <div ref={receiptRef} className="bg-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-ink/5 rounded-full -ml-24 -mb-24" />
                
                <div className="relative z-10">
                  <div className="flex flex-col items-center mb-10 text-center">
                    {(() => {
                      const userInstitution = schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid);
                      return (
                        <>
                          {userInstitution?.logo ? (
                            <img src={userInstitution.logo} className="h-14 w-14 rounded-2xl object-cover mb-4 shadow-xl shadow-ink/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-14 w-14 bg-ink text-white rounded-2xl flex items-center justify-center font-black text-2xl mb-4 shadow-xl shadow-ink/20">
                              {userInstitution?.name?.charAt(0) || 'E'}
                            </div>
                          )}
                          <h2 className="text-xl font-black text-ink tracking-tighter uppercase">{userInstitution?.name || 'EXONA'}</h2>
                          <p className="text-[8px] font-bold text-muted uppercase tracking-[0.5em] mt-1">Official Transaction Receipt</p>
                          {userInstitution && (
                            <div className="flex items-center gap-1 mt-4 opacity-50">
                              <span className="text-[7px] font-bold text-muted uppercase tracking-widest">Powered by</span>
                              <span className="text-[7px] font-black text-ink tracking-tighter">EXONA</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-end mb-8 pb-8 border-b border-gray-100">
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Receipt Number</p>
                      <p className="text-sm font-mono font-bold text-ink">#REC-{Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Date Issued</p>
                      <p className="text-[11px] font-bold text-ink">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-6 mb-12">
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Institution</p>
                      <p className="text-sm font-bold text-ink">{selectedSchool?.name || 'Institutional Record'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">{selectedSchool?.type === 'school' ? 'Student' : 'Subject'} Name</p>
                      <p className="text-sm font-bold text-ink underline decoration-ink/10 underline-offset-4">{recordForReceipt.studentName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">{selectedSchool?.type === 'school' ? 'Class/Level' : 'Category'}</p>
                        <p className="text-xs font-bold text-ink uppercase tracking-wider">{recordForReceipt.category}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Payment For</p>
                        <p className="text-xs font-bold text-ink uppercase tracking-wider">{(recordForReceipt as any).type || 'General'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4 mb-10 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Amount Paid</span>
                      <span className="text-lg font-mono font-bold text-green-600">{currencySymbol}{recordForReceipt.paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Balance</span>
                      <span className="text-sm font-mono font-bold text-red-600">{currencySymbol}{recordForReceipt.balance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-6 border-t border-dashed border-gray-200">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={16} className="text-green-500" />
                       <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Verified Payment</span>
                    </div>
                    <div className="h-10 w-full flex items-center justify-center opacity-30">
                       <ShieldCheck size={24} />
                    </div>
                    <p className="text-[7px] text-center text-muted uppercase tracking-[0.2em] leading-relaxed">
                      This receipt is electronically generated and verified by Exona. <br />
                      Valid for institutional records authentication.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDownloadReceipt}
                  disabled={isExporting}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isExporting ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isExporting ? 'Generating...' : 'Save as Image'}
                </button>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  disabled={isExporting}
                  className="w-full py-5 bg-white/10 text-white border border-white/20 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/5 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <ArrowLeft size={18} />
                  Back to Records
                </button>
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
                  active={view === 'tools'} 
                  onClick={() => { setView('tools'); setSidebarOpen(false); }} 
                />
                
                {(schools.some(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')) || 
                  places.some(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')) || 
                  userDoc?.role === 'admin') && (
                  <>
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
                      label={labels.attendance} 
                      active={view === 'attendance'} 
                      onClick={() => handleNavigateToData('attendance')} 
                    />
                    <SidebarItem 
                      icon={Wallet} 
                      label="Wallet Hub" 
                      active={view === 'finance'} 
                      onClick={() => handleNavigateToData('finance')} 
                    />
                    <SidebarItem 
                      icon={Shield} 
                      label="Penalty System" 
                      active={view === 'penalty'} 
                      onClick={() => { setView('penalty'); setSidebarOpen(false); }} 
                    />
                  </>
                )}

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
      <header className="h-16 bg-card/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-8 h-full">
          <button 
            onClick={() => setView('feed')}
            className={`h-full flex flex-col items-center justify-center gap-1 relative px-2 transition-all ${view === 'feed' ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            <span className={`text-[13px] font-bold tracking-tight ${view === 'feed' ? 'text-ink' : 'text-muted'}`}>Home</span>
            {view === 'feed' && (
              <motion.div layoutId="header-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button 
            onClick={() => setView('schools')}
            className={`h-full flex flex-col items-center justify-center gap-1 relative px-2 transition-all ${view === 'schools' ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            <span className={`text-[13px] font-bold tracking-tight ${view === 'schools' ? 'text-ink' : 'text-muted'}`}>Story</span>
            {view === 'schools' && (
              <motion.div layoutId="header-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>

        <div className="flex-1 max-w-md mx-4 relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search institutions or people..." 
            value={globalSearch}
            onChange={(e) => {
              const val = e.target.value;
              setGlobalSearch(val);
              handleSearchUsers(val);
              if (val.trim()) setView('search');
            }}
            onFocus={() => {
              if (globalSearch) setView('search');
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-accent/20 outline-none transition-all text-xs font-medium" 
          />
        </div>

        <div className="flex items-center gap-2 text-ink">
          <button 
            onClick={() => {
              if (user) {
                setView('notifications');
              } else {
                setView('login');
              }
            }}
            className={`relative p-2.5 hover:bg-gray-50 rounded-xl transition-colors ${view === 'notifications' ? 'text-accent bg-accent/5' : 'text-muted hover:text-ink'}`}
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setView('search')}
            className={`md:hidden p-2.5 hover:bg-gray-50 rounded-xl transition-colors ${view === 'search' ? 'text-accent bg-accent/5' : 'text-muted hover:text-ink'}`}
          >
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
      <main 
        className="flex-1 overflow-y-auto bg-card relative"
        onScroll={(e) => {
          if (refreshing) return;
          const target = e.currentTarget;
          if (target.scrollTop === 0) {
            // Can start pull
          }
        }}
      >
        <AnimatePresence>
          {(refreshing || pullDistance > 0) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: refreshing ? 80 : Math.min(pullDistance, 100),
                opacity: 1 
              }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full flex items-center justify-center overflow-hidden bg-gray-50/50"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div 
                  animate={{ rotate: refreshing ? 360 : pullDistance * 2 }}
                  transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                  className="text-accent"
                >
                  <Repeat size={24} className={refreshing ? "animate-pulse" : ""} />
                </motion.div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {refreshing ? 'Updating Terminal...' : pullDistance > 70 ? 'Release to refresh' : 'Pull to update'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          style={{ y: refreshing ? 0 : Math.min(pullDistance * 0.5, 50) }}
        >
          {renderView()}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/90 backdrop-blur-xl border border-gray-100 h-16 px-4 flex items-center justify-around rounded-[2rem] shadow-2xl shadow-ink/5 w-[90%] max-w-xs">
        <NavButton 
          active={view === 'chat'} 
          onClick={() => setView('chat')} 
          icon={MessageSquare} 
          label="Chat"
        />
        <NavButton 
          active={view === 'tools'} 
          onClick={() => setView('tools')} 
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

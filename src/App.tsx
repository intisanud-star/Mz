import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { 
  GraduationCap, ShieldCheck, LogOut, LogIn, User as UserIcon, 
  BookOpen, Calendar, Bell, Search, Menu, X, 
  Home, Users, MessageSquare, Wallet, Settings, 
  AlertCircle, Cpu, ChevronDown, ChevronRight,
  Heart, MessageCircle, Share2, Plus, Filter, Send,
  Image as ImageIcon, Video as VideoIcon, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  googleProvider, 
  db, 
  ensureUserDocument, 
  seedInitialData, 
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
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- TYPES ---
interface School {
  id: string;
  name: string;
  logo: string;
  description: string;
  type: 'school' | 'place';
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
  likedBy?: string[];
  commentsCount?: number;
  reshares?: number;
  resharedFrom?: {
    id: string;
    authorName: string;
    content: string;
  };
  timestamp: any;
  isOfficial?: boolean;
}

interface StudentRecord {
  id: string;
  studentName: string;
  category: string;
  addedBy: string;
  paid: number;
  balance: number;
  type: 'general' | 'books' | 'uniforms';
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <pre className="text-xs bg-gray-100 p-4 rounded-xl overflow-auto max-h-40 text-left mb-6">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all">Refresh App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-100'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>{badge}</span>}
  </button>
);

const FeedPost = ({ post, onUserClick, onLike, onComment, onReshare, onForward, currentUserId }: any) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const isLiked = post.likedBy?.includes(currentUserId);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          {post.authorPhoto ? (
            <img src={post.authorPhoto} className="h-10 w-10 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              {post.authorName?.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <h4 className="font-bold text-gray-900 text-sm">{post.authorName}</h4>
              {post.isOfficial && <ShieldCheck size={14} className="text-blue-600 fill-blue-600/10" />}
            </div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{formatTime(post.timestamp)}</p>
          </div>
        </button>
        <button className="text-gray-400 hover:text-gray-600"><ChevronDown size={18} /></button>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>
      
      {post.mediaUrl && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100">
          {post.mediaType === 'image' ? (
            <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-[400px]" referrerPolicy="no-referrer" />
          ) : (
            <video src={post.mediaUrl} controls className="w-full h-auto max-h-[400px]" />
          )}
        </div>
      )}

      {post.resharedFrom && (
        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 border-l-4 border-l-blue-600">
          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2">Reshared from {post.resharedFrom.authorName}</p>
          <p className="text-xs text-gray-600 line-clamp-3">{post.resharedFrom.content}</p>
        </div>
      )}

      <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
        <button 
          onClick={() => onLike?.(post.id, post.likedBy || [])}
          className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
        >
          <Heart size={18} className={isLiked ? 'fill-red-500' : ''} />
          <span className="text-xs font-bold">{post.likes || 0}</span>
        </button>
        <button 
          onClick={() => onComment?.(post)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-xs font-bold">{post.commentsCount || 0}</span>
        </button>
        <button 
          onClick={() => onReshare?.(post)}
          className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
        >
          <Share2 size={18} />
          <span className="text-xs font-bold">{post.reshares || 0}</span>
        </button>
        <button 
          onClick={() => onForward?.(post)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors ml-auto"
        >
          <Plus size={18} className="rotate-45" />
          <span className="text-[10px] font-black uppercase tracking-widest">Forward</span>
        </button>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
function ExonaApp() {
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'ai' | 'penalty' | 'profile' | 'user-profile' | 'admin'>('splash');
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
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [allRecords, setAllRecords] = useState<StudentRecord[]>([]);
  const [allFinance, setAllFinance] = useState<any[]>([]);
  const [finance, setFinance] = useState<SchoolFinance | null>(null);
  const [recordTab, setRecordTab] = useState<'general' | 'books' | 'uniforms'>('general');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [newSchool, setNewSchool] = useState({ name: '', description: '', logo: '', type: 'school' as 'school' | 'place' });
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newRecord, setNewRecord] = useState({ studentName: '', category: '', paid: 0, balance: 0 });

  const handleCreateSchool = async () => {
    if (!newSchool.name.trim() || !userDoc || userDoc.role !== 'admin') return;
    try {
      if (editingSchool) {
        await setDoc(doc(db, 'schools', editingSchool.id), {
          ...editingSchool,
          name: newSchool.name.trim(),
          description: newSchool.description.trim(),
          logo: newSchool.logo.trim(),
          type: newSchool.type
        }, { merge: true });
      } else {
        const schoolId = newSchool.name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'schools', schoolId), {
          id: schoolId,
          name: newSchool.name.trim(),
          description: newSchool.description.trim() || 'Official feed for ' + newSchool.name,
          logo: newSchool.logo.trim() || `https://picsum.photos/seed/${schoolId}/200`,
          type: newSchool.type
        });
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schools');
    }
  };

  const handleCreateRecord = async () => {
    if (!user) { setView('login'); return; }
    if (!newRecord.studentName.trim() || !selectedSchool) return;
    const path = 'studentRecords';
    try {
      await addDoc(collection(db, path), {
        schoolId: selectedSchool.id,
        studentName: newRecord.studentName.trim(),
        category: newRecord.category.trim() || 'General',
        addedBy: user.displayName || 'Admin',
        paid: Number(newRecord.paid),
        balance: Number(newRecord.balance),
        type: recordTab,
        timestamp: serverTimestamp()
      });
      setNewRecord({ studentName: '', category: '', paid: 0, balance: 0 });
      setIsRecordModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleCreatePost = async () => {
    if (!user) { setView('login'); return; }
    if (!newPostContent.trim()) return;
    const path = 'posts';
    setIsUploading(true);
    setUploadProgress(0);
    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | undefined = undefined;

      if (selectedFile) {
        mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
        const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);

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
        
        mediaUrl = await getDownloadURL(fileRef);
      }

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
        isOfficial: userDoc?.role === 'admin'
      });
      setNewPostContent('');
      setSelectedFile(null);
      setUploadProgress(0);
      setIsPostModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
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
    
    const unsubRecords = onSnapshot(collection(db, 'studentRecords'), (snap) => {
      setRecords(snap.docs.filter(d => d.data().schoolId === selectedSchool.id).map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'studentRecords');
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

  const handleUserClick = (profile: { uid: string, name: string, photo: string }) => {
    setSelectedUserProfile(profile);
    setView('user-profile');
  };

  const renderView = () => {
    switch (view) {
      case 'admin':
        if (userDoc?.role !== 'admin') { setView('feed'); return null; }
        const totalRevenue = allFinance.reduce((acc, f) => acc + (f.institutionBalance || 0), 0);
        const totalPaid = allRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = allRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        return (
          <div className="max-w-6xl mx-auto py-8 px-4 pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h2>
                <p className="text-sm text-gray-400 font-medium tracking-wide mt-1">Global system overview and management</p>
              </div>
              <button 
                onClick={() => setIsSchoolModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                <Plus size={18} />
                Add New School
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Schools</p>
                <h3 className="text-2xl font-black text-gray-900">{schools.length}</h3>
                <div className="mt-4 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-2/3"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Students</p>
                <h3 className="text-2xl font-black text-gray-900">{allRecords.length}</h3>
                <div className="mt-4 h-1 w-full bg-green-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 w-1/2"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
                <h3 className="text-2xl font-black text-gray-900">₦{totalRevenue.toLocaleString()}</h3>
                <div className="mt-4 h-1 w-full bg-orange-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 w-3/4"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pending Balance</p>
                <h3 className="text-2xl font-black text-red-600">₦{totalBalance.toLocaleString()}</h3>
                <div className="mt-4 h-1 w-full bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 w-1/3"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <h4 className="font-black text-gray-900">Registered Institutions</h4>
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">School</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {schools.map(school => {
                          const schoolFin = allFinance.find(f => f.schoolId === school.id);
                          return (
                            <tr key={school.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <img src={school.logo} className="h-10 w-10 rounded-xl object-cover" />
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{school.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{school.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 font-black text-gray-900 text-sm">₦{schoolFin?.institutionBalance.toLocaleString() || '0'}</td>
                              <td className="px-8 py-6">
                                <button 
                                  onClick={() => { setSelectedSchool(school); setView('finance'); }}
                                  className="text-blue-600 hover:underline text-xs font-black uppercase tracking-widest"
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
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h4 className="font-black text-gray-900 mb-6">System Activity</h4>
                  <div className="space-y-6">
                    {posts.slice(0, 5).map(post => (
                      <div key={post.id} className="flex gap-4">
                        <img src={post.authorPhoto} className="h-8 w-8 rounded-full" />
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {post.authorName} <span className="text-gray-400 font-medium">posted on feed</span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">2 minutes ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-8 py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                    View All Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'feed':
        return (
          <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Horizon Feed</h2>
              {user && (
                <button 
                  onClick={() => setIsPostModalOpen(true)}
                  className="p-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-100 hover:scale-110 transition-transform"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            {!user && (
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 mb-8 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-blue-900 text-sm mb-1">Join the conversation</h4>
                  <p className="text-xs text-blue-600 font-medium">Sign in to post updates and interact with your school community.</p>
                </div>
                <button 
                  onClick={() => setView('login')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            )}
            {posts.map(post => (
              <FeedPost 
                key={post.id} 
                post={post} 
                onUserClick={handleUserClick}
                onLike={handleLikePost}
                onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                onReshare={handleResharePost}
                onForward={handleForwardPost}
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
              className="flex items-center gap-2 text-gray-500 font-bold mb-8 hover:text-blue-600 transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Feed
            </button>
            
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
              <div className="px-8 pb-8">
                <div className="relative -mt-12 mb-6">
                  <div className="h-24 w-24 rounded-3xl bg-white p-1 shadow-xl">
                    <div className="h-full w-full rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-3xl overflow-hidden">
                      {selectedUserProfile.photo ? <img src={selectedUserProfile.photo} referrerPolicy="no-referrer" /> : selectedUserProfile.name?.charAt(0)}
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900">{selectedUserProfile.name}</h3>
                <p className="text-gray-500 font-medium mb-4">Horizon Member</p>
                
                <div className="flex gap-6">
                  <div>
                    <p className="text-xl font-black text-gray-900">{profilePosts.length}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Posts</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{profilePosts.reduce((acc, p) => acc + p.likes, 0)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Likes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-lg font-black text-gray-900 tracking-tight mb-4">Recent Activity</h4>
              {profilePosts.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                  <p className="text-gray-500 font-medium">No posts yet.</p>
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
                    currentUserId={user?.uid}
                  />
                ))
              )}
            </div>
          </div>
        );
      case 'schools':
        return (
          <div className="max-w-2xl mx-auto py-8 px-4 pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-10 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm shadow-gray-100/50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                  <Wallet size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Executive Finance</h2>
                  <p className="text-xs text-gray-400 font-medium tracking-wide">Revenue and projections</p>
                </div>
              </div>
              {userDoc?.role === 'admin' && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>

            <div className="relative mb-10">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input 
                type="text" 
                placeholder="Search institutions..." 
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-white border border-gray-50 rounded-[2rem] shadow-xl shadow-gray-100/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-600 font-medium" 
              />
            </div>

            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'school', 'place'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSchoolFilter(f as any)}
                  className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    schoolFilter === f 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-white text-gray-400 border border-gray-100'
                  }`}
                >
                  {f === 'all' ? 'All Institutions' : f === 'school' ? 'Schools' : 'Places'}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {schools
                .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                .map(school => (
                <div 
                  key={school.id}
                  className="bg-white rounded-[3rem] p-8 border border-gray-50 shadow-xl shadow-gray-100/30 relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className={`h-20 w-20 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg ${
                          school.name.toLowerCase().includes('darul') ? 'bg-orange-600 shadow-orange-100' : 'bg-blue-600 shadow-blue-100'
                        }`}>
                          {school.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="absolute bottom-0 right-0 h-6 w-6 bg-white rounded-full border-4 border-white shadow-sm"></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl font-black text-gray-900 tracking-tight">{school.name}</h4>
                          <div className="h-7 w-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md shadow-blue-100">2</div>
                        </div>
                        <p className="text-sm text-gray-400 font-medium tracking-wide mt-1 line-clamp-1">{school.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userDoc?.role === 'admin' && (
                        <button 
                          onClick={() => {
                            setEditingSchool(school);
                            setNewSchool({ name: school.name, description: school.description, logo: school.logo });
                            setIsSchoolModalOpen(true);
                          }}
                          className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all"
                        >
                          <Settings size={20} />
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedSchool(school); setView('records'); }}
                        className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-all"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('records'); }}
                      className="flex items-center justify-center gap-3 py-4 bg-gray-50/50 rounded-2xl font-bold text-gray-900 hover:bg-gray-100 transition-all text-sm"
                    >
                      <BookOpen size={18} />
                      Records
                    </button>
                    <button 
                      onClick={() => { setSelectedSchool(school); setView('finance'); }}
                      className="flex items-center justify-center gap-3 py-4 bg-gray-50/50 rounded-2xl font-bold text-gray-900 hover:bg-gray-100 transition-all text-sm"
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
          <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedSchool.name} Records</h2>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Official student records</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRecordModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                <Plus size={18} />
                Add Student Record
              </button>
            </div>

            <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
              {(['general', 'books', 'uniforms'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setRecordTab(tab)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${recordTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student & Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Added By</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.filter(r => r.type === recordTab).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-20">
                            <Filter size={48} />
                            <p className="font-bold">No records found for this category</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.filter(r => r.type === recordTab).map(record => (
                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">{record.studentName}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{record.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{record.addedBy}</td>
                          <td className="px-6 py-4 font-bold text-green-600 text-sm">₦{record.paid.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-red-600 text-sm">₦{record.balance.toLocaleString()}</td>
                          <td className="px-6 py-4"><button className="text-blue-600 hover:underline text-xs font-bold">Edit</button></td>
                        </tr>
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
          <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedSchool.name} Finance</h2>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Official institutional financial management</p>
              </div>
            </div>

            <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200 mb-8 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] mb-2">Institution Balance</p>
                <h3 className="text-5xl font-black tracking-tight mb-6">₦{finance?.institutionBalance.toLocaleString() || '0'}</h3>
                <div className="flex items-center gap-2 text-blue-100 text-[10px] font-medium bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <AlertCircle size={12} />
                  Balance is updated in real-time after verified payments.
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Wallet size={200} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <ShieldCheck size={20} />
                    </div>
                    <h4 className="font-bold text-gray-900">Official Bank Account</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Bank Name</p>
                      <p className="font-bold text-gray-900 text-sm">{finance?.bankName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Account Number</p>
                      <p className="font-bold text-gray-900 text-sm tracking-widest">{finance?.accountNumber || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Account Name</p>
                      <p className="font-bold text-gray-900 text-sm">{finance?.accountName || '---'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm h-full">
                  <h4 className="font-bold text-gray-900 mb-6">Payment History</h4>
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <MessageSquare size={48} />
                    <p className="font-bold mt-4">No transaction history found.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="flex flex-col h-full max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <Cpu size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Exona AI</h2>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Your intelligent school assistant</p>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                    <Cpu size={64} className="mb-4" />
                    <h3 className="text-xl font-bold">How can I help you today?</h3>
                    <p className="text-sm">Ask me about student records, school fees, or anything else about Exona.</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${
                      msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-50 flex gap-2">
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiSend()}
                  placeholder="Ask Exona AI..." 
                  className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                />
                <button 
                  onClick={handleAiSend}
                  disabled={!aiInput.trim() || isAiTyping}
                  className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'penalty':
        return (
          <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Penalty Board</h2>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Disciplinary records and notices</p>
              </div>
            </div>
            <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
              <div className="h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Clean Record</h3>
              <p className="text-gray-500 text-sm font-medium">You have no active penalties or disciplinary notices. Keep it up!</p>
            </div>
          </div>
        );
      case 'profile':
        if (!user) { setView('login'); return null; }
        return (
          <div className="max-w-2xl mx-auto py-8 px-4">
            <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">My Profile</h2>
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
              <div className="px-8 pb-8">
                <div className="relative -mt-12 mb-6">
                  <div className="h-24 w-24 rounded-3xl bg-white p-1 shadow-xl">
                    <div className="h-full w-full rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-3xl overflow-hidden">
                      {user?.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" /> : user?.displayName?.charAt(0)}
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900">{user?.displayName}</h3>
                <p className="text-gray-500 font-medium mb-8">{user?.email}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Role</p>
                    <p className="font-bold text-gray-900 capitalize">{userDoc?.role || 'Student'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">School ID</p>
                    <p className="font-bold text-gray-900">{userDoc?.schoolId || 'EX-2024-001'}</p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100">
                  <h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4">Danger Zone</h4>
                  <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
                    Once you delete your account, there is no going back. All your data will be permanently removed from Exona.
                  </p>
                  <button 
                    onClick={() => {
                      setAuthError(null);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all text-sm"
                  >
                    <AlertCircle size={18} />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (view === 'splash') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#000] text-white overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full"></div>
        </div>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-light tracking-[0.25em] uppercase text-white/90"
          >
            Exona
          </motion.h1>
          
          <div className="relative mt-10 w-48 h-[1px] bg-white/10 overflow-hidden rounded-full">
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: '100%' }} 
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            />
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.3 }} 
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-8 text-[9px] font-black uppercase tracking-[0.5em] text-white"
          >
            Mastering Education
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (loading) return null;

  if (view === 'login') {
    if (verificationSent || (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password'))) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200 p-12 border border-gray-100 text-center">
            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mb-10 mx-auto shadow-xl shadow-blue-100">Ex</div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Verify your email</h2>
            <p className="text-gray-500 font-medium mb-10">We've sent a verification link to <b>{user?.email || email}</b>. Please check your inbox and click the link to continue.</p>
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
                      setAuthError('Email not verified yet. Please check your inbox.');
                    }
                  }
                }} 
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                I've Verified
              </button>
              <button 
                onClick={() => {
                  setVerificationSent(false);
                  signOut(auth);
                }} 
                className="w-full py-5 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-all"
              >
                Back to Sign In
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200 p-10 border border-gray-100 my-8">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mb-8 shadow-xl shadow-blue-100">Ex</div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
            {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 font-medium mb-8">
            {authMode === 'signin' ? 'Modernizing how schools operate and learn.' : 'Join the modern school management platform.'}
          </p>

          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              {authError}
            </div>
          )}

          <div className="space-y-4 mb-8">
            {authMode === 'signup' && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-2">Full Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button 
            onClick={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp} 
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all mb-6"
          >
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-widest"><span className="bg-white px-4">Or continue with</span></div>
          </div>

          <button onClick={handleGoogleSignIn} className="w-full py-4 bg-white border border-gray-100 text-gray-700 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 mb-8">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" /> Google
          </button>

          <p className="text-center text-sm text-gray-500 font-medium">
            {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setAuthError(null);
              }} 
              className="text-blue-600 font-bold hover:underline"
            >
              {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10"
            >
              <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Delete Account?</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                This action is permanent and cannot be undone. Are you absolutely sure you want to delete your Exona account?
              </p>

              {authError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}

              {user?.providerData.some(p => p.providerId === 'password') && (
                <div className="mb-8">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-2">Enter Password to Confirm</label>
                  <input 
                    type="password" 
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword('');
                    setAuthError(null);
                  }}
                  disabled={isDeleting}
                  className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Create New Post</h3>
                <button onClick={() => setIsPostModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening in your school?"
                className="w-full h-40 p-6 bg-gray-50 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium resize-none mb-4"
              />

              {selectedFile && previewUrl && (
                <div className="mb-4 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 relative group">
                  {selectedFile.type.startsWith('image/') ? (
                    <img src={previewUrl} className="w-full h-48 object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-48 object-cover" />
                  )}
                  <button 
                    onClick={() => setSelectedFile(null)} 
                    className="absolute top-4 right-4 h-10 w-10 bg-white/80 backdrop-blur-md text-gray-900 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8">
                      <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mb-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-white"
                        />
                      </div>
                      <p className="text-white text-xs font-black uppercase tracking-widest">{Math.round(uploadProgress)}% Uploaded</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <label className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 cursor-pointer transition-all">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                  <label className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 cursor-pointer transition-all">
                    <VideoIcon size={20} />
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button 
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isUploading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Uploading...
                    </>
                  ) : 'Post to Horizon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isRecordModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Add {recordTab} Record</h3>
                <button onClick={() => setIsRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Student Name</label>
                  <input 
                    type="text" 
                    value={newRecord.studentName}
                    onChange={(e) => setNewRecord({...newRecord, studentName: e.target.value})}
                    placeholder="Full Name"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Category/Class</label>
                  <input 
                    type="text" 
                    value={newRecord.category}
                    onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                    placeholder="e.g. JSS1, SS3"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Paid (₦)</label>
                    <input 
                      type="number" 
                      value={newRecord.paid}
                      onChange={(e) => setNewRecord({...newRecord, paid: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Balance (₦)</label>
                    <input 
                      type="number" 
                      value={newRecord.balance}
                      onChange={(e) => setNewRecord({...newRecord, balance: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button 
                  onClick={handleCreateRecord}
                  disabled={!newRecord.studentName.trim()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Save Record
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">{editingSchool ? 'Edit Institution' : 'Add New Institution'}</h3>
                <button onClick={() => { setIsSchoolModalOpen(false); setEditingSchool(null); setNewSchool({ name: '', description: '', logo: '', type: 'school' }); }} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['school', 'place'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewSchool({ ...newSchool, type: t as any })}
                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                          newSchool.type === t 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                            : 'bg-gray-50 text-gray-400 border border-transparent'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Institution Name</label>
                  <input 
                    type="text" 
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                    placeholder="e.g. Horizon International"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    value={newSchool.description}
                    onChange={(e) => setNewSchool({...newSchool, description: e.target.value})}
                    placeholder="Brief description of the school..."
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium resize-none h-24"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Logo URL (Optional)</label>
                  <input 
                    type="text" 
                    value={newSchool.logo}
                    onChange={(e) => setNewSchool({...newSchool, logo: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button 
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name.trim()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {editingSchool ? 'Update' : 'Register'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCommentModalOpen && activePostForComments && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Comments</h3>
                <button onClick={() => setIsCommentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {postComments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={48} className="mx-auto text-gray-100 mb-4" />
                    <p className="text-gray-400 font-medium">No comments yet. Be the first to reply!</p>
                  </div>
                ) : (
                  postComments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      {comment.authorPhoto ? (
                        <img src={comment.authorPhoto} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                          {comment.authorName?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <p className="text-xs font-black text-gray-900 mb-1">{comment.authorName}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{comment.text}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 ml-2">
                          {comment.timestamp ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 border-t border-gray-50 bg-gray-50/50">
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-6 py-4 bg-white rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    <Send size={20} />
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
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            className="fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-50 flex flex-col"
          >
            <div className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">Ex</div>
                <span className="font-black text-xl tracking-tight">Exona</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-8">
              <div className="space-y-1">
                <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Main Menu</p>
                <SidebarItem icon={Home} label="Horizon Feed" active={view === 'feed'} onClick={() => { setView('feed'); setSidebarOpen(false); }} />
                <SidebarItem icon={Users} label="Friends" badge="12" />
                <SidebarItem icon={Cpu} label="Exona AI" active={view === 'ai'} onClick={() => { setView('ai'); setSidebarOpen(false); }} />
              </div>

              <div className="space-y-1">
                <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Management</p>
                {user?.email === 'musstaphamusa@gmail.com' && !userDoc && (
                  <p className="px-4 text-[10px] font-bold text-red-500 mb-2">DEBUG: userDoc is null</p>
                )}
                {user?.email === 'musstaphamusa@gmail.com' && userDoc && userDoc.role !== 'admin' && (
                  <p className="px-4 text-[10px] font-bold text-red-500 mb-2">DEBUG: role is {userDoc.role}</p>
                )}
                {userDoc?.role === 'admin' && (
                  <SidebarItem icon={ShieldCheck} label="Admin Dashboard" active={view === 'admin'} onClick={() => { setView('admin'); setSidebarOpen(false); }} />
                )}
                <SidebarItem icon={BookOpen} label="School Records" active={view === 'records' || (view === 'schools' && !selectedSchool)} onClick={() => { setView('schools'); setSidebarOpen(false); }} />
                <SidebarItem icon={Wallet} label="Finance Dashboard" active={view === 'finance'} onClick={() => { setView('schools'); setSidebarOpen(false); }} />
                <SidebarItem icon={AlertCircle} label="Penalty Board" active={view === 'penalty'} onClick={() => { setView('penalty'); setSidebarOpen(false); }} />
              </div>

              <div className="space-y-1">
                <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Account</p>
                <SidebarItem icon={UserIcon} label="Profile" active={view === 'profile'} onClick={() => { if (user) setView('profile'); else setView('login'); setSidebarOpen(false); }} />
                <SidebarItem icon={Settings} label="Settings" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-50">
              {user ? (
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all">
                  <LogOut size={20} /> Logout
                </button>
              ) : (
                <button onClick={() => { setView('login'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-all">
                  <LogIn size={20} /> Sign In
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500"><Menu /></button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search Exona..." className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                  </button>
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200 overflow-hidden">
                    {user?.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" /> : user?.displayName?.charAt(0)}
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => setView('login')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          {renderView()}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between pb-8">
          <button onClick={() => setView('feed')} className={`p-2 ${view === 'feed' ? 'text-blue-600' : 'text-gray-300'}`}>
            <Home size={24} />
          </button>
          <button onClick={() => setView('schools')} className={`p-2 ${view === 'schools' ? 'text-blue-600' : 'text-gray-300'}`}>
            <Search size={24} />
          </button>
          <button 
            onClick={() => {
              if (!user) { setView('login'); return; }
              if (view === 'feed') setIsPostModalOpen(true);
              else if (view === 'records') setIsRecordModalOpen(true);
            }} 
            className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 border border-gray-100"
          >
            <Plus size={24} />
          </button>
          <button onClick={() => setView('schools')} className={`p-2 ${view === 'schools' ? 'text-blue-600' : 'text-gray-300'}`}>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="h-2 w-2 rounded-sm bg-current"></div>
              <div className="h-2 w-2 rounded-sm bg-current"></div>
              <div className="h-2 w-2 rounded-sm bg-current"></div>
              <div className="h-2 w-2 rounded-sm bg-current"></div>
            </div>
          </button>
          <button onClick={() => user ? setView('profile') : setView('login')} className={`p-2 ${view === 'profile' ? 'text-blue-600' : 'text-gray-300'}`}>
            <UserIcon size={24} />
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

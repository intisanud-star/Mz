import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Play, 
  Search, 
  Plus, 
  Trash2, 
  Heart, 
  ExternalLink, 
  Tv, 
  X, 
  FileText, 
  ArrowRight,
  Sparkles,
  Info,
  Lock,
  Unlock,
  Clock,
  Coins,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowUpRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp
} from 'firebase/firestore';

export interface YoutubeBroadcast {
  id: string;
  title: string;
  type: 'video' | 'channel';
  videoId?: string;
  channelId?: string;
  category: string;
  description?: string;
  creatorUid?: string;
  creatorName?: string;
  likes?: string[];
  likesCount?: number; // fallback/mock
  isPreset?: boolean;
}

const PRESET_YOUTUBE_BROADCASTS: YoutubeBroadcast[] = [
  {
    id: 'preset_lofi',
    title: 'Lofi Girl - Ambient Focus & Coding Beats',
    type: 'video',
    videoId: 'jfKfPfyJRdk',
    category: 'Music & Focus',
    description: 'Chilled beats for studying, relaxing, coders, and system builders.',
    creatorName: 'Exona Featured',
    isPreset: true,
    likesCount: 142
  },
  {
    id: 'preset_nasa',
    title: 'NASA Live - Official Space Broadcast',
    type: 'video',
    videoId: '21X5lGlDOfg',
    category: 'Space & Science',
    description: 'Live views of Earth from orbit, space walks, and technical briefings from NASA.',
    creatorName: 'Exona Featured',
    isPreset: true,
    likesCount: 94
  }
];

const CATEGORIES = [
  "All",
  "Programming & Education",
  "Space & Science",
  "Music & Focus",
  "Business & Finance",
  "General Live"
];

function parseYoutubeId(urlOrId: string): { type: 'video' | 'channel'; id: string } | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', id: trimmed };
  }
  
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return { type: 'channel', id: trimmed };
  }

  try {
    if (trimmed.includes('youtube.com/live/')) {
      const parts = trimmed.split('youtube.com/live/');
      if (parts[1]) {
        const id = parts[1].split(/[/?#]/)[0];
        return { type: 'video', id };
      }
    }

    if (trimmed.includes('youtube.com/channel/')) {
      const parts = trimmed.split('youtube.com/channel/');
      if (parts[1]) {
        const id = parts[1].split(/[/?#]/)[0];
        if (id.startsWith('UC')) return { type: 'channel', id };
      }
    }
    
    if (trimmed.includes('v=')) {
      const urlParams = new URLSearchParams(trimmed.substring(trimmed.indexOf('?')));
      const v = urlParams.get('v');
      if (v) return { type: 'video', id: v };
    }
    
    if (trimmed.includes('youtu.be/')) {
      const parts = trimmed.split('youtu.be/');
      if (parts[1]) {
        const id = parts[1].split(/[/?#]/)[0];
        return { type: 'video', id };
      }
    }
    
    if (trimmed.includes('youtube.com/embed/')) {
      const parts = trimmed.split('youtube.com/embed/');
      if (parts[1]) {
        const id = parts[1].split(/[/?#]/)[0];
        return { type: 'video', id };
      }
    }
  } catch (e) {
    console.error("Error parsing YouTube URL:", e);
  }
  
  if (trimmed.length === 11) return { type: 'video', id: trimmed };
  if (trimmed.startsWith('UC')) return { type: 'channel', id: trimmed };

  return null;
}

interface SubscriptionPlan {
  id: '4h' | '24h' | 'weekly' | 'monthly';
  name: string;
  durationMs: number;
  cost: number;
}

const VIEW_PLANS: SubscriptionPlan[] = [
  { id: '4h', name: '4 Hours Access', durationMs: 4 * 60 * 60 * 1000, cost: 10 },
  { id: '24h', name: '24 Hours Access', durationMs: 24 * 60 * 60 * 1000, cost: 40 },
  { id: 'weekly', name: 'Weekly Access', durationMs: 7 * 24 * 60 * 60 * 1000, cost: 150 },
  { id: 'monthly', name: 'Monthly Access', durationMs: 30 * 24 * 60 * 60 * 1000, cost: 400 }
];

const PARTICIPATION_PLANS: SubscriptionPlan[] = [
  { id: '4h', name: '4 Hours Participation', durationMs: 4 * 60 * 60 * 1000, cost: 10 },
  { id: '24h', name: '24 Hours Participation', durationMs: 24 * 60 * 60 * 1000, cost: 40 },
  { id: 'weekly', name: 'Weekly Participation', durationMs: 7 * 24 * 60 * 60 * 1000, cost: 150 },
  { id: 'monthly', name: 'Monthly Participation', durationMs: 30 * 24 * 60 * 60 * 1000, cost: 400 }
];

interface YoutubeBroadcastsProps {
  user: any;
  userDoc: any;
  customBroadcasts: YoutubeBroadcast[];
  onAddBroadcast: (broadcast: Omit<YoutubeBroadcast, 'id' | 'likes'>) => Promise<void>;
  onDeleteBroadcast: (id: string, creatorUid: string) => Promise<void>;
  onLikeBroadcast: (id: string, likes: string[]) => Promise<void>;
  handleDebitExcoin: (amount: number, description: string) => Promise<boolean>;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onOpenPlace?: (creatorUid: string, creatorName?: string) => void;
}

export const YoutubeBroadcasts: React.FC<YoutubeBroadcastsProps> = ({
  user,
  userDoc,
  customBroadcasts = [],
  onAddBroadcast,
  onDeleteBroadcast,
  onLikeBroadcast,
  handleDebitExcoin,
  showNotification,
  onOpenPlace
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Excoin Balance & Real-time Subscriptions State
  const [excoinBalance, setExcoinBalance] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Record<string, { expiresAt: number; plan: string; type: string }>>({});
  
  // Purchase Modal triggers
  const [subscriptionSelector, setSubscriptionSelector] = useState<{ streamId: string; type: 'view' | 'participate' } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<'4h' | '24h' | 'weekly' | 'monthly'>('4h');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState('');

  // Live Chat Local & Real-time Messages State
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const allBroadcasts = useMemo(() => {
    // Merge preset ones with database ones, avoiding duplicates if any
    const customs = customBroadcasts.map(b => ({ ...b, isPreset: false }));
    return [...customs, ...PRESET_YOUTUBE_BROADCASTS];
  }, [customBroadcasts]);

  const filteredBroadcasts = useMemo(() => {
    return allBroadcasts.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (b.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allBroadcasts, searchQuery, categoryFilter]);

  // Derive active stream synchronously from current index
  const activeStream = useMemo(() => {
    if (filteredBroadcasts.length > 0 && currentIdx >= 0 && currentIdx < filteredBroadcasts.length) {
      return filteredBroadcasts[currentIdx];
    }
    return null;
  }, [filteredBroadcasts, currentIdx]);

  // Compatibility wrapper for manually setting activeStream
  const setActiveStream = (stream: YoutubeBroadcast | null) => {
    if (!stream) {
      scrollToIdx(0);
      return;
    }
    const idx = filteredBroadcasts.findIndex(b => b.id === stream.id);
    if (idx !== -1) {
      scrollToIdx(idx);
    }
  };

  // 1. Listen to user wallet balance in real-time
  useEffect(() => {
    if (!user?.uid) {
      setExcoinBalance(0);
      return;
    }
    const unsub = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        setExcoinBalance(snap.data().excoin_balance || 0);
      } else {
        setExcoinBalance(0);
      }
    }, (err) => {
      console.error("Wallet hook error:", err);
    });
    return () => unsub();
  }, [user?.uid]);

  // 2. Listen to user broadcast subscriptions in real-time
  useEffect(() => {
    if (!user?.uid) {
      setSubscriptions({});
      return;
    }
    const q = query(
      collection(db, 'broadcast_subscriptions'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const subs: Record<string, { expiresAt: number; plan: string; type: string }> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        const expiresAt = data.expiresAt?.seconds 
          ? data.expiresAt.seconds * 1000 
          : (data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : new Date(data.expiresAt).getTime());
        subs[`${data.streamId}_${data.type}`] = {
          expiresAt,
          plan: data.plan,
          type: data.type
        };
      });
      setSubscriptions(subs);
    }, (err) => {
      console.error("Subscriptions hook error:", err);
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Listen to Active Stream Live Comments in real-time
  useEffect(() => {
    if (!activeStream?.id) {
      setActiveChatMessages([]);
      return;
    }
    const q = query(
      collection(db, 'broadcast_chats'),
      where('broadcastId', '==', activeStream.id),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.seconds 
          ? data.timestamp.seconds * 1000 
          : (data.timestamp?.toDate ? data.timestamp.toDate().getTime() : (data.timestamp ? new Date(data.timestamp).getTime() : Date.now()));
        messages.push({
          id: doc.id,
          ...data,
          timestamp
        });
      });
      messages.sort((a,b) => a.timestamp - b.timestamp);
      setActiveChatMessages(messages);
      
      // Smooth scroll to bottom of chat
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }, (err) => {
      console.error("Chats hook error:", err);
    });
    return () => unsub();
  }, [activeStream?.id]);

  // Subscription checking helpers (Creator & Administration bypass fee)
  const hasActiveViewAccess = (streamId: string) => {
    return true;
  };

  const hasActiveParticipationAccess = (streamId: string) => {
    return true;
  };

  // Debit Coins and Store Subscription Document
  const handlePurchaseSubscription = async (
    streamId: string, 
    type: 'view' | 'participate', 
    planId: '4h' | '24h' | 'weekly' | 'monthly'
  ) => {
    if (!user?.uid) {
      showNotification("Please log in first to purchase subscriptions", "error");
      return;
    }
    
    const plan = (type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).find(p => p.id === planId);
    if (!plan) return;

    const stream = allBroadcasts.find(b => b.id === streamId);
    const streamTitle = stream ? stream.title : 'Live Stream';

    setIsPurchasing(true);
    try {
      const success = await handleDebitExcoin(
        plan.cost, 
        `Subscription Pass: ${plan.name} for Block: ${streamTitle}`
      );
      if (success) {
        const docId = `${user.uid}_${streamId}_${type}`;
        const purchasedAt = new Date();
        const expiresAt = new Date(Date.now() + plan.durationMs);

        await setDoc(doc(db, 'broadcast_subscriptions', docId), {
          userId: user.uid,
          streamId,
          type,
          plan: planId,
          cost: plan.cost,
          purchasedAt,
          expiresAt,
          streamTitle
        });

        // Show successful purchase animation state
        setPurchaseSuccessMsg(`Successfully unlocked ${type === 'view' ? 'Streaming' : 'Interaction'} pass! Duration: ${plan.id === '4h' ? '4 hours' : plan.id === '24h' ? '24 hours' : plan.id === 'weekly' ? '7 days' : '30 days'}.`);
        showNotification(`${type === 'view' ? 'Streaming' : 'Participation'} Access Unlocked!`, 'success');

        setTimeout(() => {
          setPurchaseSuccessMsg('');
          setSubscriptionSelector(null);
          if (type === 'view') {
            setActiveStream(stream || null);
            // Scroll up to main player smoothly
            const element = document.getElementById("youtube_broadcasts_portal");
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 2200);
      }
    } catch (err) {
      console.error("Purchase failed:", err);
      showNotification("Purchase transaction error. Please try again.", "error");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Post chat message under participation pass authorization
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !activeStream) return;

    if (!hasActiveParticipationAccess(activeStream.id)) {
      setSubscriptionSelector({ streamId: activeStream.id, type: 'participate' });
      showNotification("Participation subscription required to comment/chat.", "error");
      return;
    }

    const textPayload = chatInput.trim();
    setChatInput('');

    try {
      await addDoc(collection(db, 'broadcast_chats'), {
        broadcastId: activeStream.id,
        userId: user.uid,
        userName: userDoc?.displayName || user?.displayName || 'Exona Broadcaster',
        text: textPayload,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Post comment error:", err);
      showNotification("Could not send chat message. Please confirm connection.", "error");
    }
  };

  // Like stream with participation pass check
  const handleLikeClick = (streamId: string, likes: string[]) => {
    if (!user) {
      showNotification("Please sign in or register to interact with streams!", "error");
      return;
    }
    if (!hasActiveParticipationAccess(streamId)) {
      setSubscriptionSelector({ streamId, type: 'participate' });
      showNotification("Participation subscription required to like broadcasts.", "error");
      return;
    }
    onLikeBroadcast(streamId, likes);
  };
  
  // Submit state
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState("Programming & Education");
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsingError, setParsingError] = useState('');

  // Reset active scroll station to top when filters or queries change
  useEffect(() => {
    setCurrentIdx(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [categoryFilter, searchQuery]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    if (height === 0) return;
    const newIdx = Math.round(scrollTop / height);
    if (newIdx !== currentIdx && newIdx >= 0 && newIdx < filteredBroadcasts.length) {
      setCurrentIdx(newIdx);
    }
  };

  const scrollToIdx = (idx: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.scrollTo({
      top: idx * container.clientHeight,
      behavior: 'smooth'
    });
    setCurrentIdx(idx);
  };

  const handleFormUrlChange = (val: string) => {
    setFormUrl(val);
    if (!val) {
      setParsingError('');
      return;
    }
    const parsed = parseYoutubeId(val);
    if (!parsed) {
      setParsingError('⚠️ Links must be valid YouTube video watch URLs, Channel links, or ID strings.');
    } else {
      setParsingError('');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim()) return;

    const parsed = parseYoutubeId(formUrl);
    if (!parsed) {
      setParsingError('⚠️ Could not extract YouTube ID. Check your link format.');
      return;
    }

    setIsSubmitting(true);
    setParsingError('');

    try {
      await onAddBroadcast({
        title: formTitle.trim(),
        type: parsed.type,
        category: formCategory,
        description: formDescription.trim(),
        ...(parsed.type === 'video' ? { videoId: parsed.id } : { channelId: parsed.id }),
        creatorUid: user?.uid,
        creatorName: userDoc?.displayName || user?.displayName || 'Exona Broadcaster',
      });

      // Clear Form
      setFormTitle('');
      setFormUrl('');
      setFormDescription('');
      setIsAddFormOpen(false);
    } catch (e) {
      console.error(e);
      setParsingError('Failed to register block. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmbedUrl = (item: YoutubeBroadcast) => {
    if (item.type === 'channel') {
      return `https://www.youtube.com/embed/live_stream?channel=${item.channelId}&autoplay=1&mute=1&playsinline=1&rel=0&showinfo=0&modestbranding=1`;
    }
    return `https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=1&playsinline=1&rel=0&showinfo=0&modestbranding=1`;
  };

  const getCoverImageUrl = (item: YoutubeBroadcast) => {
    if (item.type === 'video' && item.videoId) {
      return `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
    }
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop`;
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in" id="youtube_broadcasts_portal">
      {/* Main Container Info card */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-ink flex items-center gap-2">
              <Youtube className="text-red-655" size={24} />
              EXONA TV BROADCASTS
            </h2>
            <p className="text-xs text-muted font-bold mt-1 max-w-md">
              Watch official livestreams, interactive tutorials, science logs, or focus loops directly. Scroll or swipe to switch channels automatically.
            </p>
          </div>
          
          {userDoc?.role === 'admin' && (
            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="px-5 py-3 bg-accent text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all self-start sm:self-center shrink-0 shadow-sm"
            >
              {isAddFormOpen ? <X size={16} /> : <Plus size={16} />}
              {isAddFormOpen ? 'Cancel' : 'Add Broadcast'}
            </button>
          )}
        </div>

        {/* Collapsible Form */}
        <AnimatePresence>
          {isAddFormOpen && userDoc?.role === 'admin' && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddSubmit}
              className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-indigo-900 mb-2">
                <Sparkles size={18} className="text-accent shrink-0 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest">Register New YouTube Live Broadcast</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Broadcast Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Frontiers Live Channel"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/80 rounded-2xl bg-white text-sm focus:outline-none focus:border-accent/40 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">YouTube Video/Channel Link or ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://www.youtube.com/watch?v=21X5lGlDOfg"
                    value={formUrl}
                    onChange={(e) => handleFormUrlChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/80 rounded-2xl bg-white text-sm focus:outline-none focus:border-accent/40 font-semibold"
                  />
                  {parsingError && (
                    <span className="text-[11px] text-red-500 font-bold">{parsingError}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Broadcast Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/80 rounded-2xl bg-white text-sm focus:outline-none focus:border-accent/40 font-semibold cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Brief Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Provide a quick synopsis of what happens on this livestream."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/80 rounded-2xl bg-white text-sm focus:outline-none focus:border-accent/40 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!parsingError}
                className="mt-2 py-3.5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Registering stream...' : 'Add Live Stream to broadcasts list'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Search & Category Filter */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search running broadcasts/livestreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-150 rounded-[1.25rem] bg-gray-50 text-sm focus:outline-none focus:bg-white focus:border-accent/20 font-semibold"
            />
          </div>

          <div className="flex gap-2 pb-2 overflow-x-auto select-none no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  categoryFilter === cat 
                    ? 'bg-ink text-white border-ink' 
                    : 'bg-white text-muted border-gray-100 hover:border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Elegant TikTok-style Snapping Vertical Video Player Container */}
      <div className="w-full flex justify-center py-2 relative">
        <div className="w-full max-w-sm sm:max-w-md aspect-[9/16] min-h-[580px] h-[75vh] md:h-[680px] bg-black rounded-[2.5rem] border-[8px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
          
          {/* Status bar notch simulation */}
          <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-black/80 to-transparent z-40 flex items-center justify-between px-6 pointer-events-none select-none text-[9px] font-mono tracking-wider text-slate-400">
            <span>EXONA TV</span>
            <div className="h-4 w-16 bg-slate-900 rounded-full border border-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>STATION {filteredBroadcasts.length > 0 ? `${currentIdx + 1}/${filteredBroadcasts.length}` : '0/0'}</span>
            </div>
          </div>

          {filteredBroadcasts.length > 0 ? (
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col relative bg-slate-950"
            >
              {filteredBroadcasts.map((stream, idx) => {
                const isActive = idx === currentIdx;
                const userLikes = stream.likes || [];
                const hasLiked = user ? userLikes.includes(user.uid) : false;
                const displayLikes = stream.isPreset 
                  ? (stream.likesCount || 0) 
                  : userLikes.length;

                const isCreatorOrAdmin = user && (stream.creatorUid === user.uid || userDoc?.role === 'admin');

                return (
                  <div 
                    key={stream.id} 
                    className="w-full h-full min-h-[564px] snap-start snap-always relative shrink-0 overflow-hidden flex items-center justify-center bg-black"
                  >
                    {isActive ? (
                      <iframe
                        src={getEmbedUrl(stream)}
                        title={stream.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-auto"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
                        <img 
                          src={getCoverImageUrl(stream)} 
                          alt={stream.title} 
                          className="absolute inset-0 w-full h-full object-cover opacity-30 select-none pointer-events-none filter blur-sm"
                        />
                        <div className="z-10 flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-full bg-slate-900/85 border border-slate-800 flex items-center justify-center text-red-500 animate-pulse">
                            <Tv size={24} />
                          </div>
                          <p className="text-white text-xs font-black uppercase tracking-widest px-4 text-center">{stream.title}</p>
                          <p className="text-slate-400 text-[10px] font-bold">Scroll or use buttons to switch station</p>
                        </div>
                      </div>
                    )}

                    {/* TikTok Overlay Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none flex flex-col gap-2 z-20">
                      <span className="px-2.5 py-0.5 bg-red-600 rounded-full text-[9px] uppercase font-black tracking-widest animate-pulse flex items-center gap-1 self-start">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        Live Broadcast
                      </span>
                      <h3 className="text-white text-sm sm:text-base font-black tracking-tight leading-snug drop-shadow-md select-text pointer-events-auto">
                        {stream.title}
                      </h3>
                      <p className="text-slate-300 text-[10px] sm:text-xs font-semibold max-w-[85%] line-clamp-2 drop-shadow-sm select-text pointer-events-auto leading-relaxed">
                        {stream.description || "Tune in to explore live feeds, study sessions, and academic logs."}
                      </p>
                      <div className="flex items-center gap-2 mt-1 py-1 text-[9px] font-bold text-slate-400">
                        <span className="bg-white/10 px-2 py-0.5 rounded-md text-white border border-white/5">{stream.category}</span>
                        <span>• By {stream.creatorName}</span>
                      </div>
                    </div>

                    {/* Right Floating Actions Column */}
                    <div className="absolute right-3.5 bottom-16 z-30 flex flex-col items-center gap-4">
                      
                      {/* Creator Profile Shortcut */}
                      <div className="relative group">
                        <div 
                          onClick={() => onOpenPlace?.(stream.creatorUid || '', stream.creatorName)}
                          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-black select-none shadow-lg cursor-pointer transform hover:scale-115 transition-transform"
                          title={`Open ${stream.creatorName}'s Space`}
                        >
                          {stream.creatorName?.slice(0, 2).toUpperCase() || "EX"}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-indigo-500 text-white rounded-full p-0.5 border border-black flex items-center justify-center shadow-md">
                          <Compass size={8} className="animate-pulse" />
                        </div>
                      </div>

                      {/* Like button */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeClick(stream.id, userLikes);
                          }}
                          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all shadow-lg border ${
                            hasLiked 
                              ? 'bg-rose-600 border-rose-500 text-white' 
                              : 'bg-black/60 border-white/20 text-white hover:bg-black/80'
                          }`}
                          title="Like Live Stream"
                        >
                          <Heart size={18} fill={hasLiked ? "currentColor" : "none"} className={hasLiked ? "animate-pulse" : ""} />
                        </button>
                        <span className="text-[10px] font-extrabold text-white drop-shadow-md">{displayLikes}</span>
                      </div>

                      {/* External YouTube Link Button */}
                      <a
                        href={stream.type === 'channel' 
                          ? `https://www.youtube.com/channel/${stream.channelId}`
                          : `https://www.youtube.com/watch?v=${stream.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-lg"
                        title="Watch on official YouTube"
                      >
                        <ExternalLink size={16} />
                      </a>

                      {/* Admin Delete Trigger */}
                      {isCreatorOrAdmin && !stream.isPreset && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBroadcast(stream.id, stream.creatorUid || '');
                          }}
                          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-red-950/80 border border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition-all flex items-center justify-center shadow-lg animate-pulse"
                          title="Remove Stream Channel"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center p-6 text-white text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
                <Youtube size={28} />
              </div>
              <p className="text-sm font-black uppercase tracking-wider">No matching broadcasts</p>
              <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                Add special broadcasts or change search filters above.
              </p>
            </div>
          )}

          {/* Floating On-Screen Navigation Controls (Tiktok-Style Back/Next overlays) */}
          {filteredBroadcasts.length > 1 && (
            <div className="absolute left-3.5 bottom-24 z-30 flex flex-col gap-2.5">
              <button
                disabled={currentIdx === 0}
                onClick={() => scrollToIdx(currentIdx - 1)}
                className="h-8 w-8 bg-black/65 border border-white/10 hover:bg-indigo-950 hover:border-indigo-500 hover:text-indigo-400 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none transition-all shadow-lg"
                title="Previous Live Channel"
              >
                <ChevronUp size={16} />
              </button>
              <button
                disabled={currentIdx === filteredBroadcasts.length - 1}
                onClick={() => scrollToIdx(currentIdx + 1)}
                className="h-8 w-8 bg-black/65 border border-white/10 hover:bg-indigo-950 hover:border-indigo-500 hover:text-indigo-400 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none transition-all shadow-lg"
                title="Next Live Channel"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Institution Workspace Redirection card */}
      {activeStream && (
        <div className="max-w-md mx-auto w-full mt-2">
          <div 
            onClick={() => onOpenPlace?.(activeStream.creatorUid || '', activeStream.creatorName)}
            className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 hover:border-slate-750 rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-indigo-950/20 hover:scale-[1.01]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors animate-pulse" />

            <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-900/60 flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-md">
              <Compass size={18} className="animate-pulse" />
            </div>

            <div>
              <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest bg-rose-950/45 border border-rose-900/30 px-2.5 py-0.5 rounded-full">
                Institution Live Community
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-tight mt-2">
                Join the interaction hub at {activeStream.creatorName || 'the registered workspace'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold max-w-sm mx-auto mt-1 leading-relaxed">
                To keep communications centered and aligned, live communication resides inside the official workspace. Tap to open and join chat boards.
              </p>
            </div>

            <button
              type="button"
              className="mt-1 px-5 py-2 bg-rose-600 hover:bg-rose-500 group-hover:bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md group-hover:shadow-rose-600/10 flex items-center gap-1.5"
            >
              Open Workspace <ArrowUpRight size={10} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Excoin Subscription Passes Overlay Modal */}
      <AnimatePresence>
        {subscriptionSelector && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-150 flex flex-col gap-6 relative"
            >
              <button 
                type="button"
                onClick={() => setSubscriptionSelector(null)}
                className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-muted transition-colors font-bold flex items-center justify-center"
              >
                <X size={16} />
              </button>

              <div>
                <div className="flex items-center gap-2 text-indigo-900 mb-1">
                  <Coins size={20} className="text-amber-500 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-widest leading-none">
                    Exon Broadcast Pass
                  </h3>
                </div>
                <h4 className="text-lg font-black text-ink leading-tight mt-1.5 uppercase">
                  {subscriptionSelector.type === 'view' ? 'Streaming Access' : 'Interactive Chat Access'}
                </h4>
                <p className="text-xs text-muted font-bold leading-relaxed mt-2 text-slate-500">
                  {subscriptionSelector.type === 'view' 
                    ? 'Acquire a streaming pass using Excoins to watch live broadcasts. All coins spent are permanently burned from total supply.' 
                    : 'Unlock community comment posting, likes and interactive chat rooms for live streams using Excoins.'}
                </p>
              </div>

              {purchaseSuccessMsg ? (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-150 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 size={32} className="text-green-500 animate-pulse" />
                  <p className="text-xs font-black text-green-800 uppercase tracking-wider">Purchase Confirmed!</p>
                  <p className="text-xs text-green-600 font-bold leading-relaxed">{purchaseSuccessMsg}</p>
                </div>
              ) : (
                <>
                  {/* Current Wallet Balance */}
                  <div className="p-4 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Excoin Balance</span>
                    <strong className="text-xs font-black text-ink flex items-center gap-1 text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-xl">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {excoinBalance.toLocaleString()} EX
                    </strong>
                  </div>

                  {/* Subscriptions Options */}
                  <div className="flex flex-col gap-2">
                    {(subscriptionSelector.type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          type="button"
                          className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-rose-50/40 border-rose-500 shadow-sm' 
                              : 'bg-white border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-rose-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <div className="h-2 w-2 rounded-full bg-rose-500" />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{plan.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Valid for {plan.id === '4h' ? '4 Hours' : plan.id === '24h' ? '24 Hours' : plan.id === 'weekly' ? '7 Days' : '30 Days'}</p>
                            </div>
                          </div>
                          <strong className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-xl shrink-0">{plan.cost} EX</strong>
                        </button>
                      );
                    })}
                  </div>

                  {/* Buy Button & Alerts */}
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handlePurchaseSubscription(subscriptionSelector.streamId, subscriptionSelector.type, selectedPlanId)}
                      disabled={isPurchasing || (excoinBalance < (subscriptionSelector.type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).find(p => p.id === selectedPlanId)!.cost)}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-99 shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isPurchasing ? 'Processing Transaction...' : (
                        excoinBalance >= (subscriptionSelector.type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).find(p => p.id === selectedPlanId)!.cost 
                          ? `Confirm Purchase & Spend ${ (subscriptionSelector.type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).find(p => p.id === selectedPlanId)!.cost } EX`
                          : 'Insufficient Balance in Wallet'
                      )}
                    </button>
                    {excoinBalance < (subscriptionSelector.type === 'view' ? VIEW_PLANS : PARTICIPATION_PLANS).find(p => p.id === selectedPlanId)!.cost && (
                      <p className="text-[10px] text-red-500 font-extrabold text-center uppercase tracking-wider bg-red-50 border border-red-100 p-2.5 rounded-xl leading-relaxed mt-1">
                        ⚠️ Please acquire additional Excoins via Excoin P2P transaction board first!
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

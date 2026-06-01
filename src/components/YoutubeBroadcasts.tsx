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
  AlertCircle
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

const PRESET_YOUTUBE_BROADCASTS: YoutubeBroadcast[] = [];

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
}

export const YoutubeBroadcasts: React.FC<YoutubeBroadcastsProps> = ({
  user,
  userDoc,
  customBroadcasts = [],
  onAddBroadcast,
  onDeleteBroadcast,
  onLikeBroadcast,
  handleDebitExcoin,
  showNotification
}) => {
  const [activeStream, setActiveStream] = useState<YoutubeBroadcast | null>(null);
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
      return `https://www.youtube.com/embed/live_stream?channel=${item.channelId}&autoplay=1&mute=0&rel=0&showinfo=0&modestbranding=1`;
    }
    return `https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=0&rel=0&showinfo=0&modestbranding=1`;
  };

  return (
    <div className="w-full flex flex-col gap-6" id="youtube_broadcasts_portal">
      {/* Dynamic Main Player (Glow frame) */}
      <AnimatePresence mode="wait">
        {activeStream && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full bg-slate-950 text-white rounded-[2rem] overflow-hidden border border-slate-900 shadow-2xl relative"
          >
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={getEmbedUrl(activeStream)}
                title={activeStream.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <div className="p-6 flex flex-col gap-3 bg-gradient-to-b from-slate-900/40 to-slate-950">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-red-600 rounded-full text-[10px] uppercase font-black tracking-widest animate-pulse flex items-center gap-1.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-white" />
                  Broadcast Live
                </span>
                <button 
                  onClick={() => setActiveStream(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors font-bold text-[10px] uppercase flex items-center gap-1"
                >
                  <X size={14} /> Close Player
                </button>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-snug">{activeStream.title}</h3>
              {activeStream.description && (
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">{activeStream.description}</p>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-900 mt-2 pt-3">
                <span>Category: <strong className="text-slate-300">{activeStream.category}</strong></span>
                <span>Registered by: <strong className="text-slate-300">{activeStream.creatorName}</strong></span>
              </div>

              {/* Live Chat & Comments Area */}
              <div className="mt-6 border-t border-slate-900 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h4 className="text-xs font-black text-rose-500 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={16} />
                    EXON LIVE COMMUNITY CHAT
                  </h4>
                  <span className="text-[9px] uppercase font-black tracking-wider text-green-400 bg-green-950/40 border border-green-900/40 px-3 py-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                    Active
                  </span>
                </div>

                {/* Chat messages box */}
                <div className="h-64 bg-slate-950/60 rounded-2xl border border-slate-900/80 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
                  {activeChatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`text-xs p-3 rounded-2xl flex flex-col gap-1 max-w-[85%] ${
                        msg.userId === user?.uid 
                          ? 'bg-rose-950/40 border border-rose-900/40 self-end' 
                          : 'bg-slate-900/60 border border-slate-900 self-start'
                      }`}
                    >
                      <div className="flex items-center gap-4 justify-between">
                        <span className={`font-black uppercase tracking-wider text-[10px] ${msg.userId === user?.uid ? 'text-rose-450' : 'text-blue-400'}`}>
                          {msg.userName} {msg.userId === user?.uid && '(You)'}
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-100 leading-relaxed font-semibold mt-0.5">{msg.text}</p>
                    </div>
                  ))}
                  {activeChatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/30 rounded-2xl border border-dashed border-slate-900">
                      <MessageSquare className="text-slate-700 mb-2 animate-bounce" size={24} />
                      <p className="text-slate-500 font-black text-xs uppercase tracking-wider">No comments yet</p>
                      <p className="text-slate-600 font-bold text-[10px] mt-1">Be the very first viewer to participate and chat live!</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input or Subscribe lock option */}
                <div className="mt-4">
                  {!user ? (
                    <button 
                      type="button"
                      onClick={() => showNotification("Please sign in or register to get Excoins and join the live workspace!", "error")}
                      className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-2xl text-center font-extrabold text-xs uppercase tracking-wider transition-all"
                    >
                      Sign in to participate
                    </button>
                  ) : !hasActiveParticipationAccess(activeStream.id) ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900/30 border border-slate-900 rounded-3xl gap-4">
                      <div className="flex items-center gap-2.5 text-amber-500">
                        <Lock size={16} className="shrink-0" />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider">Participation subscription required</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Please unlock an interaction pass to stream comments, live chat and likes on this broadcast.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanId('4h');
                          setSubscriptionSelector({ streamId: activeStream.id, type: 'participate' });
                        }}
                        className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all w-full sm:w-auto text-nowrap shadow-sm hover:scale-[1.02] active:scale-98"
                      >
                        Unlock Participation
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendChatMessage} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Say something nice to other viewers..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-xs focus:outline-none focus:border-rose-500/40 font-bold transition-colors"
                      />
                      <button 
                        type="submit"
                        className="px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-98"
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Info card */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-ink flex items-center gap-2">
              <Youtube className="text-red-600" size={24} />
              EXONA BROADCAST LIVE
            </h2>
            <p className="text-xs text-muted font-bold mt-1 max-w-md">
              Watch official livestreams, interactive tutorials, science logs, or focus loops directly from YouTube.
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

      {/* Broadcast Stream Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBroadcasts.map((stream) => {
          const userLikes = stream.likes || [];
          const hasLiked = user ? userLikes.includes(user.uid) : false;
          const displayLikes = stream.isPreset 
            ? (stream.likesCount || 0) 
            : userLikes.length;

          const isCreatorOrAdmin = user && (stream.creatorUid === user.uid || userDoc?.role === 'admin');

          return (
            <motion.div
              layout
              key={stream.id}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 overflow-hidden flex flex-col justify-between hover:border-slate-200 transition-all group"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-red-600 border border-gray-100">
                      <Tv size={18} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">
                        {stream.category}
                      </span>
                      <p className="text-[10px] text-muted/60 font-bold leading-none mt-1">
                        By {stream.creatorName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1 shrink-0">
                      <div className="h-1 w-1 rounded-full bg-red-600" />
                      Live
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-ink group-hover:text-amber-500 leading-snug transition-colors line-clamp-1">
                    {stream.title}
                  </h3>
                  <p className="text-xs text-muted font-bold tracking-tight line-clamp-2 mt-2 leading-relaxed">
                    {stream.description || "Tune in to explore live feeds, study sessions, and broadcast logs on YouTube."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 mt-6 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLikeClick(stream.id, userLikes)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                      hasLiked 
                        ? 'bg-rose-50 border-rose-100 text-rose-600' 
                        : 'bg-white border-gray-100 text-muted hover:border-gray-200'
                    }`}
                  >
                    <Heart size={14} fill={hasLiked ? "currentColor" : "none"} className={hasLiked ? "animate-pulse" : ""} />
                    {displayLikes}
                  </button>

                  {isCreatorOrAdmin && !stream.isPreset && (
                    <button
                      onClick={() => onDeleteBroadcast(stream.id, stream.creatorUid || '')}
                      className="px-2.5 py-1.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0"
                      title="Remove Broadcast channel"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={stream.type === 'channel' 
                      ? `https://www.youtube.com/channel/${stream.channelId}`
                      : `https://www.youtube.com/watch?v=${stream.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-gray-100 text-muted hover:text-ink rounded-xl transition-all"
                    title="Watch on official YouTube App"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    onClick={() => {
                      if (!user) {
                        showNotification("Please sign in or register to join live transmissions!", "error");
                        return;
                      }
                      setActiveStream(stream);
                      const element = document.getElementById("youtube_broadcasts_portal");
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-4 py-2 text-white bg-ink hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-98 shadow-sm"
                  >
                    <Play size={10} fill="currentColor" />
                    Play
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredBroadcasts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-[2.5rem]">
            <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-150 text-muted mx-auto mb-4">
              <Youtube size={28} />
            </div>
            <p className="text-sm font-black text-ink uppercase tracking-wider">No matching broadcasts</p>
            <p className="text-xs text-muted font-bold mt-1 max-w-xs mx-auto leading-relaxed">
              {userDoc?.role === 'admin' 
                ? 'Register a new live channel link by tapping the "Add Broadcast" button above!'
                : 'No livestream channels are currently broadcasted by the administration.'}
            </p>
          </div>
        )}
      </div>

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

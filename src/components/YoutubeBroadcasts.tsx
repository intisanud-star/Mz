import React, { useState, useMemo } from 'react';
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
  Info
} from 'lucide-react';

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

interface YoutubeBroadcastsProps {
  user: any;
  userDoc: any;
  customBroadcasts: YoutubeBroadcast[];
  onAddBroadcast: (broadcast: Omit<YoutubeBroadcast, 'id' | 'likes'>) => Promise<void>;
  onDeleteBroadcast: (id: string, creatorUid: string) => Promise<void>;
  onLikeBroadcast: (id: string, likes: string[]) => Promise<void>;
}

export const YoutubeBroadcasts: React.FC<YoutubeBroadcastsProps> = ({
  user,
  userDoc,
  customBroadcasts = [],
  onAddBroadcast,
  onDeleteBroadcast,
  onLikeBroadcast
}) => {
  const [activeStream, setActiveStream] = useState<YoutubeBroadcast | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
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
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-snug">{activeStream.title}</h3>
              {activeStream.description && (
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">{activeStream.description}</p>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-900 mt-4 pt-4">
                <span>Category: <strong className="text-slate-350">{activeStream.category}</strong></span>
                <span>Registered by: <strong className="text-slate-350">{activeStream.creatorName}</strong></span>
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
                  
                  <div className="flex items-center gap-1.5">
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

              <div className="flex items-center justify-between border-t border-gray-50 mt-6 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onLikeBroadcast(stream.id, userLikes)}
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
                      setActiveStream(stream);
                      const element = document.getElementById("youtube_broadcasts_portal");
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-4 py-2 bg-ink hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
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
    </div>
  );
};

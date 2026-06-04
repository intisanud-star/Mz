import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Play, 
  Pause,
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
  ChevronDown,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Terminal,
  Activity,
  RotateCw,
  AlertTriangle,
  Database
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
  type: 'video' | 'channel' | 'vlc';
  streamType?: 'youtube' | 'vlc';
  streamUrl?: string;
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

// Custom VLC SDK Simulated Player
const NetworkStreamPlayer: React.FC<{ url: string; isActive: boolean; title: string }> = ({ url, isActive, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [showVlcStats, setShowVlcStats] = useState(false);
  const [vlcLogs, setVlcLogs] = useState<string[]>([]);
  const [bufferMode, setBufferMode] = useState<'latency' | 'balanced' | 'performance'>('balanced');
  const [streamQuality, setStreamQuality] = useState('1080p (Source)');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    fps: 30,
    bitrate: 4800,
    bufferTime: 0.8,
    droppedFrames: 0,
    decodedBytes: 0,
  });

  const addLog = (msg: string) => {
    setVlcLogs(prev => [...prev.slice(-4), `[VLC] ${msg}`]);
  };

  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: any = null;
    setPlaybackError(null);
    setVlcLogs([]);
    addLog(`Initializing VLC Core decoding matrix...`);
    addLog(`Connecting to source URL: ${url.substring(0, 35)}...`);

    const setupHls = () => {
      const HlsClass = (window as any).Hls;
      if (HlsClass && HlsClass.isSupported()) {
        addLog(`VLC-HLS hardware demuxer accelerated.`);
        
        const config: any = {};
        if (bufferMode === 'latency') {
          config.maxBufferLength = 3;
          config.liveBackoff = 1.5;
          config.highBufferWatchlogDelay = 1;
        } else if (bufferMode === 'performance') {
          config.maxBufferLength = 30;
          config.liveBackoff = 8;
        } else {
          config.maxBufferLength = 10;
          config.liveBackoff = 4;
        }

        hlsInstance = new HlsClass(config);
        addLog(`Source buffer length set to ${config.maxBufferLength || 10}s.`);
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);

        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, (event: any, data: any) => {
          addLog(`Manifest parsed. Stream levels detected: ${data.levels?.length || 1}`);
          if (data.levels && data.levels[0]) {
            setStreamQuality(`${data.levels[0].height || '720'}p`);
          }
          video.play()
            .then(() => {
              setIsPlaying(true);
              setPlaybackError(null);
              addLog(`Playback initialized successfully.`);
            })
            .catch(err => {
              addLog(`Autoplay halted: interaction required.`);
              console.warn(err);
            });
        });

        hlsInstance.on(HlsClass.Events.ERROR, (event: any, data: any) => {
          console.error("HLS runtime error:", data);
          if (data.fatal) {
            addLog(`❌ Fatal error: ${data.type} - ${data.details}`);
            switch (data.type) {
              case HlsClass.ErrorTypes.NETWORK_ERROR:
                addLog(`Attempting network recovery sequence...`);
                hlsInstance.startLoad();
                break;
              case HlsClass.ErrorTypes.MEDIA_ERROR:
                addLog(`Attempting media decoder recovery...`);
                hlsInstance.recoverMediaError();
                break;
              default:
                setPlaybackError(`Fatal stream decoding error. Format might be incompatible or CORS-blocked.`);
                addLog(`Playback pipeline halted.`);
                hlsInstance.destroy();
                break;
            }
          } else {
            addLog(`Parser warning: ${data.details}`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        addLog(`Native Safari CorePlayer engine active.`);
        video.src = url;
        video.play()
          .then(() => {
            setIsPlaying(true);
            addLog(`Direct Safari stream live.`);
          })
          .catch(err => {
            addLog(`Fallback autoplay blocked: tap Play to initiate.`);
          });
      } else {
        addLog(`Checking direct MIME capability...`);
        video.src = url;
        video.play()
          .then(() => {
            setIsPlaying(true);
            addLog(`Direct network video channel active.`);
          })
          .catch(err => {
            setPlaybackError("Advanced network stream protocol not supported natively by this web browser. Use a Safari/HLS-compliant viewer, or double check feed link.");
            addLog(`❌ Direct play failed.`);
          });
      }
    };

    if (!(window as any).Hls) {
      addLog(`Loading advanced VLC streaming libraries...`);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      script.onload = () => {
        addLog(`Network streaming engine loaded.`);
        setupHls();
      };
      script.onerror = () => {
        addLog(`❌ Failed to retrieve streaming packages. Using raw video fallback.`);
        setupHls();
      };
      document.head.appendChild(script);
    } else {
      setupHls();
    }

    const statsTimer = setInterval(() => {
      if (video && !video.paused) {
        setStats(prev => {
          const fpsVar = 29 + Math.floor(Math.random() * 3);
          const kbpsVar = 4200 + Math.floor(Math.random() * 800);
          const buf = video.buffered.length > 0 ? (video.buffered.end(0) - video.currentTime) : 0;
          return {
            fps: fpsVar,
            bitrate: kbpsVar,
            bufferTime: Number(buf.toFixed(2)),
            droppedFrames: prev.droppedFrames + (Math.random() > 0.95 ? 1 : 0),
            decodedBytes: prev.decodedBytes + Math.floor(kbpsVar * 128),
          };
        });
      }
    }, 1500);

    return () => {
      clearInterval(statsTimer);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [url, isActive, bufferMode]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      addLog(`Playback paused by operator.`);
    } else {
      video.play()
        .then(() => {
          setIsPlaying(true);
          addLog(`Playback resumed.`);
        })
        .catch(err => {
          addLog(`Could not resume playback.`);
        });
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
    addLog(isMuted ? "Audio unmuted." : "Audio muted.");
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    } else if ((video as any).mozRequestFullScreen) {
      (video as any).mozRequestFullScreen();
    }
    addLog(`Entering fullscreen theatre.`);
  };

  const forceReinit = () => {
    setBufferMode(prev => prev);
    addLog(`Forcing hardware decoder re-initialization...`);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col justify-center items-center select-none overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-auto"
        playsInline
        muted={isMuted}
      />

      <div className="absolute top-9 left-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-orange-500/30 text-[9px] uppercase font-black text-orange-400 select-none">
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L6 17H18L12 2M12 5L15.5 15H8.5L12 5M4 19H20V21H4V19Z" />
        </svg>
        <span>VLC ENGINE ACTIVE</span>
      </div>

      {playbackError && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10 gap-4">
          <div className="h-14 w-14 rounded-full bg-orange-950/60 border border-orange-500 flex items-center justify-center text-orange-500 animate-bounce">
            <AlertTriangle size={24} />
          </div>
          <p className="text-white text-xs font-black uppercase tracking-wider px-4">DECODER PIPELINE FAULT</p>
          <p className="text-slate-400 text-[10px] font-semibold max-w-xs leading-relaxed">{playbackError}</p>
          <button 
            onClick={forceReinit}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <RotateCw size={12} className="animate-spin" />
            RE-INITIALIZE DECODER
          </button>
        </div>
      )}

      {showVlcStats && (
        <div className="absolute inset-x-3 top-16 bottom-20 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 z-10 flex flex-col gap-3 font-mono text-[9px] text-slate-300 pointer-events-auto select-text overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-white">
            <span className="flex items-center gap-1.5 font-bold"><Activity size={10} className="text-orange-500" /> VLC STREAM DIAGNOSTICS</span>
            <button onClick={() => setShowVlcStats(false)} className="text-slate-400 hover:text-white font-extrabold px-1.5 py-0.5 rounded-md hover:bg-white/10">CLOSE</button>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
            <div>
              <p className="text-slate-500">ENGINE PORT ID</p>
              <p className="text-white font-bold">VLC-Web-SDK/1.4</p>
            </div>
            <div>
              <p className="text-slate-500">MIME INGEST LEVEL</p>
              <p className="text-emerald-400 font-bold">{streamQuality}</p>
            </div>
            <div>
              <p className="text-slate-500">BANDWIDTH DECODE</p>
              <p className="text-white font-bold">{(stats.bitrate / 1000).toFixed(1)} Mbps</p>
            </div>
            <div>
              <p className="text-slate-500">STREAMING PROTOCOL</p>
              <p className="text-orange-400 font-bold uppercase">{url?.includes('.m3u8') ? 'HLS (m3u8)' : 'Direct Video'}</p>
            </div>
            <div>
              <p className="text-slate-500">DEMUX FPS RATE</p>
              <p className="text-white font-bold">{stats.fps} Frames/sec</p>
            </div>
            <div>
              <p className="text-slate-500">CACHED BUFFER RANGE</p>
              <p className="text-indigo-400 font-bold">{stats.bufferTime} Seconds</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 shrink-0">
            <p className="text-slate-500 uppercase tracking-widest font-black text-[8px] flex items-center gap-1"><Terminal size={8} /> LIVE DECODER SYSTEM LOGGER</p>
            <div className="flex flex-col gap-0.5 bg-black/80 px-2 py-1.5 rounded-lg border border-slate-900 text-slate-400 text-[8px] min-h-[70px]">
              {vlcLogs.map((log, lidx) => (
                <div key={lidx} className="line-clamp-1">{log}</div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-800 pt-2">
            <p className="text-slate-500 uppercase font-black text-[8px] mb-1">OPT-IN VLC BUFFER CACHING MATRIX</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button 
                onClick={() => setBufferMode('latency')}
                className={`py-1.5 rounded border text-[8px] font-bold ${bufferMode === 'latency' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
              >
                Zero Latency (3s)
              </button>
              <button 
                onClick={() => setBufferMode('balanced')}
                className={`py-1.5 rounded border text-[8px] font-bold ${bufferMode === 'balanced' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
              >
                Balanced (10s)
              </button>
              <button 
                onClick={() => setBufferMode('performance')}
                className={`py-1.5 rounded border text-[8px] font-bold ${bufferMode === 'performance' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
              >
                Stable HD (30s)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none group z-5">
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent flex flex-col justify-end p-4 gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <div className="flex items-center justify-between text-slate-300 px-1 py-1">
            <div className="flex items-center gap-3">
              <button onClick={handlePlayPause} className="hover:text-white transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>

              <button onClick={handleMuteToggle} className="hover:text-white transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                  }
                  setIsMuted(val === 0);
                }}
                className="w-12 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 outline-none hover:bg-slate-700 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setShowVlcStats(!showVlcStats)}
                className={`py-1 px-2 rounded-md border text-[8px] font-extrabold flex items-center gap-1 transition-all ${
                  showVlcStats 
                    ? 'bg-orange-600/20 border-orange-500 text-orange-400 hover:bg-orange-600/35' 
                    : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title="View VLC Signal Diagnostics"
              >
                <Settings size={9} />
                VLC CONSOLE
              </button>

              <button onClick={forceReinit} className="hover:text-white transition-colors p-1" title="Reset/Re-ingest Live Feed">
                <RotateCw size={12} />
              </button>

              <button onClick={handleFullscreen} className="hover:text-white transition-colors p-1" title="Fullscreen Screen">
                <Maximize size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  broadcastEngine: 'sqlite_offline' | 'firebase';
  setBroadcastEngine: (engine: 'sqlite_offline' | 'firebase') => void;
  onAddBroadcast: (broadcast: Omit<YoutubeBroadcast, 'id' | 'likes'>) => Promise<void>;
  onDeleteBroadcast: (id: string, creatorUid: string) => Promise<void>;
  onLikeBroadcast: (id: string, likes: string[]) => Promise<void>;
  handleDebitExcoin: (amount: number, description: string) => Promise<boolean>;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onOpenPlace?: (creatorUid: string, creatorName?: string) => void;
  onClose?: () => void;
}

export const YoutubeBroadcasts: React.FC<YoutubeBroadcastsProps> = ({
  user,
  userDoc,
  customBroadcasts = [],
  broadcastEngine,
  setBroadcastEngine,
  onAddBroadcast,
  onDeleteBroadcast,
  onLikeBroadcast,
  handleDebitExcoin,
  showNotification,
  onOpenPlace,
  onClose
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Local/MMKV persistence representing isolated offline P2P stream chats
  const [localChatMessages, setLocalChatMessages] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('exon_sqlite_broadcast_chats_map');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('exon_sqlite_broadcast_chats_map', JSON.stringify(localChatMessages));
  }, [localChatMessages]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Immersive Reels Mode State
  const [isImmersiveMode, setIsImmersiveMode] = useState(true);
  const [isImmersiveCommentsOpen, setIsImmersiveCommentsOpen] = useState(false);
  const [immersiveSelectedCategory, setImmersiveSelectedCategory] = useState('All');
  const [isImmersiveAddFormOpen, setIsImmersiveAddFormOpen] = useState(false);
  const [immersiveShowCategoryDropdown, setImmersiveShowCategoryDropdown] = useState(false);
  const [followedCreators, setFollowedCreators] = useState<string[]>([]);
  const immersiveContainerRef = useRef<HTMLDivElement>(null);

  const handleImmersiveScroll = () => {
    if (!immersiveContainerRef.current) return;
    const container = immersiveContainerRef.current;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    if (height === 0) return;
    const newIdx = Math.round(scrollTop / height);
    if (newIdx !== currentIdx && newIdx >= 0 && newIdx < filteredBroadcasts.length) {
      setCurrentIdx(newIdx);
    }
  };

  const scrollImmersiveToIdx = (idx: number) => {
    if (!immersiveContainerRef.current) return;
    const container = immersiveContainerRef.current;
    container.scrollTo({
      top: idx * container.clientHeight,
      behavior: 'smooth'
    });
    setCurrentIdx(idx);
  };

  useEffect(() => {
    if (isImmersiveMode) {
      setTimeout(() => {
        if (immersiveContainerRef.current) {
          immersiveContainerRef.current.scrollTop = currentIdx * immersiveContainerRef.current.clientHeight;
        }
      }, 150);
    }
  }, [isImmersiveMode]);

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

  // GitHub Live Ingress State Integration
  const [githubBroadcast, setGithubBroadcast] = useState<any>(null);
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    const fetchGithubBroadcast = async () => {
      try {
        const BROADCAST_URL = "https://raw.githubusercontent.com/intisanud-star/exon-broadcast-data/refs/heads/main/broadcast.json";
        const response = await fetch(`${BROADCAST_URL}?t=${Date.now()}`);
        if (!response.ok) throw new Error("Network response not ok");
        const result = await response.json();
        setGithubBroadcast(result);
      } catch (err) {
        console.error("EXON GitHub integration sync state error:", err);
      } finally {
        setGithubLoading(false);
      }
    };
    fetchGithubBroadcast();
    // Set a polling timer to sync automatically every 15 seconds
    const interval = setInterval(fetchGithubBroadcast, 15000);
    return () => clearInterval(interval);
  }, []);

  const allBroadcasts = useMemo(() => {
    // Merge preset ones with database ones, avoiding duplicates if any and filtering out legacy mock ones
    const customs = customBroadcasts
      .filter(b => b && b.id !== 'sqlite_bd_1' && b.id !== 'sqlite_bd_2' && b.id !== 'preset_lofi' && b.id !== 'preset_nasa' && !b.isPreset)
      .map(b => ({ ...b, isPreset: false }));
    const list = [...customs, ...PRESET_YOUTUBE_BROADCASTS];

    // Add GitHub broadcast at index 0 if it is live
    if (githubBroadcast?.isLive) {
      const parsed = githubBroadcast.streamUrl ? parseYoutubeId(githubBroadcast.streamUrl) : null;
      const ghItem: YoutubeBroadcast = {
        id: 'github_live_broadcast',
        title: githubBroadcast.title || 'EXON LIVE TERMINAL',
        type: githubBroadcast.type === 'vlc' ? 'vlc' : (parsed?.type || 'video'),
        streamType: githubBroadcast.type === 'vlc' ? 'vlc' : 'youtube',
        streamUrl: githubBroadcast.streamUrl,
        videoId: githubBroadcast.type === 'vlc' ? undefined : (parsed?.id || githubBroadcast.streamUrl),
        channelId: githubBroadcast.type !== 'vlc' && parsed?.type === 'channel' ? parsed.id : undefined,
        category: githubBroadcast.category || 'General Live',
        description: githubBroadcast.notice || 'Exon Global Broadcast Center (GitHub Ingestion Mode)',
        creatorUid: 'github_system',
        creatorName: 'GitHub Command Center',
        isPreset: false,
      };
      list.unshift(ghItem);
    }
    return list;
  }, [customBroadcasts, githubBroadcast]);

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

  // Save last viewed broadcast stream ID to localStorage
  useEffect(() => {
    if (activeStream?.id) {
      localStorage.setItem('exon_last_viewed_stream_id', activeStream.id);
    }
  }, [activeStream?.id]);

  // Restore last viewed broadcast stream ID on mount / when filteredBroadcasts loads
  const hasRestoredLastViewed = useRef(false);
  useEffect(() => {
    if (!hasRestoredLastViewed.current && filteredBroadcasts.length > 0) {
      const savedId = localStorage.getItem('exon_last_viewed_stream_id');
      if (savedId) {
        const idx = filteredBroadcasts.findIndex(b => b.id === savedId);
        if (idx !== -1) {
          setCurrentIdx(idx);
          setTimeout(() => {
            if (immersiveContainerRef.current) {
              immersiveContainerRef.current.scrollTop = idx * immersiveContainerRef.current.clientHeight;
            }
          }, 200);
        }
      }
      hasRestoredLastViewed.current = true;
    }
  }, [filteredBroadcasts]);

  // 1. Listen to user wallet balance in real-time
  useEffect(() => {
    if (!user?.uid) {
      setExcoinBalance(0);
      return;
    }
    if (broadcastEngine === 'sqlite_offline') {
      const mockSavedBalance = localStorage.getItem(`exon_sqlite_wallet_${user.uid}`);
      if (mockSavedBalance) {
        setExcoinBalance(Number(mockSavedBalance));
      } else {
        localStorage.setItem(`exon_sqlite_wallet_${user.uid}`, '5000');
        setExcoinBalance(5000);
      }
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
  }, [user?.uid, broadcastEngine]);

  // 2. Listen to user broadcast subscriptions in real-time
  useEffect(() => {
    if (!user?.uid) {
      setSubscriptions({});
      return;
    }
    if (broadcastEngine === 'sqlite_offline') {
      const savedSubs = localStorage.getItem(`exon_sqlite_subs_${user.uid}`);
      if (savedSubs) {
        try {
          setSubscriptions(JSON.parse(savedSubs));
        } catch (e) {
          console.error(e);
        }
      } else {
        setSubscriptions({});
      }
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
  }, [user?.uid, broadcastEngine]);

  // 3. Listen to Active Stream Live Comments in real-time
  useEffect(() => {
    if (!activeStream?.id) {
      setActiveChatMessages([]);
      return;
    }
    if (broadcastEngine === 'sqlite_offline') {
      const msgs = localChatMessages[activeStream.id] || [
        { id: 'm1', userName: 'System Bot', text: `Offline-first P2P Stream Chat initialized for ${activeStream.title}. Zero readings from Firestore.`, timestamp: Date.now() - 500000 },
        { id: 'm2', userName: 'Exonabot', text: 'Welcome! Interact freely. Likes & comments are bound to your local SQL/MMKV partition.', timestamp: Date.now() - 100000 }
      ];
      setActiveChatMessages(msgs);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
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
  }, [activeStream?.id, broadcastEngine, localChatMessages]);

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

    if (broadcastEngine === 'sqlite_offline') {
      try {
        if (excoinBalance < plan.cost) {
          showNotification('Insufficient local Excoins balance', 'error');
          setIsPurchasing(false);
          return;
        }

        const docId = `${user.uid}_${streamId}_${type}`;
        const expiresAt = Date.now() + plan.durationMs;

        const currentSubs = { ...subscriptions };
        currentSubs[docId] = {
          expiresAt,
          plan: planId,
          type
        };
        setSubscriptions(currentSubs);
        localStorage.setItem(`exon_sqlite_subs_${user.uid}`, JSON.stringify(currentSubs));

        const currentBalance = excoinBalance - plan.cost;
        setExcoinBalance(currentBalance);
        localStorage.setItem(`exon_sqlite_wallet_${user.uid}`, String(currentBalance));

        setPurchaseSuccessMsg(`Successfully unlocked ${type === 'view' ? 'Streaming' : 'Interaction'} pass! Duration: ${plan.id === '4h' ? '4 hours' : plan.id === '24h' ? '24 hours' : plan.id === 'weekly' ? '7 days' : '30 days'}.`);
        showNotification(`${type === 'view' ? 'Streaming' : 'Participation'} Access Unlocked!`, 'success');

        setTimeout(() => {
          setPurchaseSuccessMsg('');
          setSubscriptionSelector(null);
          if (type === 'view') {
            setActiveStream(stream || null);
            const element = document.getElementById("youtube_broadcasts_portal");
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 2200);
      } catch (err) {
        console.error(err);
        showNotification('Failed to register subscription locally', 'error');
      } finally {
        setIsPurchasing(false);
      }
      return;
    }

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

    if (broadcastEngine === 'sqlite_offline') {
      const newMsg = {
        id: `local_msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        broadcastId: activeStream.id,
        userId: user.uid,
        userName: userDoc?.displayName || user?.displayName || 'Exona Broadcaster',
        text: textPayload,
        timestamp: Date.now()
      };
      const existing = localChatMessages[activeStream.id] || [];
      const updated = {
        ...localChatMessages,
        [activeStream.id]: [...existing, newMsg]
      };
      setLocalChatMessages(updated);
      showNotification("Comment broadcasted via local socket mesh!", "success");
      return;
    }

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
  const [streamFormType, setStreamFormType] = useState<'youtube' | 'vlc'>('youtube');
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
    if (streamFormType === 'vlc') {
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        setParsingError('⚠️ VLC Network Link must start with http:// or https://');
      } else {
        setParsingError('');
      }
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

    setIsSubmitting(true);
    setParsingError('');

    try {
      if (streamFormType === 'vlc') {
        await onAddBroadcast({
          title: formTitle.trim(),
          type: 'vlc',
          streamType: 'vlc',
          streamUrl: formUrl.trim(),
          category: formCategory,
          description: formDescription.trim(),
          creatorUid: user?.uid,
          creatorName: userDoc?.displayName || user?.displayName || 'Exona Broadcaster',
        });
      } else {
        const parsed = parseYoutubeId(formUrl);
        if (!parsed) {
          setParsingError('⚠️ Could not extract YouTube ID. Check your link format.');
          setIsSubmitting(false);
          return;
        }

        await onAddBroadcast({
          title: formTitle.trim(),
          type: parsed.type,
          streamType: 'youtube',
          category: formCategory,
          description: formDescription.trim(),
          ...(parsed.type === 'video' ? { videoId: parsed.id } : { channelId: parsed.id }),
          creatorUid: user?.uid,
          creatorName: userDoc?.displayName || user?.displayName || 'Exona Broadcaster',
        });
      }

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
      return `https://www.youtube.com/embed/live_stream?channel=${item.channelId}&autoplay=1&mute=0&playsinline=1&rel=0&showinfo=0&modestbranding=1`;
    }
    return `https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=0&playsinline=1&rel=0&showinfo=0&modestbranding=1`;
  };

  const getCoverImageUrl = (item: YoutubeBroadcast) => {
    if (item.type === 'video' && item.videoId) {
      return `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
    }
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop`;
  };

  if (isImmersiveMode) {
    return (
      <div className="fixed inset-0 bg-black z-[9990] flex flex-col justify-between overflow-hidden select-none font-sans text-white animate-fade-in" id="youtube_broadcasts_portal">
        {/* Top Glass Header Bar Overlay */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/90 to-transparent z-50 flex items-center justify-between px-4 sm:px-6 pointer-events-auto">
          {/* Add Broadcast Stream Button */}
          {userDoc?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => setIsImmersiveAddFormOpen(true)}
              className="h-10 w-10 bg-slate-900/80 backdrop-blur-md border border-white/15 hover:border-orange-500 rounded-full flex items-center justify-center text-white hover:text-orange-400 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer animate-fade-in"
              title="Register new stream/station"
            >
              <Plus size={20} />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}

          {/* Category Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setImmersiveShowCategoryDropdown(!immersiveShowCategoryDropdown)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-200 hover:text-white transition-all cursor-pointer shadow-lg"
            >
              <span>{categoryFilter === 'All' ? 'Discover Channels' : categoryFilter}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${immersiveShowCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {immersiveShowCategoryDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 bg-slate-950/95 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-0.5"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setImmersiveShowCategoryDropdown(false);
                        setCurrentIdx(0);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-orange-600 text-white font-black'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              setIsImmersiveMode(false);
              setIsImmersiveCommentsOpen(false);
              if (onClose) {
                onClose();
              }
            }}
            className="h-10 w-10 bg-slate-900/80 backdrop-blur-md border border-white/15 hover:border-rose-500 rounded-full flex items-center justify-center text-slate-350 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Exit Fullscreen Reels"
          >
            <X size={18} />
          </button>
        </div>

        {/* Immersive Swiping Vertical Scroll Container */}
        {filteredBroadcasts.length > 0 ? (
          <div
            ref={immersiveContainerRef}
            onScroll={handleImmersiveScroll}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col relative bg-black"
          >
            {filteredBroadcasts.map((stream, idx) => {
              const isActive = idx === currentIdx;
              const userLikes = stream.likes || [];
              const hasLiked = user ? userLikes.includes(user.uid) : false;
              const displayLikes = stream.isPreset
                ? (stream.likesCount || 0)
                : userLikes.length;

              const isCreatorOrAdmin = user && (stream.creatorUid === user.uid || userDoc?.role === 'admin');
              const isFollowed = followedCreators.includes(stream.creatorUid || stream.creatorName || '');

              return (
                <div
                  key={stream.id}
                  className="w-full h-screen min-h-screen snap-start snap-always relative shrink-0 overflow-hidden flex items-center justify-center bg-black"
                >
                  {/* Video Player Frame */}
                  {isActive ? (
                    stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                      <NetworkStreamPlayer 
                        url={stream.streamUrl || ''} 
                        isActive={isActive} 
                        title={stream.title} 
                      />
                    ) : (
                      <iframe
                        src={getEmbedUrl(stream)}
                        title={stream.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-auto bg-black"
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
                      <img 
                        src={getCoverImageUrl(stream)} 
                        alt={stream.title} 
                        className="absolute inset-0 w-full h-full object-cover opacity-20 select-none pointer-events-none filter blur-md"
                      />
                      <div className="z-10 flex flex-col items-center gap-3">
                        {stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                          <div className="h-14 w-14 rounded-full bg-orange-950/85 border border-orange-500/30 flex items-center justify-center text-orange-400 animate-pulse">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L6 17H18L12 2M12 5L15.5 15H8.5L12 5M4 19H20V21H4V19Z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-slate-900/85 border border-slate-800 flex items-center justify-center text-red-500 animate-pulse">
                            <Youtube size={26} />
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CONNECTING CARRIER MATRIX...</span>
                      </div>
                    </div>
                  )}

                  {/* Right Floating Actions Column */}
                  <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-4.5 pointer-events-auto">
                    {/* Profile Hub Sphere */}
                    <div className="relative group cursor-pointer" onClick={() => {
                      setIsImmersiveMode(false);
                      if (onClose) onClose();
                      onOpenPlace?.(stream.creatorUid || '', stream.creatorName);
                    }}>
                      <div
                        className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-[2px] shadow-lg hover:scale-110 duration-200"
                        title={`Inspect ${stream.creatorName}'s School Space`}
                      >
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[11px] font-black uppercase text-white">
                          {stream.creatorName?.slice(0, 2).toUpperCase() || 'EX'}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white rounded-full p-0.5 border border-slate-950 flex items-center justify-center shadow-md">
                        <Compass size={8} className="animate-pulse" />
                      </div>
                    </div>

                    {/* Interactive Like Action */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeClick(stream.id, userLikes);
                        }}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-lg border cursor-pointer ${
                          hasLiked
                            ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                            : 'bg-black/60 border-white/20 text-slate-200 hover:text-white hover:bg-black/80'
                        }`}
                      >
                        <Heart size={20} fill={hasLiked ? "currentColor" : "none"} />
                      </button>
                      <span className="text-[10px] font-extrabold text-white drop-shadow-md">{displayLikes}</span>
                    </div>

                    {/* Slide-Up Chat board Comment Trigger */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsImmersiveCommentsOpen(true);
                          setActiveStream(stream);
                        }}
                        className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                        title="Interactive Live Comments board"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <span className="text-[10px] font-extrabold text-white drop-shadow-md">
                        {idx === currentIdx ? activeChatMessages.length : Math.floor((stream.likesCount || 12) / 2) + 2}
                      </span>
                    </div>

                    {/* Stream Link Sharing Action */}
                    <button
                      type="button"
                      onClick={() => {
                        const linkVal = stream.streamType === 'vlc' || stream.type === 'vlc'
                          ? stream.streamUrl
                          : `https://www.youtube.com/watch?v=${stream.videoId}`;
                        navigator.clipboard.writeText(linkVal || '');
                        showNotification("Live Stream link copy-pasted to clipboard!", "success");
                      }}
                      className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                      title="Share current stream link"
                    >
                      <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>

                    {/* Admin diagnostic parameters */}
                    <button
                      type="button"
                      onClick={() => {
                        showNotification(`Engine: ${stream.streamType === 'vlc' ? 'VLC Decoder' : 'YouTube SDK'} active. Signal: 100%`, 'info');
                      }}
                      className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                      title="View system parameters"
                    >
                      <Settings size={18} />
                    </button>

                    {/* Admin Trash / Delete */}
                    {isCreatorOrAdmin && !stream.isPreset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBroadcast(stream.id, stream.creatorUid || '');
                        }}
                        className="h-11 w-11 rounded-full bg-red-950/80 border border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition-all flex items-center justify-center shadow-lg animate-pulse cursor-pointer"
                        title="Remove Station"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Bottom overlay detailed caption description (like mobile reels) */}
                  <div className="absolute bottom-16 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none flex flex-col gap-2 z-35">
                    <span className="px-2.5 py-0.5 bg-red-650 text-white rounded-full text-[9px] uppercase font-black tracking-widest animate-pulse flex items-center gap-1 self-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      Live Broadcast
                    </span>
                    <h3 className="text-white text-sm font-black uppercase tracking-wider leading-tight drop-shadow-md">{stream.title}</h3>
                    {stream.description && (
                      <p className="text-slate-200 text-xs font-semibold leading-relaxed drop-shadow-sm max-w-sm line-clamp-2">{stream.description}</p>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">Channel Provider: {stream.creatorName || 'Autonomous Station'}</span>
                  </div>

                  {/* Thin Bottom Reels progress accent */}
                  <div className="absolute bottom-16 inset-x-0 h-1 bg-rose-600/35 overflow-hidden">
                    <div className="h-full bg-rose-600 w-[60%] animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center p-6 text-white text-center">
            <p className="text-sm font-black uppercase tracking-wider">No matching feeds</p>
            <button
              type="button"
              onClick={() => setCategoryFilter('All')}
              className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-505 transition-colors cursor-pointer"
            >
              Show All Channels
            </button>
          </div>
        )}

        {/* INSTAGRAM REELS STATIC NAVIGATION BAR SIMULATION (BOTTOM FOOTER) */}
        <div className="h-16 bg-black border-t border-white/5 flex items-center justify-around text-slate-500 z-40 px-6 sm:px-12 pointer-events-auto shrink-0 pb-1">
          <button onClick={() => { if (onClose) onClose(); }} className="hover:text-white transition-colors cursor-pointer" title="Go Home Dashboard">
            <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </button>
          <button className="text-white hover:scale-110 transition-transform cursor-pointer" title="Reels Mode active">
            <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H20V18H4V6M2 4V20H22V4H2M8 10V14L13 12L8 10Z"/></svg>
          </button>
          {userDoc?.role === 'admin' ? (
            <button onClick={() => setIsImmersiveAddFormOpen(true)} className="hover:text-white hover:scale-110 transition-all cursor-pointer" title="Add Live Stream">
              <Plus size={22} className="text-white bg-slate-800 rounded-lg p-0.5" />
            </button>
          ) : (
            <button 
              onClick={() => { 
                setCategoryFilter('All'); 
                showNotification("Exploring all live channels!", "info"); 
              }} 
              className="hover:text-white hover:scale-110 transition-all cursor-pointer text-slate-400" 
              title="Explore Channels"
            >
              <Compass size={22} className="hover:text-white" />
            </button>
          )}
          <button 
            onClick={() => {
              if (activeStream) {
                setIsImmersiveCommentsOpen(true);
              } else {
                showNotification("Please select a live station first!", "info");
              }
            }}
            className="hover:text-white transition-colors cursor-pointer" 
            title="Message Board"
          >
            <MessageSquare size={20} />
          </button>
          <div 
            onClick={() => {
              if (onClose) onClose();
              const profileTab = document.getElementById("profile_tab_trigger");
              if (profileTab) profileTab.click();
            }}
            className="h-6 w-6 rounded-full border border-white/60 bg-slate-850 flex items-center justify-center text-[8px] font-black text-rose-450 font-sans cursor-pointer hover:scale-110 transition-transform" 
            title="Your User Profile"
          >
            {user?.displayName?.slice(0, 2).toUpperCase() || 'EX'}
          </div>
        </div>

        {/* SLIDE-UP REELS COMMENTS DRAWER OVERLAY */}
        <AnimatePresence>
          {isImmersiveCommentsOpen && activeStream && (
            <>
              {/* Frosted comments Backdrop */}
              <div 
                onClick={() => setIsImmersiveCommentsOpen(false)}
                className="absolute inset-x-0 top-0 bottom-[60vh] bg-transparent z-[9992] cursor-pointer"
              />
              {/* Solid Updrawer card */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute bottom-0 inset-x-0 h-[60vh] rounded-t-[2.2rem] bg-slate-950/98 border-t border-slate-800 z-[9993] flex flex-col p-6 pointer-events-auto"
              >
                {/* Header bar handle */}
                <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-700 select-none shrink-0" onClick={() => setIsImmersiveCommentsOpen(false)} />
                
                <div className="flex items-center justify-between border-b border-slate-900 pb-3 shrink-0">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Live Station Room Interaction</h4>
                    <p className="text-[9px] text-slate-500 font-bold mt-0.5 leading-none">Viewing chats for {activeStream.title}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-650/25 border border-rose-500/30 text-rose-400 rounded-full font-mono text-[9px] font-black">
                    {activeChatMessages.length} CHATS
                  </span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 scrollbar-hide">
                  {activeChatMessages.length > 0 ? (
                    activeChatMessages.map((msg) => (
                      <div key={msg.id} className="flex gap-2.5 text-slate-300">
                        {/* Short circle user avatar letter */}
                        <div className="h-7 w-7 rounded-lg bg-indigo-950 border border-slate-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 uppercase">
                          {msg.userName?.slice(0, 2) || "EX"}
                        </div>
                        <div className="flex flex-col gap-0.5 max-w-[85%]">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-black text-rose-450">{msg.userName}</span>
                            <span className="text-[8px] text-slate-600">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10.5px] leading-relaxed text-slate-200 select-text bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl rounded-tl-none font-medium">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
                      <MessageSquare size={24} className="text-slate-800 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Broadcast room is currently empty</p>
                      <p className="text-[9px] text-slate-500 font-bold">Secure a participation pass below to say hello!</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Submit message form */}
                <form 
                  onSubmit={handleSendChatMessage} 
                  className="border-t border-slate-900 pt-3 flex gap-2 shrink-0 pointer-events-auto"
                >
                  <input
                    type="text"
                    required
                    placeholder="Say something respectful in chat..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-800 rounded-2xl bg-slate-900 text-xs text-white focus:outline-none focus:border-rose-500/40 font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-rose-650 hover:bg-rose-500 text-white rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* SLIDE-IN REELS REGISTER STREAM FORM PREVIEW OVERLAY (FOR ADMINS) */}
        <AnimatePresence>
          {isImmersiveAddFormOpen && userDoc?.role === 'admin' && (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9995] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4 text-white uppercase font-mono text-[9px] pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsImmersiveAddFormOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-755 text-white rounded-full transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>

                <div>
                  <div className="flex items-center gap-2 text-orange-400 mb-1">
                    <Sparkles size={16} className="text-orange-400 animate-pulse" />
                    <h3 className="text-[10px] font-black tracking-widest uppercase">REELS SIGNAL MATRIX MANAGER</h3>
                  </div>
                  <p className="text-slate-400 text-[8px] font-semibold tracking-wider leading-relaxed">
                    Add and configure live feeds using VLC (MP4 / HLS / M3U8) or Youtube Video & Channel engines instantly.
                  </p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await handleAddSubmit(e);
                  setIsImmersiveAddFormOpen(false);
                }} className="flex flex-col gap-3">
                  {/* Form Quality Selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">PLAYBACK ENGINE TYPE :</span>
                    <div className="grid grid-cols-2 gap-2 font-black text-[9px]">
                      <button
                        type="button"
                        onClick={() => setStreamFormType('youtube')}
                        className={`py-2 text-[8px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                          streamFormType === 'youtube'
                            ? 'bg-red-650/20 border-red-500 text-white font-black'
                            : 'bg-slate-800 border-slate-750 text-slate-400'
                        }`}
                      >
                        YOUTUBE EMBED
                      </button>
                      <button
                        type="button"
                        onClick={() => setStreamFormType('vlc')}
                        className={`py-2 text-[8px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                          streamFormType === 'vlc'
                            ? 'bg-orange-655/20 border-orange-500 text-white font-black'
                            : 'bg-slate-800 border-slate-750 text-slate-400'
                        }`}
                      >
                        VLC (HLS / M3U8 / MP4)
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">CHANNEL SIGNATURE TITLE :</span>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Hausa Cultural TV"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-semibold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">INGEST MEDIA LINK OR VIDEO ID :</span>
                    <input
                      type="text"
                      required
                      value={formUrl}
                      onChange={(e) => handleFormUrlChange(e.target.value)}
                      placeholder={streamFormType === 'vlc' ? "https://stream.m3u8" : "https://youtube.com/watch?v=..."}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-semibold text-xs text-normal"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">STREAM CATEGORY :</span>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-black text-[10px]"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">OPTIONAL DESCRIPTION CAPTION :</span>
                    <textarea
                      placeholder="Tune in to discover Hausa cultural broadcasts..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full h-12 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 resize-none font-sans font-semibold text-[10px]"
                    />
                  </div>

                  {parsingError && <p className="text-red-500 font-bold bg-red-950/20 px-2 py-1.5 rounded-lg text-[8px] leading-tight mt-1">{parsingError}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 mt-1 cursor-pointer"
                  >
                    {isSubmitting ? 'INGESTING FEED SEQUENCE...' : 'REGISTER EXON BROADCAST LIVE'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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

        {/* OFFLINE-FIRST SQLite ENGINES TOGGLES */}
        <div className="bg-slate-950 text-slate-100 p-5 rounded-[2.5rem] border border-slate-900 shadow-xl overflow-hidden relative mb-8">
          <div className="absolute top-0 right-0 w-44 h-44 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                <Database size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                  DATABASE TRANSMISSION PORT
                  {broadcastEngine === 'sqlite_offline' && (
                    <span className="text-[8px] bg-green-500/15 text-green-400 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-green-500/20">
                      ZERO_READS_ACTIVE
                    </span>
                  )}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Configure Ingest Stream & Post-Chat Storage Channel</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBroadcastEngine('sqlite_offline');
                  showNotification('Switched broadcasting feed to Local SQLite & MMKV partition. Zero reading cost.', 'success');
                }}
                className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${broadcastEngine === 'sqlite_offline' ? 'bg-green-500 text-slate-950 shadow-md font-extrabold' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
              >
                Offline Local (No Reads)
              </button>
              <button
                onClick={() => {
                  setBroadcastEngine('firebase');
                  showNotification('Broadcasting synchronized real-time via Cloud Firestore Engine API.', 'info');
                }}
                className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${broadcastEngine === 'firebase' ? 'bg-accent text-white shadow-md font-extrabold' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
              >
                Cloud Firestore Sync
              </button>
            </div>
          </div>
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
              <div className="flex items-center gap-2 text-indigo-900 mb-1">
                <Sparkles size={18} className="text-accent shrink-0 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest">Register New Live Channel (YouTube & VLC SDKs)</h3>
              </div>

              {/* Engine SDK Selector */}
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted">Select Ingest Engine / Player SDK</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStreamFormType('youtube');
                      setFormUrl('');
                      setParsingError('');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                      streamFormType === 'youtube'
                        ? 'bg-red-650 border-red-500 text-white'
                        : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300'
                    }`}
                  >
                    <Youtube size={14} />
                    YouTube Embed SDK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStreamFormType('vlc');
                      setFormUrl('');
                      setParsingError('');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                      streamFormType === 'vlc'
                        ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L6 17H18L12 2M12 5L15.5 15H8.5L12 5M4 19H20V21H4V19Z" />
                    </svg>
                    VLC Advanced Stream SDK (HLS/M3U8)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Broadcast Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hausa Cultural TV / Holy Sanctuary"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/80 rounded-2xl bg-white text-sm focus:outline-none focus:border-accent/40 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">
                    {streamFormType === 'vlc' ? 'VLC Advanced Network stream Link (M3U8 / HLS / MP4)' : 'YouTube Video/Channel Link or ID'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      streamFormType === 'vlc'
                        ? "e.g. https://win.holol.com/live/mak/playlist.m3u8"
                        : "e.g. https://www.youtube.com/watch?v=21X5lGlDOfg"
                    }
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

      {/* Immersive Entry Banner Option */}
      <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-5 shadow-lg max-w-md mx-auto w-full text-center">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-650 text-white rounded-full text-[9px] uppercase font-black tracking-widest animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          EXON DISCOVER PORTAL (DARK MODE)
        </span>
        <h3 className="text-white text-xs font-black uppercase tracking-wider mt-1.5">Interactive Fullscreen Reels Mode</h3>
        <p className="text-slate-400 text-[10px] sm:text-xs font-semibold max-w-xs leading-relaxed">
          Unlock a borderless, edge-to-edge dark screen experience with responsive vertical snapping, slide-up comments, likes and full VLC/YouTube embeds.
        </p>
        <button 
          onClick={() => setIsImmersiveMode(true)}
          className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-600/25 hover:shadow-lg text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-103 active:scale-97 flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <Maximize size={14} className="text-orange-400" />
          📺 TOUCH ENTER FULLSCREEN REELS
        </button>
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
                    {/* Enter Immersive Reels trigger on Touch */}
                    <button 
                      onClick={() => {
                        scrollToIdx(idx);
                        setIsImmersiveMode(true);
                      }}
                      className="absolute top-10 right-4 z-40 h-8 px-2.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20 text-white hover:bg-black/90 hover:border-orange-500 hover:text-orange-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer pointer-events-auto"
                      title="Touch for Fullscreen Immersive Reels experience"
                    >
                      <Maximize size={10} className="text-orange-500 animate-pulse" />
                      TOUCH FOR FULLSCREEN
                    </button>

                    {isActive ? (
                      stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                        <NetworkStreamPlayer 
                          url={stream.streamUrl || ''} 
                          isActive={isActive} 
                          title={stream.title} 
                        />
                      ) : (
                        <iframe
                          src={getEmbedUrl(stream)}
                          title={stream.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-auto"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
                        <img 
                          src={getCoverImageUrl(stream)} 
                          alt={stream.title} 
                          className="absolute inset-0 w-full h-full object-cover opacity-30 select-none pointer-events-none filter blur-sm"
                        />
                        <div className="z-10 flex flex-col items-center gap-3">
                          {stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                            <div className="h-14 w-14 rounded-full bg-orange-950/85 border border-orange-500/30 flex items-center justify-center text-orange-400 animate-pulse">
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L6 17H18L12 2M12 5L15.5 15H8.5L12 5M4 19H20V21H4V19Z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-slate-900/85 border border-slate-800 flex items-center justify-center text-red-500 animate-pulse">
                              <Tv size={24} />
                            </div>
                          )}
                          <p className="text-white text-xs font-black uppercase tracking-widest px-4 text-center">{stream.title}</p>
                          <p className="text-slate-400 text-[10px] font-bold">Scroll or use buttons to switch station</p>
                        </div>
                      </div>
                    )}

                    {/* Full Touch/Click Overlay to open immersive fullscreen dark mood immediately */}
                    <div 
                      onClick={() => {
                        scrollToIdx(idx);
                        setIsImmersiveMode(true);
                      }}
                      className="absolute inset-0 z-25 cursor-pointer"
                      role="button"
                      aria-label="Touch for fullscreen immersive experience"
                    />

                    {/* TikTok Overlay Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none flex flex-col gap-2 z-30">
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
                    <div className="absolute right-3.5 bottom-16 z-40 flex flex-col items-center gap-4">
                      
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

                      {/* External YouTube / Network Link Button */}
                      <a
                        href={stream.streamType === 'vlc' || stream.type === 'vlc'
                          ? stream.streamUrl
                          : (stream.type === 'channel' 
                            ? `https://www.youtube.com/channel/${stream.channelId}`
                            : `https://www.youtube.com/watch?v=${stream.videoId}`)
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-lg"
                        title={stream.streamType === 'vlc' || stream.type === 'vlc' ? "Open stream in external application" : "Watch on official YouTube"}
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

      {/* IMMERSIVE VERTICAL REELS FULLSCREEN PLAYER OVERLAY */}
      <AnimatePresence>
        {isImmersiveMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9990] flex flex-col justify-between overflow-hidden select-none font-sans text-white"
          >
            {/* Top Glass Header Bar Overlay */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/90 to-transparent z-50 flex items-center justify-between px-4 sm:px-6 pointer-events-auto">
              {/* Add Broadcast Stream Button */}
              {userDoc?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setIsImmersiveAddFormOpen(true)}
                  className="h-10 w-10 bg-slate-900/80 backdrop-blur-md border border-white/15 hover:border-orange-500 rounded-full flex items-center justify-center text-white hover:text-orange-400 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                  title="Register new stream/station"
                >
                  <Plus size={20} />
                </button>
              ) : (
                <div className="w-10 h-10" />
              )}

              {/* Category Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setImmersiveShowCategoryDropdown(!immersiveShowCategoryDropdown)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-200 hover:text-white transition-all cursor-pointer shadow-lg"
                >
                  <span>{categoryFilter === 'All' ? 'Discover Channels' : categoryFilter}</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${immersiveShowCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {immersiveShowCategoryDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 bg-slate-950/95 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-0.5"
                    >
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setCategoryFilter(cat);
                            setImmersiveShowCategoryDropdown(false);
                            setCurrentIdx(0);
                          }}
                          className={`w-full text-left px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            categoryFilter === cat
                              ? 'bg-orange-600 text-white font-black'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsImmersiveMode(false);
                  setIsImmersiveCommentsOpen(false);
                }}
                className="h-10 w-10 bg-slate-900/80 backdrop-blur-md border border-white/15 hover:border-rose-500 rounded-full flex items-center justify-center text-slate-350 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                title="Exit Fullscreen Reels"
              >
                <X size={18} />
              </button>
            </div>

            {/* Immersive Swiping Vertical Scroll Container */}
            {filteredBroadcasts.length > 0 ? (
              <div
                ref={immersiveContainerRef}
                onScroll={handleImmersiveScroll}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col relative bg-black animate-fade-in"
              >
                {filteredBroadcasts.map((stream, idx) => {
                  const isActive = idx === currentIdx;
                  const userLikes = stream.likes || [];
                  const hasLiked = user ? userLikes.includes(user.uid) : false;
                  const displayLikes = stream.isPreset
                    ? (stream.likesCount || 0)
                    : userLikes.length;

                  const isCreatorOrAdmin = user && (stream.creatorUid === user.uid || userDoc?.role === 'admin');
                  const isFollowed = followedCreators.includes(stream.creatorUid || stream.creatorName || '');

                  return (
                    <div
                      key={stream.id}
                      className="w-full h-screen min-h-screen snap-start snap-always relative shrink-0 overflow-hidden flex items-center justify-center bg-black"
                    >
                      {/* Video Player Frame */}
                      {isActive ? (
                        stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                          <NetworkStreamPlayer 
                            url={stream.streamUrl || ''} 
                            isActive={isActive} 
                            title={stream.title} 
                          />
                        ) : (
                          <iframe
                            src={getEmbedUrl(stream)}
                            title={stream.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-auto bg-black"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
                          <img 
                            src={getCoverImageUrl(stream)} 
                            alt={stream.title} 
                            className="absolute inset-0 w-full h-full object-cover opacity-20 select-none pointer-events-none filter blur-md"
                          />
                          <div className="z-10 flex flex-col items-center gap-3">
                            {stream.streamType === 'vlc' || stream.type === 'vlc' ? (
                              <div className="h-14 w-14 rounded-full bg-orange-950/85 border border-orange-500/30 flex items-center justify-center text-orange-400 animate-pulse">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2L6 17H18L12 2M12 5L15.5 15H8.5L12 5M4 19H20V21H4V19Z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="h-14 w-14 rounded-full bg-slate-900/85 border border-slate-800 flex items-center justify-center text-red-500 animate-pulse">
                                <Tv size={24} />
                              </div>
                            )}
                            <p className="text-white text-xs font-black uppercase tracking-widest px-4 text-center">{stream.title}</p>
                            <p className="text-slate-400 text-[10px] font-bold">Autoplay loading state...</p>
                          </div>
                        </div>
                      )}

                      {/* Bottom-Left Information Overlays */}
                      <div className="absolute bottom-16 left-4 right-16 z-25 p-4 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none flex flex-col gap-2 rounded-xl">
                        <span className="px-2.5 py-0.5 bg-red-650 rounded-full text-[9px] uppercase font-black tracking-widest animate-pulse flex items-center gap-1 self-start">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          Live Broadcast
                        </span>
                        <h3 className="text-white text-base sm:text-lg font-black tracking-tight leading-snug drop-shadow-md select-text pointer-events-auto">
                          {stream.title}
                        </h3>
                        <p className="text-slate-200 text-[10.5px] sm:text-xs font-semibold max-w-[90%] line-clamp-3 md:line-clamp-none drop-shadow-sm select-text pointer-events-auto leading-relaxed">
                          {stream.description || "Tune in to explore live feeds, study sessions, and academic logs."}
                        </p>
                        
                        <div className="flex items-center flex-wrap gap-2 mt-1 py-1 text-[10px] font-bold text-slate-300 pointer-events-auto">
                          <span className="bg-orange-600/25 border border-orange-500/25 px-2 py-0.5 rounded-md text-orange-400 font-mono text-[9px] font-bold">{stream.category}</span>
                          <span>• By {stream.creatorName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const key = stream.creatorUid || stream.creatorName || '';
                              if (followedCreators.includes(key)) {
                                setFollowedCreators(followedCreators.filter(f => f !== key));
                                showNotification(`Unfollowed ${stream.creatorName}`, 'info');
                              } else {
                                setFollowedCreators([...followedCreators, key]);
                                showNotification(`Following ${stream.creatorName}`, 'success');
                              }
                            }}
                            className={`ml-1.5 px-2.5 py-0.5 font-black text-[9px] uppercase tracking-wider rounded-md border transition-all ${
                              isFollowed 
                                ? 'bg-slate-800 border-white/20 text-slate-300 pointer-events-auto cursor-pointer' 
                                : 'bg-rose-650 border-rose-500 text-white shadow-sm hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer'
                            }`}
                          >
                            {isFollowed ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      </div>

                      {/* Right-Side Glass Actions Column */}
                      <div className="absolute right-4 bottom-20 z-30 flex flex-col items-center gap-4.5 pointer-events-auto">
                        {/* Profile Hub Sphere */}
                        <div className="relative group cursor-pointer" onClick={() => {
                          setIsImmersiveMode(false);
                          onOpenPlace?.(stream.creatorUid || '', stream.creatorName);
                        }}>
                          <div
                            className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-[2px] shadow-lg hover:scale-110 duration-200"
                            title={`Inspect ${stream.creatorName}'s School Space`}
                          >
                            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[11px] font-black uppercase text-white">
                              {stream.creatorName?.slice(0, 2).toUpperCase() || 'EX'}
                            </div>
                          </div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white rounded-full p-0.5 border border-slate-950 flex items-center justify-center shadow-md">
                            <Compass size={8} className="animate-pulse" />
                          </div>
                        </div>

                        {/* Interactive Like Action */}
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeClick(stream.id, userLikes);
                            }}
                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-lg border cursor-pointer ${
                              hasLiked
                                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                                : 'bg-black/60 border-white/20 text-slate-200 hover:text-white hover:bg-black/80'
                            }`}
                          >
                            <Heart size={20} fill={hasLiked ? "currentColor" : "none"} />
                          </button>
                          <span className="text-[10px] font-extrabold text-white drop-shadow-md">{displayLikes}</span>
                        </div>

                        {/* Slide-Up Chat board Comment Trigger */}
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsImmersiveCommentsOpen(true);
                              // Sync normal comments room list
                              setActiveStream(stream);
                            }}
                            className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                            title="Interactive Live Comments board"
                          >
                            <MessageSquare size={18} />
                          </button>
                          <span className="text-[10px] font-extrabold text-white drop-shadow-md">
                            {idx === currentIdx ? activeChatMessages.length : Math.floor((stream.likesCount || 12) / 2) + 2}
                          </span>
                        </div>

                        {/* Stream Link Sharing Action */}
                        <button
                          type="button"
                          onClick={() => {
                            const linkVal = stream.streamType === 'vlc' || stream.type === 'vlc'
                              ? stream.streamUrl
                              : `https://www.youtube.com/watch?v=${stream.videoId}`;
                            navigator.clipboard.writeText(linkVal || '');
                            showNotification("Live Stream link copy-pasted to clipboard!", "success");
                          }}
                          className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                          title="Share current stream link"
                        >
                          <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        </button>

                        {/* Admin diagnostic configuration console */}
                        <button
                          type="button"
                          onClick={() => {
                            showNotification(`Engine: ${stream.streamType === 'vlc' ? 'VLC Decoder' : 'YouTube SDK'} active. Signal: 100%`, 'info');
                          }}
                          className="h-11 w-11 rounded-full bg-black/60 border border-white/20 text-slate-200 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                          title="View system parameters"
                        >
                          <Settings size={18} />
                        </button>

                        {/* Admin Trash / Delete */}
                        {isCreatorOrAdmin && !stream.isPreset && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBroadcast(stream.id, stream.creatorUid || '');
                            }}
                            className="h-11 w-11 rounded-full bg-red-950/80 border border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition-all flex items-center justify-center shadow-lg animate-pulse cursor-pointer"
                            title="Remove Station"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      {/* Thin Bottom Reels progress accent */}
                      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-rose-600/35 overflow-hidden">
                        <div className="h-full bg-rose-600 w-[60%] animate-pulse" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center p-6 text-white text-center">
                <p className="text-sm font-black uppercase tracking-wider">No matching feeds</p>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('All')}
                  className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-505 transition-colors cursor-pointer"
                >
                  Show All Channels
                </button>
              </div>
            )}

            {/* INSTAGRAM REELS STATIC NAVIGATION BAR SIMULATION (BOTTOM FOOTER) */}
            <div className="h-16 bg-black border-t border-white/5 flex items-center justify-around text-slate-500 z-40 px-6 sm:px-12 pointer-events-auto shrink-0 pb-1">
              <button onClick={() => { setIsImmersiveMode(false); }} className="hover:text-white transition-colors cursor-pointer" title="Go Home Dashboard">
                <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </button>
              <button className="text-white hover:scale-110 transition-transform cursor-pointer" title="Reels Mode active">
                <svg className="h-5.5 w-5.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H20V18H4V6M2 4V20H22V4H2M8 10V14L13 12L8 10Z"/></svg>
              </button>
              {userDoc?.role === 'admin' ? (
                <button onClick={() => setIsImmersiveAddFormOpen(true)} className="hover:text-white hover:scale-110 transition-all cursor-pointer" title="Add Live Stream">
                  <Plus size={22} className="text-white bg-slate-800 rounded-lg p-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => { 
                    setCategoryFilter('All'); 
                    showNotification("Exploring all live channels!", "info"); 
                  }} 
                  className="hover:text-white hover:scale-110 transition-all cursor-pointer text-slate-400" 
                  title="Explore Channels"
                >
                  <Compass size={22} className="hover:text-white" />
                </button>
              )}
              <button 
                onClick={() => {
                  if (activeStream) {
                    setIsImmersiveCommentsOpen(true);
                  } else {
                    showNotification("Please select a live station first!", "info");
                  }
                }}
                className="hover:text-white transition-colors cursor-pointer" 
                title="Message Board"
              >
                <MessageSquare size={20} />
              </button>
              <div 
                onClick={() => {
                  setIsImmersiveMode(false);
                  const profileTab = document.getElementById("profile_tab_trigger");
                  if (profileTab) profileTab.click();
                }}
                className="h-6 w-6 rounded-full border border-white/60 bg-slate-850 flex items-center justify-center text-[8px] font-black text-rose-450 font-sans cursor-pointer hover:scale-110 transition-transform" 
                title="Your User Profile"
              >
                {user?.displayName?.slice(0, 2).toUpperCase() || 'EX'}
              </div>
            </div>

            {/* SLIDE-UP REELS COMMENTS DRAWER OVERLAY */}
            <AnimatePresence>
              {isImmersiveCommentsOpen && activeStream && (
                <>
                  {/* Frosted comments Backdrop */}
                  <div 
                    onClick={() => setIsImmersiveCommentsOpen(false)}
                    className="absolute inset-x-0 top-0 bottom-[60vh] bg-transparent z-[9992] cursor-pointer"
                  />
                  {/* Solid Updrawer card */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="absolute bottom-0 inset-x-0 h-[60vh] rounded-t-[2.2rem] bg-slate-950/98 border-t border-slate-800 z-[9993] flex flex-col p-6 pointer-events-auto"
                  >
                    {/* Header bar handle */}
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-700 select-none shrink-0" onClick={() => setIsImmersiveCommentsOpen(false)} />
                    
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3 shrink-0">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-white">Live Station Room Interaction</h4>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5 leading-none">Viewing chats for {activeStream.title}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-650/25 border border-rose-500/30 text-rose-400 rounded-full font-mono text-[9px] font-black">
                        {activeChatMessages.length} CHATS
                      </span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 scrollbar-hide">
                      {activeChatMessages.length > 0 ? (
                        activeChatMessages.map((msg) => (
                          <div key={msg.id} className="flex gap-2.5 text-slate-300">
                            {/* Short circle user avatar letter */}
                            <div className="h-7 w-7 rounded-lg bg-indigo-950 border border-slate-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 uppercase">
                              {msg.userName?.slice(0, 2) || "EX"}
                            </div>
                            <div className="flex flex-col gap-0.5 max-w-[85%]">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[10px] font-black text-rose-450">{msg.userName}</span>
                                <span className="text-[8px] text-slate-600">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10.5px] leading-relaxed text-slate-200 select-text bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl rounded-tl-none font-medium">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
                          <MessageSquare size={24} className="text-slate-800 animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Broadcast room is currently empty</p>
                          <p className="text-[9px] text-slate-500 font-bold">Secure a participation pass below to say hello!</p>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Submit message form */}
                    <form 
                      onSubmit={handleSendChatMessage} 
                      className="border-t border-slate-900 pt-3 flex gap-2 shrink-0 pointer-events-auto"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Say something respectful in chat..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-4 py-3 border border-slate-800 rounded-2xl bg-slate-900 text-xs text-white focus:outline-none focus:border-rose-500/40 font-semibold"
                      />
                      <button
                        type="submit"
                        className="px-4 bg-rose-650 hover:bg-rose-500 text-white rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* SLIDE-IN REELS REGISTER STREAM FORM PREVIEW OVERLAY (FOR ADMINS) */}
            <AnimatePresence>
              {isImmersiveAddFormOpen && userDoc?.role === 'admin' && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9995] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4 text-white uppercase font-mono text-[9px] pointer-events-auto"
                  >
                    <button
                      type="button"
                      onClick={() => setIsImmersiveAddFormOpen(false)}
                      className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-755 text-white rounded-full transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <X size={14} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <Sparkles size={16} className="text-orange-400 animate-pulse" />
                        <h3 className="text-[10px] font-black tracking-widest uppercase">REELS SIGNAL MATRIX MANAGER</h3>
                      </div>
                      <p className="text-slate-400 text-[8px] font-semibold tracking-wider leading-relaxed">
                        Add and configure live feeds using VLC (MP4 / HLS / M3U8) or Youtube Video & Channel engines instantly.
                      </p>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      await handleAddSubmit(e);
                      setIsImmersiveAddFormOpen(false);
                    }} className="flex flex-col gap-3">
                      {/* Form Quality Selector */}
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">PLAYBACK ENGINE TYPE :</span>
                        <div className="grid grid-cols-2 gap-2 font-black text-[9px]">
                          <button
                            type="button"
                            onClick={() => setStreamFormType('youtube')}
                            className={`py-2 text-[8px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                              streamFormType === 'youtube'
                                ? 'bg-red-650/20 border-red-500 text-white font-black'
                                : 'bg-slate-800 border-slate-750 text-slate-400'
                            }`}
                          >
                            YOUTUBE EMBED
                          </button>
                          <button
                            type="button"
                            onClick={() => setStreamFormType('vlc')}
                            className={`py-2 text-[8px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                              streamFormType === 'vlc'
                                ? 'bg-orange-655/20 border-orange-500 text-white font-black'
                                : 'bg-slate-800 border-slate-750 text-slate-400'
                            }`}
                          >
                            VLC (HLS / M3U8 / MP4)
                          </button>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">CHANNEL SIGNATURE TITLE :</span>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Hausa Cultural TV"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-semibold text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">INGEST MEDIA LINK OR VIDEO ID :</span>
                        <input
                          type="text"
                          required
                          value={formUrl}
                          onChange={(e) => handleFormUrlChange(e.target.value)}
                          placeholder={streamFormType === 'vlc' ? "https://stream.m3u8" : "https://youtube.com/watch?v=..."}
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-semibold text-xs text-normal"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">STREAM CATEGORY :</span>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 font-black text-[10px]"
                        >
                          {CATEGORIES.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c} className="bg-slate-900">{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">OPTIONAL DESCRIPTION CAPTION :</span>
                        <textarea
                          placeholder="Tune in to discover Hausa cultural broadcasts..."
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="w-full h-12 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 outline-none focus:border-orange-500 resize-none font-sans font-semibold text-[10px]"
                        />
                      </div>

                      {parsingError && <p className="text-red-500 font-bold bg-red-950/20 px-2 py-1.5 rounded-lg text-[8px] leading-tight mt-1">{parsingError}</p>}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 mt-1 cursor-pointer"
                      >
                        {isSubmitting ? 'INGESTING FEED SEQUENCE...' : 'REGISTER EXON BROADCAST LIVE'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

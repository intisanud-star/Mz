import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Volume2, 
  VolumeX, 
  Tv, 
  Radio, 
  Sparkles, 
  Plus, 
  Bookmark, 
  MoreHorizontal,
  ExternalLink,
  Shield,
  Clock,
  Music,
  Send,
  CheckCircle2
} from 'lucide-react';

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  likes: number;
  likedBy: string[];
  commentsCount: number;
  reshares: number;
  timestamp: any;
  isOfficial?: boolean;
  schoolId?: string;
  authorRole?: string;
  schoolName?: string;
  resharedFrom?: {
    id: string;
    authorName: string;
    content: string;
  };
}

export interface YoutubeBroadcast {
  id: string;
  title: string;
  type: 'video' | 'channel' | 'vlc' | 'hls';
  streamType?: 'youtube' | 'vlc' | 'hls';
  streamUrl?: string;
  videoId?: string;
  channelId?: string;
  category: string;
  description?: string;
  creatorUid?: string;
  creatorName?: string;
  likes?: string[];
  likesCount?: number;
  photoURL?: string;
  isPreset?: boolean;
}

interface BroadcastFeedProps {
  user: any;
  userDoc: any;
  posts: Post[];
  schools: any[];
  places: any[];
  customBroadcasts: YoutubeBroadcast[];
  onUserClick: (profile: { uid: string; name: string; photo?: string }) => void;
  onInstitutionClick: (schoolId: string) => void;
  onLikePost: (postId: string, likedBy: string[]) => void;
  onCommentPost: (post: any) => void;
  onResharePost: (post: any) => void;
  onFollowUser: (targetUid: string) => Promise<void>;
  onUnfollowUser: (targetUid: string) => Promise<void>;
  onFollowInstitution: (school: any) => Promise<void>;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isTabActive: boolean;
}

// Global audio state controller to synchronize mute status across all video players
let isGlobalMuted = true;

// Custom Bookmark collection in localStorage to persist saved streams
const getBookmarkedIds = (): string[] => {
  try {
    const saved = localStorage.getItem('exon_saved_broadcast_ids');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const BroadcastFeed: React.FC<BroadcastFeedProps> = ({
  user,
  userDoc,
  posts,
  schools,
  places,
  customBroadcasts,
  onUserClick,
  onInstitutionClick,
  onLikePost,
  onCommentPost,
  onResharePost,
  onFollowUser,
  onUnfollowUser,
  onFollowInstitution,
  showNotification,
  isTabActive
}) => {
  const [filterMode, setFilterMode] = useState<'explore' | 'following'>('explore');
  const [isMuted, setIsMuted] = useState(isGlobalMuted);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [likedPostsState, setLikedPostsState] = useState<Record<string, boolean>>({});
  const [savedPostsState, setSavedPostsState] = useState<Record<string, boolean>>(() => {
    const ids = getBookmarkedIds();
    return ids.reduce((acc, id) => ({ ...acc, [id]: true }), {});
  });
  
  // Track visual highlighting on jump scroll
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  // Synchronize internal state with global state
  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    isGlobalMuted = !isGlobalMuted;
    setIsMuted(isGlobalMuted);
    showNotification(isGlobalMuted ? 'Volume off' : 'Audio active', 'info');
  };

  // Toggle Bookmark logic
  const handleToggleBookmark = (id: string) => {
    const freshBookmarks = getBookmarkedIds();
    let updated: string[];
    if (freshBookmarks.includes(id)) {
      updated = freshBookmarks.filter(bId => bId !== id);
      showNotification('Removed from Saved Collection', 'info');
    } else {
      updated = [...freshBookmarks, id];
      showNotification('Added to Saved Collection', 'success');
    }
    localStorage.setItem('exon_saved_broadcast_ids', JSON.stringify(updated));
    setSavedPostsState(updated.reduce((acc, bId) => ({ ...acc, [bId]: true }), {}));
  };

  // Check if followed
  const isFollowingUser = (targetUid: string) => {
    return userDoc?.following?.includes(targetUid) || false;
  };

  const isFollowingSchool = (schoolId: string) => {
    if (userDoc?.following?.includes(schoolId)) return true;
    const inst = [...schools, ...places].find(s => s.id === schoolId);
    return inst?.followers?.includes(user?.uid) || false;
  };

  // Custom formatting for large numbers like Instagram (e.g., 40.2K)
  const formatQuantity = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  };

  // Align customBroadcasts properties with beautiful photos
  const enhancedBroadcasts = React.useMemo(() => {
    return customBroadcasts.map(b => {
      let photo = b.photoURL;
      if (!photo) {
        if (b.id.includes('sunnah') || b.title.toLowerCase().includes('sunnah')) {
          photo = 'https://images.unsplash.com/photo-1590076247564-a29b3addee63?w=150&q=80';
        } else if (b.id.includes('bollywood') || b.title.toLowerCase().includes('bollywood')) {
          photo = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80';
        } else if (b.id.includes('spacex') || b.title.toLowerCase().includes('spacex')) {
          photo = 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=150&q=80';
        } else if (b.id.includes('saudi-quran') || b.title.toLowerCase().includes('quran')) {
          photo = 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=150&q=80';
        } else {
          photo = `https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=150&q=80`;
        }
      }
      return { ...b, photoURL: photo };
    });
  }, [customBroadcasts]);

  // Merge & Sort all feed assets (Posts + Live streams) dynamically
  const unifiedItems = React.useMemo(() => {
    const postFeed = posts.map(post => {
      const isOfficial = post.isOfficial || false;
      const isFollowed = isFollowingUser(post.authorUid) || (post.schoolId ? isFollowingSchool(post.schoolId) : false);
      const isMine = post.authorUid === user?.uid;
      
      return {
        id: `post-${post.id}`,
        type: 'post' as const,
        timestamp: post.timestamp ? (post.timestamp.toDate ? post.timestamp.toDate() : new Date(post.timestamp)) : new Date(),
        isFollowed,
        isMine,
        priority: isFollowed ? 2 : isOfficial ? 1 : 0,
        data: {
          ...post,
          likesCount: post.likes || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.reshares || 0,
          audioTrack: post.schoolName ? `${post.schoolName} Official Audio` : 'Original audio'
        }
      };
    });

    const broadcastFeed = enhancedBroadcasts.map(b => {
      const isMine = b.creatorUid === user?.uid;
      const isFollowed = b.creatorUid ? isFollowingUser(b.creatorUid) : false;

      return {
        id: `broadcast-${b.id}`,
        type: 'broadcast' as const,
        timestamp: b.id.includes('sunnah') ? new Date(Date.now() - 5000) : b.id.includes('saudi-quran') ? new Date(Date.now() - 10000) : new Date(Date.now() - 600000),
        isFollowed,
        isMine,
        priority: 3, // Live broadcasts remain pinned to high prominence
        data: {
          ...b,
          likesCount: b.likesCount || 15400,
          commentsCount: Math.floor((b.likesCount || 15400) * 0.08) + 12,
          sharesCount: Math.floor((b.likesCount || 15400) * 0.12) + 5,
          audioTrack: `${b.creatorName || b.title} • Live Sound Recipient`
        }
      };
    });

    let combined = [...postFeed, ...broadcastFeed];

    if (filterMode === 'following') {
      combined = combined.filter(item => item.isFollowed || item.isMine);
    }

    // Live/Official items always sort high, followed by timestamp descending
    return combined.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [posts, enhancedBroadcasts, filterMode, userDoc, schools, places, user?.uid]);

  // Observer to auto-play & focus streams in timeline
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Set default active video once items load
  useEffect(() => {
    if (unifiedItems.length > 0 && !activeVideoId) {
      setActiveVideoId(unifiedItems[0].id);
    }
  }, [unifiedItems, activeVideoId]);

  useEffect(() => {
    if (!isTabActive) return;

    const observerOption = {
      root: null,
      rootMargin: '-25% 0px -25% 0px',
      threshold: 0.1
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length > 0) {
        // Find the one closest to the center of the screen or with highest ratio
        let bestEntry = visible[0];
        visible.forEach(entry => {
          if (entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        });
        const id = bestEntry.target.getAttribute('data-id');
        if (id) {
          setActiveVideoId(id);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersection, observerOption);
    const cards = listContainerRef.current?.querySelectorAll('[data-id]');
    cards?.forEach(card => observer.observe(card));

    return () => {
      cards?.forEach(card => observer.unobserve(card));
    };
  }, [unifiedItems, isTabActive]);

  // Jump scroll handler directly targeting specific elements
  const handleJumpToChannel = (channelId: string) => {
    const cardId = `broadcast-${channelId}`;
    const targetElement = document.getElementById(cardId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Spark visual flash animation
      setHighlightedCardId(cardId);
      setTimeout(() => {
        setHighlightedCardId(null);
      }, 2500);
    } else {
      showNotification('Loading feed channel coordinates...', 'info');
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full flex flex-col antialiased bg-gray-50/50 min-h-screen">
      
      {/* 1. INSTAGRAM STORY PANEL AT THE TOP */}
      <div className="bg-white border-b border-gray-150 py-4 px-2 sm:px-4 overflow-hidden mb-5 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none pb-1 font-sans">
          
          {/* Default My Story Icon resembling active user session */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer group">
            <div className="relative">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full p-[2px] bg-gray-200 flex items-center justify-center border border-gray-100">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    className="h-full w-full rounded-full object-cover border-2 border-white" 
                    alt="My story"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg border-2 border-white">
                    {user?.displayName?.charAt(0) || 'Y'}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 h-5 w-5 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold leading-none shadow group-hover:scale-110 transition-transform">
                +
              </div>
            </div>
            <span className="text-[10px] text-muted font-bold tracking-tight mt-1.5 max-w-[70px] truncate">
              Your story
            </span>
          </div>

          {/* Active Broadcast Channels as Story Icons */}
          {enhancedBroadcasts.map((channel) => (
            <div 
              key={channel.id}
              onClick={() => handleJumpToChannel(channel.id)}
              className="flex flex-col items-center shrink-0 cursor-pointer group transition-all"
            >
              <div className="relative">
                {/* Colorful rotating active gradient circle border matching active Instagram Story look */}
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600 p-[2.5px] shadow-sm flex items-center justify-center group-hover:scale-105 active:scale-95 transition-all">
                  <div className="h-full w-full bg-white rounded-full p-[2.5px] flex items-center justify-center">
                    <img 
                      src={channel.photoURL} 
                      className="h-full w-full rounded-full object-cover shrink-0 select-none bg-zinc-50"
                      alt={channel.title}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Pulsing Live indicator badge overlay */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[8px] text-white font-extrabold px-1.5 py-0.5 rounded-md border border-white uppercase tracking-wider animate-pulse leading-none shadow-sm shadow-red-200 scale-90">
                  LIVE
                </span>
              </div>
              <span className="text-[10px] text-ink font-bold tracking-tight mt-1.5 max-w-[72px] truncate text-center lowercase">
                {channel.creatorName?.replace(/\s+/g, '').toLowerCase() || channel.title.toLowerCase()}
              </span>
            </div>
          ))}

        </div>
      </div>

      {/* 2. TOP FILTER BAR AND SOUND SYSTEM */}
      <div className="flex items-center justify-between border border-gray-150 bg-white/80 backdrop-blur-md sticky top-0 z-40 py-2.5 px-4 rounded-3xl mb-5 shadow-sm">
        <div className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-2xl border border-gray-100">
          <button
            onClick={() => setFilterMode('explore')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none ${
              filterMode === 'explore'
                ? 'bg-ink text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-white'
            }`}
          >
            Explore
          </button>
          
          <button
            onClick={() => {
              if (!user) {
                showNotification('Authorized login required to view active subscribers feed', 'error');
                return;
              }
              setFilterMode('following');
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none ${
              filterMode === 'following'
                ? 'bg-ink text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-white'
            }`}
          >
            Following
          </button>
        </div>

        {/* Global Sound Control Trigger */}
        <button
          onClick={handleToggleMute}
          className="h-9 w-9 bg-gray-50 hover:bg-gray-100 text-muted hover:text-ink rounded-full flex items-center justify-center border border-gray-100/50 transition-all active:scale-95 shadow-sm"
          title={isMuted ? "Unmute feed" : "Mute feed"}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-accent shrink-0 animate-bounce" />}
        </button>
      </div>

      {/* 3. PRIMARY INS-PLAYED LIST TIMELINE */}
      <div ref={listContainerRef} className="flex flex-col gap-6 max-w-xl mx-auto w-full pb-20 px-1 sm:px-0">
        <AnimatePresence mode="popLayout">
          {unifiedItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center bg-white border border-gray-150 rounded-[2.5rem] px-6 shadow-sm flex flex-col items-center justify-center gap-4"
            >
              <div className="h-16 w-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-muted/60">
                <Radio size={28} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink mb-1">
                  Feed timeline is currently quiet
                </h3>
                <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                  {filterMode === 'following' 
                    ? "Subscribe to official channels, or follow authors to get direct automatic streaming highlights!" 
                    : "No public broadcasts have transmitted yet."}
                </p>
              </div>
              {filterMode === 'following' && (
                <button
                  onClick={() => setFilterMode('explore')}
                  className="px-5 py-2 bg-ink text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all hover:bg-ink/90"
                >
                  Explore Public Live Streams
                </button>
              )}
            </motion.div>
          ) : (
            unifiedItems.map((item) => {
              const post = item.data;
              const isLiked = linkedPostLiked(post.id) || (post.likedBy?.includes(user?.uid || 'temp-uid')) || likedPostsState[post.id];
              const isBookmarked = savedPostsState[post.id] || false;

              // Identify content details
              const hasVideo = item.type === 'broadcast' || post.mediaType === 'video' || post.mediaUrl?.includes('.mp4') || post.mediaUrls?.some((u: string) => u?.includes('.mp4'));
              const hasImages = (item.type === 'post') && (post.mediaType === 'image' || post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0));
              const isActive = activeVideoId === item.id;

              // Local dynamic liked helper state
              function linkedPostLiked(id: string) {
                return likedPostsState[id] || false;
              }

              function handleLocalLike(postId: string) {
                const alreadyLiked = likedPostsState[postId];
                setLikedPostsState(prev => ({ ...prev, [postId]: !alreadyLiked }));
                
                if (item.type === 'post') {
                  onLikePost?.(postId, post.likedBy || []);
                } else {
                  // Fake live channel stream like simulation safely
                  showNotification(alreadyLiked ? 'Removed live stream reaction' : 'Sent hearts to live broadcast channel!', 'success');
                }
              }

              return (
                <motion.div
                  key={item.id}
                  id={item.id}
                  data-id={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`bg-white border rounded-none sm:rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300 ${
                    highlightedCardId === item.id 
                      ? 'border-accent shadow-xl ring-4 ring-accent/10 sm:scale-[1.02]' 
                      : 'border-gray-200/90 shadow-sm'
                  }`}
                >
                  
                  {/* CARD HEADER LAYER */}
                  <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      
                      {/* Interactive colorful gradient circle around profile photo only when live */}
                      <button
                        onClick={() => {
                          if (item.type === 'broadcast') {
                            handleJumpToChannel(post.id);
                          } else {
                            onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto });
                          }
                        }}
                        className={`relative shrink-0 select-none cursor-pointer p-[1.5px] rounded-full focus:outline-none ${
                          item.type === 'broadcast'
                            ? 'bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600'
                            : 'bg-transparent border border-gray-100'
                        }`}
                      >
                        {post.authorPhoto || post.photoURL ? (
                          <img
                            src={post.authorPhoto || post.photoURL}
                            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover border-2 border-white"
                            referrerPolicy="no-referrer"
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-zinc-700 font-extrabold text-xs">
                            {post.authorName?.charAt(0) || post.creatorName?.charAt(0) || 'B'}
                          </div>
                        )}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (item.type === 'broadcast') {
                                handleJumpToChannel(post.id);
                              } else {
                                onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto });
                              }
                            }}
                            className="text-[13px] sm:text-[14px] font-black text-ink hover:underline transition-all text-left truncate leading-tight focus:outline-none lowercase"
                          >
                            {post.authorName?.replace(/\s+/g, '').toLowerCase() || post.creatorName?.replace(/\s+/g, '').toLowerCase() || 'broadcaster'}
                          </button>
                          
                          {/* Real blue verified checkmark badge like Instagram */}
                          {(item.type === 'broadcast' || post.isOfficial || post.authorRole === 'admin') && (
                            <CheckCircle2 size={13} className="text-[#0095f6] fill-[#0095f6] text-white shrink-0" />
                          )}
                        </div>

                        {/* Song element / Original audio indicator directly matching Instagram design */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold tracking-tight uppercase max-w-[200px] truncate mt-0.5">
                          <Music size={10} className="shrink-0 text-zinc-500" />
                          <span className="truncate">{post.audioTrack || 'Original audio'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Header Action Option Button */}
                    <button 
                      onClick={() => {
                        if (item.type === 'broadcast') {
                          handleToggleBookmark(post.id);
                        } else {
                          showNotification('Stream telemetry connected.', 'info');
                        }
                      }}
                      className="h-9 w-9 text-muted hover:text-ink flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors focus:outline-none"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  {/* MEDIA DISPLAY CONTAINER AND EMBEDDED PLAYER */}
                  <div className="bg-black relative aspect-square sm:aspect-video w-full flex items-center justify-center overflow-hidden border-b border-gray-150 shadow-inner">
                    {item.type === 'broadcast' ? (
                      // Live broadcast stream
                      isActive ? (
                        <>
                          {/* Gesture protective overlay allowing normal touch swipes to scroll the timeline cleanly */}
                          <div 
                            className="absolute inset-0 bg-transparent z-10 cursor-pointer"
                            onClick={handleToggleMute}
                          />
                          {(post.streamType === 'youtube' || post.videoId) ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${post.videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${post.videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=2`}
                              title={post.title}
                              className="w-full h-full border-0 absolute inset-0 select-none pointer-events-none"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : post.streamUrl ? (
                            <video
                              src={post.streamUrl}
                              autoPlay
                              loop
                              muted={isMuted}
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                              <Tv size={36} className="text-zinc-600 animate-pulse" />
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Live feed offline</span>
                            </div>
                          )}
                        </>
                      ) : (
                        // Static elegant placeholder cover card for inactive broadcast channels
                        <div 
                          className="w-full h-full relative cursor-pointer select-none flex flex-col items-center justify-center bg-zinc-950 overflow-hidden group"
                          onClick={() => setActiveVideoId(item.id)}
                        >
                          {/* Ambient blurred backdrop */}
                          {post.photoURL && (
                            <img 
                              src={post.photoURL} 
                              className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-30 scale-110"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          {/* Central logo */}
                          {post.photoURL && (
                            <div className="relative z-10 h-24 w-24 sm:h-28 sm:w-28 rounded-full p-1 bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-600 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                              <img 
                                src={post.photoURL} 
                                className="h-full w-full rounded-full object-cover border-4 border-black" 
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Pulsing play overlay indicator */}
                          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-3 z-10 pt-16 sm:pt-20">
                            <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg shadow-black/10 transition-all duration-300">
                              <Tv size={20} className="text-white" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-white bg-red-600 px-3 py-1 rounded-full border border-red-500 shadow animate-pulse">
                              TAP TO TUNE IN
                            </span>
                          </div>
                        </div>
                      )
                    ) : (
                      // Normal Feed post attachments
                      hasVideo ? (
                        isActive ? (
                          <>
                            {/* Scroll safeguard overlay */}
                            <div 
                              className="absolute inset-0 bg-transparent z-10 cursor-pointer"
                              onClick={handleToggleMute}
                            />
                            <video
                              src={post.mediaUrl || (post.mediaUrls && post.mediaUrls[0])}
                              autoPlay
                              loop
                              muted={isMuted}
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </>
                        ) : (
                          // Lightweight video placeholder cover
                          <div 
                            className="w-full h-full relative cursor-pointer select-none flex items-center justify-center bg-zinc-950 overflow-hidden group"
                            onClick={() => setActiveVideoId(item.id)}
                          >
                            {post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) ? (
                              <video
                                src={post.mediaUrl || (post.mediaUrls && post.mediaUrls[0])}
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-40 blur-sm scale-105"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
                              <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                                <Music size={18} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] text-white font-black uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                Tap to Autoplay
                              </span>
                            </div>
                          </div>
                        )
                      ) : hasImages ? (
                        <img
                          src={post.mediaUrl || (post.mediaUrls && post.mediaUrls[0])}
                          className="w-full h-full object-cover select-none"
                          referrerPolicy="no-referrer"
                          alt="Visual Attachment"
                        />
                      ) : (
                        // Standard text-only fallback visual card with Instagram elegant color gradient
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-50 via-zinc-50 to-rose-50 p-6 flex items-center justify-center text-center">
                          <p className="text-[16px] font-semibold text-ink leading-relaxed max-w-sm">
                            "{post.content}"
                          </p>
                        </div>
                      )
                    )}

                    {/* MUTE VOLUME TRIGGER KEY FLOATING ON PLAYER */}
                    {hasVideo && isActive && (
                      <button
                        onClick={handleToggleMute}
                        className="absolute bottom-3 right-3 h-8 w-8 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-md focus:outline-none z-10"
                      >
                        {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} className="text-sky-400 rotate-6 shrink-0" />}
                      </button>
                    )}

                    {/* Top Corner Live/Autoplay Indicator Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[8px] font-extrabold text-white uppercase tracking-wider select-none border border-white/5 z-10">
                      <span className={`h-1.5 w-1.5 rounded-full ${item.type === 'broadcast' ? 'bg-red-500 animate-ping' : 'bg-green-400'}`} />
                      <span>{item.type === 'broadcast' ? 'Live Channel' : 'Autoplay'}</span>
                    </div>
                  </div>

                  {/* INSTAGRAM FOOTER FEEDBACK BAR & COMMENTS */}
                  <div className="p-4 flex flex-col gap-3.5 bg-white">
                    
                    {/* Primary Button Icons Layer on Instagram (Like / Comm / MailPlane) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        
                        {/* Heart Button */}
                        <button
                          onClick={() => handleLocalLike(post.id)}
                          className="hover:scale-110 active:scale-90 transition-transform focus:outline-none cursor-pointer"
                          title="Heart post"
                        >
                          <Heart 
                            size={23} 
                            className={`transition-colors ${
                              isLiked 
                                ? 'text-[#ff3040] fill-[#ff3040] stroke-[#ff3040]' 
                                : 'text-zinc-800 hover:text-zinc-500'
                            }`} 
                          />
                        </button>

                        {/* Comment Button */}
                        <button
                          onClick={() => {
                            if (item.type === 'post') {
                              onCommentPost?.(post);
                            } else {
                              showNotification('Welcome to Live Commentary Channel', 'info');
                            }
                          }}
                          className="hover:scale-110 active:scale-95 transition-transform focus:outline-none cursor-pointer text-zinc-800 hover:text-zinc-500"
                          title="Comment"
                        >
                          <MessageCircle size={23} />
                        </button>

                        {/* Direct Send AirPlane Icon */}
                        <button
                          onClick={() => {
                            if (item.type === 'post') {
                              onResharePost?.(post);
                            } else {
                              showNotification('Broadcasting link shared', 'success');
                            }
                          }}
                          className="hover:scale-110 active:scale-95 transition-transform focus:outline-none cursor-pointer text-zinc-800 hover:text-zinc-500"
                          title="Forward stream link"
                        >
                          <Share2 size={21} />
                        </button>

                      </div>

                      {/* Bookmark Icon */}
                      <button
                        onClick={() => handleToggleBookmark(post.id)}
                        className="hover:scale-110 active:scale-95 transition-transform focus:outline-none cursor-pointer text-zinc-800 hover:text-zinc-500"
                        title="Bookmark"
                      >
                        <Bookmark 
                          size={22} 
                          className={isBookmarked ? 'text-[#000] fill-[#000]' : ''} 
                        />
                      </button>
                    </div>

                    {/* Numeric Engagement Statistics Row */}
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-ink/90 font-black">
                      <span className="cursor-pointer hover:underline">
                        {formatQuantity(post.likesCount + (isLiked ? 1 : 0))} likes
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="cursor-pointer hover:underline">
                        {formatQuantity(post.commentsCount)} comments
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="cursor-pointer hover:underline">
                        {formatQuantity(post.sharesCount)} reshares
                      </span>
                    </div>

                    {/* Visual Caption Text Area */}
                    <div className="text-[13px] sm:text-[14px] leading-relaxed text-ink/90 font-medium">
                      
                      {/* Bold Username Prefix */}
                      <span className="font-extrabold text-black mr-2 lowercase">
                        {post.authorName?.replace(/\s+/g, '') || post.creatorName?.replace(/\s+/g, '') || 'broadcaster'}
                      </span>
                      
                      {/* Caption text details */}
                      <span className="whitespace-pre-wrap select-text">
                        {post.content || post.description || 'Continuous high frequency live broadcast.'}
                      </span>
                      
                    </div>

                    {/* Meta Info/Time elapsed row */}
                    <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">
                      <span>{formatTimeAgo(item.timestamp)}</span>
                      {post.category && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="text-accent">{post.category}</span>
                        </>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

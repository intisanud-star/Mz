import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Play, Pause, Download, Upload, Eye, Film, Maximize, SkipBack, SkipForward, 
  Volume2, VolumeX, Sparkles, Tv, Clapperboard, MonitorPlay, ChevronLeft, ChevronRight, 
  X, Info, User, Star, ExternalLink, Heart, Trash2, Search, Plus, ThumbsUp,
  Sun, Moon, Sliders, Captions, Languages, SlidersHorizontal
} from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface PhotoVideoLabProps {
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_MOVIES = [
  {
    id: 'default-1',
    title: 'Sintel: Legend of the Dawn Dragon',
    description: 'A spectacular, legendary cinematic CGI fantasy narrative created by the Blender Foundation. Follow the epic, heart-wrenching voyage of a brave explorer on a quest to rescue her mystical dragon companion.',
    youtubeUrl: 'https://www.youtube.com/watch?v=eRsGy_Q889Y',
    embedUrl: 'https://www.youtube.com/embed/eRsGy_Q889Y',
    category: 'Sci-Fi & Fantasy',
    duration: '14 mins',
    matchPercentage: '99% Match',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800',
    likes: 412,
    displayName: 'Blender Foundation',
    createdAt: new Date().toISOString(),
    isYouTube: true
  },
  {
    id: 'default-2',
    title: 'Scenic Flight: Majestic High Alps',
    description: 'Breathtaking 4K aerial flyovers and panoramic vistas of towering snow-capped alpine peaks, lush valleys, and sweeping glacial lakes of northern Europe.',
    youtubeUrl: 'https://www.youtube.com/watch?v=Cx8K8VvK_U4',
    embedUrl: 'https://www.youtube.com/embed/Cx8K8VvK_U4',
    category: 'Nature & Science',
    duration: '11 mins',
    matchPercentage: '96% Match',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800',
    likes: 289,
    displayName: 'AirCinema International',
    createdAt: new Date().toISOString(),
    isYouTube: true
  },
  {
    id: 'default-3',
    title: 'Lofi Neon Tokyo Rain & Cozy Beats',
    description: 'Immerse your senses in neon-soaked Tokyo street aesthetics under tranquil evening rainfall. Paired with relaxing, slow-tempo modular synth beats for study and focus.',
    youtubeUrl: 'https://www.youtube.com/watch?v=n61ULEU7CO0',
    embedUrl: 'https://www.youtube.com/embed/n61ULEU7CO0',
    category: 'Aesthetic & Lo-Fi',
    duration: '25 mins',
    matchPercentage: '95% Match',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800',
    likes: 531,
    displayName: 'Chillwave Station',
    createdAt: new Date().toISOString(),
    isYouTube: true
  },
  {
    id: 'default-4',
    title: 'Tears of Steel: Future Cybernetics',
    description: 'A cyber-thriller exploring cybernetics and artificial intelligence in a futuristic Amsterdam. Merges live-action actors with stellar CGI mechanical tracking.',
    youtubeUrl: 'https://www.youtube.com/watch?v=R6MlUcmO1Mc',
    embedUrl: 'https://www.youtube.com/embed/R6MlUcmO1Mc',
    category: 'Technology',
    duration: '12 mins',
    matchPercentage: '98% Match',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800',
    likes: 310,
    displayName: 'Exona Studios CC',
    createdAt: new Date().toISOString(),
    isYouTube: true
  }
];

export default function PhotoVideoLab({ onClose, showNotification }: PhotoVideoLabProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sharedVideos, setSharedVideos] = useState<any[]>([]);
  const [activeTheaterVideo, setActiveTheaterVideo] = useState<any>(DEFAULT_MOVIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [newShareUrl, setNewShareUrl] = useState('');
  const [newShareTitle, setNewShareTitle] = useState('');
  const [newShareDesc, setNewShareDesc] = useState('');
  const [newShareCategory, setNewShareCategory] = useState('Trending');
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  // Auth sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr || null);
    });
    return () => unsub();
  }, []);

  // Shared videos snapshot listener
  useEffect(() => {
    const q = query(collection(db, 'cinemaVideos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data(), isYouTube: true });
      });
      setSharedVideos(list);

      // Keep default_movies if nothing else is active
      if (list.length > 0 && activeTheaterVideo?.id?.startsWith('default-')) {
        setActiveTheaterVideo({ ...list[0], matchPercentage: '99% Match', duration: '12 mins', category: list[0].category || 'Shared Clips' });
      }
    }, (err) => {
      console.warn("Shared video sync error:", err);
    });

    return () => unsub();
  }, []);

  // YouTube Parser
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    let videoId = '';
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      } else {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          videoId = urlObj.pathname.split('/')[2];
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
      }
    } catch (e) {
      if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.substring(0, 11) || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.substring(0, 11) || '';
      } else if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.substring(0, 11) || '';
      }
    }
    return videoId && videoId.length === 11 ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  // Convert embed links to have modestbranding, hide related videos, hide logos, hide annotations, hide youtube titles, etc.
  // Immersive Cinema Player States
  const [lightsDim, setLightsDim] = useState<number>(0); // 0 (bright) to 100 (pitch black)
  const [playerVolume, setPlayerVolume] = useState<number>(85); // 0 to 100 volume slider
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [subtitleLang, setSubtitleLang] = useState<string>('en');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9'); // 16:9, 21:9, 4:3 size format
  const [audioPreset, setAudioPreset] = useState<string>('Cinema Surround'); // Audio equalizer presets
  const [ambientGlowType, setAmbientGlowType] = useState<string>('Dynamic matches Category'); // Backdrop illumination type
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Cross-browser fullscreen request
  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        let p: any;
        if (videoContainerRef.current.requestFullscreen) {
          p = videoContainerRef.current.requestFullscreen();
        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
          p = (videoContainerRef.current as any).webkitRequestFullscreen();
        } else if ((videoContainerRef.current as any).msRequestFullscreen) {
          p = (videoContainerRef.current as any).msRequestFullscreen();
        }
        
        if (p && typeof p.catch === 'function') {
          p.catch((err: any) => {
            console.warn("Fullscreen permission rejected in sandbox mode:", err);
            showNotification("Native Fullscreen restricted in sandbox! Open App in a new tab for native full screen.", "info");
          });
        } else {
          showNotification("Entering Cinema Fullscreen Mode!", "info");
        }
      } else {
        let p: any;
        if (document.exitFullscreen) {
          p = document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          p = (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          p = (document as any).msExitFullscreen();
        }
        
        if (p && typeof p.catch === 'function') {
          p.catch((err: any) => {
            console.warn("Exit fullscreen failure:", err);
          });
        }
      }
    } catch (err) {
      console.error("Fullscreen error outside promise:", err);
      showNotification("Fullscreen was blocked, please run the app in a new tab!", "error");
    }
  };

  // Compute layered backlight ambient glow shadow to immerse user
  const getAmbientGlowStyle = () => {
    if (ambientGlowType === 'None') return 'none';
    
    let color = 'rgba(239, 68, 68, 0.45)'; // Default cinematic red
    if (ambientGlowType === 'Dynamic matches Category') {
      const cat = activeTheaterVideo?.category?.toLowerCase() || '';
      if (cat.includes('space') || cat.includes('sci-fi')) {
        color = 'rgba(59, 130, 246, 0.55)'; // Deep indigo space
      } else if (cat.includes('nature') || cat.includes('science')) {
        color = 'rgba(16, 185, 129, 0.55)'; // Emerald forest
      } else if (cat.includes('aesthetic') || cat.includes('lo-fi')) {
        color = 'rgba(168, 85, 247, 0.6)'; // Dreamy lavender
      } else if (cat.includes('tech')) {
        color = 'rgba(6, 182, 212, 0.6)'; // Cyber cyan
      }
    } else if (ambientGlowType === 'Neon Purple') {
      color = 'rgba(168, 85, 247, 0.6)';
    } else if (ambientGlowType === 'Crimson Red') {
      color = 'rgba(239, 68, 68, 0.6)';
    } else if (ambientGlowType === 'Cyber Cyan') {
      color = 'rgba(6, 182, 212, 0.6)';
    } else if (ambientGlowType === 'Golden Aurora') {
      color = 'rgba(245, 158, 11, 0.6)';
    }
    
    // Live calculated brightness multiplier: glow shines brighter is the theater room is pitch dark (more contrast)!
    const dimMultiplier = (lightsDim / 100) * 0.8 + 0.2;
    const baseGlow = `0 4px 30px -5px ${color.replace('0.55', `${dimMultiplier * 0.45}`).replace('0.6', `${dimMultiplier * 0.5}`)}`;
    const bloomGlow = `0 12px 70px -15px ${color.replace('0.55', `${dimMultiplier * 0.3}`).replace('0.6', `${dimMultiplier * 0.35}`)}`;
    const roomGlow = `0 25px 120px -25px ${color.replace('0.55', `${dimMultiplier * 0.15}`).replace('0.6', `${dimMultiplier * 0.2}`)}`;
    
    return `${baseGlow}, ${bloomGlow}, ${roomGlow}`;
  };

  const getCleanStreamUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.split('?')[0];
    
    const params = new URLSearchParams();
    params.set('autoplay', isPlaying ? '1' : '0');
    params.set('mute', isMuted ? '1' : '0');
    params.set('modestbranding', '1');
    params.set('rel', '0');
    params.set('iv_load_policy', '3');
    params.set('showinfo', '0');
    params.set('disablekb', '1');
    params.set('controls', '1');
    params.set('fs', '1');
    params.set('widget_referrer', '1');
    params.set('origin', window.location.origin);
    
    // Subtitles (cc_load_policy: 1 = force subtitles ON, 3 = force OFF)
    params.set('cc_load_policy', subtitlesEnabled ? '1' : '3');
    if (subtitlesEnabled) {
      params.set('hl', subtitleLang);
      params.set('cc_lang_pref', subtitleLang);
    }
    
    return `${cleanUrl}?${params.toString()}`;
  };

  // Submit shared film channel stream
  const handleShareVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShareTitle.trim()) {
      showNotification('Please provide a video title!', 'error');
      return;
    }
    const embed = getYouTubeEmbedUrl(newShareUrl);
    if (!embed) {
      showNotification('Invalid link format! Please paste a valid streaming url link.', 'error');
      return;
    }

    setIsSubmittingVideo(true);
    try {
      const videoData = {
        title: newShareTitle.trim(),
        description: newShareDesc.trim() || 'A short shared dynamic cinematic clip.',
        youtubeUrl: newShareUrl.trim(),
        embedUrl: embed,
        category: newShareCategory,
        uid: currentUser?.uid || 'guest_user',
        displayName: currentUser?.displayName || 'Exona Guest',
        photoURL: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        rating: '98% Match'
      };
      await addDoc(collection(db, 'cinemaVideos'), videoData);
      showNotification('Stream successfully broadcasted to Cinema Room!', 'success');
      setActiveTheaterVideo(videoData);
      setNewShareUrl('');
      setNewShareTitle('');
      setNewShareDesc('');
      setIsSharingModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('Error sharing video stream to Cinema.', 'error');
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  // Like video
  const handleLikeVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification('Please login to like shared cinema videos!', 'error');
      return;
    }
    
    // Check if it is default movie
    if (videoId.startsWith('default-')) {
      showNotification('You liked this Exona cinematic master!', 'success');
      return;
    }

    const targetVideo = sharedVideos.find(v => v.id === videoId);
    if (!targetVideo) return;

    const likedByList = targetVideo.likedBy || [];
    const hasLiked = likedByList.includes(currentUser.uid);
    let newLikedBy = [];
    if (hasLiked) {
      newLikedBy = likedByList.filter((uid: string) => uid !== currentUser.uid);
    } else {
      newLikedBy = [...likedByList, currentUser.uid];
    }

    try {
      await updateDoc(doc(db, 'cinemaVideos', videoId), {
        likedBy: newLikedBy,
        likes: newLikedBy.length
      });
      showNotification(hasLiked ? 'Video un-liked' : 'Video liked!', 'success');
    } catch (err) {
      console.warn("Like error:", err);
    }
  };

  // Delete shared video
  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoId.startsWith('default-')) return;
    if (!window.confirm('Are you sure you want to remove this video from Cinema list?')) return;
    try {
      await deleteDoc(doc(db, 'cinemaVideos', videoId));
      showNotification('Removed video channel.', 'success');
      if (activeTheaterVideo?.id === videoId) {
        setActiveTheaterVideo(DEFAULT_MOVIES[0]);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to remove video.', 'error');
    }
  };

  // Gather all items
  const allMoviesCombined = [
    ...DEFAULT_MOVIES,
    ...sharedVideos.map(v => ({
      ...v,
      matchPercentage: '95% Match',
      duration: '10 mins',
      thumbnail: v.thumbnail || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800'
    }))
  ];

  // Filter lists
  const filteredMovies = allMoviesCombined.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          movie.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || movie.category === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const genres = ['All', 'Sci-Fi & Space', 'Nature & Science', 'Aesthetic & Lo-Fi', 'Technology', 'Trending', 'Shared Clips'];

  return (
    <div className="flex-1 flex flex-col bg-white text-zinc-900 overflow-hidden relative min-h-screen">
      
      {/* Immersive Theater Dimming Mask overlay */}
      {lightsDim > 0 && (
        <div 
          className="absolute inset-0 bg-zinc-950 pointer-events-none transition-all duration-700 z-30"
          style={{ opacity: `${(lightsDim / 100) * 0.90}` }}
        />
      )}
      
      {/* 1. Header Bar - Pristine White Background */}
      <div className="sticky top-0 bg-white border-b border-gray-150 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Clapperboard size={20} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
              YouTube Cinema Room
              <span className="text-[9px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded uppercase font-sans tracking-wider border border-red-200">
                YouTube Cinema
              </span>
            </h1>
            <p className="text-xs text-zinc-500 font-bold">
              Immersive cinematic hub featuring curated YouTube streams, documentaries, and community posts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Search movies, trailers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-50 border border-gray-200 rounded-full text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 w-full sm:w-60 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Share Movie Trigger */}
          <button
            onClick={() => setIsSharingModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} /> Share Trailer
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-3xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>

      {/* 2. Netflix Immersive Cinema Canvas Slider/Layout - Outer container is white layout but has beautiful dark theatre element */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 space-y-8">
        
        {/* Genre fast filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                selectedGenre === genre 
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs' 
                  : 'bg-white text-zinc-500 border-gray-200 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Dynamic Netflix-style Theater view block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Cinema Watch Board with Relative z-index to sit above the dimming shroud */}
          <div className="lg:col-span-8 flex flex-col gap-4 relative z-40">
            <div className="bg-zinc-950 rounded-[2rem] p-6 text-white overflow-hidden shadow-2xl border border-zinc-900 relative">
              
              {/* Actual Video Frame */}
              <div 
                ref={videoContainerRef}
                className="w-full relative rounded-2xl overflow-hidden bg-black border border-zinc-800 transition-all duration-500"
                style={{ 
                  boxShadow: getAmbientGlowStyle(),
                  aspectRatio: aspectRatio === '21:9' ? '21/9' : aspectRatio === '4:3' ? '4/3' : '16/9'
                }}
              >
                {activeTheaterVideo ? (
                  <iframe
                    src={getCleanStreamUrl(activeTheaterVideo.embedUrl)}
                    title={activeTheaterVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0 absolute inset-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-zinc-500 gap-3">
                    <Tv size={48} className="text-zinc-700 animate-pulse" />
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-wider">Select a Movie Stream</p>
                      <p className="text-xs text-zinc-500 mt-1">Pick a curated cinema masterpiece or community clip below to begin projection.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 📺 ULTIMATE CINEMA COMMAND STRIP & CONTROLLER DECK */}
              {activeTheaterVideo && (
                <div className="mt-4 p-4 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl space-y-4 shadow-sm">
                  {/* Row 1: Direct Play, Volume, and Fullscreen Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/40 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Play/Pause state */}
                      <button
                        onClick={() => {
                          setIsPlaying(!isPlaying);
                          showNotification(isPlaying ? "Projection paused!" : "Projection resumed!", "info");
                        }}
                        className="h-8 w-8 bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 transition-all flex items-center justify-center shadow-sm"
                        title={isPlaying ? "Pause Stream" : "Play Stream"}
                      >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                      </button>

                      {/* Sound Control Mute/Unmute */}
                      <div className="flex items-center gap-2 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                        <button
                          onClick={() => {
                            setIsMuted(!isMuted);
                            showNotification(isMuted ? "Audio Unmuted" : "Audio Muted", "info");
                          }}
                          className="text-zinc-400 hover:text-white transition-all duration-150"
                        >
                          {isMuted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} className="text-emerald-500" />}
                        </button>
                        
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : playerVolume}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setPlayerVolume(val);
                            if (val === 0) {
                              setIsMuted(true);
                            } else {
                              setIsMuted(false);
                            }
                          }}
                          className="w-16 accent-red-500 h-1 rounded-lg bg-zinc-800 focus:outline-none appearance-none"
                          title="Cinema Volume Link"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 font-bold w-6 text-right">
                          {isMuted ? 'Mute' : `${playerVolume}%`}
                        </span>
                      </div>

                      {/* Animated EQ Frequency visualizer */}
                      <div className="hidden sm:flex items-center gap-2 bg-zinc-950/40 border border-zinc-800/40 px-3 py-1.5 rounded-lg">
                        <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500 font-mono">
                          {audioPreset}
                        </span>
                        <div className="flex items-end gap-0.5 h-4 w-9 pb-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1 rounded-2xl transition-all duration-300 ${isMuted ? 'bg-zinc-700 h-1' : 'bg-red-500 animate-bounce'}`}
                              style={isMuted ? {} : {
                                height: `${[40, 90, 50, 100, 30][i]}%`,
                                animationDuration: `${[1.1, 0.8, 1.3, 0.9, 1.4][i]}s`,
                                animationDelay: `${[0.2, 0.1, 0.4, 0, 0.3][i]}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio Preset Dial */}
                      <select
                        value={audioPreset}
                        onChange={(e) => {
                          setAudioPreset(e.target.value);
                          showNotification(`Aura Equalizer adjusted to: ${e.target.value}`, 'success');
                        }}
                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-zinc-300 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                        title="Equalizer Profile"
                      >
                        <option value="Cinema Surround">🎬 Dolby Cinema Pro</option>
                        <option value="3D Spatial">🎧 3D IMAX Space</option>
                        <option value="Dialogue Boost">🎤 True Dialogue</option>
                        <option value="Extra Bass Blast">🎵 Subwoofer Heavy</option>
                        <option value="Flat Studio">🎚️ Master Flat</option>
                      </select>

                      {/* Toggle Subtitles Switch */}
                      <button
                        onClick={() => {
                          setSubtitlesEnabled(!subtitlesEnabled);
                          showNotification(subtitlesEnabled ? "Subtitles Disabled" : "Subtitles Enabled", "info");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all ${
                          subtitlesEnabled 
                            ? 'bg-red-600/15 text-red-500 border-red-500/30' 
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                        title="Toggle Captions"
                      >
                        <Captions size={12} />
                        <span>CC {subtitlesEnabled ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Fullscreen maximize launcher */}
                      <button
                        onClick={handleToggleFullscreen}
                        className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-all flex items-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        title="Maximize projection block"
                      >
                        <Maximize size={12} />
                        <span className="hidden sm:inline">Theater IMAX</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Lighting, Captions Lang, Aspect Ratio, Speed Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                    {/* A. Lighting Dimmer */}
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                          <Sun size={10} className="text-amber-500" /> Adjust Room Lights
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold">
                          {lightsDim === 0 ? 'Day' : lightsDim === 100 ? 'Dark' : `${lightsDim}%`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={lightsDim}
                          onChange={(e) => setLightsDim(parseInt(e.target.value))}
                          className="w-full accent-amber-500 h-1 rounded-lg bg-zinc-800 focus:outline-none appearance-none"
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-bold text-zinc-500">
                        <button onClick={() => setLightsDim(0)} className="hover:text-white uppercase">Bright</button>
                        <button onClick={() => setLightsDim(55)} className="hover:text-white uppercase">Cozy</button>
                        <button onClick={() => setLightsDim(100)} className="hover:text-white uppercase">Max pitch</button>
                      </div>
                    </div>

                    {/* B. Caption Language Selector */}
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                          <Languages size={10} className="text-indigo-400" /> CC Language
                        </span>
                      </div>
                      <select
                        disabled={!subtitlesEnabled}
                        value={subtitleLang}
                        onChange={(e) => {
                          setSubtitleLang(e.target.value);
                          showNotification(`Captions altered to translation: ${e.target.value.toUpperCase()}`, 'success');
                        }}
                        className={`w-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 ${!subtitlesEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Subtitle Lang preference"
                      >
                        <option value="en">English (Original)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="fr">Français (French)</option>
                        <option value="ja">日本語 (Japanese)</option>
                        <option value="de">Deutsch (German)</option>
                        <option value="ar">العربية (Arabic)</option>
                      </select>
                      <p className="text-[8px] text-zinc-500 font-bold leading-none">
                        {!subtitlesEnabled ? '💡 Turn CC standard state ON' : '🔄 CC is actively sync-routing track'}
                      </p>
                    </div>

                    {/* C. Interactive Sizer / Layout Ratio */}
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                          <Film size={10} className="text-cyan-400" /> Screen Scale Ratio
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {['16:9', '21:9', '4:3'].map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => {
                              setAspectRatio(ratio);
                              showNotification(`Aspect frame adjusted to ${ratio}`, 'success');
                            }}
                            className={`flex-1 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all border ${
                              aspectRatio === ratio
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8px] text-zinc-500 font-semibold text-center leading-none">
                        {aspectRatio === '21:9' ? '🎬 Cinemascope Format' : aspectRatio === '4:3' ? '📺 Vintage Tube Model' : '💻 Standard Widescreen'}
                      </p>
                    </div>

                    {/* D. Backlight Aura Ambient Glow */}
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                          <Sparkles size={10} className="text-purple-400" /> Ambient Backdrop Glow
                        </span>
                      </div>
                      <select
                        value={ambientGlowType}
                        onChange={(e) => {
                          setAmbientGlowType(e.target.value);
                          showNotification(`Theater Ambient aura matches: ${e.target.value}`, 'success');
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                        title="Backlighting Glow Preset select"
                      >
                        <option value="Dynamic matches Category">🌈 Dynamic Category Bloom</option>
                        <option value="Neon Purple">🔮 Neon Midnight Purple</option>
                        <option value="Crimson Red">🔥 Crimson Pop Red</option>
                        <option value="Cyber Cyan">🛸 Science Cyber Cyan</option>
                        <option value="Golden Aurora">🌞 Golden Firelight</option>
                        <option value="None">❌ Turn Glow Off</option>
                      </select>
                      <p className="text-[8px] text-zinc-500 font-bold leading-none">
                        {ambientGlowType === 'None' ? 'Backlights off' : '✨ Aura dynamically intensifies inside pitch dark!'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Movie Description HUD underneath Video player */}
              {activeTheaterVideo && (
                <div className="mt-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5 mb-1">
                        <span className="text-[11px] font-black tracking-widest text-red-500 uppercase">
                          {activeTheaterVideo.category || 'Cinema Exclusive'}
                        </span>
                        <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                          {activeTheaterVideo.matchPercentage || '98% Match'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {activeTheaterVideo.duration || 'Widescreen'}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white tracking-tight">{activeTheaterVideo.title}</h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Likes Counter */}
                      <button
                        onClick={(e) => handleLikeVideo(activeTheaterVideo.id || 'default', e)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                          activeTheaterVideo.likedBy?.includes(currentUser?.uid)
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <Heart size={14} fill={activeTheaterVideo.likedBy?.includes(currentUser?.uid) ? "currentColor" : "none"} />
                        <span>{activeTheaterVideo.likes || 0} Likes</span>
                      </button>

                      {/* Deletion capacity */}
                      {activeTheaterVideo.id && !activeTheaterVideo.id.startsWith('default-') && (activeTheaterVideo.uid === currentUser?.uid || currentUser?.email === 'admin@exona.com') && (
                        <button
                          onClick={(e) => handleDeleteVideo(activeTheaterVideo.id!, e)}
                          className="bg-red-950 hover:bg-red-900 border border-red-800/50 text-red-100 p-2.5 rounded-xl transition-all"
                          title="Delete Cinema Stream"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-300 text-xs font-medium leading-relaxed max-w-4xl pt-1">
                    {activeTheaterVideo.description}
                  </p>

                  <div className="h-px bg-zinc-900 my-4" />

                  {/* Channel uploader badge */}
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-black uppercase ring-2 ring-red-500/10 overflow-hidden">
                      {activeTheaterVideo.photoURL ? (
                        <img src={activeTheaterVideo.photoURL} className="h-full w-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{activeTheaterVideo.displayName?.charAt(0) || 'E'}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      Projected in cinema by <span className="font-extrabold text-zinc-200">{activeTheaterVideo.displayName || 'Exona Studios'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info & Submission Panel - Matching Netflix Theme */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Cool Callout */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white p-6 rounded-[2rem] shadow-lg flex flex-col justify-between h-48 relative overflow-hidden">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <Clapperboard size={150} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] bg-white/25 rounded px-2 py-0.5">EXONA THEATER</span>
                <h3 className="text-2xl font-black tracking-tight leading-tight mt-3">Watch & Learn with Classroom Channels</h3>
              </div>
              <p className="text-white/80 text-[11px] font-bold">
                Submit an educational documentary, creative trailer, or modular science course link directly for instant streaming.
              </p>
            </div>

            {/* Trending Quick Picks List Sidebar */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-5 flex flex-col gap-4">
              <h3 className="text-xs font-black text-zinc-950 uppercase tracking-widest flex items-center justify-between border-b border-gray-100 pb-3">
                <span>Top Suggested Streams</span>
                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-black">Trending Now</span>
              </h3>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {DEFAULT_MOVIES.map(movie => (
                  <button
                    key={movie.id}
                    onClick={() => setActiveTheaterVideo(movie)}
                    className={`w-full flex items-center gap-3 p-2 rounded-2xl text-left transition-all border ${
                      activeTheaterVideo?.id === movie.id 
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-red-500/15' 
                        : 'bg-zinc-50/50 hover:bg-zinc-50 border-transparent text-zinc-800'
                    }`}
                  >
                    <div className="h-11 w-16 rounded-xl overflow-hidden bg-zinc-200 shrink-0 shadow-3xs relative">
                      <img src={movie.thumbnail} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <Play size={10} fill="currentColor" className="text-white opacity-80" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-black truncate leading-tight ${activeTheaterVideo?.id === movie.id ? 'text-white' : 'text-zinc-900'}`}>
                        {movie.title}
                      </h4>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${activeTheaterVideo?.id === movie.id ? 'text-red-400' : 'text-zinc-400'}`}>
                        {movie.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 3. Immersive YouTube Cinema Rows Catalog */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-base font-black text-zinc-950 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-600 rounded" />
              YouTube Cinema Catalog Feed
              <span className="text-xs font-bold text-zinc-400 font-sans">({filteredMovies.length} Videos)</span>
            </h3>
            
            <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest hidden sm:block">
              Hover items to explore Match Rating & Streams
            </p>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="py-16 text-center bg-white border border-gray-200 rounded-[2.5rem]">
              <Video size={40} className="text-zinc-300 mx-auto mb-3" />
              <h4 className="text-sm font-black text-zinc-900 uppercase">No Media Streams Match Filter</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                No videos fit the current filter. Try selecting 'All' genres or perform a different search parameter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMovies.map(movie => {
                const isSelected = activeTheaterVideo?.id === movie.id;
                return (
                  <div
                    key={movie.id}
                    onClick={() => {
                      setActiveTheaterVideo(movie);
                      showNotification(`Now Playing: ${movie.title}`, 'success');
                    }}
                    className={`group bg-white rounded-3xl overflow-hidden border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'border-red-500 ring-2 ring-red-500/10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Thumbnail Image section with scale zoom on group hover */}
                    <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                      <img 
                        src={movie.thumbnail} 
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Play Hover Overlay styled like Netflix */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                        <div className="h-11 w-11 bg-white hover:scale-110 active:scale-95 text-zinc-950 rounded-full flex items-center justify-center shadow-lg transition-transform">
                          <Play size={18} fill="currentColor" className="ml-0.5 text-zinc-950" />
                        </div>
                      </div>

                      {/* Top left Cinema Badge */}
                      <div className="absolute top-2 left-2 bg-red-600 text-white font-sans font-black text-[9px] px-2 py-0.5 uppercase tracking-wider rounded-md border border-red-700 shadow-sm">
                        🍿 YOUTUBE CINEMA
                      </div>

                      {/* Match percentage bottom left */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 font-sans bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white backdrop-blur-xs">
                        <span className="text-green-400 font-extrabold">{movie.matchPercentage || '98% Match'}</span>
                        <span className="text-zinc-300"> • </span>
                        <span>{movie.duration || '11m'}</span>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-zinc-900 text-sm leading-tight text-left break-words line-clamp-1 truncate block w-full">
                            {movie.title}
                          </h4>
                        </div>
                        <p className="text-zinc-500 text-[11px] font-medium leading-normal mt-1 line-clamp-2">
                          {movie.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                          {movie.category || 'Trending'}
                        </span>
                        
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Heart size={11} className="text-zinc-300 group-hover:text-red-500 transition-colors" />
                            {movie.likes || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 4. MODAL - SHARE TRAILER MODAL */}
      {isSharingModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-gray-150 p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-scale-up space-y-6 text-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <Film size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-950 leading-tight">Share YouTube Cinema Video</h3>
                  <p className="text-xs text-zinc-500 font-bold mt-0.5">Stream shared movie links directly on YouTube Cinema View.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSharingModalOpen(false)}
                className="h-10 w-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-full flex items-center justify-center transition-colors active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleShareVideo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Video Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science of Gravity Waves, Interstellar Odyssey trailer..."
                  value={newShareTitle}
                  onChange={(e) => setNewShareTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-gray-200 focus:border-red-500 rounded-2xl text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Reference Video Link / URL</label>
                <input
                  type="url"
                  required
                  placeholder="Paste watch, short, or list URL e.g. https://www.exona.com/..."
                  value={newShareUrl}
                  onChange={(e) => setNewShareUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-gray-200 focus:border-red-500 rounded-2xl text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-zinc-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Genre Category</label>
                  <select
                    value={newShareCategory}
                    onChange={(e) => setNewShareCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-gray-200 focus:border-red-500 rounded-2xl text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/10"
                  >
                    <option value="Sci-Fi & Space">Sci-Fi & Space</option>
                    <option value="Nature & Science">Nature & Science</option>
                    <option value="Aesthetic & Lo-Fi">Aesthetic & Lo-Fi</option>
                    <option value="Technology">Technology</option>
                    <option value="Trending">Trending</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Rating Match</label>
                  <input
                    type="text"
                    disabled
                    value="98% Match"
                    className="w-full px-4 py-3 bg-zinc-100 rounded-2xl text-xs font-bold text-zinc-400 border border-transparent cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Synopsis / Short Synopsis</label>
                <textarea
                  placeholder="Give a brief description about the content of this cinematic stream..."
                  value={newShareDesc}
                  onChange={(e) => setNewShareDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-gray-200 focus:border-red-500 rounded-2xl text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-zinc-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSharingModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVideo}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
                >
                  {isSubmittingVideo ? 'Projecting...' : 'Stream Trailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

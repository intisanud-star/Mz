import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Image as ImageIcon, Download, Upload, Sliders, Type, Play, Pause, 
  RotateCcw, SlidersHorizontal, Eye, RefreshCw, Layers, Crop, Film, Maximize, Scissors,
  Search, Plus, Heart, Trash2, Shield, User, ExternalLink, SkipBack, SkipForward, Volume2, VolumeX, Sparkles, Tv, Clapperboard, MonitorPlay
} from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface PhotoVideoLabProps {
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PhotoVideoLab({ onClose, showNotification }: PhotoVideoLabProps) {
  // Mode selection
  const [labMode, setLabMode] = useState<'photo' | 'video' | 'player'>('photo');

  // --- New Video Player States ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localVideoFileUrl, setLocalVideoFileUrl] = useState<string | null>(null);
  const [localVideoFileName, setLocalVideoFileName] = useState<string>('');
  const [activeTheaterVideo, setActiveTheaterVideo] = useState<{
    id?: string;
    title: string;
    youtubeUrl?: string;
    embedUrl?: string;
    uid?: string;
    displayName?: string;
    photoURL?: string;
    description?: string;
    isYouTube?: boolean;
    likes?: number;
    likedBy?: string[];
  } | null>(null);

  // Search and database states
  const [playerTab, setPlayerTab] = useState<'local' | 'cinema'>('cinema');
  const [sharedVideos, setSharedVideos] = useState<any[]>([]);
  const [cinemaLimit, setCinemaLimit] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [newShareUrl, setNewShareUrl] = useState('');
  const [newShareTitle, setNewShareTitle] = useState('');
  const [newShareDesc, setNewShareDesc] = useState('');
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  // Local Custom Player UI States
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localPlaybackSpeed, setLocalPlaybackSpeed] = useState(1);
  const [localDuration, setLocalDuration] = useState(0);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const localPlayerRef = useRef<HTMLVideoElement>(null);

  // YouTube URL Embed Parser
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

  // Auth synchronization
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr || null);
    });
    return () => unsub();
  }, []);

  // Shared videos snapshot listener
  useEffect(() => {
    if (labMode !== 'player') return;

    const q = query(collection(db, 'cinemaVideos'), orderBy('createdAt', 'desc'), limit(cinemaLimit));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSharedVideos(list);

      // Auto projects the first shared YouTube track if empty
      if (list.length > 0 && !activeTheaterVideo) {
        setActiveTheaterVideo({ ...list[0], isYouTube: true });
      }
    }, (err) => {
      console.warn("Shared video sync error:", err);
    });

    return () => unsub();
  }, [labMode, cinemaLimit]);

  // Handle uploading local player video file
  const handleLocalPlayerVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLocalVideoFileName(file.name);
      const url = URL.createObjectURL(file);
      setLocalVideoFileUrl(url);
      setLocalPlaying(false);
      
      const localObj = {
        title: file.name,
        isYouTube: false,
        embedUrl: url
      };
      setActiveTheaterVideo(localObj);
      showNotification(`Cinema loaded local file: ${file.name}`, 'success');
    }
  };

  // Skip helper for custom local controller
  const skipLocal = (secs: number) => {
    const player = localPlayerRef.current;
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + secs));
  };

  // Toggle play for local video player
  const toggleLocalPlay = () => {
    const player = localPlayerRef.current;
    if (!player) return;
    if (localPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setLocalPlaying(!localPlaying);
  };

  // Save new YouTube content sharing profile
  const handleShareVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShareTitle.trim()) {
      showNotification('Please provide a video title!', 'error');
      return;
    }
    const embed = getYouTubeEmbedUrl(newShareUrl);
    if (!embed) {
      showNotification('Invalid YouTube link! Paste a standard, short, or watch link.', 'error');
      return;
    }

    setIsSubmittingVideo(true);
    try {
      await addDoc(collection(db, 'cinemaVideos'), {
        title: newShareTitle.trim(),
        description: newShareDesc.trim(),
        youtubeUrl: newShareUrl.trim(),
        embedUrl: embed,
        uid: currentUser?.uid || 'guest_user',
        displayName: currentUser?.displayName || 'Anonymous Player',
        photoURL: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: []
      });
      showNotification('YouTube shared to Cinema Channels successfully!', 'success');
      setNewShareUrl('');
      setNewShareTitle('');
      setNewShareDesc('');
      setIsSharingModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('Error sharing video to classroom theater.', 'error');
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
    } catch (err) {
      console.warn("Like error:", err);
    }
  };

  // Delete shared video from cloud store
  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this video post?')) return;
    try {
      await deleteDoc(doc(db, 'cinemaVideos', videoId));
      showNotification('Deleted shared video from channels.', 'success');
      if (activeTheaterVideo?.id === videoId) {
        setActiveTheaterVideo(null);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete video.', 'error');
    }
  };

  // Filter list matching search query to find user by their name and see their posted links
  const filteredSharedVideos = sharedVideos.filter(video => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (video.displayName || '').toLowerCase().includes(term);
  });

  // --- Photo Editor States ---
  const [photoSrc, setPhotoSrc] = useState<string>('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200');
  const [photoName, setPhotoName] = useState<string>('Graduation_Tech_Symposium.jpg');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [blur, setBlur] = useState<number>(0);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [hueRotate, setHueRotate] = useState<number>(0);
  const [invert, setInvert] = useState<number>(0);
  
  // Crop & rotation presets
  const [currentCrop, setCurrentCrop] = useState<'original' | '1:1' | '16:9' | '4:3'>('original');
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270

  // Canvas ref for real export
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset Images
  const presetPhotos = [
    { name: 'Tech Symposium', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600' },
    { name: 'Graduation Ceremony', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600' },
    { name: 'Cozy Library Study', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600' },
    { name: 'Nature Background', url: 'https://images.unsplash.com/photo-1472214222541-d510753a4707?q=80&w=600' }
  ];

  // --- Video Studio States ---
  const [videoSrc, setVideoSrc] = useState<string>('https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-over-a-lone-tree-43187-large.mp4');
  const [videoName, setVideoName] = useState<string>('Starry_Night_TimeLapse.mp4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [videoFilter, setVideoFilter] = useState<'none' | 'grayscale' | 'cinematic' | 'warm' | 'cyberpunk' | 'vintage'>('none');
  
  // Text Overlay / Watermark State
  const [overlayText, setOverlayText] = useState<string>('Exona Media Lab');
  const [overlayColor, setOverlayColor] = useState<string>('#ffffff');
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [overlayFontSize, setOverlayFontSize] = useState<number>(18);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Video Element Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preset Videos
  const presetVideos = [
    { name: 'Starry Sky Timelapse', url: 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-over-a-lone-tree-43187-large.mp4' },
    { name: 'Abstract Colorful Liquid', url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-of-colored-fluids-mixing-42217-large.mp4' },
    { name: 'Forest River Stream', url: 'https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4' }
  ];

  // Handle image upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoName(file.name);
      const url = URL.createObjectURL(file);
      setPhotoSrc(url);
      showNotification(`Loaded photo: ${file.name}`, 'success');
    }
  };

  // Reset Photo settings
  const handleResetPhoto = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(0);
    setSepia(0);
    setHueRotate(0);
    setInvert(0);
    setRotation(0);
    setCurrentCrop('original');
    showNotification('Photo filters reset!', 'info');
  };

  // Export processed image
  const handleExportPhoto = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      showNotification('Unable to render image.', 'error');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Direct configuration of canvas matches original image dimensions
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    // Handle rotation dimensions
    if (rotation === 90 || rotation === 270) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save state, apply translation, rotation, and filter
    ctx.save();

    // Map the CSS filter string directly code side into Canvas filter property
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale}%) sepia(${sepia}%) hue-rotate(${hueRotate}deg) invert(${invert}%)`;

    // Translate to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw image centered
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    // Turn canvas into downloadable item
    try {
      const exportUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `processed_${photoName}`;
      link.href = exportUrl;
      link.click();
      showNotification(`Exported high-res filter adjusted asset successfully!`, 'success');
    } catch (err) {
      showNotification('Cross-origin restriction or format error. Try uploading a local photo first.', 'error');
    }
  };

  // Video controls trigger
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
    } else {
      vid.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Sync speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoSpeed;
    }
  }, [videoSpeed, videoSrc]);

  // Video filters lookup map
  const getVideoFilterClass = () => {
    switch (videoFilter) {
      case 'grayscale': return 'grayscale';
      case 'vintage': return 'sepia contrast-125 saturate-50';
      case 'warm': return 'hue-rotate-15 saturate-125 brightness-105';
      case 'cyberpunk': return 'hue-rotate-180 saturate-200 contrast-125';
      case 'cinematic': return 'contrast-115 brightness-95 saturate-110';
      default: return '';
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoName(file.name);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsPlaying(false);
      showNotification(`Loaded video: ${file.name}`, 'success');
    }
  };

  const exportVideoMetadata = () => {
    const meta = {
      sourceFile: videoName,
      timestamp: new Date().toISOString(),
      modulations: {
        filter: videoFilter,
        playbackSpeed: videoSpeed,
        watermark: showWatermark ? overlayText : null,
        watermarkColor: overlayColor,
        watermarkPosition: overlayPosition,
        watermarkSize: `${overlayFontSize}px`
      }
    };

    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoName}_production_profile.json`;
    link.click();
    showNotification(`Downloaded Exon Studio video overlay manifest!`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white overflow-hidden relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header bar */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
            {labMode === 'photo' ? <ImageIcon size={20} /> : labMode === 'video' ? <Video size={20} /> : <Film size={20} />}
          </div>
          <div className="text-left">
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Photo & Video Lab
              <span className="text-[9px] bg-rose-500/20 text-rose-300 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wide border border-rose-500/20">Studio Engine</span>
            </h1>
            <p className="text-xs text-zinc-400 font-bold">
              {labMode === 'player'
                ? "Watch local device videos or share and search YouTube cinema streams posted by classroom channels."
                : "Enhance photos, tweak brightness, add non-destructive overlays and download assets live."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mode Switcher */}
          <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700 flex-1 sm:flex-none">
            <button
              onClick={() => setLabMode('photo')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                labMode === 'photo' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} /> Photo Lab
            </button>
            <button
              onClick={() => setLabMode('video')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                labMode === 'video' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Video size={13} /> Video Lab
            </button>
            <button
              onClick={() => setLabMode('player')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                labMode === 'player' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film size={13} /> Cinema Player
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xs"
          >
            Exit Studio
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Interactive Play Field */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center overflow-y-auto bg-zinc-950">
          
          {/* File Name Info Pill */}
          <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2 font-mono text-xs font-bold text-zinc-300 shadow-xs">
            <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
            <span className="truncate max-w-[240px] md:max-w-md">
              {labMode === 'photo' ? photoName : labMode === 'video' ? videoName : (activeTheaterVideo?.title || "No Cinema Stream Loaded")}
            </span>
          </div>

          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-md flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-[420px] relative">
            
            {labMode === 'photo' ? (
              // Photo Preview Canvas Simulation
              <div className="relative flex items-center justify-center max-w-full max-h-[500px]">
                <img
                  ref={imageRef}
                  src={photoSrc}
                  alt="Source View"
                  crossOrigin="anonymous"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale}%) sepia(${sepia}%) hue-rotate(${hueRotate}deg) invert(${invert}%)`,
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                  className={`max-w-full max-h-[400px] object-contain rounded-xl shadow-lg transition-all ${
                    currentCrop === '1:1' ? 'aspect-square object-cover w-[300px] h-[300px]' : 
                    currentCrop === '16:9' ? 'aspect-video object-cover w-[500px] h-[281px]' : 
                    currentCrop === '4:3' ? 'aspect-[4/3] object-cover w-[400px] h-[300px]' : ''
                  }`}
                />
              </div>
            ) : labMode === 'video' ? (
              // Video Preview Player Simulation
              <div className="w-full max-w-[640px] aspect-video relative rounded-2xl overflow-hidden bg-black shadow-lg border border-zinc-800">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  loop
                  muted
                  playsInline
                  crossOrigin="anonymous"
                  className={`w-full h-full object-cover transition-all ${getVideoFilterClass()}`}
                />

                {/* Live Overlays */}
                {showWatermark && (
                  <div 
                    style={{
                      color: overlayColor,
                      fontSize: `${overlayFontSize}px`,
                    }}
                    className={`absolute left-0 right-0 px-6 py-3 font-black text-center drop-shadow-md z-10 select-none uppercase tracking-wider pointer-events-none transition-all ${
                      overlayPosition === 'top' ? 'top-4' : 
                      overlayPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
                      'bottom-4'
                    }`}
                  >
                    {overlayText}
                  </div>
                )}

                {/* Sub-bar custom controls overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between opacity-0 hover:opacity-100 focus-within:opacity-100 transition-all z-20">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={togglePlay} 
                      className="bg-white text-zinc-950 p-2 rounded-full hover:scale-110 active:scale-95 transition-all shadow"
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <span className="text-[10px] text-white/90 font-mono font-bold">{videoSpeed}x Playback</span>
                  </div>

                  <span className="text-[10px] text-zinc-400 font-mono font-extrabold uppercase bg-black/40 px-2 py-1 rounded border border-white/10">
                    Live Monitor
                  </span>
                </div>
              </div>
            ) : (
              // --- CINEMA THEATER CANVAS ---
              <div className="w-full flex flex-col items-center">
                {activeTheaterVideo ? (
                  activeTheaterVideo.isYouTube !== false ? (
                    // YouTube Iframe Projection
                    <div className="w-full max-w-3xl aspect-video relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-zinc-800 ring-4 ring-rose-500/10">
                      <iframe
                        src={`${activeTheaterVideo.embedUrl}?autoplay=1`}
                        title={activeTheaterVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full border-0 absolute inset-0"
                      />
                    </div>
                  ) : (
                    // Local HTML5 Media Player with Premium custom control rail
                    <div className="w-full max-w-3xl aspect-video relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-zinc-800 flex flex-col group/local">
                      <video
                        ref={localPlayerRef}
                        src={activeTheaterVideo.embedUrl}
                        playsInline
                        muted={localMuted}
                        className="w-full flex-1 object-contain"
                        onTimeUpdate={() => {
                          if (localPlayerRef.current) {
                            setLocalCurrentTime(localPlayerRef.current.currentTime);
                          }
                        }}
                        onLoadedMetadata={() => {
                          if (localPlayerRef.current) {
                            setLocalDuration(localPlayerRef.current.duration);
                          }
                        }}
                        onEnded={() => setLocalPlaying(false)}
                      />
                      
                      {/* Premium Custom Player HUD overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-3 transition-all duration-200 opacity-0 group-hover/local:opacity-100 focus-within:opacity-100">
                        {/* Custom scrub bar timeline progression */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max={localDuration || 100}
                            value={localCurrentTime}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setLocalCurrentTime(v);
                              if (localPlayerRef.current) {
                                localPlayerRef.current.currentTime = v;
                              }
                            }}
                            className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>

                        {/* Control buttons line */}
                        <div className="flex justify-between items-center text-white text-xs">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => skipLocal(-10)}
                              className="text-white/80 hover:text-rose-500"
                              title="Rewind 10s"
                            >
                              <SkipBack size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={toggleLocalPlay}
                              className="w-8 h-8 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white scale-110 active:scale-95 transition-all shadow-md"
                            >
                              {localPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => skipLocal(10)}
                              className="text-white/80 hover:text-rose-500"
                              title="Forward 10s"
                            >
                              <SkipForward size={16} />
                            </button>

                            {/* Time text indicator */}
                            <span className="font-mono text-[10px] text-zinc-300">
                              {Math.floor(localCurrentTime / 60)}:{( '0' + Math.floor(localCurrentTime % 60) ).slice(-2)} / {Math.floor(localDuration / 60)}:{( '0' + Math.floor(localDuration % 60) ).slice(-2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Playback speed selector */}
                            <div className="flex bg-white/10 p-0.5 rounded-lg text-[9px] font-bold">
                              {[1, 1.5, 2].map(sp => (
                                <button
                                  key={sp}
                                  type="button"
                                  onClick={() => {
                                    setLocalPlaybackSpeed(sp);
                                    if (localPlayerRef.current) {
                                      localPlayerRef.current.playbackRate = sp;
                                    }
                                  }}
                                  className={`px-1.5 py-0.5 rounded ${localPlaybackSpeed === sp ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                >
                                  {sp}x
                                </button>
                              ))}
                            </div>

                            {/* Mute button */}
                            <button
                              type="button"
                              onClick={() => {
                                setLocalMuted(!localMuted);
                              }}
                              className="text-white/85 hover:text-rose-500"
                            >
                              {localMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>

                            {/* Fullscreen button */}
                            <button
                              type="button"
                              onClick={() => {
                                localPlayerRef.current?.requestFullscreen?.();
                              }}
                              className="text-white/85 hover:text-rose-500"
                              title="Go Fullscreen"
                            >
                              <Maximize size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-900 text-zinc-400 rounded-3xl border border-zinc-800 w-full max-w-3xl aspect-video gap-4">
                    <MonitorPlay size={44} className="text-zinc-650 animate-pulse" />
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-wider">No Active Cinema Projection</p>
                      <p className="text-xs text-zinc-500 mt-1">Paste a YouTube track or select another channel from the right pane.</p>
                    </div>
                  </div>
                )}

                {/* Sub-theatre description metadata details */}
                {activeTheaterVideo && (
                  <div className="mt-4 w-full max-w-3xl text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-black text-white tracking-tight leading-tight">{activeTheaterVideo.title}</h2>
                      {activeTheaterVideo.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-medium">{activeTheaterVideo.description}</p>
                      )}
                      
                      {/* Creator attribution line */}
                      {activeTheaterVideo.displayName && (
                        <div className="flex items-center gap-2 mt-2">
                          {activeTheaterVideo.photoURL ? (
                            <img
                              src={activeTheaterVideo.photoURL}
                              alt={activeTheaterVideo.displayName}
                              referrerPolicy="no-referrer"
                              className="w-4.5 h-4.5 rounded-full object-cover border border-zinc-800"
                            />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full bg-zinc-800 text-zinc-350 flex items-center justify-center text-[8px] font-black uppercase">
                              {activeTheaterVideo.displayName.charAt(0)}
                            </div>
                          )}
                          <span className="text-[10px] text-zinc-400 font-bold">
                            Posted by <span className="font-extrabold text-zinc-200">{activeTheaterVideo.displayName}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Social interaction like pill in cinema */}
                    {activeTheaterVideo.isYouTube !== false && activeTheaterVideo.id && (
                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end shrink-0">
                        <button
                          onClick={(e) => handleLikeVideo(activeTheaterVideo.id!, e)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-3xs ${
                            activeTheaterVideo.likedBy?.includes(currentUser?.uid)
                              ? 'bg-rose-50 border-rose-300 text-rose-600'
                              : 'bg-white border-gray-200 text-zinc-650 hover:bg-gray-50'
                          }`}
                        >
                          <Heart size={12} fill={activeTheaterVideo.likedBy?.includes(currentUser?.uid) ? "currentColor" : "none"} />
                          <span>{activeTheaterVideo.likes || 0} Likes</span>
                        </button>

                        {/* Owner deletion capability inside theater details */}
                        {(activeTheaterVideo.uid === currentUser?.uid || currentUser?.email === 'admin@exona.com') && (
                          <button
                            onClick={(e) => handleDeleteVideo(activeTheaterVideo.id!, e)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 p-1.5 rounded-lg transition-colors shadow-3xs"
                            title="Delete cinema post"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick preset switch bottom line */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
            {labMode !== 'player' && (
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center mr-2 gap-1 animate-pulse">
                <RefreshCw size={10} /> Preset Samples:
              </span>
            )}
            {labMode === 'photo' ? (
              presetPhotos.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setPhotoSrc(p.url);
                    setPhotoName(`${p.name.replace(/\s+/g, '_')}.jpg`);
                    showNotification(`Switched to sample ${p.name}`, 'info');
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-250 hover:border-rose-400 text-zinc-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  {p.name}
                </button>
              ))
            ) : labMode === 'video' ? (
              presetVideos.map((v) => (
                <button
                  key={v.name}
                  onClick={() => {
                    setVideoSrc(v.url);
                    setVideoName(`${v.name.replace(/\s+/g, '_')}.mp4`);
                    setIsPlaying(false);
                    showNotification(`Switched to sample ${v.name}`, 'info');
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-250 hover:border-rose-400 text-zinc-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  {v.name}
                </button>
              ))
            ) : (
              <div className="text-[11px] text-zinc-400 text-center font-bold">
                🎭 Cinema Mode active. Explore YouTube channels or watch local movies from your device.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane Controls Panel */}
        <div className="w-full lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-y-auto text-zinc-100">
          
          {labMode !== 'player' ? (
            <>
              {/* Top Panel Actions: Upload local files directly */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={labMode === 'photo' ? handlePhotoUpload : handleVideoUpload}
                  accept={labMode === 'photo' ? "image/*" : "video/*"}
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-6 border-2 border-dashed border-zinc-700 hover:border-rose-500 rounded-2xl flex flex-col items-center justify-center gap-1 bg-zinc-900 hover:bg-rose-500/10 transition-all text-center"
                >
                  <Upload size={18} className="text-rose-500" />
                  <span className="text-xs font-black text-white uppercase tracking-widest leading-none mt-1">Upload Own {labMode === 'photo' ? 'Photo' : 'Video'}</span>
                  <span className="text-[10px] text-zinc-400 font-bold">Import from local phone / desktop storage</span>
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {labMode === 'photo' ? (
                  // --- PHOTO CONTROLS LAYOUT ---
                  <div className="space-y-6">
                    
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Sliders size={14} className="text-rose-500" /> Image Modulators
                      </h3>
                      <button 
                        onClick={handleResetPhoto}
                        className="text-[9px] font-black uppercase text-zinc-400 hover:text-rose-600 transition-colors"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="space-y-4 font-bold text-zinc-700 text-xs">
                      {/* Brightness slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span>Brightness</span>
                          <span className="text-rose-600">{brightness}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="200" 
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>

                      {/* Contrast slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span>Contrast</span>
                          <span className="text-rose-600">{contrast}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="200" 
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>

                      {/* Saturation slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span>Saturation</span>
                          <span className="text-rose-600">{saturation}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="200" 
                          value={saturation}
                          onChange={(e) => setSaturation(Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>

                      {/* Blur slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span>Blur Precision</span>
                          <span className="text-rose-600">{blur}px</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5"
                          value={blur}
                          onChange={(e) => setBlur(Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>

                      {/* Sepia & Grayscale combined block */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span>Grayscale</span>
                            <span className="text-rose-600">{grayscale}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={grayscale}
                            onChange={(e) => setGrayscale(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span>Sepia Tone</span>
                            <span className="text-rose-600">{sepia}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={sepia}
                            onChange={(e) => setSepia(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                      </div>

                      {/* Hue shift and Invert */}
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span>Hue Shift</span>
                            <span className="text-rose-600">{hueRotate}°</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            value={hueRotate}
                            onChange={(e) => setHueRotate(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span>Invert Color</span>
                            <span className="text-rose-600">{invert}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={invert}
                            onChange={(e) => setInvert(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-150" />

                    {/* Aspect Cropper & Rotation */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Crop size={14} className="text-rose-500" /> Frame Aspect & Rotation
                      </h4>

                      <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border">
                        {(['original', '1:1', '16:9', '4:3'] as const).map(crop => (
                          <button
                            key={crop}
                            onClick={() => {
                              setCurrentCrop(crop);
                              showNotification(`Switched aspect ratio to ${crop}`, 'info');
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                              currentCrop === crop 
                                ? 'bg-rose-500 text-white font-black shadow-xs' 
                                : 'text-zinc-500 hover:text-zinc-800 hover:bg-white'
                            }`}
                          >
                            {crop}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between items-center bg-gray-50/50 rounded-xl p-3 border">
                        <span className="text-xs font-bold text-zinc-650">Rotation Increment</span>
                        <button
                          onClick={() => {
                            setRotation(prev => (prev + 90) % 360);
                            showNotification('Rotated 90° clockwise', 'info');
                          }}
                          className="px-4 py-2 bg-white border hover:border-rose-300 text-zinc-800 rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:shadow-2xs"
                        >
                          +{rotation}° Rotate
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Photo Export Trigger */}
                    <button
                      onClick={handleExportPhoto}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Download size={14} /> Render & Download Photo
                    </button>
                  </div>
                ) : (
                  // --- VIDEO CONTROLS LAYOUT ---
                  <div className="space-y-6">
                    
                    {/* Visual playback helper trigger */}
                    <div className="bg-gray-50 rounded-2xl p-4 border flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Playback Controls</h4>
                        <p className="text-[10px] text-zinc-500 font-bold leading-none mt-1">Simulate interactive video deck</p>
                      </div>
                      <button
                        onClick={togglePlay}
                        className="h-10 w-10 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-full flex items-center justify-center transition-all shadow-xs shrink-0"
                      >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                      </button>
                    </div>

                    {/* Aesthetic Video Filters preset selector */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Film size={14} className="text-rose-500" /> Colorist Cinematic Profiles
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'none', label: 'None (Raw)' },
                          { id: 'grayscale', label: 'Noir (Grayscale)' },
                          { id: 'vintage', label: 'Vintage Amber' },
                          { id: 'warm', label: 'Golden Hour' },
                          { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                          { id: 'cinematic', label: 'Hollywood Cine' },
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setVideoFilter(f.id as any);
                              showNotification(`Applied filter: ${f.label}`, 'info');
                            }}
                            className={`py-2.5 px-3 border rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden ${
                              videoFilter === f.id 
                                ? 'bg-rose-50 border-rose-500 text-rose-700 font-black ring-1 ring-rose-500' 
                                : 'bg-white text-zinc-650 hover:bg-gray-50'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-gray-150" />

                    {/* Video speed playback multiplier */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                        <SlidersHorizontal size={14} className="text-rose-500" /> Time Speed Modulator
                      </h3>
                      <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-150">
                        {[0.5, 1, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => {
                              setVideoSpeed(speed);
                              showNotification(`Set playback velocity to ${speed}x`, 'info');
                            }}
                            className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                              videoSpeed === speed ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-gray-150" />

                    {/* Custom Overlay / Subtitles studio overlay configuration */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Type size={14} className="text-rose-500" /> Title & Watermark Suite
                        </h3>
                        <button
                          onClick={() => setShowWatermark(!showWatermark)}
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                            showWatermark ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-zinc-650'
                          }`}
                        >
                          {showWatermark ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                          <label className="text-[10px] font-black uppercase text-zinc-400">Subtitle Overlay Text</label>
                          <input 
                            type="text" 
                            value={overlayText}
                            onChange={(e) => setOverlayText(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-rose-500"
                            placeholder="e.g. Cinema Frame Title..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-400">Color Palette</label>
                            <select
                              value={overlayColor}
                              onChange={(e) => setOverlayColor(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-rose-500"
                            >
                              <option value="#ffffff">Pure White</option>
                              <option value="#fbbf24">Cinema Yellow</option>
                              <option value="#ef4444">Neon Red</option>
                              <option value="#3b82f6">Ocean Blue</option>
                              <option value="#10b981">Live Emerald</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-400">Y-Axis Anchor</label>
                            <select
                              value={overlayPosition}
                              onChange={(e) => setOverlayPosition(e.target.value as any)}
                              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-rose-500"
                            >
                              <option value="top">Top Header</option>
                              <option value="center">Center Safe-Area</option>
                              <option value="bottom">Lower Third</option>
                            </select>
                          </div>
                        </div>

                        {/* Font size control */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span>Font Size</span>
                            <span className="text-rose-650">{overlayFontSize}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="12" 
                            max="32" 
                            value={overlayFontSize}
                            onChange={(e) => setOverlayFontSize(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtitle manifest file generator */}
                    <button
                      onClick={exportVideoMetadata}
                      className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Download size={14} /> Render Overlay Manifest
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // --- CINEMA CONSOLE SIDEBAR ---
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Inner console selector */}
              <div className="p-3 border-b border-gray-100 flex gap-2 shrink-0 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setPlayerTab('cinema')}
                  className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    playerTab === 'cinema' 
                      ? 'bg-rose-600 text-white shadow-xs font-black' 
                      : 'bg-white text-zinc-500 hover:text-zinc-800 border'
                  }`}
                >
                  <Tv size={12} /> Social Channels
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerTab('local')}
                  className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    playerTab === 'local' 
                      ? 'bg-rose-600 text-white shadow-xs font-black' 
                      : 'bg-white text-zinc-500 hover:text-zinc-800 border'
                  }`}
                >
                  <MonitorPlay size={12} /> Local Video Player
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {playerTab === 'local' ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                      <input
                        type="file"
                        id="local-player-file-input"
                        className="hidden"
                        accept="video/*"
                        onChange={handleLocalPlayerVideoUpload}
                      />
                      <label
                        htmlFor="local-player-file-input"
                        className="w-full py-8 px-4 border-2 border-dashed border-zinc-300 hover:border-rose-500 rounded-xl flex flex-col items-center justify-center gap-2 bg-white hover:bg-rose-50/10 cursor-pointer transition-all text-center"
                      >
                        <Upload size={24} className="text-rose-500 animate-bounce" />
                        <span className="text-xs font-black text-zinc-800 uppercase tracking-wider mt-1">Select Local Movie File</span>
                        <span className="text-[9px] text-zinc-400">Watch files directly on your phone</span>
                      </label>
                    </div>

                    {localVideoFileName && (
                      <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clapperboard size={14} className="text-rose-500 shrink-0" />
                          <span className="font-mono font-bold truncate text-zinc-700">{localVideoFileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (localPlayerRef.current) {
                              localPlayerRef.current.currentTime = 0;
                              setLocalPlaying(false);
                            }
                          }}
                          className="text-zinc-400 hover:text-rose-600 font-black uppercase text-[9px] shrink-0 ml-2"
                        >
                          Restart
                        </button>
                      </div>
                    )}

                    <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-2.5 text-zinc-300">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Device Video Guidance:</h4>
                      <p className="text-[11px] leading-tight font-medium">1. Select your film from internal storage or camera rolls.</p>
                      <p className="text-[11px] leading-tight font-medium">2. Enjoy high fidelity playback controls with custom rewinds and triggers.</p>
                      <p className="text-[11px] leading-tight font-medium">3. Data remains strictly private on your phone.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Share Action Block */}
                    <div className="bg-zinc-900 text-white rounded-2xl p-4 shadow-sm border border-zinc-800 relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1.5 text-rose-400">
                          <Sparkles size={14} className="animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Creator Social Theatre</span>
                        </div>
                        <h4 className="text-xs font-black tracking-tight uppercase">Share YouTube Movies</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-medium">Copy links of YouTube clips, define titles, and let other classmates search and watch!</p>
                        
                        <button
                          type="button"
                          onClick={() => setIsSharingModalOpen(!isSharingModalOpen)}
                          className="mt-3.5 flex items-center justify-center gap-1.5 w-full bg-rose-600 hover:bg-rose-650 transition-all text-white font-black py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-xs"
                        >
                          <Plus size={12} /> {isSharingModalOpen ? 'Cancel Share Form' : 'Publish Video Link'}
                        </button>
                      </div>
                    </div>

                    {/* Sharing Modal/Form Overlay */}
                    {isSharingModalOpen && (
                      <form onSubmit={handleShareVideo} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-inner">
                        <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest block">New Shared Channel Post</span>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block">Video Title *</label>
                          <input
                            type="text"
                            required
                            value={newShareTitle}
                            onChange={(e) => setNewShareTitle(e.target.value)}
                            placeholder="e.g. Science Class Lesson Explained"
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block">YouTube Link *</label>
                          <input
                            type="url"
                            required
                            value={newShareUrl}
                            onChange={(e) => setNewShareUrl(e.target.value)}
                            placeholder="e.g. https://www.youtube.com/watch?v=..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block">Brief Notes (optional)</label>
                          <textarea
                            value={newShareDesc}
                            onChange={(e) => setNewShareDesc(e.target.value)}
                            placeholder="Provide details about the video clip..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 h-16 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingVideo}
                          className="w-full py-2 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-rose-700 transition-all disabled:opacity-50"
                        >
                          {isSubmittingVideo ? 'Publishing...' : 'Publish to Class Channels'}
                        </button>
                      </form>
                    )}

                    {/* Search Field */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={13} className="text-zinc-500" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search user by name to see their posted channels..."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:border-rose-500 transition-all"
                      />
                    </div>

                    {/* Channel Streams List */}
                    <div className="space-y-3">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                        <Tv size={10} /> Active Channel Directory ({filteredSharedVideos.length})
                      </h4>
                      
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {filteredSharedVideos.length > 0 ? (
                          filteredSharedVideos.map((video) => {
                            const hasLiked = video.likedBy?.includes(currentUser?.uid);
                            const isOwner = video.uid === currentUser?.uid || currentUser?.email === 'admin@exona.com';
                            const active = activeTheaterVideo?.id === video.id;
                            
                            return (
                              <div
                                key={video.id}
                                onClick={() => {
                                  setActiveTheaterVideo({ ...video, isYouTube: true });
                                  showNotification(`Loaded channel: ${video.title}`, 'info');
                                }}
                                className={`group p-3 rounded-xl border transition-all cursor-pointer text-left flex gap-3 relative overflow-hidden select-none ${
                                  active 
                                    ? 'bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/20' 
                                    : 'bg-zinc-950 border-zinc-800 hover:border-rose-500/50 text-white shadow-2xs'
                                }`}
                              >
                                <div className="w-12 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-rose-500 overflow-hidden relative shrink-0">
                                  <Film size={14} className="text-rose-500 scale-100 group-hover:scale-110 transition-transform" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className="font-extrabold text-[11px] text-white truncate leading-tight group-hover:text-rose-400 transition-colors">{video.title}</h5>
                                  
                                  <div className="flex items-center justify-between mt-1.5">
                                    <div className="flex items-center gap-1 min-w-0">
                                      {video.photoURL ? (
                                        <img
                                          src={video.photoURL}
                                          alt={video.displayName}
                                          referrerPolicy="no-referrer"
                                          className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-800"
                                        />
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[7px] font-black uppercase">
                                          {(video.displayName || 'G').charAt(0)}
                                        </div>
                                      )}
                                      <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[80px]">
                                        {video.displayName || 'Guest User'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleLikeVideo(video.id, e)}
                                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black tracking-tight transition-all ${
                                          hasLiked
                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                                            : 'bg-zinc-900 border-zinc-750 text-zinc-400 hover:border-rose-500/50'
                                        }`}
                                      >
                                        <Heart size={7} fill={hasLiked ? "currentColor" : "none"} />
                                        <span>{video.likes || 0}</span>
                                      </button>
                                      
                                      {isOwner && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteVideo(video.id, e)}
                                          className="text-zinc-400 hover:text-red-500 p-0.5 transition-colors"
                                          title="Delete channel video"
                                        >
                                          <Trash2 size={9} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 text-zinc-500">
                            <Clapperboard size={20} className="mx-auto text-zinc-600 animate-pulse" />
                            <p className="text-[10px] font-bold mt-1 uppercase text-zinc-500">No active streams match search</p>
                          </div>
                        )}

                        {filteredSharedVideos.length >= cinemaLimit && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setCinemaLimit(prev => prev + 15)}
                              className="w-full py-2.5 px-4 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center cursor-pointer shadow-md"
                            >
                              Load More Channels
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

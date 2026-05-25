import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Image as ImageIcon, Download, Upload, Sliders, Type, Play, Pause, 
  RotateCcw, SlidersHorizontal, Eye, RefreshCw, Layers, Crop, Film, Maximize, Scissors 
} from 'lucide-react';

interface PhotoVideoLabProps {
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PhotoVideoLab({ onClose, showNotification }: PhotoVideoLabProps) {
  // Mode selection
  const [labMode, setLabMode] = useState<'photo' | 'video'>('photo');

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
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header bar */}
      <div className="sticky top-0 bg-white border-b border-gray-150 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            {labMode === 'photo' ? <ImageIcon size={20} /> : <Video size={20} />}
          </div>
          <div className="text-left">
            <h1 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              Photo & Video Lab
              <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wide">Studio Engine</span>
            </h1>
            <p className="text-xs text-zinc-500 font-bold">Enhance photos, tweak brightness, add non-destructive overlays and download assets live.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-150 flex-1 sm:flex-none">
            <button
              onClick={() => setLabMode('photo')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                labMode === 'photo' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <ImageIcon size={14} /> Photo Lab
            </button>
            <button
              onClick={() => setLabMode('video')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                labMode === 'video' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Video size={14} /> Video Lab
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xs"
          >
            Exit Studio
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Interactive Play Field */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center overflow-y-auto bg-gray-100/50">
          
          {/* File Name Info Pill */}
          <div className="mb-4 bg-white border border-gray-150 rounded-full px-4 py-1.5 flex items-center gap-2 font-mono text-xs font-bold text-zinc-650 shadow-xs">
            <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="truncate max-w-[240px] md:max-w-md">{labMode === 'photo' ? photoName : videoName}</span>
          </div>

          <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-[2rem] p-6 shadow-md flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-[420px] relative">
            
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
            ) : (
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
            )}
          </div>

          {/* Quick preset switch bottom line */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center mr-2 gap-1">
              <RefreshCw size={10} className="animate-spin-slow" /> Preset Samples:
            </span>
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
            ) : (
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
            )}
          </div>
        </div>

        {/* Right Pane Controls Panel */}
        <div className="w-full lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200 bg-white flex flex-col overflow-y-auto">
          
          {/* Top Panel Actions: Upload local files directly */}
          <div className="p-6 border-b border-gray-150 bg-gray-50/50">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={labMode === 'photo' ? handlePhotoUpload : handleVideoUpload}
              accept={labMode === 'photo' ? "image/*" : "video/*"}
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-6 border-2 border-dashed border-gray-300 hover:border-rose-500 rounded-2xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-rose-50/10 transition-all text-center"
            >
              <Upload size={18} className="text-rose-500" />
              <span className="text-xs font-black text-zinc-900 uppercase tracking-widest leading-none mt-1">Upload Own {labMode === 'photo' ? 'Photo' : 'Video'}</span>
              <span className="text-[10px] text-zinc-500 font-bold">Import from local phone / desktop storage</span>
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
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { 
  Share2, Download, Upload, Wifi, WifiOff, Smartphone, Laptop, 
  Music, Image as ImageIcon, Video as VideoIcon, Folder, Grid, HelpCircle, 
  Settings, Activity, Clock, CheckCircle2, ArrowRight, ArrowLeft, 
  X, Plus, Trash2, ArrowUpDown, RefreshCw, Layers, Check, FileText, File,
  Radio, Laptop2, Tablet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransferFile {
  id: string;
  name: string;
  size: string;
  bytes: number;
  type: 'app' | 'photo' | 'music' | 'video' | 'doc';
  iconName?: string;
  thumbnail?: string;
}

interface TransferLog {
  id: string;
  file: TransferFile;
  direction: 'send' | 'receive';
  progress: number;
  speed: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
}

export default function ExonaFileShare({ 
  onClose,
  showNotification
}: { 
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  // Base preloaded simulated files
  const [apps, setApps] = useState<TransferFile[]>([
    { id: 'app-1', name: 'WhatsApp Pro', size: '34.8 MB', bytes: 36490240, type: 'app' },
    { id: 'app-2', name: 'Instagram LITE', size: '18.4 MB', bytes: 19293798, type: 'app' },
    { id: 'app-3', name: 'Exona Educational client', size: '12.2 MB', bytes: 12792627, type: 'app' },
    { id: 'app-4', name: 'Chess Grandmaster', size: '28.1 MB', bytes: 29464985, type: 'app' },
    { id: 'app-5', name: 'CapCut Editor', size: '65.4 MB', bytes: 68576870, type: 'app' }
  ]);

  const [photos, setPhotos] = useState<TransferFile[]>([
    { id: 'photo-1', name: 'Graduation_Ceremony.jpg', size: '3.4 MB', bytes: 3565158, type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=200' },
    { id: 'photo-2', name: 'Tech_Symposium_Stage.png', size: '4.8 MB', bytes: 5033164, type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=200' },
    { id: 'photo-3', name: 'Science_Lab_Setup.jpg', size: '2.1 MB', bytes: 2202009, type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=200' },
    { id: 'photo-4', name: 'Campus_Library_Study.jpg', size: '5.2 MB', bytes: 5452595, type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=200' }
  ]);

  const [music, setMusic] = useState<TransferFile[]>([
    { id: 'music-1', name: 'Burna Boy - Last Last.mp3', size: '5.2 MB', bytes: 5452595, type: 'music' },
    { id: 'music-2', name: 'Wizkid - Mood (feat. Buju).mp3', size: '6.4 MB', bytes: 6710886, type: 'music' },
    { id: 'music-3', name: 'Asake - Organise.mp3', size: '4.9 MB', bytes: 5138022, type: 'music' },
    { id: 'music-4', name: 'Rema - Calm Down.mp3', size: '7.1 MB', bytes: 7444889, type: 'music' }
  ]);

  const [videos, setVideos] = useState<TransferFile[]>([
    { id: 'video-1', name: 'AI_Conference_Panel.mp4', size: '42.5 MB', bytes: 44564480, type: 'video' },
    { id: 'video-2', name: 'Student_Project_Inauguration.mp4', size: '108.2 MB', bytes: 113455923, type: 'video' },
    { id: 'video-3', name: 'Inter-House_Sports_Finals.mp4', size: '84.1 MB', bytes: 88185856, type: 'video' }
  ]);

  const [docs, setDocs] = useState<TransferFile[]>([
    { id: 'doc-1', name: 'Institutional_Assessment_Form.pdf', size: '1.4 MB', bytes: 1468006, type: 'doc' },
    { id: 'doc-2', name: 'First_Semester_Timetable.xlsx', size: '820 KB', bytes: 839680, type: 'doc' },
    { id: 'doc-3', name: 'Research_Methodology_Draft.docx', size: '2.8 MB', bytes: 2936012, type: 'doc' },
    { id: 'doc-4', name: 'Exona_Integration_API.json', size: '142 KB', bytes: 145408, type: 'doc' }
  ]);

  // Folder of received files
  const [receivedFiles, setReceivedFiles] = useState<TransferFile[]>([]);

  // State Management
  const [activeTab, setActiveTab] = useState<'app' | 'photo' | 'music' | 'video' | 'doc' | 'received'>('app');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<'files' | 'radar'>('files');
  const [connectionState, setConnectionState] = useState<'disconnected' | 'creating' | 'joining' | 'connected_master' | 'connected_slave'>('disconnected');
  const [activePeerName, setActivePeerName] = useState<string>('');
  const [activePeerDevice, setActivePeerDevice] = useState<string>('');
  
  // Connection simulator controls
  const [hotspotSSID, setHotspotSSID] = useState<string>('');
  const [showConnectPC, setShowConnectPC] = useState<boolean>(false);
  const [radarPulse, setRadarPulse] = useState<boolean>(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<any[]>([]);
  
  // Transfer history logs state
  const [transferHistory, setTransferHistory] = useState<TransferLog[]>([]);
  const [activeTransferringId, setActiveTransferringId] = useState<string | null>(null);
  const [transferSpeed, setTransferSpeed] = useState<string>('0 B/s');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Auto discover peers in radar screen
  useEffect(() => {
    let peerInterval: any;
    if (connectionState === 'joining') {
      setRadarPulse(true);
      setDiscoveredPeers([]);
      peerInterval = setTimeout(() => {
        setDiscoveredPeers([
          { id: 'peer-1', name: "Jane's iPhone 15", distance: '0.4m', device: 'phone', avatar: 'JC' },
          { id: 'peer-2', name: "Mr. Musa's MacBook Pro", distance: '1.1m', device: 'laptop', avatar: 'MM' },
          { id: 'peer-3', name: "East Lab iPad Pro", distance: '2.5m', device: 'tablet', avatar: 'IP' }
        ]);
      }, 2000);
    } else {
      setRadarPulse(false);
    }
    return () => clearTimeout(peerInterval);
  }, [connectionState]);

  // Simulated transfer loop helper (AirDrop swift transfer style)
  const runActiveTransfersModel = async (direction: 'send' | 'receive', filesToMove: TransferFile[]) => {
    if (filesToMove.length === 0) return;

    for (let index = 0; index < filesToMove.length; index++) {
      const file = filesToMove[index];
      const transferId = `transfer-${Date.now()}-${file.id}`;

      // Create initial transfer record
      const newLog: TransferLog = {
        id: transferId,
        file: file,
        direction: direction,
        progress: 0,
        speed: 'Connecting...',
        status: 'pending'
      };

      setTransferHistory(prev => [newLog, ...prev]);
      setActiveTransferringId(transferId);

      // Start simulated transfer
      let progressVal = 0;

      const transferPromise = new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          progressVal += 15;
          if (progressVal > 100) progressVal = 100;
          
          // Speed randomized
          const speed = (Math.random() * 25 + 45).toFixed(1); // Ultra speed AirDrop peer-to-peer 45-70 MB/s
          setTransferSpeed(`${speed} MB/s`);

          setTransferHistory(prev => prev.map(log => {
            if (log.id === transferId) {
              return {
                ...log,
                progress: progressVal,
                speed: `${speed} MB/s`,
                status: progressVal >= 100 ? 'completed' : 'transferring'
              };
            }
            return log;
          }));

          if (progressVal >= 100) {
            clearInterval(interval);
            // Save to received folder if incoming
            if (direction === 'receive') {
              setReceivedFiles(prev => [...prev, file]);
            }
            resolve();
          }
        }, 250);
      });

      await transferPromise;
    }

    setTransferSpeed('0 B/s');
    setActiveTransferringId(null);
    showNotification(`AirDrop: Successfully dropped ${filesToMove.length} files onto local wireless mesh!`, 'success');
  };

  // Drag and Drop real uploads integration
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const filesUploaded = e.dataTransfer.files;
    if (filesUploaded && filesUploaded.length > 0) {
      registerUploadedFiles(filesUploaded);
    }
  };

  const handleManualUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesUploaded = e.target.files;
    if (filesUploaded && filesUploaded.length > 0) {
      registerUploadedFiles(filesUploaded);
    }
  };

  const registerUploadedFiles = (fileList: FileList) => {
    const newItems: TransferFile[] = [];
    for (let index = 0; index < fileList.length; index++) {
      const f = fileList[index];
      const pathSizeStr = f.size > 1024 * 1024 
        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(f.size / 1024).toFixed(1)} KB`;
      
      const fileExt = f.name.split('.').pop()?.toLowerCase();
      let tabCategory: 'app' | 'photo' | 'music' | 'video' | 'doc' = 'doc';

      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt || '')) {
        tabCategory = 'photo';
      } else if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(fileExt || '')) {
         tabCategory = 'music';
      } else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(fileExt || '')) {
         tabCategory = 'video';
      } else if (['apk'].includes(fileExt || '')) {
         tabCategory = 'app';
      }

      const generatedFile: TransferFile = {
        id: `uploaded-${Date.now()}-${index}`,
        name: f.name,
        size: pathSizeStr,
        bytes: f.size,
        type: tabCategory,
        thumbnail: tabCategory === 'photo' ? URL.createObjectURL(f) : undefined
      };

      newItems.push(generatedFile);

      // Prepend to respective states
      if (tabCategory === 'photo') setPhotos(prev => [generatedFile, ...prev]);
      else if (tabCategory === 'music') setMusic(prev => [generatedFile, ...prev]);
      else if (tabCategory === 'video') setVideos(prev => [generatedFile, ...prev]);
      else if (tabCategory === 'app') setApps(prev => [generatedFile, ...prev]);
      else if (tabCategory === 'doc') setDocs(prev => [generatedFile, ...prev]);
    }

    // Direct auto-select newly uploaded files
    const autoSelectIds = newItems.map(item => item.id);
    setSelectedIds(prev => [...prev, ...autoSelectIds]);
    showNotification(`Registered and selected ${newItems.length} real files for sending!`, 'success');
  };

  // Calculate current selected size
  const getSelectedFilesObjects = (): TransferFile[] => {
    const all = [...apps, ...photos, ...music, ...videos, ...docs, ...receivedFiles];
    return all.filter(f => selectedIds.includes(f.id));
  };

  const selectedFilesList = getSelectedFilesObjects();
  const totalSelectedBytes = selectedFilesList.reduce((acc, current) => acc + current.bytes, 0);
  const totalSelectedSizeStr = totalSelectedBytes > 1024 * 1024 
    ? `${(totalSelectedBytes / (1024 * 1024)).toFixed(1)} MB` 
    : `${(totalSelectedBytes / 1024).toFixed(1)} KB`;

  // Filter out currently active tab list
  const getActiveTabFilesList = () => {
    switch (activeTab) {
      case 'app': return apps;
      case 'photo': return photos;
      case 'music': return music;
      case 'video': return videos;
      case 'doc': return docs;
      case 'received': return receivedFiles;
      default: return [];
    }
  };

  const activeTabFiles = getActiveTabFilesList();

  const toggleSelectFile = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllActiveTabFiles = () => {
    const activeIds = activeTabFiles.map(f => f.id);
    const allSelected = activeIds.every(id => selectedIds.includes(id));

    if (allSelected) {
       setSelectedIds(prev => prev.filter(id => !activeIds.includes(id)));
    } else {
       setSelectedIds(prev => [...new Set([...prev, ...activeIds])]);
    }
  };

  // Simulated peer actions
  const createHotspotGroup = () => {
    const randSsid = `ExonaDrop_${Math.floor(100 + Math.random() * 900)}`;
    setHotspotSSID(randSsid);
    setConnectionState('creating');
    showNotification(`Exona Drop: Broadcasting AirDrop beacon ${randSsid}.`, 'info');
    // Ensure mobile view displays the QR credentials and connections
    setMobileView('radar');
  };

  const joinHotspotGroup = () => {
    setConnectionState('joining');
    showNotification('Looking for nearby Exona Drop devices...', 'info');
    // Display the radar scan animation and targets on mobile
    setMobileView('radar');
  };

  const simulateIncomingConnection = () => {
    // Peer connects
    setActivePeerName("Jane Cooper's iPhone 15");
    setActivePeerDevice("phone");
    setConnectionState('connected_master');
    showNotification("Jane Cooper connected over local peer wireless link!", 'success');
  };

  const handleConnectToDiscoveredPeer = (peer: any) => {
    setActivePeerName(peer.name);
    setActivePeerDevice(peer.device);
    setConnectionState('connected_slave');
    showNotification(`Exona Drop: Connected with ${peer.name} successfully!`, 'success');
  };

  const handleDisconnect = () => {
    setConnectionState('disconnected');
    setActivePeerName('');
    setActivePeerDevice('');
    setTransferSpeed('0 B/s');
    showNotification('Closed connection mesh.', 'info');
  };

  const triggerMeshFilesSendTransfer = () => {
    if (selectedFilesList.length === 0) {
      showNotification('Please select files from categories to drop first!', 'error');
      return;
    }
    if (connectionState === 'disconnected') {
      showNotification('Open peer discovery first by clicking "AirDrop Discover" or "Share Beacon"!', 'info');
      setMobileView('radar');
      return;
    }
    
    // Run send
    const itemsToSend = [...selectedFilesList];
    setSelectedIds([]); // empty bag
    runActiveTransfersModel('send', itemsToSend);
    setMobileView('radar');
  };

  const triggerSimulatedIncomingFiles = () => {
    if (connectionState === 'disconnected') {
      showNotification('Establish a connection with a peer first!', 'error');
      return;
    }

    // Random choice of 2 items to receive
    const incomingSimList: TransferFile[] = [
      { id: `incoming-rec-1-${Date.now()}`, name: 'AI_Course_Syllabus.docx', size: '2.4 MB', bytes: 2516582, type: 'doc' },
      { id: `incoming-rec-2-${Date.now()}`, name: 'Epic_Nature_Background.jpg', size: '4.1 MB', bytes: 4299161, type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1472214222541-d510753a4707?q=80&w=200' }
    ];

    runActiveTransfersModel('receive', incomingSimList);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Exona share header */}
      <div className="bg-white border-b border-gray-150 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-xs relative z-30">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
              Exona Drop 
              <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">AirDrop Mode</span>
            </h2>
            <p className="text-xs text-muted font-bold">Secure instant file, application, media, and document sharing via offline ad-hoc wifi radio.</p>
          </div>
        </div>

        {/* Live connections readout status row */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          {connectionState !== 'disconnected' ? (
            <div className="flex items-center gap-3 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-2xl">
              <Wifi size={18} className="animate-pulse text-blue-600" />
              <div className="text-left text-xs">
                <p className="font-extrabold uppercase tracking-wide leading-none">{connectionState.replace('_', ' ')}</p>
                <p className="font-medium text-[10px] text-blue-600/80 mt-0.5">
                  {connectionState.includes('master') || connectionState.includes('slave') ? `Linked with ${activePeerName}` : 'Pulsing Radio Link...'}
                </p>
              </div>
              <button 
                onClick={handleDisconnect}
                className="ml-2 h-6 w-6 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-800 transition-all text-xs"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100/80 text-muted px-4 py-2 rounded-2xl border border-gray-200">
              <WifiOff size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Radio: Offline</span>
            </div>
          )}

          <button 
            onClick={() => setShowConnectPC(!showConnectPC)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-800 border border-gray-200 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
          >
            <Laptop size={14} />
            <span className="hidden md:inline">WebDrop Link</span>
          </button>

          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-red-50 text-muted hover:text-red-600 rounded-2xl border border-gray-100 transition-all shrink-0"
            title="Exit Exona Drop"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mobile view sub-tabs switcher (Hidden on desktop) */}
      <div className="lg:hidden bg-white border-b border-gray-150 px-4 py-2 flex shrink-0 justify-center z-20 shadow-xs">
        <div className="w-full max-w-md flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button 
            onClick={() => setMobileView('files')}
            className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mobileView === 'files' ? 'bg-white text-zinc-950 shadow-xs font-black' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Folder size={14} /> Browse Files
          </button>
          <button 
            onClick={() => setMobileView('radar')}
            className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mobileView === 'radar' ? 'bg-white text-zinc-950 shadow-xs font-black' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Radio size={14} className={connectionState !== 'disconnected' ? "animate-pulse text-blue-600" : ""} />
            AirDrop Radar & Drops ({transferHistory.length})
          </button>
        </div>
      </div>

      {/* Main double column split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: file explorer categories */}
        <div className={`flex-1 flex-col min-w-0 bg-white border-r border-gray-150 relative ${
          mobileView === 'files' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Tab Selection panel */}
          <div className="bg-gray-50/50 p-4 border-b border-gray-150 sticky top-0 z-10 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              {[
                { id: 'app', label: 'Apps', icon: Grid, color: 'text-purple-600 bg-purple-50' },
                { id: 'photo', label: 'Photos', icon: ImageIcon, color: 'text-amber-600 bg-amber-50' },
                { id: 'music', label: 'Music', icon: Music, color: 'text-rose-600 bg-rose-50' },
                { id: 'video', label: 'Videos', icon: VideoIcon, color: 'text-indigo-600 bg-indigo-50' },
                { id: 'doc', label: 'Docs & Files', icon: Folder, color: 'text-emerald-600 bg-emerald-50' },
                { id: 'received', label: 'Received Drops', icon: Download, color: 'text-blue-600 bg-blue-50 border border-blue-200/55' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[12px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-ink text-white shadow-xs' 
                      : `hover:bg-gray-150 text-zinc-600 ${tab.color}`
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                  {tab.id === 'received' && receivedFiles.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white font-extrabold text-[9px] rounded-full">
                      {receivedFiles.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selection control top line */}
          <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center text-sm font-bold text-muted bg-gray-50/20 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={selectAllActiveTabFiles}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-ink hover:underline font-extrabold"
              >
                {activeTabFiles.every(f => selectedIds.includes(f.id)) ? 'Deselect All' : 'Select All Files'}
              </button>
              <span>•</span>
              <span className="text-xs font-bold text-zinc-500">{activeTabFiles.length} items listed</span>
            </div>

            {/* Custom browser file dropper launcher triggers */}
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple
                className="hidden" 
                onChange={handleManualUploadSelect} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline uppercase tracking-widest font-black"
              >
                <Plus size={14} /> Add System File
              </button>
            </div>
          </div>

          {/* Categories directories dynamic container */}
          <div 
            className={`flex-1 overflow-y-auto p-6 relative transition-colors ${dragOver ? 'bg-blue-50/30 border-2 border-dashed border-blue-400' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {dragOver && (
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center bg-blue-600/10 backdrop-blur-xs text-blue-900">
                <Radio size={64} className="animate-bounce mb-4 text-blue-600" />
                <p className="text-xl font-black">Drop files and folder contents here!</p>
                <p className="text-xs font-bold text-blue-600/80 uppercase mt-1">Automatic AirDrop Sorting</p>
              </div>
            )}

            {activeTabFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/40 rounded-3xl border border-dashed">
                <Folder size={48} className="text-gray-300 mb-3" />
                <h4 className="text-base font-black text-zinc-800">No assets inside category</h4>
                <p className="text-xs text-muted max-w-sm mt-1">Drag files from your workstation here, or tap "Add System File" above to test local high speed dropping simulator.</p>
              </div>
            ) : activeTab === 'photo' ? (
              /* Beautiful Grid of photos for easy selection */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map(file => {
                  const isSel = selectedIds.includes(file.id);
                  return (
                    <div 
                      key={file.id} 
                      onClick={() => toggleSelectFile(file.id)}
                      className={`group relative rounded-2xl overflow-hidden aspect-square border-2 cursor-pointer transition-all ${
                        isSel ? 'border-blue-600 scale-[0.98]' : 'border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      <img src={file.thumbnail} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <p className="text-[10px] font-bold text-white truncate w-full">{file.name}</p>
                      </div>
                      
                      {/* Selection Badge badge overlay */}
                      <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center border-2 border-white text-white transition-all ${
                        isSel ? 'bg-blue-600 opacity-100 scale-100' : 'bg-black/30 group-hover:scale-100'
                      }`}>
                        {isSel && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] text-white font-extrabold">
                        {file.size}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Classy list of document / apps / files item models */
              <div className="space-y-2.5 max-w-4xl mx-auto">
                {activeTabFiles.map(file => {
                  const isSel = selectedIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleSelectFile(file.id)}
                      className={`p-4 bg-white border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                        isSel 
                          ? 'border-blue-600 bg-blue-50/5 shadow-xs' 
                          : 'border-gray-150 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Interactive Dynamic icon based on tab index type */}
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                          file.type === 'app' ? 'bg-purple-50 text-purple-600' :
                          file.type === 'music' ? 'bg-rose-50 text-rose-600' :
                          file.type === 'video' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {file.type === 'app' ? <Grid size={20} /> :
                           file.type === 'music' ? <Music size={20} /> :
                           file.type === 'video' ? <VideoIcon size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-bold text-zinc-950 truncate pr-4 text-sm">{file.name}</h4>
                          <span className="text-[10px] text-muted font-bold uppercase tracking-wider">{file.size} • {file.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Playable option if it is background music / download option for received file */}
                        {file.id.startsWith('incoming-') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              showNotification(`Initiated download of received drop: ${file.name}`, 'success');
                            }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2.5 rounded-xl border border-blue-100 transition-all"
                            title="Download Shared Drop Asset"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSel ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white'
                        }`}>
                          {isSel && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Basket Counter bottom bar */}
          <div className="bg-zinc-950 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 transition-all">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">AirDrop Tray</span>
              <p className="text-white text-base font-black">
                {selectedIds.length} files queued • <span className="text-blue-400">{totalSelectedSizeStr}</span>
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto">
              {selectedIds.length > 0 && (
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-3 border border-white/10 hover:border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  Clear Queue
                </button>
              )}
              <button 
                onClick={triggerMeshFilesSendTransfer}
                disabled={selectedIds.length === 0}
                className="flex-1 sm:flex-none px-8 py-3 bg-blue-650 hover:bg-blue-600 disabled:bg-white/5 text-white disabled:text-white/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Upload size={14} /> AirDrop Selected Setup
              </button>
            </div>
          </div>
        </div>

        {/* Right pane: transfer controls & dynamic radar sonar connection manager */}
        <div className={`w-full lg:w-96 shrink-0 flex-col bg-gray-50 border-l border-zinc-200 ${
          mobileView === 'radar' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Quick connections tools block */}
          <div className="p-6 bg-white border-b border-gray-150 text-center shrink-0">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] block mb-3">AirDrop Handshakes</span>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button 
                onClick={createHotspotGroup}
                className="p-4 bg-blue-50/50 text-blue-800 border-2 border-dashed border-blue-200 hover:border-blue-300 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-50 transition-all"
              >
                <Upload size={22} className="text-blue-600" />
                <span className="text-[11px] font-black uppercase tracking-wider">Share Beacon</span>
              </button>

              <button 
                onClick={joinHotspotGroup}
                className="p-4 bg-indigo-50/50 text-indigo-800 border-2 border-dashed border-indigo-200 hover:border-indigo-300 rounded-3xl flex flex-col items-center gap-2 hover:bg-indigo-50 transition-all"
              >
                <Download size={22} className="text-indigo-600" />
                <span className="text-[11px] font-black uppercase tracking-wider">Discover Drop</span>
              </button>
            </div>

            {/* Simulated actions to feed mock transfers */}
            {connectionState !== 'disconnected' && (
              <button 
                onClick={triggerSimulatedIncomingFiles}
                className="w-full mt-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className="animate-spin text-blue-400" />
                Simulate Received Drop
              </button>
            )}
          </div>

          {/* Dynamic state content area (Radar scanner / Host hotspot code / Active Logs) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <AnimatePresence mode="wait">
              {connectionState === 'creating' && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white p-6 border border-gray-150 rounded-[2rem] text-center shadow-xs"
                >
                  <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <Radio size={24} className="text-blue-600" />
                  </div>
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-1">Broadcasting Drop SSID</h4>
                  <p className="text-[11px] text-muted mb-6 leading-relaxed">Other students can detect your computer over ad-hoc Wi-Fi channel. Scan code or join manual network</p>

                  {/* Pure HTML code-free inline SVG to draw clean QR Code */}
                  <div className="bg-gray-50 border border-gray-150 p-4 rounded-3xl inline-block mb-6 shadow-inner">
                    <svg width="130" height="130" viewBox="0 0 100 100" className="mx-auto text-zinc-950 fill-current">
                      <rect x="0" y="0" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6"/>
                      <rect x="75" y="0" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6"/>
                      <rect x="0" y="75" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6"/>
                      {/* Random digital QR grids */}
                      <rect x="8" y="8" width="8" height="8"/>
                      <rect x="83" y="8" width="8" height="8"/>
                      <rect x="8" y="83" width="8" height="8"/>
                      <rect x="35" y="10" width="10" height="10"/>
                      <rect x="50" y="25" width="15" height="10"/>
                      <rect x="35" y="45" width="20" height="15"/>
                      <rect x="65" y="55" width="20" height="10"/>
                      <rect x="15" y="45" width="10" height="15"/>
                      <rect x="75" y="75" width="20" height="20"/>
                    </svg>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left border">
                    <div className="flex justify-between text-[11px] font-bold text-muted uppercase tracking-wide">
                      <span>AirDrop SSID:</span>
                      <span className="text-blue-700 font-extrabold">{hotspotSSID}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="flex justify-between text-[11px] font-bold text-muted uppercase tracking-wide">
                      <span>WPA2 Key:</span>
                      <span className="text-zinc-950 font-mono font-extrabold">exona-mesh</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={simulateIncomingConnection}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xs"
                    >
                      Mock Wireless Association
                    </button>
                    <button 
                      onClick={handleDisconnect}
                      className="py-2 text-[10px] text-muted hover:text-red-600 uppercase tracking-wider font-extrabold"
                    >
                      Disable Radio
                    </button>
                  </div>
                </motion.div>
              )}

              {connectionState === 'joining' && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white p-6 border border-gray-150 rounded-[2rem] text-center shadow-xs"
                >
                  {/* Radar simulator animation block */}
                  <div className="h-28 w-28 relative mx-auto mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-dashed border-blue-200 rounded-full animate-spin duration-3000" />
                    <div className="absolute h-20 w-20 border border-blue-300/40 rounded-full animate-ping" />
                    <div className="absolute h-14 w-14 border border-blue-400 rounded-full" />
                    
                    <div className="h-9 w-9 bg-blue-600 rounded-full flex items-center justify-center text-white z-10 shadow-md">
                      <Radio size={16} />
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-cyan-800 uppercase tracking-widest mb-1">Scanning Ad-Hoc Channels</h4>
                  <p className="text-[11px] text-muted mb-6">Listening for Exona Drop beacons on nearest frequencies...</p>

                  <div className="space-y-2 mb-6 text-left">
                    <p className="text-[10px] font-extrabold text-muted uppercase tracking-wider mb-2">Nearby Dropnodes</p>
                    {discoveredPeers.length === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                        <span className="text-xs text-muted font-bold animate-pulse">Searching SSID signals...</span>
                      </div>
                    ) : (
                      discoveredPeers.map(peer => (
                        <button
                          key={peer.id}
                          onClick={() => handleConnectToDiscoveredPeer(peer)}
                          className="w-full p-3 bg-white border border-gray-150 hover:border-blue-600 rounded-2xl flex items-center justify-between text-left group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-50 text-blue-600 font-extrabold text-xs rounded-lg flex items-center justify-center">
                              {peer.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-900">{peer.name}</p>
                              <p className="text-[9px] text-muted font-semibold uppercase tracking-wider">Wi-Fi • {peer.distance}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            Drop File
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <button 
                    onClick={handleDisconnect}
                    className="text-[10px] text-muted hover:text-red-600 uppercase tracking-wider font-extrabold"
                  >
                    Cease Discovery scan
                  </button>
                </motion.div>
              )}

              {/* Connected node readouts + speed dashboard */}
              {(connectionState.includes('connected_master') || connectionState.includes('connected_slave')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="bg-zinc-950 text-white p-6 rounded-[2rem] text-left border border-white/10 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-12 -mt-12" />
                    
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none mb-1 block">Throughput Rate</span>
                    <h3 className="text-3xl font-black text-white">{transferSpeed}</h3>
                    
                    <div className="h-px bg-white/10 my-4" />
                    
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {activePeerDevice === 'phone' ? <Smartphone size={16} className="text-blue-400" /> : <Laptop size={16} className="text-blue-400" />}
                        <div>
                          <p className="font-extrabold text-white leading-none">{activePeerName || 'Super Peer Node'}</p>
                          <p className="text-[9px] text-zinc-400 font-semibold tracking-wider uppercase mt-1">Exona Radio Drop Node</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PC browser file-sharing instruction card */}
            {showConnectPC && (
              <div className="p-6 bg-gradient-to-br from-blue-750 to-indigo-800 text-white rounded-[2rem] text-center shadow-lg transform translate-y-1 relative">
                <button 
                  onClick={() => setShowConnectPC(false)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white"
                >
                  <X size={16} />
                </button>
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                  <Laptop size={20} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest mb-1 text-white">Browser AirDrop Web Client</h4>
                <p className="text-[11px] text-white/80 leading-relaxed mb-4">Direct system-wide AirDrop to desktop computers, Linux machines or browser tools on same sub-network.</p>

                <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-left font-mono text-xs text-blue-300 space-y-1 select-all mb-4">
                  <p className="text-[8px] uppercase tracking-widest text-white/40 font-sans font-bold">Ad-hoc URL</p>
                  <p className="font-black text-white text-xs">http://exona-drop.local:3000</p>
                </div>

                <ol className="text-left text-[10px] text-white/70 font-semibold space-y-1 list-decimal pl-4">
                  <li>Keep target system on same school Wifi network or hotspots.</li>
                  <li>Type local URL above in Chrome, Safari, or Edge.</li>
                  <li>Perform wireless drops directly into this dashboard!</li>
                </ol>
              </div>
            )}

            {/* Transfer queue logs activity logs history */}
            <div className="bg-white border border-gray-150 p-6 rounded-[2rem] shadow-xs">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Active AirDrops</h4>
                <span className="text-[10px] font-bold bg-gray-100 text-zinc-650 px-2.5 py-1 rounded-md">
                  {transferHistory.length} drops
                </span>
              </div>

              {transferHistory.length === 0 ? (
                <div className="py-8 text-center text-muted text-xs font-semibold font-mono">
                  Listening for incoming drops...
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {transferHistory.map(log => {
                    const isCompleted = log.status === 'completed';
                    return (
                      <div key={log.id} className="text-left">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {log.direction === 'send' ? (
                              <Upload size={12} className="text-blue-600 shrink-0" />
                            ) : (
                              <Download size={12} className="text-blue-600 shrink-0" />
                            )}
                            <p className="font-bold text-zinc-800 truncate pr-4">{log.file.name}</p>
                          </div>
                          <span className={`text-[10px] font-bold ${isCompleted ? 'text-green-600 animate-pulse' : 'text-zinc-500'}`}>
                            {isCompleted ? 'Accepted ✓' : log.speed}
                          </span>
                        </div>

                        {/* Progress line */}
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                          <div 
                            className={`h-full transition-all duration-300 ${log.direction === 'send' ? 'bg-blue-600' : 'bg-blue-600'}`}
                            style={{ width: `${log.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted font-semibold uppercase mt-1">
                          <span>{log.progress}% transacted</span>
                          <span>{log.file.size}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

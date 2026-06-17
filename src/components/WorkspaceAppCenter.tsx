import React, { useState } from 'react';
import { 
  Search, Plus, ArrowLeft, Star, Grid as GridIcon, Check, HelpCircle, Laptop, Smartphone,
  Shield, Play, Heart, CloudLightning, RefreshCw, Layers, Sparkles, AlertCircle, ShoppingBag, 
  Trash2, Sliders, Code, Eye, ExternalLink, Settings, Download, Info, ArrowRight, Bell,
  FileText, PenTool, FileJson, Radio, HardDrive, BadgeCheck, Video, HelpCircle as QuestionIcon,
  Upload, Image as ImageIcon, User, Gamepad2
} from 'lucide-react';
import { db, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Help map icon string to actual Lucide component dynamically
export const getAppIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileText': return FileText;
    case 'PenTool': return PenTool;
    case 'FileJson': return FileJson;
    case 'Radio': return Radio;
    case 'HardDrive': return HardDrive;
    case 'BadgeCheck': return BadgeCheck;
    case 'Video': return Video;
    case 'Code': return Code;
    case 'ShoppingBag': return ShoppingBag;
    case 'Sparkles': return Sparkles;
    case 'Laptop': return Laptop;
    case 'Smartphone': return Smartphone;
    case 'Shield': return Shield;
    case 'Settings': return Settings;
    case 'Heart': return Heart;
    case 'Gamepad2': return Gamepad2;
    default: return GridIcon;
  }
};

export interface AppCenterItem {
  id: string;
  name: string;
  description: string;
  category: 'Productivity' | 'Media & Creative' | 'Assessment' | 'Utility' | 'Custom';
  iconName: string;
  color: string;
  rating: string;
  reviews: number;
  creator: string;
  isDefault: boolean;
  isCustom?: boolean;
  version: string;
  size: string;
  featuresList?: string[];
  appUrl?: string;
  iconUrl?: string;
}

interface WorkspaceAppCenterProps {
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  enabledAppIds: string[];
  setEnabledAppIds: (ids: string[]) => void;
  customApps: AppCenterItem[];
  setCustomApps: (apps: AppCenterItem[]) => void;
  onLaunchApp: (id: string) => void;
}

export default function WorkspaceAppCenter({
  onClose,
  showNotification,
  enabledAppIds,
  setEnabledAppIds,
  customApps,
  setCustomApps,
  onLaunchApp
}: WorkspaceAppCenterProps) {
  // We use active tabs matching the exact Google Play UI:
  // - games: Battle assessments & interactive quiz apps
  // - apps: Productivity suite, utility launchers, and custom URL apps
  // - search: Comprehensive Google Play search tool
  // - you: User's Developer Publisher Console & Active Layout Switches
  const [activeTab, setActiveTab] = useState<'games' | 'apps' | 'search' | 'you'>('apps');
  const [subTab, setSubTab] = useState<'foryou' | 'topcharts' | 'education' | 'categories'>('foryou');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedApp, setSelectedApp] = useState<AppCenterItem | null>(null);

  // Custom App Form States
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [newAppIconUrl, setNewAppIconUrl] = useState('');
  const [newAppCat, setNewAppCat] = useState<'Productivity' | 'Media & Creative' | 'Assessment' | 'Utility' | 'Custom'>('Productivity');
  const [newAppIcon, setNewAppIcon] = useState('Code');
  const [newAppColor, setNewAppColor] = useState('blue-600');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const handleIconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file', 'error');
      return;
    }

    try {
      setIsUploadingIcon(true);
      showNotification('Uploading custom app icon...', 'info');
      
      const fileId = `app_icon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const fileRef = ref(storage, `workspace_custom_apps_icons/${fileId}.jpg`);
      
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setNewAppIconUrl(downloadURL);
      showNotification('Custom app icon uploaded successfully!', 'success');
    } catch (error: any) {
      console.error('Icon upload failure:', error);
      showNotification(error.message || 'Failed to upload custom icon.', 'error');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  // Static Library of Default Catalog Apps
  const defaultCatalogApps: AppCenterItem[] = [
    { 
      id: 'docs', 
      name: 'Document Hub', 
      description: 'Central base to list, preview, download, and manage your school documents & reports.', 
      iconName: 'FileText', 
      category: 'Productivity', 
      color: 'blue-600', 
      rating: '4.8', 
      reviews: 145, 
      creator: 'Exona Cloud Platform',
      isDefault: true,
      version: 'v2.1.0',
      size: '1.4 MB',
      featuresList: ['Live PDF Preview', 'Offline Cache Sync', 'Markdown Render Parser', 'Immediate Print Formatting']
    },
    { 
      id: 'editor', 
      name: 'Creative Editor', 
      description: 'Powerful editor for technical writing with free trial and template tools.', 
      iconName: 'PenTool', 
      category: 'Media & Creative', 
      color: 'purple-600', 
      rating: '4.9', 
      reviews: 218, 
      creator: 'Exonasoft Creative Hub',
      isDefault: true,
      version: 'v3.5.4',
      size: '2.8 MB',
      featuresList: ['Pro Template Auto Generation', 'Smart AI Copywriting Prompts', 'Markdown Export Engine', 'Real-time Character Counter']
    },
    { 
      id: 'pdf', 
      name: 'PDF Studio', 
      description: 'Advanced PDF tools for conversion, compression, and signing.', 
      iconName: 'FileJson', 
      category: 'Productivity', 
      color: 'red-600', 
      rating: '4.7', 
      reviews: 92, 
      creator: 'Apex Systems',
      isDefault: true,
      version: 'v1.2.0',
      size: '3.1 MB',
      featuresList: ['E-Signatures Overlay', 'Fast PDF Client Compilation', 'Encrypted Meta Strip', 'Custom Banner Imposer']
    },
    { 
      id: 'file-share', 
      name: 'Exona Drop', 
      description: 'Exchange files, photos, music, and apps locally at lightning hardware speeds using secure offline ad-hoc wireless links.', 
      iconName: 'Radio', 
      category: 'Utility', 
      color: 'blue-600', 
      rating: '5.0', 
      reviews: 341, 
      creator: 'Exona Local Mesh',
      isDefault: true,
      version: 'v4.0.2',
      size: '850 KB',
      featuresList: ['Ad-Hoc Wireless SSID Broadcast', 'Peer Discovery Radar', 'Zero-Server Privacy Transmission', 'Universal Mobile Transfer QR Core']
    },
    { 
      id: 'storage', 
      name: 'Cloud Storage', 
      description: 'Secure cloud storage for your institution\'s important assets.', 
      iconName: 'HardDrive', 
      category: 'Utility', 
      color: 'emerald-600', 
      rating: '4.6', 
      reviews: 74, 
      creator: 'Exona Data Services',
      isDefault: true,
      version: 'v1.4.1',
      size: '4.5 MB',
      featuresList: ['End-to-End Encrypted Folder Nodes', 'Multi-format File Categorizer', 'Single-Click Asset Delete', 'High Bandwidth Streaming']
    },
    { 
      id: 'e-test', 
      name: 'E-Test Portal', 
      description: 'Conduct and manage electronic tests for students and staff with real-time tracking.', 
      iconName: 'BadgeCheck', 
      category: 'Assessment', 
      color: 'indigo-600', 
      rating: '4.7', 
      reviews: 106, 
      creator: 'Apex Assessment Labs',
      isDefault: true,
      version: 'v2.0.0',
      size: '1.9 MB',
      featuresList: ['Real-time Timer Constraints', 'Comprehensive Result Analytics Builder', 'Auto-Grade Key Formulas', 'Dynamic Subject Selector']
    }
  ];

  // Combine defaults and custom apps
  const allAvailableApps = [...defaultCatalogApps, ...customApps];

  // Filter apps based on active tabs, search and subTabs criteria
  const getCategorizedApps = () => {
    let list = [...allAvailableApps];

    // Filter by high-level navigation tabs
    if (activeTab === 'games') {
      // In Google Play Games Tab, show brain quiz and gamified portal apps (Assessment & Creative)
      list = list.filter(app => app.category === 'Assessment' || app.category === 'Media & Creative' || app.id === 'e-test');
    } else if (activeTab === 'apps') {
      // General applications tab
      list = list.filter(app => app.id !== 'e-test');
    } else if (activeTab === 'search') {
      // Simple search query match
      if (searchQuery.trim()) {
        list = list.filter(app => 
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    // Filter by categories dropdown/filters if active
    if (selectedCategory !== 'All') {
      list = list.filter(app => app.category === selectedCategory);
    }

    // Filter by Sub navigation bar selections
    if (subTab === 'topcharts') {
      // Sort descending by rating score
      list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (subTab === 'education') {
      // Only educational productivity
      list = list.filter(app => app.category === 'Assessment' || app.category === 'Productivity');
    }

    return list;
  };

  const currentAppsList = getCategorizedApps();

  // Toggle install / activation inside workspace
  const handleToggleAppActivation = (appId: string) => {
    if (appId === 'docs-placeholder-app-center') return; 

    if (enabledAppIds.includes(appId)) {
      const updated = enabledAppIds.filter(id => id !== appId);
      setEnabledAppIds(updated);
      showNotification(`Deactivated and removed from main Workspace panel.`, 'info');
    } else {
      const updated = [...enabledAppIds, appId];
      setEnabledAppIds(updated);
      showNotification(`Activated successfully! App added to Workspace panel.`, 'success');
    }
  };

  // Register modern Custom app to play store (registers on Firestore so all users see it!)
  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) {
      showNotification('Please enter an app name', 'error');
      return;
    }

    let sanitizedUrl = newAppUrl.trim();
    if (sanitizedUrl && !/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    const newId = `custom-app-${Date.now()}`;
    const newApp: AppCenterItem = {
      id: newId,
      name: newAppName,
      description: newAppDesc || 'Custom published application live portal.',
      category: newAppCat,
      iconName: newAppIcon,
      color: newAppColor,
      rating: (4.5 + Math.random() * 0.5).toFixed(1), // Realistic high rating
      reviews: Math.floor(Math.random() * 40) + 15,
      creator: 'Workspace Publisher',
      isDefault: false,
      isCustom: true,
      version: sanitizedUrl ? 'v1.0.0 (Live Live URL Link)' : 'v1.0.0 (Blueprint Specification)',
      size: sanitizedUrl ? 'Direct' : '120 KB',
      featuresList: sanitizedUrl 
        ? ['Instantly launches immersive live portal', 'Fully embedded sandbox iframe browser support', 'Real-time synchronization across devices']
        : ['Designed component mockup specification', 'Aesthetic theme customization ready', 'Dynamic interactive form ready'],
      appUrl: sanitizedUrl || undefined,
      iconUrl: newAppIconUrl.trim() || undefined
    };

    const updatedCatalog = [...customApps, newApp];
    setCustomApps(updatedCatalog);
    localStorage.setItem('exonasoft_custom_workspace_apps', JSON.stringify(updatedCatalog));
    
    // Upload to shared Firestore instantly for all active users
    try {
      setDoc(doc(db, 'workspaceCustomApps', newId), {
        ...newApp,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Firestore save failed:', err));
    } catch (e) {
      console.error(e);
    }
    
    // Auto active
    setEnabledAppIds([...enabledAppIds, newId]);

    // Reset Form
    setNewAppName('');
    setNewAppDesc('');
    setNewAppUrl('');
    setNewAppIconUrl('');
    setNewAppIcon('Code');
    setNewAppColor('blue-600');
    setActiveTab('apps');
    showNotification(`Successfully published "${newAppName}" shortcut to Workspace Play Store!`, 'success');
  };

  // Delete custom apps
  const handleDeleteCustomApp = async (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this custom app? This will remove it for all users.');
    if (!confirmed) return;

    const updatedCustoms = customApps.filter(app => app.id !== appId);
    setCustomApps(updatedCustoms);
    localStorage.setItem('exonasoft_custom_workspace_apps', JSON.stringify(updatedCustoms));

    // Delete Firestore instance
    try {
      await deleteDoc(doc(db, 'workspaceCustomApps', appId));
    } catch (fsErr) {
      console.error('Failed to delete from Firestore:', fsErr);
    }

    const updatedEnabled = enabledAppIds.filter(id => id !== appId);
    setEnabledAppIds(updatedEnabled);
    showNotification('Removed custom app.', 'info');
  };

  // Preset Template deployment shortcuts
  const quickTemplateApps = [
    { name: 'Student Information System', desc: 'Manage official enrollment databases, student rosters, and records.', cat: 'Productivity', icon: 'Laptop', color: 'indigo-600' },
    { name: 'Tuition Fee Registry', desc: 'Invoices, transaction logging, and payment receipt verifications.', cat: 'Utility', icon: 'Shield', color: 'emerald-600' },
    { name: 'Attendance Sheet Pro', desc: 'Log and audit class engagement with real-time analytics graphs.', cat: 'Assessment', icon: 'BadgeCheck', color: 'blue-600' },
    { name: 'Library Catalog Tracker', desc: 'Browse available textbooks, check-out statuses, and due date calculators.', cat: 'Productivity', icon: 'FileText', color: 'purple-600' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      
      {/* Google Play Styled Brand Header (Search / Notification / Profile) */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 shrink-0 shadow-xs z-20">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          
          {/* Brand Logo (Google Play Style) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="h-9 w-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 transition-colors shadow-2xs mr-1"
              title="Return to active Workspace"
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="text-zinc-600" />
            </button>
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="h-9 w-9 bg-gradient-to-tr from-[#ea4335] via-[#fbbc05] to-[#34a853] rounded-xl flex items-center justify-center text-white shadow-xs rotate-6 group-hover:rotate-0 transition-transform duration-300">
                <Play fill="currentColor" size={17} className="ml-0.5 text-white/95" />
              </div>
              <span className="text-lg font-black font-sans tracking-tight text-zinc-900">
                Workspace <span className="text-blue-600 font-bold font-sans">Play</span>
              </span>
            </div>
          </div>

          {/* Right Action Items (Search quick access, Bell, Avatar picture) */}
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => setActiveTab('search')}
              className={`p-2 rounded-full transition-all cursor-pointer ${activeTab === 'search' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-zinc-500'}`}
              title="Search store apps"
            >
              <Search size={18} strokeWidth={2.2} />
            </button>

            <button className="p-2 hover:bg-gray-100 text-zinc-500 rounded-full relative cursor-pointer" title="Notifications">
              <Bell size={18} strokeWidth={2.2} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div 
              onClick={() => setActiveTab('you')}
              className="h-9 w-9 rounded-full border border-gray-150 overflow-hidden shadow-2xs ring-2 ring-blue-500/10 cursor-pointer hover:ring-blue-500/45 transition-all"
              title="Open Publisher Console"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                className="h-full w-full object-cover" 
                alt="Developer Avatar"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Material Underline Tab Sub-Navigation (For You, Charts, Children, Categories) */}
        {(activeTab === 'apps' || activeTab === 'games') && (
          <div className="flex gap-7 mt-4 border-b border-gray-100 text-xs font-extrabold uppercase tracking-widest leading-none max-w-5xl mx-auto overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setSubTab('foryou'); setSelectedCategory('All'); }}
              className={`pb-3 transition-colors relative whitespace-nowrap cursor-pointer ${
                subTab === 'foryou' && selectedCategory === 'All' ? 'text-blue-600 font-black' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              For you
              {subTab === 'foryou' && selectedCategory === 'All' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>

            <button
              onClick={() => setSubTab('topcharts')}
              className={`pb-3 transition-colors relative whitespace-nowrap cursor-pointer ${
                subTab === 'topcharts' ? 'text-blue-600 font-black' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Top charts
              {subTab === 'topcharts' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>

            <button
              onClick={() => setSubTab('education')}
              className={`pb-3 transition-colors relative whitespace-nowrap cursor-pointer ${
                subTab === 'education' ? 'text-blue-600 font-black' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Children
              {subTab === 'education' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>

            {/* Quick dropdown filters representing Categories tab */}
            <div className="relative pb-3 text-zinc-500 whitespace-nowrap">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSubTab('foryou');
                }}
                className={`bg-transparent text-xs font-extrabold cursor-pointer border-none outline-none pr-2 focus:ring-0 uppercase tracking-widest ${
                  selectedCategory !== 'All' ? 'text-blue-600 font-black' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <option value="All">Categories</option>
                <option value="Productivity">Productivity</option>
                <option value="Media & Creative">Media & Creative</option>
                <option value="Assessment">Assessment</option>
                <option value="Utility">Utility</option>
                <option value="Custom">Custom Concepts</option>
              </select>
              {selectedCategory !== 'All' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </div>
          </div>
        )}
      </div>

      {/* Main Material Scroll Content columns */}
      <div className="flex-1 overflow-y-auto pb-24 bg-white text-left">
        <div className="max-w-5xl mx-auto px-5 py-6">

          {/* ----------------- TAB: APPS ----------------- */}
          {activeTab === 'apps' && (
            <div className="space-y-8 animate-fade-in-up">
              
              {/* editorial highlight Carousel Banner */}
              <div 
                className="relative h-60 md:h-72 rounded-[2rem] overflow-hidden shadow-xs cursor-pointer group"
                onClick={() => {
                  // Pre-select creative editor as a demonstration
                  const featureApp = allAvailableApps.find(a => a.id === 'editor') || allAvailableApps[0];
                  if (featureApp) setSelectedApp(featureApp);
                }}
              >
                {/* Beautiful Unsplash Sunset Background */}
                <img 
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80" 
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-102 transition-transform duration-700" 
                  alt="Featured banner sunset"
                  referrerPolicy="no-referrer"
                />
                {/* Dark rich gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Information text content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white text-left">
                  <span className="text-[10px] bg-purple-600/90 text-white font-black px-3 py-1 rounded-full uppercase tracking-wider leading-none block w-max mb-2.5">
                    Essentials
                  </span>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight max-w-2xl">
                    Transform your school workspace with robust AI tools
                  </h2>
                  <p className="text-zinc-300 text-xs mt-1.5 leading-relaxed font-bold max-w-lg">
                    Compile templates, manage institution databases, copywrite with smart prompts, or add secure custom link apps.
                  </p>
                </div>
              </div>

              {/* SECTION: Recommended for you (Horizontal Squircle Scrolling) */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-zinc-900 font-sans tracking-tight">Recommended for you</h3>
                  <button className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-center text-zinc-700">
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-100 scrollbar-track-transparent">
                  {currentAppsList.map(app => {
                    const AppIcon = getAppIcon(app.iconName);
                    const isAdded = enabledAppIds.includes(app.id);

                    return (
                      <div 
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="w-28 md:w-32 shrink-0 group cursor-pointer text-left"
                      >
                        {/* Squircle container housing app icon */}
                        <div className="h-28 w-28 md:h-32 md:w-32 bg-gray-50 border border-gray-150 rounded-[2.2rem] flex items-center justify-center shadow-2xs group-hover:shadow-md transition-all duration-300 relative overflow-hidden mb-2.5">
                          {app.iconUrl ? (
                            <img src={app.iconUrl} className="h-full w-full object-cover rounded-[2.2rem]" alt={app.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`h-14 w-14 bg-gradient-to-tr from-${app.color.split('-')[0] || 'blue'}-100 to-white text-${app.color} rounded-2xl flex items-center justify-center border shadow-xs`}>
                              <AppIcon size={26} strokeWidth={2.2} />
                            </div>
                          )}
                          
                          {/* Active state overlay badge */}
                          {isAdded && (
                            <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                        </div>

                        <h4 className="text-[12px] font-extrabold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-tight">
                          {app.name}
                        </h4>
                        <p className="text-[11px] font-bold text-zinc-400 mt-0.5 line-clamp-1">
                          {app.creator}
                        </p>
                        <div className="flex items-center gap-0.5 text-[11px] font-extrabold text-amber-500 mt-0.5">
                          <span>{app.rating}</span>
                          <Star size={10} fill="currentColor" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Workspace Custom Link Shortcuts (Real Shared Apps) */}
              {customApps.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-zinc-900 font-sans tracking-tight">Shared Portal Shortcuts</h3>
                    <button className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-center text-zinc-700">
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customApps.map(app => {
                      const isAdded = enabledAppIds.includes(app.id);
                      return (
                        <div 
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className="bg-white border border-gray-150 p-4 rounded-3xl flex justify-between items-center hover:border-blue-400 hover:shadow-2xs transition-all text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-4 truncate">
                            <div className="h-14 w-14 rounded-2xl overflow-hidden shrink-0 border bg-zinc-50">
                              {app.iconUrl ? (
                                <img src={app.iconUrl} className="h-full w-full object-cover" alt={app.name} referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-blue-600 bg-blue-50">
                                  {React.createElement(getAppIcon(app.iconName), { size: 24 })}
                                </div>
                              )}
                            </div>
                            <div className="truncate pr-2">
                              <h4 className="font-extrabold text-zinc-900 text-xs flex items-center gap-1.5 leading-tight mb-1 truncate">
                                {app.name}
                              </h4>
                              <p className="text-[11px] text-zinc-500 font-medium leading-normal line-clamp-1 truncate">{app.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md">Live App</span>
                                <span className="text-[11px] font-extrabold text-[#fbbc05] flex items-center gap-0.5">
                                  {app.rating} <Star size={10} fill="currentColor" />
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAppActivation(app.id);
                            }}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                              isAdded 
                                ? 'bg-emerald-500 text-white hover:bg-rose-500' 
                                : 'bg-gray-100 text-zinc-800 hover:bg-gray-200'
                            }`}
                          >
                            {isAdded ? 'Active' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Productivity Suite List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-zinc-900 font-sans tracking-tight">Communication & Productivity</h3>
                  <button className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-center text-zinc-700">
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="bg-gray-50/50 border border-gray-150 rounded-[2.5rem] divide-y divide-gray-100 overflow-hidden shadow-2xs">
                  {defaultCatalogApps.map(app => {
                    const AppIcon = getAppIcon(app.iconName);
                    const isAdded = enabledAppIds.includes(app.id);

                    return (
                      <div 
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-100/50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 bg-white text-${app.color} rounded-2xl flex items-center justify-center border shadow-3xs shrink-0`}>
                            <AppIcon size={22} strokeWidth={2.2} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-zinc-1000 text-sm flex items-center gap-1.5">
                              {app.name}
                              {app.isDefault && (
                                <span className="text-[8px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase font-sans">Google Workspace</span>
                              )}
                            </h4>
                            <p className="text-xs text-zinc-500 font-bold leading-relaxed max-w-lg mt-0.5">{app.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                          <div className="text-right hidden sm:block pr-1">
                            <span className="text-[10px] text-zinc-400 font-bold block">{app.size}</span>
                            <span className="text-[11px] font-black text-amber-500 flex items-center gap-0.5">
                              {app.rating} <Star size={10} fill="currentColor" />
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isAdded}
                              onChange={() => handleToggleAppActivation(app.id)}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deployment Blueprints Section */}
              <div className="bg-linear-to-tr from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-indigo-100/50 p-8 rounded-[3rem] text-left">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-md shrink-0">
                    <CloudLightning size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 leading-tight">Instant Deployment Suggestions</h3>
                    <p className="text-xs text-zinc-500 font-bold leading-relaxed mt-1">One-click compile any pre-programmed blueprint draft and see it appear live in your active Workspace dashboard tabs!</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickTemplateApps.map(tpl => {
                    const isAlreadyCustomCreated = customApps.some(app => app.name === tpl.name);
                    
                    return (
                      <div 
                        key={tpl.name}
                        className="bg-white border border-gray-150 p-5 rounded-3xl flex justify-between items-center hover:border-indigo-400 hover:shadow-2xs transition-all text-left"
                      >
                        <div className="pr-4">
                          <h4 className="font-extrabold text-zinc-900 text-xs flex items-center gap-1.5 leading-tight mb-1">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            {tpl.name}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-medium leading-normal">{tpl.desc}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (isAlreadyCustomCreated) {
                              showNotification(`App is already deployed in workspace!`, 'info');
                              return;
                            }
                            const tplId = `tpl-${Date.now()}`;
                            const newApp: AppCenterItem = {
                              id: tplId,
                              name: tpl.name,
                              description: tpl.desc,
                              category: tpl.cat as any,
                              iconName: tpl.icon,
                              color: tpl.color,
                              rating: '4.8',
                              reviews: 14,
                              creator: 'Admin Auto-Draft',
                              isDefault: false,
                              isCustom: true,
                              version: 'v1.0.0 Blueprint',
                              size: '340 KB',
                              featuresList: ['Autogenerated specifications', 'Playground simulation panel', 'Dynamic dashboard mockup info']
                            };

                            const updated = [...customApps, newApp];
                            setCustomApps(updated);
                            localStorage.setItem('exonasoft_custom_workspace_apps', JSON.stringify(updated));
                            setEnabledAppIds([...enabledAppIds, tplId]);
                            showNotification(`Deployed ${tpl.name} template into active workspace!`, 'success');
                          }}
                          disabled={isAlreadyCustomCreated}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                            isAlreadyCustomCreated 
                              ? 'bg-gray-100 text-zinc-400 cursor-not-allowed' 
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {isAlreadyCustomCreated ? 'Deployed' : 'Deploy Draft'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------- TAB: GAMES ----------------- */}
          {activeTab === 'games' && (
            <div className="space-y-8 animate-fade-in-up">
              
              {/* Games Tab Hero Banner banner info */}
              <div 
                className="relative h-60 md:h-72 rounded-[2rem] overflow-hidden shadow-xs cursor-pointer group animate-fade-in"
                onClick={() => {
                  const gameApp = allAvailableApps.find(a => a.id === 'e-test') || allAvailableApps[0];
                  if (gameApp) setSelectedApp(gameApp);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80" 
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-102 transition-transform duration-700" 
                  alt="Games highlight"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white text-left">
                  <span className="text-[10px] bg-emerald-600 font-black px-3 py-1 rounded-full uppercase tracking-wider leading-none block w-max mb-2.5">
                    Brain Arena Online
                  </span>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight max-w-2xl">
                    Challenge peers in live speed assessments & brain battles
                  </h2>
                  <p className="text-zinc-300 text-xs mt-1.5 leading-relaxed font-bold max-w-lg">
                    Answer real-time evaluation matrices and track dynamic subject leaderboard listings!
                  </p>
                </div>
              </div>

              {/* ROW RECENT GAMES  */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-zinc-900 font-sans tracking-tight">Trending Educational Games</h3>
                  <button className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-center text-zinc-700">
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-100 scrollbar-track-transparent">
                  {currentAppsList.map(app => {
                    const AppIcon = getAppIcon(app.iconName);
                    const isAdded = enabledAppIds.includes(app.id);

                    return (
                      <div 
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="w-28 md:w-32 shrink-0 group cursor-pointer text-left font-sans"
                      >
                        <div className="h-28 w-28 md:h-32 md:w-32 bg-zinc-50 border border-gray-150 rounded-[2.2rem] flex items-center justify-center shadow-2xs group-hover:shadow-md transition-all duration-300 relative overflow-hidden mb-2.5">
                          {app.iconUrl ? (
                            <img src={app.iconUrl} className="h-full w-full object-cover rounded-[2.2rem]" alt={app.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border shadow-xs">
                              <AppIcon size={26} strokeWidth={2.2} />
                            </div>
                          )}
                          {isAdded && (
                            <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                        </div>

                        <h4 className="text-[12px] font-extrabold text-zinc-900 group-hover:text-amber-500 transition-colors line-clamp-1 leading-tight">
                          {app.name}
                        </h4>
                        <p className="text-[11px] font-bold text-zinc-400 mt-0.5 line-clamp-1">
                          {app.creator}
                        </p>
                        <div className="flex items-center gap-0.5 text-[11px] font-extrabold text-amber-500 mt-0.5">
                          <span>{app.rating}</span>
                          <Star size={10} fill="currentColor" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LEADERBOARDS COLUMN RANK */}
              <div>
                <h3 className="text-lg font-black text-zinc-900 font-sans tracking-tight mb-4 text-left">Top Leaderboard Assessments</h3>
                <div className="space-y-4">
                  {currentAppsList.slice(0, 3).map((app, idx) => {
                    const AppIcon = getAppIcon(app.iconName);
                    return (
                      <div 
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="bg-white border rounded-3xl p-4 flex items-center justify-between hover:border-blue-400 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-black text-zinc-400 w-6 text-center">{idx + 1}</span>
                          <div className="h-12 w-12 rounded-xl border overflow-hidden shrink-0">
                            {app.iconUrl ? (
                              <img src={app.iconUrl} className="h-full w-full object-cover" alt="icon" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-50 text-zinc-600">
                                <AppIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-zinc-900 text-xs leading-none">{app.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase">{app.creator}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-amber-500 flex items-center gap-0.5 justify-end">
                            {app.rating} <Star size={10} fill="currentColor" />
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">{app.reviews} reviews</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------- TAB: SEARCH ----------------- */}
          {activeTab === 'search' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Play Store Styled Clean Centered Floating Search Bar */}
              <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-150 shadow-3xs max-w-3xl mx-auto">
                <div className="relative">
                  <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search apps, utilities, and live portal shortcuts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-13 pr-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                </div>

                {/* Popular Keywords suggestions */}
                <div className="mt-4 flex flex-wrap gap-2 items-center text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider mr-1 text-[10px]">Trending:</span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'docs', label: 'Document' },
                    { id: 'ai', label: 'AI Copywriter' },
                    { id: 'pdf', label: 'PDF Converter' },
                    { id: 'portal', label: 'SaaS Client' },
                    { id: 'mesh', label: 'Local Drop' },
                  ].map(keyword => (
                    <button
                      key={keyword.id}
                      onClick={() => {
                        setSearchQuery(keyword.id === 'all' ? '' : keyword.label);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/10 rounded-full font-bold text-xs text-zinc-650 tracking-wide transition-colors cursor-pointer"
                    >
                      {keyword.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH RESULTS LIST */}
              <div>
                <h3 className="text-base font-black text-zinc-900 mb-4 max-w-3xl mx-auto text-left">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Explore All Store Applications'}
                </h3>

                {currentAppsList.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-gray-150 rounded-[2.5rem] p-10 max-w-3xl mx-auto">
                    <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border text-zinc-400">
                      <AlertCircle size={28} />
                    </div>
                    <h3 className="text-lg font-black text-zinc-800 mb-1">No matching applications found</h3>
                    <p className="text-xs text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                      We couldn't locate any apps matching your query. Verify you spelled the app name correctly or draft a custom bookmark shortcut on the "You" tab!
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border rounded-[2.5rem] divide-y max-w-3xl mx-auto overflow-hidden">
                    {currentAppsList.map(app => {
                      const isAdded = enabledAppIds.includes(app.id);
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => setSelectedApp(app)}
                          className="p-5 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                              {app.iconUrl ? (
                                <img src={app.iconUrl} className="h-full w-full object-cover" alt={app.name} referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`text-${app.color.split('-')[0] || 'blue'}-600`}>
                                  {React.createElement(getAppIcon(app.iconName), { size: 24 })}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-zinc-900 text-sm">{app.name}</h4>
                              <p className="text-xs text-zinc-400 font-medium mt-0.5">{app.creator} • {app.category}</p>
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-500 mt-0.5">
                                <span>{app.rating}</span>
                                <Star size={10} fill="currentColor" />
                                <span className="text-zinc-300">•</span>
                                <span className="text-zinc-400 font-medium">{app.size}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAppActivation(app.id);
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isAdded 
                                ? 'bg-emerald-500 text-white hover:bg-rose-500' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isAdded ? 'Added' : 'Get'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ----------------- TAB: YOU (DEVELOPER PUBLISHER CONSOLE) ----------------- */}
          {activeTab === 'you' && (
            <div className="space-y-8 animate-fade-in-up">
              
              {/* User Developer Portfolio Card */}
              <div className="bg-gradient-to-r from-zinc-900 to-blue-950 text-white rounded-[2.5rem] p-6 text-left relative overflow-hidden shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl -mr-24 pointer-events-none" />
                
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-3xl overflow-hidden shadow-lg border-2 border-white/10 shrink-0">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                      className="h-full w-full object-cover" 
                      alt="Developer profile"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-1.5">
                      Personal Developer Console
                      <Shield size={16} className="text-blue-400 fill-blue-400/20" />
                    </h2>
                    <p className="text-xs text-zinc-300 font-bold mt-1 max-w-sm">
                      Admin ID: dev-user-1714 • Syncing web credentials real-time with Google Cloud/Firestore database.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-600/90 text-white font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                    Verified Publisher
                  </span>
                  <button 
                    onClick={() => {
                      setEnabledAppIds(defaultCatalogApps.map(a => a.id));
                      showNotification('Restored to default workspace layout features', 'info');
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Reset Layout
                  </button>
                </div>
              </div>

              {/* TWO GRID: PUBLISH NEW APP & ENABLED MANAGER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Form to Publish New App (Direct URL and image upload) */}
                <div className="lg:col-span-12 xl:col-span-7 bg-white p-6 md:p-8 border border-gray-150 rounded-[2.5rem] shadow-sm text-left">
                  <div className="flex items-center gap-3.5 mb-6 border-b pb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Plus size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 leading-none">Publish Shortcut to App Store</h3>
                      <p className="text-[11px] text-zinc-500 font-semibold mt-1 leading-relaxed">
                        Input external SaaS dashboards, links, Google sheets, or custom apps. Upload an image to displays as a home-screen style app icon!
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCustomApp} className="space-y-4 font-bold text-zinc-700 text-xs">
                    
                    {/* Title */}
                    <div className="space-y-1.5 focus-within:text-blue-605">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Application Name</label>
                      <input
                        type="text"
                        required
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="e.g. Student Attendance Registry"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-10 ring-inset transition-all"
                      />
                    </div>

                    {/* App URL target */}
                    <div className="space-y-1.5 focus-within:text-blue-605">
                      <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center justify-between">
                        <span>Live Target Application Link / Web URL</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAppUrl}
                        onChange={(e) => setNewAppUrl(e.target.value)}
                        placeholder="e.g. https://www.google.com, https://canvas.lms"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-10 ring-inset transition-all"
                      />
                    </div>

                    {/* Image Drag and Drop / File Uploader */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center justify-between">
                        <span>Launcher Silhouette App Icon / Custom Image URL</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={newAppIconUrl}
                            onChange={(e) => setNewAppIconUrl(e.target.value)}
                            placeholder="Paste direct .png/.jpg link or upload ->"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="h-full min-h-[42px] px-4 py-2 bg-zinc-50 border border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/15 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
                            <Upload size={14} className={isUploadingIcon ? "animate-spin text-blue-500" : "text-zinc-500"} />
                            <span className="text-[10px] font-black text-zinc-650 uppercase tracking-wider">
                              {isUploadingIcon ? 'Sending...' : 'Upload Image'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleIconFileUpload}
                              disabled={isUploadingIcon}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-medium normal-case">
                        Browser screens, sandboxes, and workspace links will use this target image as the launcher icon.
                      </p>
                    </div>

                    {/* Description Area */}
                    <div className="space-y-1.5 focus-within:text-blue-605">
                      <label className="text-[10px] font-black uppercase text-zinc-400 font-sans">App Specs / Description Details</label>
                      <textarea
                        required
                        value={newAppDesc}
                        onChange={(e) => setNewAppDesc(e.target.value)}
                        rows={2}
                        placeholder="Explain features, usage specifications, and institution scopes..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none leading-relaxed transition-all"
                      />
                    </div>

                    {/* Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Store Category</label>
                        <select
                          value={newAppCat}
                          onChange={(e) => setNewAppCat(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-150 rounded-xl font-bold text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="Productivity">Productivity</option>
                          <option value="Media & Creative">Media & Creative</option>
                          <option value="Assessment">Assessment</option>
                          <option value="Utility">Utility</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Color Aesthetic</label>
                        <select
                          value={newAppColor}
                          onChange={(e) => setNewAppColor(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-150 rounded-xl font-bold text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="blue-600">Sky Blue</option>
                          <option value="purple-600">Aubergine Purple</option>
                          <option value="emerald-600">Emerald Green</option>
                          <option value="rose-600">Fierce Red</option>
                          <option value="indigo-600">Neon Indigo</option>
                        </select>
                      </div>
                    </div>

                    {/* Big submit */}
                    <button
                      type="submit"
                      className="w-full py-4 bg-blue-600 hover:bg-blue-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Integrate & Share to All Users
                    </button>
                  </form>
                </div>

                {/* Previews and custom deletion lists column */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-6 text-left">
                  
                  {/* Dynamic Interactive Icon Preview Card */}
                  <div className="bg-white p-6 border border-gray-150 rounded-[2.5rem] shadow-sm">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-4">Silhouette Icon Preview</p>
                    
                    <div className="bg-zinc-50 border p-5 rounded-3xl text-left relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-2 h-full bg-${newAppColor.split('-')[0]}-600`} />
                      
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className={`h-14 w-14 border rounded-[1.6rem] bg-white flex items-center justify-center shrink-0 shadow-3xs overflow-hidden`}>
                          {newAppIconUrl ? (
                            <img src={newAppIconUrl} className="h-full w-full object-cover" alt="Preview App Icon" referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`text-${newAppColor.split('-')[0] || 'blue'}-600`}>
                              {React.createElement(getAppIcon(newAppIcon), { size: 28 })}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-white border px-2.5 py-0.5 rounded-lg text-zinc-500">
                          {newAppCat}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-zinc-950 text-sm leading-tight truncate">
                        {newAppName || 'Specify Name'}
                      </h4>
                      {newAppUrl && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md inline-block max-w-full font-mono truncate mt-1">
                          target_link: {newAppUrl}
                        </span>
                      )}
                      
                      <p className="text-xs text-zinc-500 leading-normal font-bold mt-2.5 leading-relaxed line-clamp-3">
                        {newAppDesc || 'Describe your brand web tool. You will instantly see the preview update in real-time. Hit publish at the bottom to sync across all institutional users!'}
                      </p>
                    </div>
                  </div>

                  {/* Registered custom shortcuts list with deletion */}
                  {customApps.length > 0 && (
                    <div className="bg-white p-6 border border-gray-150 rounded-[2.5rem] shadow-sm">
                      <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-1">
                        <Code size={14} className="text-blue-600" /> Draft Deletion Console
                      </h4>
                      
                      <div className="divide-y max-h-60 overflow-y-auto space-y-2.5 pb-2">
                        {customApps.map(app => (
                          <div key={app.id} className="flex items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-3 truncate">
                              <div className="h-8 w-8 rounded-lg overflow-hidden border shrink-0">
                                {app.iconUrl ? (
                                  <img src={app.iconUrl} className="h-full w-full object-cover" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs bg-gray-50 font-bold">CP</div>
                                )}
                              </div>
                              <span className="text-xs font-black text-zinc-800 truncate">{app.name}</span>
                            </div>

                            <button
                              onClick={(e) => handleDeleteCustomApp(app.id, e)}
                              className="h-8 w-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                              title="Delete app"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* ----------------- MATERIAL GOOGLE PLAY BOTTOM NAVIGATION BAR ----------------- */}
      <div className="absolute bottom-0 left-0 right-0 h-20 border-t border-gray-150 bg-white/95 backdrop-blur-md flex items-center justify-around px-4 pb-1.5 z-40">
        
        {/* TAB 1: GAMES */}
        <button 
          onClick={() => setActiveTab('games')}
          className="flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
        >
          <div className={`relative px-6 py-1.5 rounded-full transition-all duration-300 ${activeTab === 'games' ? 'bg-[#c2e7ff] text-[#001d35]' : 'hover:bg-gray-100 text-zinc-500'}`}>
            <Gamepad2 size={18} strokeWidth={activeTab === 'games' ? 2.5 : 2.0} />
          </div>
          <span className={`text-[11px] font-extrabold mt-1 tracking-tight ${activeTab === 'games' ? 'text-blue-600 font-bold' : 'text-zinc-500 font-bold'}`}>Games</span>
        </button>

        {/* TAB 2: APPS (DEFAULT) */}
        <button 
          onClick={() => { setActiveTab('apps'); setSubTab('foryou'); setSelectedCategory('All'); }}
          className="flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
        >
          <div className={`relative px-6 py-1.5 rounded-full transition-all duration-300 ${activeTab === 'apps' ? 'bg-[#c2e7ff] text-[#001d35]' : 'hover:bg-gray-100 text-zinc-500'}`}>
            <GridIcon size={18} strokeWidth={activeTab === 'apps' ? 2.5 : 2.0} />
          </div>
          <span className={`text-[11px] font-extrabold mt-1 tracking-tight ${activeTab === 'apps' ? 'text-blue-600 font-bold' : 'text-zinc-500 font-bold'}`}>Apps</span>
        </button>

        {/* TAB 3: SEARCH */}
        <button 
          onClick={() => setActiveTab('search')}
          className="flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
        >
          <div className={`relative px-6 py-1.5 rounded-full transition-all duration-300 ${activeTab === 'search' ? 'bg-[#c2e7ff] text-[#001d35]' : 'hover:bg-gray-100 text-zinc-500'}`}>
            <Search size={18} strokeWidth={activeTab === 'search' ? 2.5 : 2.0} />
          </div>
          <span className={`text-[11px] font-extrabold mt-1 tracking-tight ${activeTab === 'search' ? 'text-blue-600 font-bold' : 'text-zinc-500 font-bold'}`}>Search</span>
        </button>

        {/* TAB 4: YOU */}
        <button 
          onClick={() => setActiveTab('you')}
          className="flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
        >
          <div className={`relative px-6 py-1.5 rounded-full transition-all duration-300 ${activeTab === 'you' ? 'bg-[#c2e7ff] text-[#001d35]' : 'hover:bg-gray-100 text-zinc-500'}`}>
            <User size={18} strokeWidth={activeTab === 'you' ? 2.5 : 2.0} />
          </div>
          <span className={`text-[11px] font-extrabold mt-1 tracking-tight ${activeTab === 'you' ? 'text-blue-600 font-bold' : 'text-zinc-500 font-bold'}`}>You</span>
        </button>

      </div>

      {/* ----------------- EXONA APP DETAIL FULL-SCREEN MODAL OVERLAY ----------------- */}
      {selectedApp && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl text-left border border-zinc-200 animate-fade-in-up">
            
            <div className={`h-4 bg-gradient-to-r from-${selectedApp.color.split('-')[0] || 'blue'}-600 to-indigo-600`} />
            
            <div className="p-8">
              
              {/* Top Row with icon image */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`h-22 w-22 bg-gradient-to-tr from-${selectedApp.color.split('-')[0] || 'blue'}-100 to-white text-${selectedApp.color} rounded-[2rem] flex items-center justify-center border shadow-xs shrink-0 overflow-hidden`}>
                  {selectedApp.iconUrl ? (
                    <img src={selectedApp.iconUrl} className="h-full w-full object-cover rounded-[2rem]" alt={selectedApp.name} referrerPolicy="no-referrer" />
                  ) : (
                    React.createElement(getAppIcon(selectedApp.iconName), { size: 36, strokeWidth: 2.2 })
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 leading-tight">{selectedApp.name}</h3>
                  <p className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider mt-1">{selectedApp.creator}</p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                      <Star size={13} fill="currentColor" />
                      {selectedApp.rating}
                    </div>
                    <span className="text-zinc-300">•</span>
                    <span className="text-zinc-500 font-bold text-[11px] uppercase">{selectedApp.category}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons trigger */}
              <div className="flex gap-2.5 mb-8">
                <button
                  onClick={() => {
                    handleToggleAppActivation(selectedApp.id);
                  }}
                  className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                    enabledAppIds.includes(selectedApp.id)
                      ? 'bg-emerald-500 text-white hover:bg-rose-600 hover:text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-705'
                  }`}
                >
                  {enabledAppIds.includes(selectedApp.id) ? 'Installed (Active)' : 'Install App'}
                </button>
                
                {enabledAppIds.includes(selectedApp.id) && (
                  <button
                    onClick={() => {
                      onLaunchApp(selectedApp.id);
                      setSelectedApp(null);
                    }}
                    className="px-6 bg-zinc-950 text-white rounded-2xl hover:bg-zinc-850 font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Launch
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-6 bg-gray-100 text-zinc-700 hover:bg-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl mb-6 text-center text-xs border border-gray-150">
                <div>
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1 font-sans">Version</span>
                  <span className="font-extrabold text-zinc-800 font-sans">{selectedApp.version}</span>
                </div>
                <div className="border-x border-gray-200">
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1 font-sans">App Size</span>
                  <span className="font-extrabold text-zinc-800 font-sans">{selectedApp.size}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1 font-sans">Security Node</span>
                  <span className="font-extrabold text-green-650 flex items-center justify-center gap-1 font-sans">
                    <Shield size={10} /> Verified
                  </span>
                </div>
              </div>

              {/* Spec list items */}
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={13} className="text-blue-500" /> Core Integration Specs
                </h4>
                
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 max-h-40 overflow-y-auto space-y-2">
                  {selectedApp.featuresList ? (
                    selectedApp.featuresList.map((f, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs font-medium text-zinc-650">
                        <Check size={12} className="text-green-600 mt-1 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-400 flex gap-2 text-xs">
                      <QuestionIcon size={14} className="mt-0.5" />
                      <span>General webapp services specification rules.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

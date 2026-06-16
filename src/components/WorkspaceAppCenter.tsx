import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, ArrowLeft, Star, Grid, Check, HelpCircle, Laptop, Smartphone,
  Shield, Play, Heart, CloudLightning, RefreshCw, Layers, Sparkles, AlertCircle, ShoppingBag, 
  Trash2, Sliders, Smartphone as PhoneIcon, Code, Eye, ExternalLink, Settings, Download, Info,
  FileText, PenTool, FileJson, Radio, HardDrive, BadgeCheck, Video, HelpCircle as QuestionIcon
} from 'lucide-react';

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
    default: return Grid;
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
  const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'sandbox'>('browse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedApp, setSelectedApp] = useState<AppCenterItem | null>(null);

  // Custom App Creation formulation
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [newAppCat, setNewAppCat] = useState<'Productivity' | 'Media & Creative' | 'Assessment' | 'Utility' | 'Custom'>('Productivity');
  const [newAppIcon, setNewAppIcon] = useState('Code');
  const [newAppColor, setNewAppColor] = useState('blue-600');

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
      name: 'Exona Drop (AirDrop)', 
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

  // Combine defaults and student custom apps
  const allAvailableApps = [...defaultCatalogApps, ...customApps];

  // Filter apps based on search & category select
  const filteredApps = allAvailableApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle install / activation inside workspace
  const handleToggleAppActivation = (appId: string) => {
    // If it is workspace-app-center, we never allow disabling it
    if (appId === 'docs-placeholder-app-center') return; 

    if (enabledAppIds.includes(appId)) {
      // Uninstall/Disable
      const updated = enabledAppIds.filter(id => id !== appId);
      setEnabledAppIds(updated);
      showNotification(`Deactivated and removed from main Workspace panel.`, 'info');
    } else {
      // Install/Enable
      const updated = [...enabledAppIds, appId];
      setEnabledAppIds(updated);
      showNotification(`Activated successfully! App added to Workspace panel.`, 'success');
    }
  };

  // Create custom specifications
  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) {
      showNotification('Please enter an app name', 'error');
      return;
    }

    // Standardize URL protocol if needed
    let sanitizedUrl = newAppUrl.trim();
    if (sanitizedUrl && !/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    const newId = `custom-app-${Date.now()}`;
    const newApp: AppCenterItem = {
      id: newId,
      name: newAppName,
      description: newAppDesc || 'Custom application shortcut/platform.',
      category: newAppCat,
      iconName: newAppIcon,
      color: newAppColor,
      rating: '5.0',
      reviews: 1,
      creator: 'Your Institution Labs',
      isDefault: false,
      isCustom: true,
      version: sanitizedUrl ? 'v1.0.0 (Active Live URL Link)' : 'v1.0.0 (Concept Sketch)',
      size: sanitizedUrl ? 'Direct Link' : '200 KB',
      featuresList: sanitizedUrl 
        ? ['Instantly launches live URL shortcut', 'Stand-alone mobile home screen shortcut ready', 'Zero-latency direct routing']
        : ['Specs Registered', 'Custom Action Handlers', 'Placeholder Dashboard Layout'],
      appUrl: sanitizedUrl || undefined
    };

    const updatedCatalog = [...customApps, newApp];
    setCustomApps(updatedCatalog);
    localStorage.setItem('exonasoft_custom_workspace_apps', JSON.stringify(updatedCatalog));
    
    // Auto-enable newly created app
    setEnabledAppIds([...enabledAppIds, newId]);

    // Reset Form
    setNewAppName('');
    setNewAppDesc('');
    setNewAppUrl('');
    setNewAppIcon('Code');
    setNewAppColor('blue-600');
    setActiveTab('browse');
    showNotification(`Custom shortcut app "${newAppName}" added & activated in Workspace!`, 'success');
  };

  // Delete custom apps
  const handleDeleteCustomApp = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this custom app draft?');
    if (!confirmed) return;

    const updatedCustoms = customApps.filter(app => app.id !== appId);
    setCustomApps(updatedCustoms);
    localStorage.setItem('exonasoft_custom_workspace_apps', JSON.stringify(updatedCustoms));

    const updatedEnabled = enabledAppIds.filter(id => id !== appId);
    setEnabledAppIds(updatedEnabled);
    showNotification('Removed custom app draft.', 'info');
  };

  // Suggested app quick deployment options
  const quickTemplateApps = [
    { name: 'Student Information System', desc: 'Manage official enrollment databases, student rosters, and records.', cat: 'Productivity', icon: 'Laptop', color: 'indigo-600' },
    { name: 'Tuition Fee Registry', desc: 'Invoices, transaction logging, and payment receipt verifications.', cat: 'Utility', icon: 'Shield', color: 'emerald-600' },
    { name: 'Attendance Sheet Pro', desc: 'Log and audit class engagement with real-time analytics graphs.', cat: 'Assessment', icon: 'BadgeCheck', color: 'blue-600' },
    { name: 'Library Catalog Tracker', desc: 'Browse available textbooks, check-out statuses, and due date calculators.', cat: 'Productivity', icon: 'FileText', color: 'purple-600' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
      
      {/* Exona App Store Style Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-850 to-blue-950 text-white p-6 md:p-10 shrink-0 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-left max-w-2xl">
            <span className="text-[10px] bg-blue-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest leading-none block w-max mb-3 shadow-sm shadow-blue-500/15">
              Exona Workspace
            </span>
            <h1 className="text-3xl font-black tracking-tight leading-tight">
              Workspace App Store
            </h1>
            <p className="text-zinc-300 text-sm mt-1.5 leading-relaxed font-bold">
              Instantly add, remove, configure, and customize applications right in your active Workspace panel. Create brand-new concept templates to build later!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-white text-zinc-900 border border-zinc-200 hover:bg-gray-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Workspace
            </button>
          </div>
        </div>

        {/* Exona Segment Tabs */}
        <div className="flex gap-6 mt-8 border-b border-white/10 text-sm font-black uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('browse')}
            className={`pb-3 transition-colors flex items-center gap-2 relative ${
              activeTab === 'browse' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={16} /> Games & Apps Store
            {activeTab === 'browse' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`pb-3 transition-colors flex items-center gap-2 relative ${
              activeTab === 'installed' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Grid size={16} /> Enabled in Workspace ({enabledAppIds.length})
            {activeTab === 'installed' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`pb-3 transition-colors flex items-center gap-2 relative ${
              activeTab === 'sandbox' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code size={16} /> Create Concept App
            {activeTab === 'sandbox' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Feed Column */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          
          {activeTab === 'browse' && (
            <div className="space-y-8 animate-fade-in-up">
              
              {/* Search & Categories Bar */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search Workspace apps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-150 rounded-2xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-2xl border border-gray-150 shadow-2xs">
                  {['All', 'Productivity', 'Media & Creative', 'Assessment', 'Utility', 'Custom'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        selectedCategory === cat 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-zinc-500 hover:text-zinc-850 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Apps */}
              {filteredApps.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-200/50 rounded-[2rem] p-10">
                  <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border text-zinc-400">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="text-lg font-black text-zinc-800 mb-1">No applications found</h3>
                  <p className="text-xs text-zinc-500 font-bold max-w-sm mx-auto">Try refining your search keyword or explore other menu categories.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredApps.map(app => {
                    const AppIcon = getAppIcon(app.iconName);
                    const isAdded = enabledAppIds.includes(app.id);

                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="group bg-white border border-gray-150 rounded-[2rem] p-6 text-left hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                      >
                        <div>
                          {/* Banner background hover effect */}
                          <div className={`absolute top-0 left-0 w-2 h-full bg-${app.color}`} />

                          <div className="flex justify-between items-start gap-3 mb-6">
                            <div className={`h-14 w-14 bg-gradient-to-tr from-${app.color.split('-')[0]}-100 to-${app.color.split('-')[0]}-50 text-${app.color} rounded-2xl flex items-center justify-center shadow-md shadow-${app.color.split('-')[0]}-300/10 shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                              <AppIcon size={26} strokeWidth={2.5} />
                            </div>

                            {/* Stars rating and badge info */}
                            <div className="text-right">
                              <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 text-zinc-500 px-2 py-0.5 rounded-md block w-max ml-auto mb-1">
                                {app.category}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                                <Star size={12} fill="currentColor" />
                                {app.rating}
                              </div>
                            </div>
                          </div>

                          <h3 className="text-lg font-black text-zinc-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">
                            {app.name}
                          </h3>
                          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest leading-none mb-3">
                            {app.creator}
                          </p>
                          <p className="text-xs text-zinc-500 font-bold leading-relaxed line-clamp-3 mb-6">
                            {app.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                          <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">
                            {app.size} • {app.isCustom ? 'Concepts' : app.version}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Launch directly trigger */}
                            {isAdded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLaunchApp(app.id);
                                }}
                                className="h-8 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                title="Run Application"
                              >
                                Launch
                              </button>
                            )}

                            {/* Primary Install/Deinstall button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAppActivation(app.id);
                              }}
                              className={`h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                isAdded 
                                  ? 'bg-emerald-500 hover:bg-destructive hover:text-white hover:border-transparent text-white border border-transparent' 
                                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                              }`}
                            >
                              {isAdded ? 'Added' : 'Get / Add'}
                            </button>
                            
                            {/* Trash binary icon for draft customs only */}
                            {app.isCustom && (
                              <button
                                onClick={(e) => handleDeleteCustomApp(app.id, e)}
                                className="h-8 w-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition-all border border-rose-100"
                                title="Delete Custom AppDraft"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Template deployment section */}
              <div className="bg-gradient-to-tr from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-indigo-100/50 p-8 rounded-[3rem] text-left">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-md">
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
                        className="bg-white border border-gray-150 p-5 rounded-2xl flex justify-between items-center hover:border-indigo-400 hover:shadow-xs transition-colors text-left"
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
                            // Process deployment template
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

          {activeTab === 'installed' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex justify-between items-center text-left">
                <div>
                  <h3 className="text-xl font-black text-zinc-950">Active Layout Grid</h3>
                  <p className="text-xs text-zinc-500 font-bold leading-normal mt-0.5">Toggle active modules to customize the main workspace. Only enabled features will be visible on your team navigation tiles.</p>
                </div>
                <button
                  onClick={() => {
                    setEnabledAppIds(defaultCatalogApps.map(a => a.id));
                    showNotification('Restored to default workspace layout features', 'info');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Restore Defaults
                </button>
              </div>

              <div className="bg-white border border-gray-150 rounded-[2.5rem] divide-y divide-gray-100 overflow-hidden shadow-2xs">
                {allAvailableApps.map(app => {
                  const AppIcon = getAppIcon(app.iconName);
                  const isChecked = enabledAppIds.includes(app.id);

                  return (
                    <div 
                      key={app.id}
                      className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 bg-gray-50 text-${app.color} rounded-xl flex items-center justify-center border shrink-0`}>
                          <AppIcon size={24} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-zinc-900 text-sm flex items-center gap-1.5">
                            {app.name}
                            {app.isDefault && (
                              <span className="text-[8px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase">Default Suite</span>
                            )}
                          </h4>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-lg mt-0.5">{app.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          isChecked ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {isChecked ? 'Enabled' : 'Disabled'}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
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
          )}

          {activeTab === 'sandbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
              
              {/* Creator Form */}
              <div className="lg:col-span-7 bg-white p-8 border border-gray-150 rounded-[2.5rem] shadow-sm text-left">
                <div className="flex items-center gap-3.5 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Code size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 leading-none">Draft App Creator</h3>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1 leading-relaxed">Instantly model custom concept specifications so that developers can build them specifically in secondary phases!</p>
                  </div>
                </div>

                <form onSubmit={handleCreateCustomApp} className="space-y-5 font-bold text-zinc-700 text-xs">
                  {/* Name */}
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Application Title</label>
                    <input
                      type="text"
                      required
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. Student Attendance Pro"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* App or Website URL */}
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center justify-between">
                      <span>Direct Portal App or Website URL (Optional)</span>
                      <span className="text-blue-500 font-extrabold normal-case">e.g. Google, Telegram, external page</span>
                    </label>
                    <input
                      type="text"
                      value={newAppUrl}
                      onChange={(e) => setNewAppUrl(e.target.value)}
                      placeholder="e.g. https://t.me/username, https://my-app.netlify.app or domain.com"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-[10px] font-black uppercase text-zinc-400">App Specs & Purpose Description</label>
                    <textarea
                      required
                      value={newAppDesc}
                      onChange={(e) => setNewAppDesc(e.target.value)}
                      rows={3}
                      placeholder="e.g. Conduct student checkout verifications, record physical signature logs and print daily rosters..."
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Category and Color grid combo line */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Portal Category</label>
                      <select
                        value={newAppCat}
                        onChange={(e) => setNewAppCat(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Productivity">Productivity</option>
                        <option value="Media & Creative">Media & Creative</option>
                        <option value="Assessment">Assessment</option>
                        <option value="Utility">Utility</option>
                        <option value="Custom">Custom Concept</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Aesthetic Brand Tone</label>
                      <select
                        value={newAppColor}
                        onChange={(e) => setNewAppColor(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="blue-600">Ocean Blue</option>
                        <option value="purple-600">Royal Purple</option>
                        <option value="indigo-600">Modern Indigo</option>
                        <option value="emerald-600">Emerald Green</option>
                        <option value="rose-600">Ruby Rose</option>
                        <option value="amber-600">Amber Yellow</option>
                      </select>
                    </div>
                  </div>

                  {/* Icon Selector grid */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400">App Icon Preset</label>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { id: 'Code', label: 'Code' },
                        { id: 'ShoppingBag', label: 'Store' },
                        { id: 'Sparkles', label: 'AI' },
                        { id: 'Laptop', label: 'Device' },
                        { id: 'Smartphone', label: 'Mobile' },
                        { id: 'Shield', label: 'Secure' },
                      ].map(ico => {
                        const IconNode = getAppIcon(ico.id);
                        const isSel = newAppIcon === ico.id;
                        return (
                          <button
                            key={ico.id}
                            type="button"
                            onClick={() => setNewAppIcon(ico.id)}
                            className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                              isSel ? 'border-blue-600 bg-blue-50/50 text-blue-600 shadow-2xs' : 'bg-white text-zinc-400 border-gray-150 hover:bg-gray-50'
                            }`}
                          >
                            <IconNode size={20} />
                            <span className="text-[9px] font-extrabold">{ico.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md uppercase"
                  >
                    <Plus size={14} /> Register Custom App Concept
                  </button>
                </form>
              </div>

              {/* Sandbox info and previews */}
              <div className="lg:col-span-5 space-y-6 text-left">
                
                {/* Visual Preview Sandbox Card */}
                <div className="bg-white p-6 border border-gray-150 rounded-[2.5rem] shadow-sm">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-4">Live Concept Preview</p>
                  
                  <div className="bg-zinc-50 border border-gray-150 p-6 rounded-3xl relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-2 h-full bg-${newAppColor}`} />
                    
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div className={`h-11 w-11 bg-white border border-gray-150 text-${newAppColor} rounded-xl flex items-center justify-center shadow-2xs`}>
                        {React.createElement(getAppIcon(newAppIcon), { size: 20 })}
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider bg-white border px-2 py-0.5 rounded-md text-zinc-500">
                        {newAppCat}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-zinc-950 text-base leading-tight">
                      {newAppName || 'Example App Title'}
                    </h4>
                    {newAppUrl && (
                      <div className="mt-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md inline-block w-max font-mono truncate max-w-full">
                        link: {newAppUrl}
                      </div>
                    )}
                    <p className="text-[9px] font-extrabold text-[#2481CC] uppercase tracking-widest leading-none mt-1">EXONASOFT SHIFT WORKSPACE</p>
                    <p className="text-xs text-zinc-500 leading-relaxed font-bold mt-2.5">
                      {newAppDesc || 'Define details, features, and specs in the left input fields to instantly mock draft. This concept app will immediately integrate into your workspace layout matrix.'}
                    </p>
                  </div>
                </div>

                {/* Developer Guidelines checklist */}
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 text-xs relative overflow-hidden shadow-md">
                  <div className="absolute right-0 bottom-0 pointer-events-none text-white/5 pr-4 pb-2">
                    <Code size={180} />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-2 text-blue-400">How Sandbox Mode Works</h4>
                  <ul className="space-y-3 font-bold text-zinc-300 leading-relaxed">
                    <li className="flex gap-2 items-start">
                      <span className="h-5 w-5 rounded-lg bg-white/10 text-white flex items-center justify-center font-mono shrink-0">1</span>
                      <span>Model specifications instantly to share your functional mockup layout.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="h-5 w-5 rounded-lg bg-white/10 text-white flex items-center justify-center font-mono shrink-0">2</span>
                      <span>Launch app triggers active development sandbox simulators instantly.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="h-5 w-5 rounded-lg bg-white/10 text-white flex items-center justify-center font-mono shrink-0">3</span>
                      <span>Your changes persistent automatically via client context engines.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Sidebar Mini Catalog / Fast Switcher */}
        <div className="hidden xl:flex w-[280px] shrink-0 border-l border-gray-150 bg-white flex-col text-left">
          <div className="p-5 border-b border-gray-150">
            <h3 className="font-black text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600 animate-pulse" /> Popular Apps Today
            </h3>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {defaultCatalogApps.slice(0, 4).map(app => (
              <div 
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="group p-4 border border-gray-100 hover:border-blue-400 hover:bg-blue-50/5 rounded-2xl cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 bg-${app.color.split('-')[0]}-50 text-${app.color} rounded-xl flex items-center justify-center border shrink-0 font-bold`}>
                    {React.createElement(getAppIcon(app.iconName), { size: 16 })}
                  </div>
                  <div className="truncate text-left">
                    <h4 className="font-extrabold text-zinc-900 text-xs truncate group-hover:text-blue-600 transition-colors">{app.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-extrabold uppercase leading-none mt-1">{app.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] font-black text-amber-500">
                  <Star size={10} fill="currentColor" /> {app.rating} <span className="text-zinc-400 font-medium">({app.reviews} reviews)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Exona App Detail Overlapping Drawer/Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl text-left border border-zinc-200 animate-fade-in-up">
            
            {/* Header banner brand color */}
            <div className={`h-4 bg-gradient-to-r from-${selectedApp.color.split('-')[0] || 'blue'}-600 to-indigo-600`} />
            
            <div className="p-8">
              
              {/* App Meta top row */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`h-20 w-20 bg-gradient-to-tr from-${selectedApp.color.split('-')[0] || 'blue'}-100 to-white text-${selectedApp.color} rounded-[2rem] flex items-center justify-center border shadow-md shrink-0`}>
                  {React.createElement(getAppIcon(selectedApp.iconName), { size: 36, strokeWidth: 2.2 })}
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

              {/* Action Buttons row */}
              <div className="flex gap-2.5 mb-8">
                <button
                  onClick={() => {
                    handleToggleAppActivation(selectedApp.id);
                  }}
                  className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    enabledAppIds.includes(selectedApp.id)
                      ? 'bg-emerald-500 text-white hover:bg-rose-600 hover:text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {enabledAppIds.includes(selectedApp.id) ? 'Installed (Active)' : 'Install to Workspace'}
                </button>
                {enabledAppIds.includes(selectedApp.id) && (
                  <button
                    onClick={() => {
                      onLaunchApp(selectedApp.id);
                      setSelectedApp(null);
                    }}
                    className="px-6 bg-zinc-950 text-white rounded-2xl hover:bg-zinc-850 font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Launch
                  </button>
                )}
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-6 bg-gray-100 text-zinc-700 hover:bg-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Close
                </button>
              </div>

              {/* Informational specs grid stats */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl mb-6 text-center text-xs border border-gray-150">
                <div>
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1">Version</span>
                  <span className="font-extrabold text-zinc-800">{selectedApp.version}</span>
                </div>
                <div className="border-x border-gray-200">
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1">Download Size</span>
                  <span className="font-extrabold text-zinc-800">{selectedApp.size}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-wider mb-1">Security Node</span>
                  <span className="font-extrabold text-green-600 flex items-center justify-center gap-1">
                    <Shield size={10} /> Verified
                  </span>
                </div>
              </div>

              {/* Specifications / Features info list */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={13} className="text-blue-500" /> Core Integration Features
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

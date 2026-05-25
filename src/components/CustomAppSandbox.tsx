import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Code, Play, RefreshCw, Send, CheckCircle, Plus, Trash2, 
  Terminal, Sliders, Layout, Layers, Heart, Sparkles, Smartphone, Check, HelpCircle
} from 'lucide-react';
import { getAppIcon, AppCenterItem } from './WorkspaceAppCenter';

interface CustomAppSandboxProps {
  app: AppCenterItem;
  onClose: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface MockUiElement {
  id: string;
  type: 'search' | 'stats' | 'table' | 'form' | 'chart';
  title: string;
  content: string;
}

export default function CustomAppSandbox({ app, onClose, showNotification }: CustomAppSandboxProps) {
  const [themeMode, setThemeMode] = useState<'slate' | 'dark' | 'glass'>('slate');
  const [logs, setLogs] = useState<string[]>([
    `[INFO] Initializing ${app.name} system sandbox v1.0.0...`,
    `[OK] Mock database sync container loaded.`,
    `[OK] Dynamic responsive viewport listening on Port 3000.`
  ]);

  // Spec developer tasks
  const [requirements, setRequirements] = useState<string[]>([
    'Setup OAuth connection for school system database.',
    'Create automated PDF report compiler triggered monthly.',
    'Add scan system for quick student barcodes.'
  ]);
  const [newReq, setNewReq] = useState('');

  // Sandbox mock items
  const [uiElements, setUiElements] = useState<MockUiElement[]>([
    { id: '1', type: 'stats', title: 'Operational Performance', content: 'Active Counter: 5,900 Records Synced' },
    { id: '2', type: 'search', title: 'Filter Database Panel', content: 'Type keywords... SEARCH' },
    { id: '3', type: 'table', title: 'Mock Live Registers', content: 'Student ID #1234 — Present • Staff ID #4562 — Absent' }
  ]);

  const [newElTitle, setNewElTitle] = useState('');
  const [newElType, setNewElType] = useState<'search' | 'stats' | 'table' | 'form' | 'chart'>('stats');

  const addTermLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.trim()) return;
    setRequirements(prev => [...prev, newReq.trim()]);
    addTermLog(`[SPEC] Configured requirement added: "${newReq}"`);
    setNewReq('');
    showNotification('Developer spec requirement registered.');
  };

  const handleRemoveRequirement = (idx: number) => {
    const req = requirements[idx];
    setRequirements(prev => prev.filter((_, i) => i !== idx));
    addTermLog(`[SPEC] Deleted spec requirement: "${req}"`);
  };

  const handleAddUiElement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newElTitle.trim()) return;
    
    const newEl: MockUiElement = {
      id: `${Date.now()}`,
      type: newElType,
      title: newElTitle,
      content: getMockContentForType(newElType, newElTitle)
    };

    setUiElements(prev => [...prev, newEl]);
    addTermLog(`[LAYOUT] Injected mock canvas module: "${newElTitle}" (${newElType})`);
    setNewElTitle('');
    showNotification('Injected mockup layout element.');
  };

  const getMockContentForType = (type: string, title: string) => {
    switch (type) {
      case 'search': return `Search & Query ${title} inputs`;
      case 'stats': return `4.9 rating / 100% cloud up-time achieved`;
      case 'table': return `Row 1: Admin • Row 2: Standard user records`;
      case 'form': return `Text inputs for custom fields`;
      case 'chart': return `Bar chart showing monthly analytics distributions`;
      default: return `Custom generic widget`;
    }
  };

  const handleSendToDevTeam = () => {
    addTermLog(`[PIPELINE] Submitting conceptual drafts...`);
    setTimeout(() => {
      addTermLog(`[SUCCESS] Specifications packages compiled & broadcasted!`);
      showNotification(`Spec for "${app.name}" submitted. Code engineers will build this in stage 2!`, 'success');
    }, 1500);
  };

  const IconComponent = getAppIcon(app.iconName);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative text-left">
      
      {/* Top action header info */}
      <div className="bg-white border-b border-gray-150 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="h-10 w-10 bg-gray-50 border border-gray-150 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            title="Return to App Center Store"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 bg-gradient-to-tr from-${app.color.split('-')[0]}-100 to-white text-${app.color} rounded-xl flex items-center justify-center border shadow-xs shrink-0`}>
              <IconComponent size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-950 leading-tight">{app.name}</h2>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Concept Draft Mode
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-bold uppercase mt-0.5">Specifications Blueprint Dashboard</p>
            </div>
          </div>
        </div>

        {/* Action headers */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSendToDevTeam}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-650 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send size={13} /> Submit Specs to Devs
          </button>
        </div>
      </div>

      {/* Main split work canvas */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Specification Column */}
        <div className="lg:col-span-4 border-r border-gray-150 p-6 overflow-y-auto bg-white/70 space-y-8 flex flex-col justify-between">
          
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={15} className="text-blue-600" /> App Definition Rules
              </h3>
              <p className="text-[11px] text-zinc-400 font-bold mt-1 leading-relaxed">Modify specifications and set direct core goals developers will look at.</p>
            </div>

            {/* General definitions info boxes */}
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-1">
                <span className="text-[9px] font-black uppercase text-zinc-400">Concept Description</span>
                <p className="text-xs text-zinc-700 font-bold leading-normal">{app.description}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[8px] font-black uppercase text-zinc-400 block">Class Category</span>
                  <span className="text-xs font-extrabold text-zinc-800">{app.category}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase text-zinc-400 block">Deploy State</span>
                  <span className="text-xs font-extrabold text-indigo-700">Stage 1 (Mock)</span>
                </div>
              </div>
            </div>

            {/* Developer Spec Requirements Form Checklist */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center justify-between">
                <span>Required Feature Specs ({requirements.length})</span>
              </h4>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                {requirements.map((req, idx) => (
                  <div key={idx} className="group p-3 bg-gray-50 rounded-xl border flex items-center justify-between gap-3 text-xs text-zinc-700 hover:border-zinc-300 transition-colors">
                    <div className="flex gap-2 items-start font-bold">
                      <CheckCircle size={13} className="text-blue-600 mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveRequirement(idx)}
                      className="text-zinc-400 hover:text-rose-600 p-1 rounded-lg transition-colors shrink-0"
                      title="Delete Requirement"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Requirement Adder Form */}
              <form onSubmit={handleAddRequirement} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Add signature scanner..."
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-250 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl text-xs font-black flex items-center justify-center shrink-0"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" /> Live Client Simulation Active
            </span>
          </div>
        </div>

        {/* Center Canvas Layout Simulation */}
        <div className="lg:col-span-5 p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
          
          <div className="space-y-6">
            <div className="flex justify-between items-center text-left">
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Layout size={15} className="text-emerald-600" /> UI Mockup Blueprint
                </h3>
                <p className="text-[11px] text-zinc-400 font-bold mt-1 leading-normal">Simulate elements on screen. Click layout items to customize interface.</p>
              </div>

              {/* Theme selectors */}
              <div className="flex gap-1.5 bg-white p-1 rounded-xl border text-[10px] font-black uppercase tracking-wider">
                {['slate', 'dark', 'glass'].map(tm => (
                  <button
                    key={tm}
                    onClick={() => {
                      setThemeMode(tm as any);
                      addTermLog(`[THEME] Switched simulator skin to "${tm}" format.`);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      themeMode === tm 
                        ? 'bg-zinc-900 text-white' 
                        : 'text-zinc-500 hover:text-zinc-850 hover:bg-zinc-50'
                    }`}
                  >
                    {tm}
                  </button>
                ))}
              </div>
            </div>

            {/* Live mockup simulator canvas rendering */}
            <div className={`p-6 rounded-[2.5rem] border shadow-xs min-h-[380px] text-left transition-all ${
              themeMode === 'slate' ? 'bg-slate-50 border-slate-200 text-slate-900' :
              themeMode === 'dark' ? 'bg-zinc-950 border-zinc-900 text-zinc-100' :
              'bg-blue-600/5 backdrop-blur-md border-blue-500/10 text-zinc-900'
            }`}>
              
              {/* Header inside simulation */}
              <div className="pb-4 border-b border-gray-200/50 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 bg-white text-zinc-900 border rounded-lg flex items-center justify-center font-bold shadow-xs shrink-0`}>
                    <IconComponent size={14} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs">{app.name} Mockup</h4>
                    <span className="text-[8px] font-extrabold tracking-widest text-zinc-400 uppercase leading-none">Portal Sandbox</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                </div>
              </div>

              {/* Elements mapped inside simulation */}
              <div className="space-y-4">
                {uiElements.map((el) => (
                  <div 
                    key={el.id}
                    className={`p-4 rounded-2xl border text-xs relative group/item transition-colors ${
                      themeMode === 'dark' 
                        ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' 
                        : 'bg-white border-gray-150 hover:border-gray-200 shadow-3xs'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-[10px] text-zinc-500 uppercase tracking-widest">{el.title}</span>
                      <button
                        onClick={() => {
                          setUiElements(prev => prev.filter(item => item.id !== el.id));
                          addTermLog(`[LAYOUT] Deleted mock widget element: "${el.title}"`);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 text-zinc-400 hover:text-red-500 p-0.5 rounded transition-all"
                        title="Delete Element From Canvas"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <p className={`text-[11px] font-medium ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>{el.content}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Module Block Injector Form */}
          <form onSubmit={handleAddUiElement} className="bg-white border border-gray-150 p-4 rounded-2xl flex flex-col sm:flex-row gap-2 mt-6 justify-between items-center">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black uppercase text-zinc-400 whitespace-nowrap">Add Canvas Widget:</span>
              <input
                type="text"
                required
                placeholder="e.g. Student List Chart"
                value={newElTitle}
                onChange={(e) => setNewElTitle(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-250 rounded-lg text-xs font-bold text-zinc-850 placeholder-zinc-400 focus:outline-none w-full"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <select
                value={newElType}
                onChange={(e) => setNewElType(e.target.value as any)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-250 rounded-lg text-[10px] font-black uppercase text-zinc-700 focus:outline-none"
              >
                <option value="stats">Stat Counter</option>
                <option value="search">Search Input</option>
                <option value="table">Data Register</option>
                <option value="chart">Distribution Chart</option>
              </select>

              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg uppercase tracking-wide flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </form>

        </div>

        {/* Right Terminal Output Log Console Column */}
        <div className="lg:col-span-3 border-l border-gray-150 bg-slate-950 p-5 flex flex-col overflow-hidden text-left relative font-mono text-[11px] text-zinc-300">
          
          <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 shrink-0">
            <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Terminal size={12} /> Emulator Terminal
            </h4>
            <button
              onClick={() => {
                setLogs([`[INFO] Recycled terminal buffer logs.`]);
                showNotification('Cleared buffer logs.');
              }}
              className="text-zinc-500 hover:text-white transition-colors"
              title="Clear Console Logs"
            >
              <RefreshCw size={10} />
            </button>
          </div>

          {/* Scrolling log text column */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pb-20 custom-scrollbar leading-relaxed">
            {logs.map((log, idx) => {
              const textClass = log.includes('[SUCCESS]') ? 'text-green-400 font-extrabold' : 
                                log.includes('[OK]') ? 'text-amber-400' : 
                                log.includes('[SPEC]') ? 'text-blue-300' :
                                log.includes('[LAYOUT]') ? 'text-purple-300' :
                                'text-zinc-300';
              return (
                <div key={idx} className={textClass}>
                  {log}
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-slate-900 border border-white/5 rounded-xl p-3 text-[10px] text-zinc-400 text-center uppercase font-bold leading-normal">
            ⚙️ Active Sandbox Daemon Listening...
          </div>

        </div>

      </div>

    </div>
  );
}

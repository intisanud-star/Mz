import React, { useEffect, useState, Component, ErrorInfo, ReactNode, useMemo, useRef } from 'react';
import { 
  GraduationCap, LogIn, User as UserIcon, 
  BookOpen, Calendar, Bell, Search, Menu, X, 
  Home, Users, MessageSquare, Wallet, Settings, 
  AlertCircle, Cpu, ChevronDown, ChevronRight, ChevronLeft,
  Heart, MessageCircle, Share2, Plus, Filter, Send, Repeat, PlusSquare,
  Image as ImageIcon, Video as VideoIcon, Paperclip,
  MoreVertical, Trash2, Edit2, UserPlus, UserMinus,
  MoreHorizontal, ArrowUpRight, CreditCard, Fingerprint, Eye, EyeOff,
  BadgeCheck, AlertTriangle, Smile, TrendingUp, TrendingDown, ShieldAlert,
  DollarSign, Clock, FileText, Upload, LayoutGrid, Database, Sparkles, Stars, Shield,
  ClipboardList, CheckCircle2, XCircle, Compass, Check, Camera, Circle, Phone,
  Mic, Play, Pause, PhoneOff, StopCircle, RefreshCw,
  Building2, MapPin, Lock,
  Globe, Zap, Mail, Facebook, Twitter, Instagram, Github, Chrome, Palette, HelpCircle, Info, Coffee, Rocket, Terminal, Code2, Monitor, Smartphone, Tablet, Github as GithubIcon, Laptop, Coffee as CoffeeIcon,
  Sun, Moon, Book, Award, Star, BarChart3, Briefcase, HeartHandshake, ShieldCheck, Zap as ZapIcon, Fingerprint as FingerprintIcon,
  FileCode, FileImage, FileAudio, FileVideo, FileArchive, FilePieChart,
  Edit, Grid, List, Download, Share, Maximize2, Minimize2, ExternalLink, Link, Move, Copy,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ExternalLink as ExternalLinkIcon, ListFilter, SlidersHorizontal, Hash, Tag, Bookmark, ShieldAlert as ShieldAlertIcon,
  RefreshCcw, Layers, Layout, Library, Pencil, Save, BookOpen as BookOpenIcon, Clock as ClockIcon, Calendar as CalendarIcon, Check as CheckIcon, X as XIcon, Menu as MenuIcon, Search as SearchIcon, Filter as FilterIcon, MoreVertical as MoreVerticalIcon, Bell as BellIcon, Settings as SettingsIcon, LogOut as LogOutIcon, Camera as CameraIcon, Plus as PlusIcon, Send as SendIcon, Image as ImageIcon2, Smile as SmileIcon, Heart as HeartIcon, MessageCircle as MessageCircleIcon, Share2 as Share2Icon, MoreHorizontal as MoreHorizontalIcon, Trash2 as Trash2Icon, Edit2 as Edit2Icon, Bookmark as BookmarkIcon, Heart as HeartFilled, LogOut,
  Gamepad2, Trophy, Flame, Ghost, Music, Video, Map, Volume2, VolumeX, MicOff,
  Cloud, CloudUpload, CloudDownload, Files, Folder, FolderPlus, FilePlus, FileMinus,
  Calculator, FileBarChart, IdCard, Gift, ArrowUpDown, CheckCheck, Printer,
  Banknote, Receipt, TableProperties, LayoutList, PenTool, HardDrive, FileJson, Activity
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  auth, 
  googleProvider, 
  db, 
  ensureUserDocument, 
  handleFirestoreError, 
  OperationType, 
  storage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadBytesResumable,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteDoc
} from './firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, where, getDocs, arrayUnion, arrayRemove, writeBatch, limit, increment } from 'firebase/firestore';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- CONSTANTS ---
const BRAIN_BATTLE_QUESTIONS = [
  // General Knowledge
  {
    question: "Which is the largest continent in the world by land area?",
    options: ["Africa", "Asia", "North America", "Europe"],
    answer: "Asia",
    category: "General Knowledge"
  },
  {
    question: "What is the hardest natural substance known to man?",
    options: ["Gold", "Iron", "Diamond", "Quartz"],
    answer: "Diamond",
    category: "General Knowledge"
  },
  {
    question: "Who is the author of the famous novel 'Things Fall Apart'?",
    options: ["Wole Soyinka", "Chinua Achebe", "Chimamanda Adichie", "Femi Osofisan"],
    answer: "Chinua Achebe",
    category: "General Knowledge"
  },
  {
    question: "How many planets are currently in our Solar System?",
    options: ["7", "8", "9", "10"],
    answer: "8",
    category: "General Knowledge"
  },
  {
    question: "What is the capital city of France?",
    options: ["Marseille", "Lyon", "Paris", "Nice"],
    answer: "Paris",
    category: "General Knowledge"
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
    answer: "Leonardo da Vinci",
    category: "General Knowledge"
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    answer: "Pacific Ocean",
    category: "General Knowledge"
  },

  // School Questions
  {
    question: "What is the result of 12 multiplied by 12?",
    options: ["124", "144", "164", "142"],
    answer: "144",
    category: "School Questions"
  },
  {
    question: "Which organ in the human body is responsible for pumping blood?",
    options: ["Lungs", "Brain", "Liver", "Heart"],
    answer: "Heart",
    category: "School Questions"
  },
  {
    question: "What is the chemical symbol for Gold?",
    options: ["Ag", "Fe", "Au", "Pb"],
    answer: "Au",
    category: "School Questions"
  },
  {
    question: "What is the boiling point of pure water at sea level?",
    options: ["90°C", "100°C", "110°C", "120°C"],
    answer: "100°C",
    category: "School Questions"
  },
  {
    question: "How many continents are there on Earth?",
    options: ["5", "6", "7", "8"],
    answer: "7",
    category: "School Questions"
  },
  {
    question: "What is the closest star to Earth?",
    options: ["Mars", "The Sun", "Proxima Centauri", "Venus"],
    answer: "The Sun",
    category: "School Questions"
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Jupiter", "Venus", "Mars", "Saturn"],
    answer: "Mars",
    category: "School Questions"
  },

  // Nigeria Trivia
  {
    question: "In what year did Nigeria become an independent nation?",
    options: ["1950", "1960", "1963", "1970"],
    answer: "1960",
    category: "Nigeria Trivia"
  },
  {
    question: "Which Nigerian city is famously known as the 'Center of Excellence'?",
    options: ["Abuja", "Kano", "Lagos", "Port Harcourt"],
    answer: "Lagos",
    category: "Nigeria Trivia"
  },
  {
    question: "What are the primary colors on the Nigerian national flag?",
    options: ["Green and Blue", "Green and White", "Green and Yellow", "Red and White"],
    answer: "Green and White",
    category: "Nigeria Trivia"
  },
  {
    question: "Who was the first ceremonial President of Nigeria?",
    options: ["Tafawa Balewa", "Obafemi Awolowo", "Nnamdi Azikiwe", "Murtala Muhammed"],
    answer: "Nnamdi Azikiwe",
    category: "Nigeria Trivia"
  },
  {
    question: "What is the official language of Nigeria?",
    options: ["Hausa", "Igbo", "Yoruba", "English"],
    answer: "English",
    category: "Nigeria Trivia"
  },
  {
    question: "Which river is the longest in Nigeria?",
    options: ["River Benue", "River Niger", "River Ogun", "River Kaduna"],
    answer: "River Niger",
    category: "Nigeria Trivia"
  },
  {
    question: "Who is on the Nigerian 200 Naira note?",
    options: ["Ahmadu Bello", "Nnamdi Azikiwe", "Obafemi Awolowo", "Herbert Macaulay"],
    answer: "Ahmadu Bello",
    category: "Nigeria Trivia"
  },

  // Islamic Questions
  {
    question: "How many daily obligatory prayers (Salat) are performed by Muslims?",
    options: ["3", "4", "5", "6"],
    answer: "5",
    category: "Islamic Questions"
  },
  {
    question: "What is the name of the holy book revealed to Prophet Muhammad (SAW)?",
    options: ["Torah", "Injeel", "Zabur", "Quran"],
    answer: "Quran",
    category: "Islamic Questions"
  },
  {
    question: "In which city was the Prophet Muhammad (SAW) born?",
    options: ["Medina", "Jerusalem", "Mecca", "Riyadh"],
    answer: "Mecca",
    category: "Islamic Questions"
  },
  {
    question: "What is the name of the month in which Muslims fast from dawn to sunset?",
    options: ["Muharram", "Ramadan", "Shawwal", "Dhul-Hijjah"],
    answer: "Ramadan",
    category: "Islamic Questions"
  },
  {
    question: "Who was the first person to embrace Islam after the Prophet (SAW)?",
    options: ["Abu Bakr", "Umar", "Ali", "Khadijah"],
    answer: "Khadijah",
    category: "Islamic Questions"
  },
  {
    question: "How many chapters (Surahs) are in the Holy Quran?",
    options: ["110", "112", "114", "116"],
    answer: "114",
    category: "Islamic Questions"
  },
  {
    question: "Which Surah is known as the 'Heart of the Quran'?",
    options: ["Surah Fatiha", "Surah Yaseen", "Surah Rahman", "Surah Ikhlas"],
    answer: "Surah Yaseen",
    category: "Islamic Questions"
  },

  // Science & Tech
  {
    question: "What is the main gas found in the Earth's atmosphere?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    answer: "Nitrogen",
    category: "Science & Tech"
  },
  {
    question: "Which company developed the iPhone?",
    options: ["Samsung", "Google", "Microsoft", "Apple"],
    answer: "Apple",
    category: "Science & Tech"
  },
  {
    question: "What does 'WWW' stand for?",
    options: ["Word Wide Web", "World Wide Web", "Wide World Web", "World Web Wide"],
    answer: "World Wide Web",
    category: "Science & Tech"
  },
  // Logic & Riddles
  {
    question: "What gets wetter and wetter the more it dries?",
    options: ["Water", "A Towel", "Clouds", "Rain"],
    answer: "A Towel",
    category: "Logic & Riddles"
  },
  {
    question: "I have keys but no locks. I have a space but no room. What am I?",
    options: ["A House", "A Keyboard", "A Car", "A Map"],
    answer: "A Keyboard",
    category: "Logic & Riddles"
  },
  {
    question: "How many months in the year have 28 days?",
    options: ["1", "6", "12", "0"],
    answer: "12",
    category: "Logic & Riddles"
  },
  {
    question: "I have one eye but cannot see. What am I?",
    options: ["A Cyclops", "A Needle", "A Potato", "A Storm"],
    answer: "A Needle",
    category: "Logic & Riddles"
  }
];

const BrainBattleModal = ({ 
  isActive, 
  setIsActive, 
  step, 
  setStep, 
  guestInfo, 
  setGuestInfo, 
  score, 
  setScore, 
  currentIndex, 
  setCurrentIndex, 
  answered, 
  setAnswered, 
  questions, 
  user, 
  onNotify, 
  onJoin,
  timeLeft,
  setTimeLeft,
  timerActive,
  setTimerActive,
  leaderboard,
  onFetchLeaderboard,
  onShareResult,
  onCheckParticipation
}: { 
  isActive: boolean,
  setIsActive: (val: boolean) => void,
  step: 'welcome' | 'entry' | 'check-result' | 'playing' | 'result' | 'leaderboard' | 'existing',
  setStep: (val: any) => void,
  [key: string]: any 
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [existingResult, setExistingResult] = useState<any>(null);

  // Proactive check for logged in user
  useEffect(() => {
    if (isActive && user?.email && step === 'welcome' && !existingResult && !isChecking) {
      const checkSelf = async () => {
        setIsChecking(true);
        const record = await onCheckParticipation(user.email);
        setIsChecking(false);
        if (record) {
          setExistingResult(record);
        }
      };
      checkSelf();
    }
  }, [isActive, user, step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveAsImage = async () => {
    if (!resultRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(resultRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Exona_BrainBattle_${(existingResult?.name || guestInfo.name) || 'Champion'}.png`;
      link.click();
      onNotify('Scorecard saved successfully!', 'success');
    } catch (e) {
      console.error('Failed to save image', e);
      onNotify('Failed to save scorecard. Try again.', 'error');
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 sm:p-6 no-print"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-xl bg-white rounded-[3rem] p-8 sm:p-12 border border-gray-100 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full -ml-32 -mb-32 blur-3xl animate-pulse" />

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-ink text-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-ink leading-tight">Brain Battle</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Exonapp Presents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {step === 'playing' && (
                  <div className={`px-4 py-2 rounded-xl flex flex-col items-center border ${timeLeft < 30 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-ink'}`}>
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Time Left</span>
                    <span className="text-sm font-black font-mono leading-none">{formatTime(timeLeft)}</span>
                  </div>
                )}
                {step !== 'playing' && (
                  <button 
                    onClick={() => {
                      setIsActive(false);
                      setTimerActive(false);
                    }} 
                    className="h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
              {step === 'welcome' && (
                <div className="text-center py-10">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-indigo-600">
                    <Stars size={48} />
                  </div>
                  <h4 className="text-3xl font-black text-ink mb-4">Are you ready to battle?</h4>
                  <p className="text-muted font-medium mb-12 max-w-sm mx-auto leading-relaxed">
                    Test your knowledge in Science, History, and Nigeria Trivia. Win weekly rewards!
                  </p>
                  
                  {existingResult ? (
                    <div className="space-y-4">
                      <div className="p-6 bg-green-50 border border-green-100 rounded-3xl mb-6 text-left">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Your Weekly Status</p>
                        <p className="text-sm font-bold text-ink">You've already participated this week! Score: {existingResult.score}</p>
                      </div>
                      <button 
                        onClick={() => setStep('existing')}
                        className="w-full py-6 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 shadow-xl transition-all flex items-center justify-center gap-3"
                      >
                        <Trophy size={18} /> View My Record
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setStep('entry')}
                        className="w-full py-6 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 shadow-xl transition-all flex items-center justify-center gap-3"
                      >
                        <Zap size={18} /> Start Sunday Battle
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => {
                            onFetchLeaderboard();
                            setStep('leaderboard');
                          }}
                          className="w-full py-5 bg-white text-ink border-2 border-gray-100 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Trophy size={16} /> Leaderboard
                        </button>
                        <button 
                          onClick={() => {
                            if (user?.email) {
                              setGuestInfo({ ...guestInfo, email: user.email });
                            }
                            setStep('check-result');
                          }}
                          className="w-full py-5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Search size={16} /> My Result
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'check-result' && (
                <div className="max-w-md mx-auto py-10 text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-indigo-600">
                    <Search size={32} />
                  </div>
                  <h4 className="text-2xl font-black text-ink mb-2">Check Your Record</h4>
                  <p className="text-muted font-medium mb-8">Enter the email you used to play.</p>
                  
                  <div className="space-y-4 mb-8">
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all text-sm font-bold"
                    />
                  </div>

                  <button 
                    disabled={isChecking}
                    onClick={async () => {
                      if (!guestInfo.email) {
                        onNotify('Please enter your email', 'error');
                        return;
                      }
                      
                      setIsChecking(true);
                      const record: any = await onCheckParticipation(guestInfo.email);
                      setIsChecking(false);

                      if (record) {
                        setExistingResult(record);
                        setStep('existing');
                      } else {
                        onNotify('No record found for this email this week.', 'error');
                      }
                    }}
                    className={`w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 shadow-xl transition-all ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isChecking ? 'Searching...' : 'Find My Result'}
                  </button>
                  
                  <button 
                    onClick={() => setStep('welcome')}
                    className="w-full py-4 text-muted font-bold text-[10px] uppercase tracking-[0.2em] hover:text-ink transition-all mt-4"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'leaderboard' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="text-left">
                      <div className="inline-block px-4 py-1.5 bg-yellow-400/10 text-yellow-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                        Weekly Standings
                      </div>
                      <h4 className="text-lg font-bold text-ink">Champions League</h4>
                    </div>
                    <button 
                       onClick={() => setStep('check-result')}
                       className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <Search size={14} /> My Result
                    </button>
                  </div>

                  {leaderboard.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-600 to-accent p-6 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 mb-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy size={120} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <Stars className="text-yellow-400" size={24} />
                          <h5 className="text-sm font-black uppercase tracking-widest">Sunday Champions</h5>
                        </div>
                        <p className="text-white/80 text-sm font-medium leading-relaxed mb-6">
                          Congratulations to our top battle-tested legends for this week!
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Trophy size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Top Performer</p>
                            <p className="text-xl font-black">{leaderboard[0].name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {leaderboard.length === 0 ? (
                      <div className="py-20 text-center">
                        <TrendingUp size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-sm text-muted font-medium">Waiting for the battle to conclude...</p>
                      </div>
                    ) : (
                      leaderboard.map((lead: any, idx: number) => {
                        const getRankInfo = (index: number) => {
                          switch(index) {
                            case 0: return { label: 'Diamond', color: 'bg-cyan-500', icon: Trophy };
                            case 1: return { label: 'Gold', color: 'bg-yellow-400', icon: Award };
                            case 2: return { label: 'Silver', color: 'bg-gray-300', icon: Award };
                            case 3: return { label: 'Bronze', color: 'bg-orange-400', icon: Award };
                            case 4: return { label: 'Elite', color: 'bg-indigo-500', icon: ShieldCheck };
                            default: return null;
                          }
                        };
                        const rankInfo = getRankInfo(idx);
                        
                        return (
                          <div 
                            key={lead.id}
                            className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${idx < 5 ? (idx === 0 ? 'bg-cyan-50 border-cyan-100 animate-pulse' : 'bg-gray-50 border-gray-100') : 'bg-white border-transparent'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm ${
                                  rankInfo ? rankInfo.color + ' text-white' : 'bg-gray-100 text-muted'
                                }`}>
                                  {idx + 1}
                                </div>
                                {rankInfo && (
                                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-50">
                                    <rankInfo.icon size={10} className={rankInfo.color.replace('bg-', 'text-')} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-ink">{lead.name}</p>
                                  {rankInfo && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${rankInfo.color} text-white`}>
                                      {rankInfo.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mt-1">{lead.address}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <p className={`text-base font-black ${idx < 5 ? 'text-ink' : 'text-muted'}`}>{lead.score}</p>
                                <Zap size={12} className={idx < 5 ? 'text-yellow-500' : 'text-gray-300'} />
                              </div>
                              <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Points Scored</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button 
                    onClick={() => setStep('welcome')}
                    className="w-full py-5 bg-white text-muted rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] border border-gray-100 hover:bg-gray-50 transition-all mt-6"
                  >
                    ← Back to Centre
                  </button>
                </div>
              )}

              {step === 'entry' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                      Guest Entry
                    </div>
                    <h4 className="text-lg font-bold text-ink mb-2">Identify Yourself, Champion!</h4>
                    <p className="text-sm text-muted font-medium leading-relaxed">
                      Provide your details to capture your score and stand a chance to win weekly airtime rewards.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-4 block">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Your Name"
                        value={guestInfo.name}
                        onChange={(e) => setGuestInfo({...guestInfo, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-4 block">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="your@email.com"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-4 block">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="080 0000 0000"
                        value={guestInfo.phone}
                        onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-4 block">Location/Address</label>
                      <input 
                        type="text" 
                        placeholder="Residential Address"
                        value={guestInfo.address}
                        onChange={(e) => setGuestInfo({...guestInfo, address: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={isChecking}
                    onClick={async () => {
                      if (!guestInfo.name || !guestInfo.email || !guestInfo.phone || !guestInfo.address) {
                        onNotify('Please fill all fields', 'error');
                        return;
                      }
                      
                      setIsChecking(true);
                      const record: any = await onCheckParticipation(guestInfo.email);
                      setIsChecking(false);

                      if (record) {
                        setExistingResult(record);
                        setStep('existing');
                        return;
                      }

                      setStep('playing');
                      setScore(0);
                      setCurrentIndex(0);
                      setAnswered([]);
                      setTimeLeft(300); // 5 minutes Reset
                      setTimerActive(true);
                    }}
                    className={`w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 shadow-xl transition-all active:scale-[0.98] mt-4 ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isChecking ? 'Checking Eligibility...' : 'Authenticate & Play'}
                  </button>
                  <button 
                    onClick={() => setStep('welcome')}
                    className="w-full py-4 text-muted font-bold text-[10px] uppercase tracking-[0.2em] hover:text-ink transition-all mt-2"
                  >
                    ← Back to Welcome
                  </button>
                </div>
              )}

              {step === 'existing' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-yellow-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-yellow-600">
                    <Trophy size={40} />
                  </div>
                  <h4 className="text-3xl font-black text-ink mb-2">Already Battle Tested</h4>
                  <p className="text-muted font-medium mb-10 leading-relaxed px-4">
                    Hello <span className="text-ink font-bold">{existingResult?.name}</span>, you have already participated in this week's Brain Battle.
                  </p>

                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 mb-10">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-2">Your Score</p>
                        <p className="text-4xl font-black text-ink">{existingResult?.score}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-2">Accuracy</p>
                        <p className="text-4xl font-black text-accent">
                          {existingResult?.totalQuestions ? Math.round((existingResult.score / (existingResult.totalQuestions * 10)) * 100) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button 
                       onClick={() => {
                         onFetchLeaderboard();
                         setStep('leaderboard');
                       }}
                       className="w-full py-6 bg-ink text-white rounded-[2.5rem] font-bold text-xs uppercase tracking-[0.25em] shadow-xl hover:bg-ink/90 transition-all flex items-center justify-center gap-3"
                    >
                      Check Weekly Leaderboard
                    </button>
                    <button 
                       onClick={() => setStep('welcome')}
                       className="w-full py-5 bg-white text-muted rounded-2xl font-bold text-xs uppercase tracking-[0.25em] border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                      Back to Start
                    </button>
                  </div>
                </div>
              )}

              {step === 'playing' && questions.length > 0 && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Question</p>
                      <p className="text-sm font-black text-ink">{currentIndex + 1} / {questions.length}</p>
                    </div>
                    <div className="px-4 py-2 bg-accent/5 rounded-xl border border-accent/10">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">Score</p>
                      <p className="text-sm font-black text-accent">{score}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="inline-block px-3 py-1 bg-ink/5 text-ink rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                      {questions[currentIndex].category}
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-ink leading-snug">
                      {questions[currentIndex].question}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {questions[currentIndex].options.map((option: string, idx: number) => (
                      <button 
                        key={idx}
                        onClick={async () => {
                          if (answered.includes(currentIndex)) return;
                          
                          const isCorrect = option === questions[currentIndex].answer;
                          if (isCorrect) {
                            setScore((prev: number) => prev + 10);
                          }
                          
                          setAnswered((prev: number[]) => [...prev, currentIndex]);
                          
                          // Stagger next question
                          setTimeout(async () => {
                            if (currentIndex < questions.length - 1) {
                              setCurrentIndex((prev: number) => prev + 1);
                            } else {
                              // Final Result
                              setTimerActive(false);
                              setStep('result');
                              // Save lead
                              try {
                                await addDoc(collection(db, 'brainBattleLeads'), {
                                  ...guestInfo,
                                  score: score + (isCorrect ? 10 : 0),
                                  totalQuestions: questions.length,
                                  timestamp: serverTimestamp(),
                                  uid: user?.uid || null,
                                  finishedOnTime: true
                                });
                              } catch (e) {
                                console.error("Failed to save battle result", e);
                              }
                            }
                          }, 500);
                        }}
                        className={`w-full p-6 rounded-2xl text-left font-bold text-sm transition-all border-2 active:scale-[0.98] flex items-center justify-between group ${
                          answered.includes(currentIndex)
                            ? option === questions[currentIndex].answer
                              ? 'bg-green-50 border-green-200 text-green-900'
                              : 'bg-gray-50 border-gray-100 text-gray-400'
                            : 'bg-white border-gray-100 hover:border-accent/40 hover:bg-accent/5'
                        }`}
                      >
                        {option}
                        {answered.includes(currentIndex) && option === questions[currentIndex].answer && (
                          <CheckCircle2 size={18} className="text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'result' && (
                <div className="text-center py-6">
                  <div ref={resultRef} className="bg-white p-8 rounded-[2.5rem]">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-32 w-32 bg-yellow-400 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12"
                    >
                      <Trophy size={64} />
                    </motion.div>
                    
                    <h4 className="text-4xl font-black text-ink mb-2">Battle Concluded!</h4>
                    <div className="bg-ink/5 border border-ink/10 rounded-2xl px-6 py-4 mb-8 inline-block">
                      <p className="text-ink font-black text-xs uppercase tracking-[0.2em] mb-1">Status Update</p>
                      <p className="text-muted font-bold text-xs">Please wait for the overall weekly results list.</p>
                    </div>

                    <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 mb-10">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-2">Final Score</p>
                          <p className="text-4xl font-black text-ink">{score}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-2">Accuracy</p>
                          <p className="text-4xl font-black text-accent">{Math.round((score / (questions.length * 10)) * 100)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                         onClick={saveAsImage}
                         className="flex items-center justify-center gap-2 py-5 bg-white text-ink rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] border border-gray-100 hover:bg-gray-50 transition-all shadow-sm"
                      >
                        <Download size={16} /> Save Scorecard
                      </button>
                      {user && (
                        <button 
                           onClick={() => {
                             onShareResult(score);
                             onNotify('Achievement shared to Exona Records!', 'success');
                           }}
                           className="flex items-center justify-center gap-2 py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                        >
                          <Zap size={16} /> Share to Records
                        </button>
                      )}
                    </div>
                    <button 
                       onClick={() => {
                         onFetchLeaderboard();
                         setStep('leaderboard');
                       }}
                       className="w-full py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 transition-all shadow-xl"
                    >
                      See All Results
                    </button>
                    {!user && (
                      <button 
                        onClick={() => {
                          setIsActive(false);
                          onJoin();
                        }}
                        className="w-full py-5 bg-accent text-white rounded-2xl font-bold text-xs uppercase tracking-[0.25em] hover:bg-accent/90 shadow-xl transition-all"
                      >
                        Join Exona Family Now
                      </button>
                    )}
                    <button 
                       onClick={() => setIsActive(false)}
                       className="w-full py-5 bg-white text-muted rounded-2xl font-bold text-xs uppercase tracking-[0.25em] border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                      Return to Hub
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


// --- TYPES ---

interface Place {
  id: string;
  name: string;
  type: 'place';
  category: 'School' | 'Business' | 'Community' | 'Personal' | 'Other';
  logo: string;
  description: string;
  creatorUid: string;
  timestamp: any;
  isOfficial?: boolean;
  followers?: string[];
  pendingFollowers?: string[];
  replyPermission?: 'everyone' | 'followers' | 'none';
  administrativeViewers?: string[];
  bankAccounts?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }[];
}

interface Post {
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

interface TeacherAttendance {
  id: string;
  teacherName: string;
  schoolId: string;
  status: 'present' | 'absent' | 'late';
  date: string;
  timestamp: any;
  addedBy: string;
}

interface School {
  id: string;
  name: string;
  description: string;
  logo: string;
  type: 'school';
  creatorUid: string;
  timestamp: any;
  educationalLevels?: string[];
  followers?: string[];
  pendingFollowers?: string[];
  replyPermission?: 'everyone' | 'followers' | 'none';
  administrativeViewers?: string[];
  bankAccounts?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }[];
}

const NETWORK_PROVIDERS = ['MTN', 'Airtel', 'Glo', '9mobile'];
const DATA_PLANS = [
  { id: 'mtn-1gb', name: '1GB - 30 Days', price: 1200, network: 'MTN' },
  { id: 'mtn-5gb', name: '5GB - 30 Days', price: 5000, network: 'MTN' },
  { id: 'airtel-2gb', name: '2GB - 30 Days', price: 1500, network: 'Airtel' },
  { id: 'glo-3gb', name: '3GB - 30 Days', price: 2000, network: 'Glo' }
];
const BILL_TYPES = ['Electricity', 'Cable TV', 'Internet', 'Betting'];

const NIGERIAN_BANKS = [
  'Access Bank',
  'First Bank of Nigeria',
  'Zenith Bank',
  'United Bank for Africa (UBA)',
  'Guaranty Trust Bank (GTBank)',
  'Union Bank of Nigeria',
  'Fidelity Bank',
  'First City Monument Bank (FCMB)',
  'Ecobank Nigeria',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Wema Bank',
  'Polaris Bank',
  'Keystone Bank',
  'Heritage Bank',
  'Unity Bank',
  'Jaiz Bank',
  'Titan Trust Bank',
  'PremiumTrust Bank',
  'Globus Bank',
  'SunTrust Bank Nigeria',
  'Providus Bank',
  'OPay',
  'PalmPay',
  'Kuda Bank',
  'Moniepoint MFB',
  'VFD Microfinance Bank',
  'Carbon',
  'FairMoney'
];

interface Story {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: any;
  expiresAt: any;
  schoolId?: string;
  viewers?: string[];
}

interface StudentRecord {
  id: string;
  studentName: string;
  category: string;
  paid: number;
  balance: number;
  type: 'general' | 'books' | 'uniforms' | 'services' | 'products';
  visibility: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  schoolId?: string;
  creatorUid: string;
  addedBy: string;
  timestamp: any;
}

interface Record {
  id: string;
  studentName: string;
  category: string;
  paid: number;
  balance: number;
  type: 'general' | 'books' | 'uniforms' | 'services' | 'products';
  visibility: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  placeId?: string;
  creatorUid: string;
  addedBy: string;
  timestamp: any;
}

interface Message {
  id: string;
  senderUid: string;
  receiverUid: string;
  participants: string[];
  text: string;
  timestamp: any;
  chatId: string;
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
}

interface Notification {
  id: string;
  type: 'message' | 'follower_request' | 'system' | 'like' | 'comment';
  title: string;
  text: string;
  timestamp: any;
  isRead: boolean;
  link?: string;
  senderUid?: string;
  targetId?: string; // id of post, chat etc
}

interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  schoolId?: string;
  following?: string[];
  followers?: string[];
  pendingFollowers?: string[];
  invitesCount?: number;
  referredBy?: string | null;
  isLifetimeFree?: boolean;
  hasCreatedInstitution?: boolean;
  bio?: string;
  isPrivate?: boolean;
  country?: string;
  currency?: string;
}

interface SchoolFinance {
  institutionBalance: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md bg-white p-12 rounded-[3rem] border border-gray-100"
          >
            <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-ink mb-4 tracking-tight">System Interruption</h1>
            <p className="text-muted text-sm font-medium mb-8 leading-relaxed">An unexpected error has occurred within the Exona core. Our engineers have been notified.</p>
            <pre className="text-[10px] font-mono bg-white p-6 rounded-2xl overflow-auto max-h-40 text-left mb-10 text-muted border border-gray-100">{this.state.error?.message}</pre>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all active:scale-[0.98]"
            >
              Restart Core
            </button>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UTILS ---
const COUNTRIES = [
  { name: 'Nigeria', code: 'NG', currency: '₦' },
  { name: 'United States', code: 'US', currency: '$' },
  { name: 'United Kingdom', code: 'GB', currency: '£' },
  { name: 'Ghana', code: 'GH', currency: 'GH₵' },
  { name: 'Kenya', code: 'KE', currency: 'KSh' },
  { name: 'South Africa', code: 'ZA', currency: 'R' },
  { name: 'Canada', code: 'CA', currency: '$' },
  { name: 'India', code: 'IN', currency: '₹' },
  { name: 'European Union', code: 'EU', currency: '€' },
];

const formatTime = (timestamp: any) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- HELPERS ---
const getLabels = (type?: 'school' | 'place') => {
  if (type === 'place') {
    return {
      student: 'Member',
      students: 'Members',
      teacher: 'Staff',
      teachers: 'Staff',
      books: 'Services',
      uniforms: 'Products',
      general: 'General',
      school: 'Place',
      attendance: 'Participation',
      system: 'Management System',
      educationalLevel: 'Category'
    };
  }
  return {
    student: 'Student',
    students: 'Students',
    teacher: 'Teacher',
    teachers: 'Teachers',
    books: 'Books',
    uniforms: 'Uniforms',
    general: 'General',
    school: 'School',
    attendance: 'Attendance',
    system: 'School Management System',
    educationalLevel: 'Class/Level'
  };
};

// --- COMPONENTS ---

  const NavIcon = ({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) => (
    <button 
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-2xl transition-all relative group ${active ? 'text-ink' : 'text-muted hover:text-ink hover:bg-white border border-transparent hover:border-gray-100'}`}
      title={label}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      {active && <motion.div layoutId="nav-pill" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 bg-ink rounded-full" />}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest">
        {label}
      </span>
    </button>
  );

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <motion.button 
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
      active 
        ? 'bg-accent/5 text-accent' 
        : 'text-muted hover:bg-white border border-transparent hover:border-gray-100 hover:text-ink'
    }`}
  >
    <div className="flex items-center gap-4 relative z-10">
      <Icon size={20} className={`${active ? 'text-accent' : 'text-muted group-hover:text-ink'} transition-colors duration-300`} />
      <span className={`text-[14px] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-accent' : 'text-muted group-hover:text-ink'}`}>{label}</span>
    </div>
    {badge && (
      <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full relative z-10">
        {badge}
      </span>
    )}
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
      />
    )}
  </motion.button>
);

const WordLayout = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  toolbar,
  branding,
  showNotification,
  handlePrint,
  hideOfficialBadge = false,
  hideSaveImage = false,
  hideBranding = false,
  hideIcon = false
}: { 
  title: string, 
  subtitle: string, 
  icon: any, 
  children: React.ReactNode, 
  toolbar?: React.ReactNode,
  branding?: { logo?: string, name?: string },
  showNotification: (msg: string, type?: 'success' | 'error') => void,
  handlePrint: () => void,
  hideOfficialBadge?: boolean,
  hideSaveImage?: boolean,
  hideBranding?: boolean,
  hideIcon?: boolean
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const triggerDownload = (url: string, fileName: string) => {
    // Check if we are in Telegram Mini App
    const isTelegram = (window as any).Telegram?.WebApp?.initData;
    
    if (isTelegram && url.startsWith('data:')) {
      // In Telegram, direct blob/base64 downloads often fail
      // We'll try to show it in a new window or use Telegram's openLink if it's a real URL
      // For images, showing them in a new window allows long-press "Save to Gallery"
      const newWin = window.open();
      if (newWin) {
        newWin.document.write(`<img src="${url}" style="width: 100%; height: auto;" />`);
        newWin.document.title = fileName;
        showNotification('Image opened. Long-press to save to your device.');
      } else {
        showNotification('Please allow popups to save images');
      }
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAsImage = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 1.5, // Lower for mobile memory
        skipFonts: false,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: contentRef.current.offsetWidth + 'px',
          height: contentRef.current.offsetHeight + 'px',
        }
      });
      triggerDownload(dataUrl, `${branding?.name?.toLowerCase().replace(/\s+/g, '-') || 'exona'}-${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.png`);
    } catch (err) {
      console.error('Failed to save as image:', err);
      showNotification('Failed to save image. Try the Print option or Screenshot.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white">
      {/* Ribbon Header */}
      <div className="bg-white border-b border-gray-200 z-20 sticky top-0 no-print">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 md:gap-4">
            {!hideIcon && (
              <div className="h-8 w-8 bg-ink rounded-lg flex items-center justify-center text-white shrink-0">
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink leading-none truncate font-display">{title}</h2>
              <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all"
            >
              <Printer size={14} />
              Print
            </button>
            {!hideSaveImage && (
              <button 
                onClick={handleSaveAsImage}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="h-3 w-3 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {isExporting ? 'Exporting...' : 'Save as Image'}
              </button>
            )}
          </div>
        </div>
        {/* Toolbar / Ribbon Tabs */}
        <div className="px-4 md:px-6 py-2 flex flex-wrap items-center gap-2 sm:gap-4 bg-white">
          {toolbar}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="p-0 sm:p-4 md:p-8 lg:p-12 flex justify-center bg-gray-50/30">
        <motion.div 
          ref={contentRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full md:max-w-[1000px] bg-white min-h-screen md:min-h-[1200px] p-6 sm:p-10 md:p-16 lg:p-20 rounded-none md:rounded-sm border-x-0 md:border-x border-gray-200 relative mb-0 md:mb-20 shadow-2xl shadow-gray-200/50 print-content"
        >
          {/* Page Header Decor */}
          <div className="absolute top-0 left-0 w-full h-1 bg-ink/5" />
          <div className="flex justify-between items-start mb-20">
            {!hideBranding ? (
              <div className="flex items-center gap-3">
                {branding?.logo ? (
                  <img src={branding.logo} className="h-12 w-12 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                ) : (
                  <div className="h-12 w-12 bg-ink text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                    {branding?.name?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black text-ink tracking-tighter leading-none uppercase">{branding?.name || ''}</h1>
                  {!hideOfficialBadge && (
                    <p className="text-[8px] font-bold text-muted uppercase tracking-[0.4em] mt-1">Institutional Record</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-black text-ink tracking-tighter leading-none uppercase">{branding?.name || ''}</h1>
                </div>
              </div>
            )}
            <div className="text-right">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Document ID</div>
              <div className="text-sm font-mono font-bold text-ink">#{Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
            </div>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
};

const FeedPost = ({ 
  post, 
  onUserClick, 
  onInstitutionClick,
  onLike, 
  onComment, 
  onMessage, 
  onReshare, 
  onForward, 
  onEdit, 
  onDelete, 
  currentUserId, 
  canManage, 
  canReply = true 
}: any) => {
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = post.likedBy?.includes(currentUserId);
  const isOwnPost = post.authorUid === currentUserId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] p-6 mb-4 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative"
    >
      <div className="flex gap-4">
        {/* Left Column: Avatar */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button 
            onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
            className="shrink-0"
          >
            {post.authorPhoto ? (
              <img src={post.authorPhoto} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm hover:ring-accent/20 transition-all border border-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-accent font-black text-lg">
                {post.authorName?.charAt(0)}
              </div>
            )}
          </button>
          <div className="w-[2px] grow bg-gray-100 rounded-full" />
        </div>

        {/* Right Column: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <button 
                onClick={() => onUserClick?.({ uid: post.authorUid, name: post.authorName, photo: post.authorPhoto })}
                className="flex flex-col min-w-0 group/author"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-black text-ink truncate group-hover/author:text-accent transition-colors uppercase tracking-tight">
                    {post.authorName}
                  </span>
                  {post.authorRole === 'admin' && <Shield size={12} className="text-accent fill-accent/10" />}
                </div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">
                  {formatTime(post.timestamp)}
                </span>
              </button>

              {post.schoolId && (
                <button 
                  onClick={() => onInstitutionClick?.(post.schoolId)}
                  className="px-2 py-0.5 rounded-lg bg-accent/5 text-[9px] font-black text-accent uppercase tracking-widest hover:bg-accent/10 transition-colors truncate max-w-[120px]"
                >
                  {post.schoolName}
                </button>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="h-8 w-8 text-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center"
              >
                <MoreHorizontal size={16} />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-30 overflow-hidden"
                  >
                    {(isOwnPost || canManage) && (
                      <>
                        <button 
                          onClick={() => { onEdit?.(post); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-[11px] font-black text-ink hover:bg-gray-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                        >
                          <Edit2 size={14} className="text-muted" /> Edit Post
                        </button>
                        <button 
                          onClick={() => { onDelete?.(post); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-[11px] font-black text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        <div className="h-px bg-gray-50 my-2" />
                      </>
                    )}
                    <button className="w-full px-4 py-2.5 text-left text-[11px] font-black text-ink hover:bg-gray-50 flex items-center gap-3 transition-colors uppercase tracking-widest">
                      <Share2 size={14} className="text-muted" /> Share
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-[14px] leading-relaxed text-ink whitespace-pre-wrap mb-4 font-medium tracking-tight">
            {post.content}
          </p>

          {post.resharedFrom && (
            <div className="mb-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl border-l-4 border-accent/20 group/repost hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={14} className="text-accent" />
                <p className="text-[10px] font-black text-accent uppercase tracking-widest">{post.resharedFrom.authorName}</p>
              </div>
              <p className="text-[13px] text-muted leading-relaxed line-clamp-3 font-medium">{post.resharedFrom.content}</p>
            </div>
          )}

          {(post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0)) && (
            <div className={`mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 group/media shadow-sm ${post.mediaUrls && post.mediaUrls.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
              {post.mediaUrls && post.mediaUrls.length > 0 ? (
                post.mediaUrls.map((url: string, idx: number) => (
                  <div key={idx} className={post.mediaUrls!.length === 1 ? '' : 'aspect-square'}>
                    {post.mediaType === 'image' ? (
                      <img src={url} className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                    ) : (
                      <video src={url} controls className="w-full h-full object-contain bg-black" />
                    )}
                  </div>
                ))
              ) : (
                <div className="">
                  {post.mediaType === 'image' ? (
                    <img src={post.mediaUrl} className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  ) : (
                    <video src={post.mediaUrl} controls className="w-full h-full object-contain bg-black" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Row - Threads Style (Tight) */}
          <div className="flex items-center gap-1 -ml-2">
            <button 
              onClick={() => onLike?.(post.id, post.likedBy || [])}
              className={`flex items-center gap-1 px-2 py-2 rounded-xl transition-all ${isLiked ? 'text-accent' : 'text-muted hover:text-accent hover:bg-accent/5'}`}
            >
              <Heart size={20} className={isLiked ? 'fill-accent' : ''} />
              {post.likes > 0 && <span className="text-[11px] font-black tabular-nums">{post.likes}</span>}
            </button>

            <button 
              onClick={() => canReply && onComment?.(post)}
              className={`flex items-center gap-1 px-2 py-2 rounded-xl transition-all ${canReply ? 'text-muted hover:text-blue-500 hover:bg-blue-50' : 'text-muted/30 cursor-not-allowed'}`}
              disabled={!canReply}
            >
              <MessageCircle size={20} />
              {post.commentsCount > 0 && <span className="text-[11px] font-black tabular-nums">{post.commentsCount}</span>}
            </button>

            <button 
              onClick={() => onForward?.(post)}
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-muted hover:text-green-500 hover:bg-green-50 transition-all"
            >
              <Repeat size={20} />
            </button>

            <button 
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-muted hover:text-ink hover:bg-gray-100 transition-all"
            >
              <Send size={20} />
            </button>
            
            {!isOwnPost && (
              <button 
                onClick={() => onMessage?.(post)}
                className="flex items-center px-2 py-2 rounded-xl text-muted hover:text-accent hover:bg-accent/5 transition-all"
                title="Message Author"
              >
                <Smartphone size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick} 
    className="flex flex-col items-center justify-center flex-1 h-full gap-1 group relative"
  >
    <div className={`transition-all duration-300 ${active ? 'text-accent scale-110' : 'text-muted group-hover:text-ink'}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-accent' : 'text-muted group-hover:text-ink'}`}>{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-active"
        className="absolute bottom-0 w-1 h-1 bg-accent rounded-full"
      />
    )}
  </button>
);

// --- MAIN DASHBOARD ---
function ExonaApp() {
  const [feedTab, setFeedTab] = useState<'institutions' | 'broadcasts'>('institutions');
  const [view, setView] = useState<'splash' | 'login' | 'feed' | 'records' | 'finance' | 'schools' | 'tools' | 'penalty' | 'profile' | 'user-profile' | 'institution-profile' | 'admin' | 'school-feed' | 'attendance' | 'chat' | 'notifications' | 'search' | 'onboarding' | 'workspace'>('splash');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedSignupCountry, setSelectedSignupCountry] = useState(COUNTRIES[0]);
  const [onboardingCountry, setOnboardingCountry] = useState(COUNTRIES[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ uid: string, name: string, photo: string } | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const currencySymbol = useMemo(() => userDoc?.currency || '₦', [userDoc?.currency]);
  const [selectedUserProfileDoc, setSelectedUserProfileDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLimit, setPostsLimit] = useState(10);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const [allAttendance, setAllAttendance] = useState<TeacherAttendance[]>([]);
  const [allFinance, setAllFinance] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<'all' | 'message' | 'follower_request' | 'system' | 'like' | 'comment'>('all');
  const [notificationReadFilter, setNotificationReadFilter] = useState<'all' | 'unread'>('all');
  const [chatTab, setChatTab] = useState<'chats' | 'requests'>('chats');
  const [chatInput, setChatInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

  const handleAddBankAccount = async () => {
    if (!selectedSchool || !newBankName || !newAccountNumber || !newAccountName) return;
    try {
      const collectionName = selectedSchool.type === 'school' ? 'schools' : 'places';
      const ref = doc(db, collectionName, selectedSchool.id);
      await updateDoc(ref, {
        bankAccounts: arrayUnion({
          bankName: newBankName,
          accountNumber: newAccountNumber,
          accountName: newAccountName
        })
      });
      showNotification('Bank account added successfully');
      setNewBankName('');
      setNewAccountNumber('');
      setNewAccountName('');
      setIsAddingBank(false);
    } catch (error) {
      console.error('Error adding bank account:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${selectedSchool.id}`);
    }
  };

  const handleRemoveBankAccount = async (account: any) => {
    if (!selectedSchool) return;
    try {
      const collectionName = selectedSchool.type === 'school' ? 'schools' : 'places';
      const ref = doc(db, collectionName, selectedSchool.id);
      await updateDoc(ref, {
        bankAccounts: arrayRemove(account)
      });
      showNotification('Bank account removed');
    } catch (error) {
      console.error('Error removing bank account:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${selectedSchool.id}`);
    }
  };

  const [recordTab, setRecordTab] = useState<'general' | 'books' | 'uniforms' | 'services' | 'products'>('general');
  const [recordViewMode, setRecordViewMode] = useState<'classic' | 'microsoft' | 'bento'>('classic');
  const [hasChosenView, setHasChosenView] = useState(false);
  const [calcTuition, setCalcTuition] = useState<string>('');
  const [calcPaid, setCalcPaid] = useState<string>('');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportCategory, setExportCategory] = useState<'all' | 'general' | 'books' | 'uniforms' | 'services' | 'products'>('all');
  const [auditorSearch, setAuditorSearch] = useState('');
  const [auditorResults, setAuditorResults] = useState<UserDoc[]>([]);
  const [isAuditorSearching, setIsAuditorSearching] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [recordForReceipt, setRecordForReceipt] = useState<Record | StudentRecord | null>(null);
  const CallOverlay = () => {
    const call = incomingCall || outgoingCall;
    if (!call) return null;

    const otherUid = call.callerUid === user?.uid ? call.receiverUid : call.callerUid;
    const otherUser = chatUsers.find(u => u.uid === otherUid) || { displayName: 'User', photoURL: null };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/90 backdrop-blur-xl p-4"
      >
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full border-4 border-accent/20 p-1 mb-6 relative">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-accent rounded-full -z-10"
            />
            <div className="h-full w-full rounded-full overflow-hidden bg-white flex items-center justify-center">
              {otherUser.photoURL ? (
                <img src={otherUser.photoURL} className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-muted" />
              )}
            </div>
          </div>

          <h2 className="text-white text-2xl font-black mb-2">{otherUser.displayName}</h2>
          <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-12">
            {call.status === 'ringing' ? (outgoingCall ? 'Calling...' : 'Incoming Audio Call') : 'Call Active'}
          </p>

          <div className="flex gap-8">
            {incomingCall && call.status === 'ringing' && (
              <button 
                onClick={() => handleAcceptCall(call.id)}
                className="h-16 w-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-all"
              >
                <Phone size={24} />
              </button>
            )}
            <button 
              onClick={() => handleEndCall(call.id)}
              className="h-16 w-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
            >
              <PhoneOff size={24} />
            </button>
          </div>

          {call.status === 'active' && (
             <div className="mt-12 text-white/40 font-mono text-xs flex items-center gap-2">
               <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2 w-2 bg-green-500 rounded-full" />
               Live Audio
             </div>
          )}
        </div>
      </motion.div>
    );
  };

  const handleWorkspaceToolClick = (toolId: string) => {
    if (toolId === 'editor') {
      showNotification('Creative Editor is a Premium feature. Please upgrade to unlock.', 'error');
      return;
    }
    if (toolId === 'e-test' || toolId === 'e-exam') {
      // Find the relevant institution: selected one or one owned by user
      const inst = selectedSchool || selectedPlace || schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid);
      
      const isAdmin = userDoc?.role === 'admin';
      
      if (isAdmin) {
        setActiveWorkspaceTool(toolId);
        return;
      }

      if (!inst) {
        showNotification('Select a school or place to access this portal', 'success');
        return;
      }

      if (verifiedPortalAccess.includes(inst.id)) {
        setActiveWorkspaceTool(toolId);
      } else {
        setPendingToolAccess(toolId);
        setPendingInstitutionAccess(inst.id);
        
        // Check if institution even has a key
        const instData = inst as any;
        if (!instData.portalSecretKey) {
          showNotification('This institution has no Secret Key. Please add one in Secret Keys tool to continue.', 'error');
          // Still open modal so they know it's locked? 
          // User said "tell user to add secret keys to continue"
          // Maybe just redirect them to secret keys if they are the owner?
          if (inst.creatorUid === user?.uid) {
            setPendingInstitutionAccess(inst.id);
            setIsSecretKeyModalOpen(true);
          } else {
             return;
          }
        } else {
          setIsSecretKeyModalOpen(true);
        }
      }
    } else {
      setActiveWorkspaceTool(toolId);
    }
  };

  const handleVerifySecretKey = () => {
    // Find institution by pending ID or fall back to owned one
    const inst = schools.find(s => s.id === pendingInstitutionAccess) || 
                 places.find(p => p.id === pendingInstitutionAccess) ||
                 schools.find(s => s.creatorUid === user?.uid) || 
                 places.find(p => p.creatorUid === user?.uid);

    if (!inst) {
      showNotification('Institution not found', 'error');
      return;
    }

    const instData = inst as any;
    if (!instData.portalSecretKey) {
      showNotification('Access key not found for this institution. Please add a key in the Secret Keys tool.', 'error');
      return;
    }

    if (secretKeyInput === instData.portalSecretKey) {
      setVerifiedPortalAccess(prev => [...prev, inst.id]);
      setActiveWorkspaceTool(pendingToolAccess);
      setIsSecretKeyModalOpen(false);
      setSecretKeyInput('');
      setPendingInstitutionAccess(null);
      showNotification('Access Granted', 'success');
    } else {
      showNotification('Invalid Secret Key', 'error');
    }
  };

  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<any | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [editorContent, setEditorContent] = useState<string>('# Creative Studio\n\nStart crafting your technical document here...');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', members: [] as string[], photoURL: '' });
  const [chatGroups, setChatGroups] = useState<any[]>([]);
  const [myFollowers, setMyFollowers] = useState<UserDoc[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [newAttendance, setNewAttendance] = useState({ teacherName: '', status: 'present' as TeacherAttendance['status'] });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleteSchoolModalOpen, setIsDeleteSchoolModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPostFiles, setSelectedPostFiles] = useState<File[]>([]);
  const [previewPostUrls, setPreviewPostUrls] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isBrainBattleActive, setIsBrainBattleActive] = useState(false);
  const [battleStep, setBattleStep] = useState<'welcome' | 'entry' | 'check-result' | 'playing' | 'result' | 'leaderboard' | 'existing'>('welcome');
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '', address: '' });
  const [battleScore, setBattleScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [currentBattleQuestions, setCurrentBattleQuestions] = useState<any[]>(BRAIN_BATTLE_QUESTIONS);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);
  const [battleTimeLeft, setBattleTimeLeft] = useState(300); // 5 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // --- E-EXAMINATION JAMB REPLICA STATES ---
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [examCurrentSubject, setExamCurrentSubject] = useState('Use of English');
  const [examCurrentQuestionIndex, setExamCurrentQuestionIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<{[subject: string]: {[index: number]: string}}>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState(7200); // 2 hours
  const [examShowSubmitConfirm, setExamShowSubmitConfirm] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);

  const mockRegNumber = useMemo(() => {
    return '2026' + Math.floor(10000000 + Math.random() * 90000000).toString() + 'JB';
  }, []);

  const examQuestionsStore = useMemo(() => {
    const subjects: {[key: string]: any[]} = {};
    ['Use of English', 'Mathematics', 'Physics', 'Chemistry'].forEach(subject => {
      const count = subject === 'Use of English' ? 60 : 40;
      subjects[subject] = Array.from({ length: count }, (_, i) => ({
        id: `${subject}-${i}`,
        question: subject === 'Use of English' 
          ? `In English Language question ${i + 1}, identify the most appropriate synonym for the underlined word in context.`
          : `Solve the following ${subject} problem (Question ${i + 1}): If X = ${i * 2} and Y = ${Math.floor(i / 3) + 5}, what is the value of X + Y?`,
        options: {
          A: subject === 'Use of English' ? 'Conscientious' : `${(i * 2) + Math.floor(i / 3) + 5}`,
          B: subject === 'Use of English' ? 'Inadvertent' : `${(i * 2) + Math.floor(i / 3) + 10}`,
          C: subject === 'Use of English' ? 'Meticulous' : `${(i * 2) + Math.floor(i / 3) - 5}`,
          D: subject === 'Use of English' ? 'Ambiguous' : `${(i * 2) + Math.floor(i / 3) + 15}`
        },
        correctAnswer: 'A'
      }));
    });
    return subjects;
  }, []);

  const handleExamAnswer = (choice: string) => {
    setExamAnswers(prev => ({
      ...prev,
      [examCurrentSubject]: {
        ...(prev[examCurrentSubject] || {}),
        [examCurrentQuestionIndex]: choice
      }
    }));
  };

  const handleExamNext = () => {
    const subjectQs = examQuestionsStore[examCurrentSubject];
    if (examCurrentQuestionIndex < subjectQs.length - 1) {
      setExamCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Switch to next subject if available
      const subjects = Object.keys(examQuestionsStore);
      const currentSubIdx = subjects.indexOf(examCurrentSubject);
      if (currentSubIdx < subjects.length - 1) {
        setExamCurrentSubject(subjects[currentSubIdx + 1]);
        setExamCurrentQuestionIndex(0);
      }
    }
  };

  const handleExamPrev = () => {
    if (examCurrentQuestionIndex > 0) {
      setExamCurrentQuestionIndex(prev => prev - 1);
    } else {
      // Switch to previous subject if available
      const subjects = Object.keys(examQuestionsStore);
      const currentSubIdx = subjects.indexOf(examCurrentSubject);
      if (currentSubIdx > 0) {
        const prevSubject = subjects[currentSubIdx - 1];
        setExamCurrentSubject(prevSubject);
        setExamCurrentQuestionIndex(examQuestionsStore[prevSubject].length - 1);
      }
    }
  };

  const calculateExamScore = () => {
    let totalScore = 0;
    let subjectScores: {[key: string]: number} = {};
    
    Object.keys(examQuestionsStore).forEach(subject => {
      let subjectCorrect = 0;
      const questions = examQuestionsStore[subject];
      const answers = examAnswers[subject] || {};
      
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) {
          subjectCorrect++;
        }
      });
      
      // Calculate JAMB-style score (max 100 per subject usually)
      const maxPossible = questions.length;
      const score = Math.round((subjectCorrect / maxPossible) * 100);
      subjectScores[subject] = score;
      totalScore += score;
    });
    
    return { totalScore, subjectScores };
  };

  const handleExamSubmit = () => {
    const results = calculateExamScore();
    setExamResult(results);
    setIsExamStarted(false);
    setExamShowSubmitConfirm(false);
  };

  // Check if current time is within Sunday 7:00 PM - 7:55 PM
  const isBattleWindowOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Sunday (0), 7 PM (19:00) to 7:55 PM (19:55)
    return day === 0 && hour === 19 && minute <= 55;
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, 'brainBattleLeads'),
        orderBy('score', 'desc'),
        orderBy('timestamp', 'asc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaderboard(leads);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  };

  const checkParticipation = async (email: string) => {
    try {
      const now = new Date();
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, 'brainBattleLeads'),
        where('email', '==', email),
        where('timestamp', '>=', lastSunday),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (e) {
      console.error("Error checking participation:", e);
      return null;
    }
  };

  const handleShareBattleResult = async (score: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'activities'), {
        userId: user.uid,
        userName: userDoc?.fullName || user.displayName || 'Champion',
        userPhoto: userDoc?.photoURL || user.photoURL || '',
        type: 'achievement',
        content: `Just scored ${score} points in the Exona Brain Battle! 🏆 Can you beat me next Sunday?`,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        category: 'battle'
      });
    } catch (e) {
      console.error("Failed to share battle result", e);
    }
  };

  // Brain Battle Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && battleTimeLeft > 0 && battleStep === 'playing') {
      interval = setInterval(() => {
        setBattleTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (battleTimeLeft === 0 && isTimerActive && battleStep === 'playing') {
      setIsTimerActive(false);
      setBattleStep('result');
      
      // Save partial result automatically
      const savePartialResult = async () => {
        try {
          await addDoc(collection(db, 'brainBattleLeads'), {
            ...guestInfo,
            score: battleScore,
            totalQuestions: currentBattleQuestions.length,
            timestamp: serverTimestamp(),
            uid: user?.uid || null,
            finishedOnTime: false,
            timedOut: true
          });
        } catch (e) {
          console.error("Failed to save partial battle result", e);
        }
      };
      savePartialResult();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, battleTimeLeft, battleStep, guestInfo, battleScore, currentBattleQuestions, user]);

  // E-EXAM TIMER LOGIC
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExamStarted && examTimeRemaining > 0 && !examShowSubmitConfirm) {
      interval = setInterval(() => {
        setExamTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (examTimeRemaining === 0 && isExamStarted) {
      handleExamSubmit();
    }
    return () => clearInterval(interval);
  }, [isExamStarted, examTimeRemaining, examShowSubmitConfirm]);

  // E-EXAM KEYBOARD SHORTCUTS
  useEffect(() => {
    if (!isExamStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Prevent browser default for some keys
      if (['A', 'B', 'C', 'D', 'N', 'P', 'S', 'R'].includes(key)) {
        // e.preventDefault(); // Might interfere with inputs if any, but JAMB doesn't have other inputs
      }

      if (['A', 'B', 'C', 'D'].includes(key)) {
        handleExamAnswer(key);
      } else if (key === 'N') {
        handleExamNext();
      } else if (key === 'P') {
        handleExamPrev();
      } else if (key === 'S') {
        setExamShowSubmitConfirm(true);
      } else if (key === 'R') {
        setExamShowSubmitConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExamStarted, examCurrentSubject, examCurrentQuestionIndex]);

  const formatExamTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderBrainBattle = () => (
    <BrainBattleModal 
      isActive={isBrainBattleActive}
      setIsActive={setIsBrainBattleActive}
      step={battleStep}
      setStep={setBattleStep}
      guestInfo={guestInfo}
      setGuestInfo={setGuestInfo}
      score={battleScore}
      setScore={setBattleScore}
      currentIndex={currentQuestionIndex}
      setCurrentIndex={setCurrentQuestionIndex}
      answered={answeredQuestions}
      setAnswered={setAnsweredQuestions}
      questions={currentBattleQuestions}
      user={user}
      onNotify={showNotification}
      onJoin={() => setAuthMode('signup')}
      timeLeft={battleTimeLeft}
      setTimeLeft={setBattleTimeLeft}
      timerActive={isTimerActive}
      setTimerActive={setIsTimerActive}
      leaderboard={leaderboard}
      onFetchLeaderboard={fetchLeaderboard}
      onShareResult={handleShareBattleResult}
      onCheckParticipation={checkParticipation}
    />
  );

  const handleWalletClick = () => {
    if (user) {
      setIsWalletSelectorOpen(true);
    } else {
      setView('login');
    }
  };
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'cloudFiles'),
      where('ownerUid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCloudFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error fetching cloud files:', error);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chatGroups'),
      where('members', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chatGroups');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users'),
      where('following', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyFollowers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return unsubscribe;
  }, [user]);

  const [showPassword, setShowPassword] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeVoiceMessage, setActiveVoiceMessage] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<any>(null);
  const [activeCallStream, setActiveCallStream] = useState<MediaStream | null>(null);
  
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isSecretKeyModalOpen, setIsSecretKeyModalOpen] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [pendingToolAccess, setPendingToolAccess] = useState<string | null>(null);
  const [pendingInstitutionAccess, setPendingInstitutionAccess] = useState<string | null>(null);
  const [isRequestingKey, setIsRequestingKey] = useState(false);
  const [activeKeyRequest, setActiveKeyRequest] = useState<any | null>(null);
  const [verifiedPortalAccess, setVerifiedPortalAccess] = useState<string[]>([]);
  const [pendingKeyRequests, setPendingKeyRequests] = useState<any[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  useEffect(() => {
    if (!user) return;
    // Listen for calls where user is caller or receiver
    const qCalls = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', user.uid),
      where('status', 'in', ['ringing', 'active']),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(qCalls, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.receiverUid === user.uid && data.status === 'ringing') {
          setIncomingCall({ id: doc.id, ...data });
        } else if (data.callerUid === user.uid && data.status === 'ringing') {
          setOutgoingCall({ id: doc.id, ...data });
        } else if ((data.callerUid === user.uid || data.receiverUid === user.uid) && data.status === 'active') {
          // If active, keep track
          if (data.callerUid === user.uid) setOutgoingCall({ id: doc.id, ...data });
          else setIncomingCall({ id: doc.id, ...data });
        }
      });

      // Clear if no active/ringing calls in results for this user
      const relevantCall = snapshot.docs.find(doc => {
        const d = doc.data();
        return (d.callerUid === user.uid || d.receiverUid === user.uid) && (d.status === 'ringing' || d.status === 'active');
      });
      if (!relevantCall) {
        setIncomingCall(null);
        setOutgoingCall(null);
        if (activeCallStream) {
          activeCallStream.getTracks().forEach(t => t.stop());
          setActiveCallStream(null);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'calls');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (userDoc?.role !== 'admin') return;
    
    const q = query(collection(db, 'keyRequests'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingKeyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'keyRequests');
    });
    return unsubscribe;
  }, [userDoc]);

  useEffect(() => {
    if (!user) return;
    const inst = schools.find(s => s.creatorUid === user.uid) || places.find(p => p.creatorUid === user.uid);
    if (!inst) return;
    
    const q = query(
      collection(db, 'keyRequests'), 
      where('institutionId', '==', inst.id), 
      where('requesterUid', '==', user.uid),
      orderBy('timestamp', 'desc'), 
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveKeyRequest(snapshot.docs[0].data());
      } else {
        setActiveKeyRequest(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'keyRequests');
    });
    return unsubscribe;
  }, [user, schools, places]);

  const [finance, setFinance] = useState<SchoolFinance | null>(null);
  const [settlementStep, setSettlementStep] = useState<'selection' | 'exona' | 'other' | 'airtime' | 'data' | 'bills' | 'pin' | 'success' | 'deposit'>('selection');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDataPlan, setSelectedDataPlan] = useState('');
  const [selectedBillType, setSelectedBillType] = useState('');
  const [transactionPin, setTransactionPin] = useState('');
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [selectedSettlementBank, setSelectedSettlementBank] = useState('First Bank of Nigeria');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedSchool) return;

    const q = query(collection(db, 'settlements'), where('schoolId', '==', selectedSchool.id), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSettlements(docs);
    }, (error) => {
      console.error('Settlements listener error:', error);
    });

    return () => unsubscribe();
  }, [selectedSchool]);

  useEffect(() => {
    if (recipientAccount.length === 10) {
      handleVerifyAccount();
    } else {
      setVerifiedName('');
    }
  }, [recipientAccount, settlementStep, selectedSettlementBank]);

  const handleVerifyAccount = async () => {
    setIsVerifying(true);
    setVerificationError('');
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      if (recipientAccount.length !== 10) {
        setVerificationError('Invalid Account Number');
        setVerifiedName('');
        return;
      }

      if (settlementStep === 'exona') {
        // Internal check: search institutions
        const q = query(collection(db, 'schools'), where('id', '==', recipientAccount));
        const snap = await getDocs(q);
        if (snap.empty) {
          setVerifiedName('Verified Account'); 
        } else {
          setVerificationError('Account Not Found');
          setVerifiedName('');
        }
      } else {
        // External check
        if (recipientAccount.startsWith('000')) {
          setVerificationError('Invalid Bank Details');
          setVerifiedName('');
        } else {
          setVerifiedName('Account Verified'); 
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('Connection Failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInitiateSettlement = async () => {
    if (!user || !selectedSchool || !finance) return;
    if (transactionPin !== '1234') { // Mock PIN for now
      showNotification('Incorrect Transaction PIN');
      return;
    }

    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount');
      return;
    }
    if (amount > (finance.institutionBalance || 0)) {
      showNotification('Insufficient balance');
      return;
    }

    setIsProcessingSettlement(true);
    try {
      const settlementId = `SET-${Date.now()}`;
      const payload = {
        amount,
        type: settlementStep === 'exona' ? 'exona-bank' : 'other-bank',
        bankName: settlementStep === 'exona' ? 'Exona Bank' : selectedSettlementBank,
        status: 'completed', // Direct settlement is instant
        timestamp: serverTimestamp(),
        authorUid: user.uid,
        schoolId: selectedSchool.id,
        recipientId: `${recipientAccount} (${verifiedName})`,
        recipientName: verifiedName,
        recipientAccount: recipientAccount
      };

      await setDoc(doc(db, 'settlements', settlementId), payload);
      
      const schoolType = selectedSchool.type === 'school' ? 'schools' : 'places';
      const financeRef = doc(db, schoolType, selectedSchool.id, 'finance', 'stats');
      await updateDoc(financeRef, {
        institutionBalance: increment(-amount),
        lastSettlement: serverTimestamp()
      });

      setSettlementStep('success');
      showNotification('Transfer Successful');
    } catch (error) {
      console.error('Settlement error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'settlements');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  useEffect(() => {
    // Institution selection hook
  }, [selectedSchool]);
  const [selectedInstitutionForProfile, setSelectedInstitutionForProfile] = useState<School | Place | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<UserDoc[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'school' | 'place'>('all');
  const [recordSort, setRecordSort] = useState<'alphabet' | 'amount' | 'date'>('alphabet');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isEditingProfileInline, setIsEditingProfileInline] = useState(false);
  const [editingProfile, setEditingProfile] = useState({ displayName: '', bio: '', isPrivate: false });
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'blue' | 'purple'>('light');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<UserDoc[]>([]);
  const [chatUsers, setChatUsers] = useState<UserDoc[]>([]);
  const [institutionFollowerDocs, setInstitutionFollowerDocs] = useState<UserDoc[]>([]);
  const groupCandidates = useMemo(() => {
    const combined = [...myFollowers];
    institutionFollowerDocs.forEach(doc => {
      if (!combined.find(c => c.uid === doc.uid)) combined.push(doc);
    });
    return combined;
  }, [myFollowers, institutionFollowerDocs]);

  useEffect(() => {
    if (!user) return;
    
    // Managed institutions: where user is creator or admin
    const myManaged = [...schools, ...places].filter(inst => 
      inst.creatorUid === user.uid || 
      inst.administrativeViewers?.includes(user.uid)
    );
    
    const followerIds = new Set<string>();
    myManaged.forEach(inst => {
      inst.followers?.forEach(uid => {
        if (uid !== user.uid) followerIds.add(uid);
      });
    });
    
    if (followerIds.size === 0) {
      if (institutionFollowerDocs.length > 0) setInstitutionFollowerDocs([]);
      return;
    }
    
    // IDs not already being tracked to keep fetching efficient
    const idsToFetch = Array.from(followerIds).filter(uid => 
      !myFollowers.find(f => f.uid === uid) && 
      !chatUsers.find(u => u.uid === uid) &&
      !institutionFollowerDocs.find(u => u.uid === uid)
    );
    
    if (idsToFetch.length === 0) return;
    
    const fetchFollowerDocs = async () => {
      try {
        const chunks = [];
        for (let i = 0; i < idsToFetch.length; i += 30) {
          chunks.push(idsToFetch.slice(i, i + 30));
        }
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          const newDocs = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDoc));
          setInstitutionFollowerDocs(prev => [...prev, ...newDocs]);
        }
      } catch (err) {
        console.error("Error fetching institution followers:", err);
      }
    };
    
    fetchFollowerDocs();
  }, [user, schools, places, myFollowers, chatUsers]);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editingGroupData, setEditingGroupData] = useState({ name: '', description: '', photoURL: '' });
  const activeGroup = activeChat?.isGroup ? chatGroups.find(g => g.id === activeChat.uid) : null;
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    const allKnown = [...chatUsers, ...groupCandidates];
    return activeGroup.members?.map((uid: string) => 
      allKnown.find(u => u.uid === uid) || { uid, displayName: 'Member' }
    ) || [];
  }, [activeGroup, chatUsers, groupCandidates]);

  const handleUpdateGroup = async () => {
    if (!activeGroup) return;
    try {
      const groupRef = doc(db, 'chatGroups', activeGroup.id);
      await updateDoc(groupRef, {
        name: editingGroupData.name.trim(),
        description: editingGroupData.description.trim(),
        photoURL: editingGroupData.photoURL.trim()
      });
      setIsEditingGroup(false);
      showNotification('Group settings updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'chatGroups');
    }
  };

  const [isUploadingGroupPhoto, setIsUploadingGroupPhoto] = useState(false);

  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNewGroup: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploadingGroupPhoto(true);
    try {
      const compressedBase64 = await compressImage(file, 600, 0.7);
      
      if (compressedBase64.length < 300 * 1024) {
        if (isNewGroup) {
          setNewGroupData({ ...newGroupData, photoURL: compressedBase64 });
        } else {
          setEditingGroupData({ ...editingGroupData, photoURL: compressedBase64 });
        }
        showNotification('Group photo selected');
        return;
      }

      const response = await fetch(compressedBase64);
      const blob = await response.blob();
      
      const fileRef = ref(storage, `groups/${activeGroup?.id || 'temp'}/photo_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(fileRef, blob);
      const photoURL = await getDownloadURL(snapshot.ref);
      
      if (isNewGroup) {
        setNewGroupData({ ...newGroupData, photoURL });
      } else {
        setEditingGroupData({ ...editingGroupData, photoURL });
      }
      showNotification('Group photo uploaded');
    } catch (error: any) {
      console.error('Group photo upload failure:', error);
      showNotification('Failed to upload group photo', 'error');
    } finally {
      setIsUploadingGroupPhoto(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup || !user) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const groupRef = doc(db, 'chatGroups', activeGroup.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid)
      });
      setIsGroupSettingsOpen(false);
      setActiveChat(null);
      showNotification('You have left the group');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'chatGroups');
    }
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<Story[] | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Slightly lower for mobile stability
        skipFonts: false,
      });
      
      const fileName = `exona-receipt-${recordForReceipt?.studentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.png`;
      
      // Check if we are in Telegram Mini App
      const isTelegram = (window as any).Telegram?.WebApp?.initData;
      if (isTelegram) {
        // Open in new tab for gallery save
        const newWin = window.open();
        if (newWin) {
          newWin.document.write(`<img src="${dataUrl}" style="width: 100%; height: auto;" />`);
          newWin.document.title = fileName;
          showNotification('Receipt ready. Long-press to save.');
        } else {
          showNotification('Popup blocked. Please check settings.');
        }
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      showNotification('Failed to generate receipt image. Try Print or Screenshot.', 'error');
    } finally {
      setIsExporting(false);
    }
  };
  const [pendingFollowerProfiles, setPendingFollowerProfiles] = useState<UserDoc[]>([]);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingState, setTypingState] = useState<{ [chatId: string]: boolean }>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('Reconnected to internet');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('Running in offline mode', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTyping = (chatId: string, isTyping: boolean) => {
    if (!user) return;
    const typingDocRef = doc(db, 'typingStates', `${chatId}_${user.uid}`);
    setDoc(typingDocRef, {
      isTyping,
      updatedAt: serverTimestamp(),
      chatId,
      uid: user.uid
    }, { merge: true }).catch(err => console.error("Typing state error:", err));
  };

  useEffect(() => {
    let timeout: any;
    if (chatInput.trim() && activeChat) {
      const chatId = [user?.uid, activeChat.uid].sort().join('_');
      handleTyping(chatId, true);
      
      timeout = setTimeout(() => {
        handleTyping(chatId, false);
      }, 3000);
    }
    return () => {
      clearTimeout(timeout);
      if (activeChat && user) {
        const chatId = [user.uid, activeChat.uid].sort().join('_');
        handleTyping(chatId, false);
      }
    };
  }, [chatInput, view]);

  useEffect(() => {
    if (!user || !activeChat) {
      setIsOtherTyping(false);
      return;
    }
    const chatId = [user.uid, activeChat.uid].sort().join('_');
    const q = query(
      collection(db, 'typingStates'),
      where('chatId', '==', chatId),
      where('uid', '==', activeChat.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      let typingStatus = false;
      snap.forEach(doc => {
        const data = doc.data();
        // Only show if updated recently (within 5 seconds)
        if (data.isTyping) {
          const now = new Date().getTime();
          const lastUpdate = data.updatedAt?.toDate().getTime() || now; // Default to now if timestamp pending
          if (now - lastUpdate < 5000) {
            typingStatus = true;
          }
        }
      });
      setIsOtherTyping(typingStatus);
    });
    
    return () => unsub();
  }, [user?.uid, activeChat?.uid]);

  const recentChats = useMemo(() => {
    if (!user) return [];
    const chatsMap: { [chatId: string]: { lastMessage: any, otherUid: string, isGroup: boolean } } = {};
    allMessages.forEach(msg => {
      const existing = chatsMap[msg.chatId];
      const msgTime = (msg.timestamp?.seconds || Date.now() / 1000);
      if (!existing || msgTime > (existing.lastMessage.timestamp?.seconds || 0)) {
        const isGroup = msg.isGroup || false;
        const otherUid = isGroup ? msg.receiverUid : (msg.participants.find(p => p !== user.uid) || user.uid);
        chatsMap[msg.chatId] = { lastMessage: msg, otherUid, isGroup };
      }
    });

    chatGroups.forEach(group => {
      if (!chatsMap[group.id]) {
        chatsMap[group.id] = {
          lastMessage: {
            text: 'Group created',
            timestamp: group.timestamp,
            chatId: group.id,
            status: 'read'
          },
          otherUid: group.id,
          isGroup: true
        };
      }
    });

    return Object.values(chatsMap).sort((a, b) => 
      ((b.lastMessage.timestamp?.seconds || Date.now() / 1000) - (a.lastMessage.timestamp?.seconds || Date.now() / 1000))
    );
  }, [allMessages, user?.uid, chatGroups]);

  useEffect(() => {
    if (!user || recentChats.length === 0) return;
    const fetchChatUsers = async () => {
      const uidsToFetch = recentChats
        .map(c => c.otherUid)
        .filter(uid => !chatUsers.find(u => u.uid === uid) && !connectedUsers.find(u => u.uid === uid));
      
      if (uidsToFetch.length === 0) return;

      const chunks = [];
      for (let i = 0; i < uidsToFetch.length; i += 30) {
        chunks.push(uidsToFetch.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        try {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          const newUsers = snap.docs.map(d => d.data() as UserDoc);
          setChatUsers(prev => [...prev, ...newUsers]);
        } catch (error) {
          console.error('Error fetching chat users:', error);
        }
      }
    };
    fetchChatUsers();
  }, [recentChats, user?.uid]);

  useEffect(() => {
    if (view === 'chat' && activeChat && allMessages.length > 0) {
      markChatAsRead(activeChat.uid, activeChat.isGroup);
    }
  }, [view, activeChat?.uid, allMessages.length]);

  useEffect(() => {
    if (!user || allMessages.length === 0) return;
    const sentMessagesForMe = allMessages.filter(m => m.receiverUid === user.uid && m.status === 'sent');
    if (sentMessagesForMe.length === 0) return;

    const updateDelivered = async () => {
      try {
        const batch = writeBatch(db);
        sentMessagesForMe.forEach(msg => {
          batch.update(doc(db, 'messages', msg.id), { status: 'delivered' });
        });
        await batch.commit();
      } catch (error) {
        console.error('Error updating delivered status:', error);
      }
    };
    updateDelivered();
  }, [allMessages.length, user?.uid]);

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({ 
    name: '', 
    description: '', 
    logo: '', 
    type: 'school' as 'school' | 'place',
    category: 'School' as Place['category'],
    educationalLevels: [] as string[],
    replyPermission: 'everyone' as 'everyone' | 'followers' | 'none'
  });
  const [newRecord, setNewRecord] = useState({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private' as Record['visibility'], sharedWith: '' });

  const labels = getLabels(selectedSchool?.type);

  const isRecentlyActive = (institutionId: string) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return posts.some(p => p.schoolId === institutionId && (p.timestamp?.seconds * 1000 || 0) > twentyFourHoursAgo);
  };

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingInstitutionId, setUploadingInstitutionId] = useState<string | null>(null);
  const [pendingFollowerProfilesMap, setPendingFollowerProfilesMap] = useState<{[uid: string]: { displayName: string, photoURL?: string }}>({});
  const [schoolFeedTab, setSchoolFeedTab] = useState<'feed' | 'manage'>('feed');

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Reset work-in-progress when switching institutions
  useEffect(() => {
    setNewRecord({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private', sharedWith: '' });
    setActiveTool(null);
    setCalcTuition('');
    setCalcPaid('');
    setExportStartDate('');
    setExportEndDate('');
    setRecordSearch('');
    setEditingRecord(null);
  }, [selectedSchool?.id]);

  const groupedNotifications = useMemo(() => {
    let filtered = notifications;
    if (notificationReadFilter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }
    if (notificationTypeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === notificationTypeFilter);
    }

    const groups: { [key: string]: Notification[] } = {};
    filtered.forEach(notif => {
      let key = 'single_' + notif.id;
      if (notif.type === 'like' || notif.type === 'comment') {
        key = `${notif.type}_${notif.targetId}`;
      } else if (notif.type === 'message') {
        key = `message_${notif.senderUid}`;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });

    return Object.values(groups).sort((a, b) => {
      const timeA = a[0].timestamp?.seconds || 0;
      const timeB = b[0].timestamp?.seconds || 0;
      return timeB - timeA;
    });
  }, [notifications, notificationReadFilter, notificationTypeFilter]);

  const handleCreateNotification = async (targetUid: string, notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    try {
      await addDoc(collection(db, `users/${targetUid}/notifications`), {
        ...notification,
        timestamp: serverTimestamp(),
        isRead: false
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, `users/${user.uid}/notifications`, n.id), { isRead: true });
    });
    try {
      await batch.commit();
      showNotification('All notifications seen');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notifications`, notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const clearNotifications = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, `users/${user.uid}/notifications`, n.id));
    });
    try {
      await batch.commit();
      setNotifications([]);
      showNotification('Inbox cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * Compresses and resizes an image to fit within safe limits.
   */
  const compressImage = async (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Constraints
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width *= maxWidth / height;
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const storyGroups = useMemo(() => {
    const groups: { [key: string]: Story[] } = {};
    stories.forEach(story => {
      const key = story.schoolId || story.authorUid;
      if (!groups[key]) groups[key] = [];
      groups[key].push(story);
    });
    return groups;
  }, [stories]);

  const handleDownloadFile = (file: any) => {
    const blob = new Blob([file.content || ''], { type: file.type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Check if we are in Telegram Mini App
    const isTelegram = (window as any).Telegram?.WebApp?.initData;
    if (isTelegram) {
      showNotification('Printing is restricted in Telegram. Please use Save as Image or take a screenshot.', 'error');
      return;
    }
    window.print();
  };

  useEffect(() => {
    if (!user || !userDoc?.following || userDoc.following.length === 0) {
      setConnectedUsers([]);
      return;
    }

    const fetchConnectedUsers = async () => {
      try {
        const followingUids = userDoc.following || [];
        // Fetch all users the current user follows
        const usersData: UserDoc[] = [];
        
        // Firestore 'in' query limit is 30
        const chunks = [];
        for (let i = 0; i < followingUids.length; i += 30) {
          chunks.push(followingUids.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const data = doc.data() as UserDoc;
            // A user is "connected" if they also follow the current user back
            if (data.following?.includes(user.uid)) {
              usersData.push(data);
            }
          });
        }
        setConnectedUsers(usersData);
      } catch (error) {
        console.error('Error fetching connected users:', error);
      }
    };

      fetchConnectedUsers();
  }, [user, userDoc?.following]);

  const fetchConnectedUsers = async () => {
    if (!user || !userDoc?.following || userDoc.following.length === 0) {
      setConnectedUsers([]);
      return;
    }
    try {
      const followingUids = userDoc.following || [];
      const usersData: UserDoc[] = [];
      const chunks = [];
      for (let i = 0; i < followingUids.length; i += 30) {
        chunks.push(followingUids.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const data = doc.data() as UserDoc;
          if (data.following?.includes(user.uid)) {
            usersData.push(data);
          }
        });
      }
      setConnectedUsers(usersData);
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  };

  useEffect(() => {
    fetchPendingFollowers();
  }, [user, userDoc?.pendingFollowers]);

  const fetchPendingFollowers = async () => {
    if (!user || !userDoc?.pendingFollowers || userDoc.pendingFollowers.length === 0) {
      setPendingFollowerProfiles([]);
      return;
    }
    try {
      const pendingUids = userDoc.pendingFollowers || [];
      const usersData: UserDoc[] = [];
      const chunks = [];
      for (let i = 0; i < pendingUids.length; i += 30) {
        chunks.push(pendingUids.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          usersData.push(doc.data() as UserDoc);
        });
      }
      setPendingFollowerProfiles(usersData);
    } catch (error) {
      console.error('Error fetching pending followers:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPullDistance(0);
    try {
      // Re-fetch all non-realtime or critical data
      if (user) {
        await Promise.all([
          fetchConnectedUsers(),
          fetchPendingFollowers()
        ]);
      }
      // Add a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification('Content refreshed');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('exona_ref', refCode);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const managedInstitutions = [...schools, ...places].filter(s => s.creatorUid === user?.uid);

  useEffect(() => {
    const fetchProfiles = async () => {
      const pendingUids = managedInstitutions.flatMap(s => [
        ...(s.pendingFollowers || []),
        ...((s as any).pendingAuditors || [])
      ]);
      const uniqueUids = [...new Set(pendingUids)].filter(uid => !pendingFollowerProfilesMap[uid]);
      
      if (uniqueUids.length === 0) return;

      const newProfiles: {[uid: string]: { displayName: string, photoURL?: string }} = {};
      
      for (const uid of uniqueUids) {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid as string));
          if (userSnap.exists()) {
            const data = userSnap.data();
            newProfiles[uid as string] = { 
              displayName: data.displayName || 'Anonymous',
              photoURL: data.photoURL 
            };
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }

      if (Object.keys(newProfiles).length > 0) {
        setPendingFollowerProfilesMap(prev => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [managedInstitutions]);

  const unifiedFollowRequests = useMemo(() => {
    const list: any[] = [];
    
    // 1. Personal Follow Requests
    pendingFollowerProfiles.forEach(p => {
      list.push({
        id: `user_${p.uid}`,
        type: 'user_follow',
        requesterUid: p.uid,
        requesterName: p.displayName,
        requesterPhoto: p.photoURL,
        timestamp: Date.now()
      });
    });

    // 2. Institution Follow Requests
    managedInstitutions.forEach(inst => {
      if (inst.pendingFollowers) {
        inst.pendingFollowers.forEach(uid => {
          const profile = pendingFollowerProfilesMap[uid];
          list.push({
            id: `inst_${inst.id}_${uid}`,
            type: 'institution_follow',
            requesterUid: uid,
            requesterName: profile?.displayName || 'Loading...',
            requesterPhoto: profile?.photoURL,
            institutionId: inst.id,
            institutionName: inst.name,
            institution: inst,
            timestamp: Date.now()
          });
        });
      }

      // 3. Management (Auditor) Requests
      const pendingAuditors = (inst as any).pendingAuditors || [];
      pendingAuditors.forEach((uid: string) => {
        const profile = pendingFollowerProfilesMap[uid];
        list.push({
          id: `audit_${inst.id}_${uid}`,
          type: 'auditor_request',
          requesterUid: uid,
          requesterName: profile?.displayName || 'Loading...',
          requesterPhoto: profile?.photoURL,
          institutionId: inst.id,
          institutionName: inst.name,
          institution: inst,
          timestamp: Date.now()
        });
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [pendingFollowerProfiles, managedInstitutions, pendingFollowerProfilesMap]);

  const unreadRequestsCount = useMemo(() => unifiedFollowRequests.length, [unifiedFollowRequests]);

  const handleEditSchool = (school: School | Place) => {
    setEditingSchool(school as School);
    setNewSchool({
      name: school.name,
      description: school.description,
      logo: school.logo,
      type: school.type,
      educationalLevels: (school as School).educationalLevels || [],
      category: (school as Place).category || 'Other'
    });
    setIsSchoolModalOpen(true);
  };

  const checkReferralQualification = async (currentUserDoc: UserDoc) => {
    if (currentUserDoc.hasCreatedInstitution || !currentUserDoc.referredBy) return;

    try {
      const referrerRef = doc(db, 'users', currentUserDoc.referredBy);
      const referrerSnap = await getDoc(referrerRef);
      
      if (referrerSnap.exists()) {
        const referrerData = referrerSnap.data() as UserDoc;
        const newInvitesCount = (referrerData.invitesCount || 0) + 1;
        
        await setDoc(referrerRef, { 
          invitesCount: newInvitesCount,
          isLifetimeFree: newInvitesCount >= 3
        }, { merge: true });
        console.log('Referrer invitesCount updated:', newInvitesCount);
      }

      // Mark current user as having created an institution
      await setDoc(doc(db, 'users', currentUserDoc.uid), { 
        hasCreatedInstitution: true 
      }, { merge: true });
      console.log('Current user marked as institution creator');
    } catch (error) {
      console.error('Error in checkReferralQualification:', error);
    }
  };

  const handleUpdateProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploadingProfile(true);
    setUploadProgress(0);
    try {
      console.log('Hyper-Reliable Profile Update Start:', file.name, file.size);
      
      // 1. Compress Image (aim for ~600px for storage)
      const compressedBase64 = await compressImage(file, 600, 0.7);
      
      // 2. Micro-thumbnail for Auth photoURL (Firebase Auth limit is tiny ~2KB)
      const tinyThumb = await compressImage(file, 40, 0.5);

      // 3. If the file is small or easily compressed, use direct sync
      // We check the length of the string rather than the file size
      if (compressedBase64.length < 100 * 1024) {
        console.log('Optimized: Small image detected, using direct Firestore sync.');
        await updateProfile(user, { photoURL: tinyThumb });
        await setDoc(doc(db, 'users', user.uid), { photoURL: compressedBase64 }, { merge: true });
        
        const updatedDoc = await getDoc(doc(db, 'users', user.uid));
        if (updatedDoc.exists()) setUserDoc(updatedDoc.data() as UserDoc);
        showNotification('Profile updated successfully');
        return;
      }

      // 4. For larger images, use Cloud Storage with compression
      // Convert base64 back to blob for uploadBytes
      const response = await fetch(compressedBase64);
      const blob = await response.blob();
      
      const fileRef = ref(storage, `users/${user.uid}/profile_${Date.now()}_thumb.jpg`);
      const uploadPromise = uploadBytes(fileRef, blob);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloud Storage Timeout. Use a smaller image if possible.')), 25000)
      );
      
      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const photoURL = await getDownloadURL(snapshot.ref);
      
      await updateProfile(user, { photoURL });
      await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });
      
      const updatedDoc = await getDoc(doc(db, 'users', user.uid));
      if (updatedDoc.exists()) setUserDoc(updatedDoc.data() as UserDoc);
      showNotification('Profile picture updated successfully');
    } catch (error: any) {
      console.error('Upload failure:', error);
      alert('UPDATE NOTICE:\n' + (error.message || 'The update could not be completed. Please try a smaller image.'));
    } finally {
      setIsUploadingProfile(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateInstitutionLogo = async (institution: School | Place, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setUploadingInstitutionId(institution.id);
    setUploadProgress(0);
    try {
      const collectionName = institution.type === 'school' ? 'schools' : 'places';
      
      // Compress Logo
      const compressedBase64 = await compressImage(file, 400, 0.7);

      // Bypassing Storage for compressed logos (usually under 100kb)
      if (compressedBase64.length < 500 * 1024) {
        await setDoc(doc(db, collectionName, institution.id), { logo: compressedBase64 }, { merge: true });
        showNotification('Institutional logo updated (Direct)');
        return;
      }

      // Convert back to blob for storage upload
      const response = await fetch(compressedBase64);
      const blob = await response.blob();

      const fileRef = ref(storage, `${collectionName}/${institution.id}/logo_${Date.now()}.jpg`);
      const uploadPromise = uploadBytes(fileRef, blob);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logo Upload Timeout.')), 25000)
      );
      
      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const logoURL = await getDownloadURL(snapshot.ref);
      
      await setDoc(doc(db, collectionName, institution.id), { logo: logoURL }, { merge: true });
      showNotification('Institutional logo updated');
    } catch (error: any) {
      console.error('Logo update failure:', error);
      alert('LOGO ERROR:\n' + (error.message || 'Upload failed.'));
    } finally {
      setUploadingInstitutionId(null);
      setUploadProgress(0);
    }
  };

  const handleUpdateReplyPermission = async (schoolId: string, permission: 'everyone' | 'followers' | 'none') => {
    try {
      const collectionName = selectedSchool?.type === 'school' ? 'schools' : 'places';
      await updateDoc(doc(db, collectionName, schoolId), {
        replyPermission: permission
      });
      showNotification('Reply permissions updated');
    } catch (error) {
      showNotification('Failed to update permissions', 'error');
    }
  };

  const handleUpdateAdminPermission = async (institutionId: string, permission: 'owner' | 'followers' | 'everyone') => {
    // Deprecated in favor of handleToggleAdminViewer
  };

  const handleToggleAdminViewer = async (institutionId: string, viewerUid: string, action: 'add' | 'remove') => {
    if (!selectedSchool) return;
    try {
      const collectionName = selectedSchool.type === 'school' ? 'schools' : 'places';
      const docRef = doc(db, collectionName, institutionId);
      await updateDoc(docRef, {
        administrativeViewers: action === 'add' ? arrayUnion(viewerUid) : arrayRemove(viewerUid)
      });
      showNotification(action === 'add' ? 'Access granted' : 'Access revoked');
    } catch (error) {
      showNotification('Failed to update access', 'error');
    }
  };

  const handleSearchAuditors = async (term: string) => {
    setAuditorSearch(term);
    if (term.length < 3) { setAuditorResults([]); return; }
    setIsAuditorSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('displayName', '>=', term), 
        where('displayName', '<=', term + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setAuditorResults(snap.docs.map(d => d.data() as UserDoc).filter(u => u.uid !== user?.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditorSearching(false);
    }
  };

  const handleCreateSchool = async () => {
    console.log('handleCreateSchool started', { newSchool, user: user?.uid, editingSchool: editingSchool?.id });
    if (!newSchool.name.trim() || !user) {
      console.warn('handleCreateSchool aborted: missing name or user', { name: newSchool.name, user: user?.uid });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      let logoUrl = newSchool.logo.trim();
      
      if (selectedFile) {
        console.log('Hyper-Reliable Logo Upload (Creation):', selectedFile.name);
        
        // Compress Logo
        const compressedBase64 = await compressImage(selectedFile, 400, 0.7);

        if (compressedBase64.length < 500 * 1024) {
          logoUrl = compressedBase64;
          console.log('Optimized creation: Using Compressed logo.');
        } else {
          const response = await fetch(compressedBase64);
          const blob = await response.blob();
          
          const fileRef = ref(storage, `${newSchool.type === 'school' ? 'schools' : 'places'}/${user.uid}/${Date.now()}_thumb.jpg`);
          const uploadPromise = uploadBytes(fileRef, blob);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Logo Upload Timeout (25s). Use a smaller image.')), 25000)
          );
          
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
          logoUrl = await getDownloadURL(snapshot.ref);
        }
      }

      const collectionName = newSchool.type === 'school' ? 'schools' : 'places';
      const batch = writeBatch(db);
      
      if (editingSchool) {
        console.log('Updating existing institution:', editingSchool.id);
        batch.set(doc(db, collectionName, editingSchool.id), {
          ...editingSchool,
          name: newSchool.name.trim(),
          description: newSchool.description.trim(),
          logo: logoUrl,
          type: newSchool.type,
          category: newSchool.type === 'place' ? newSchool.category : null,
          educationalLevels: newSchool.type === 'school' ? newSchool.educationalLevels : [],
          replyPermission: newSchool.replyPermission || 'everyone'
        }, { merge: true });
        console.log('Institution update queued');
      } else {
        console.log('Creating new institution...');
        const slug = newSchool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const schoolId = `${slug}-${Math.random().toString(36).substr(2, 5)}`;
        
        const institutionData = {
          id: schoolId,
          name: newSchool.name.trim(),
          description: newSchool.description.trim() || `Space for ${newSchool.name}`,
          logo: logoUrl,
          type: newSchool.type,
          category: newSchool.type === 'place' ? newSchool.category : null,
          educationalLevels: newSchool.type === 'school' ? (newSchool.educationalLevels || []) : [],
          creatorUid: user.uid,
          followers: [user.uid],
          replyPermission: newSchool.replyPermission || 'everyone',
          timestamp: serverTimestamp()
        };

        batch.set(doc(db, collectionName, schoolId), institutionData);
        
        // Initialize finance
        batch.set(doc(db, 'finance', schoolId), {
          schoolId: schoolId,
          placeId: schoolId, // For compatibility
          institutionBalance: 0,
          bankName: 'Exona trust wallet',
          accountNumber: '00' + Math.floor(Math.random() * 90000000 + 10000000),
          accountName: `${newSchool.name} General`
        });
        
        // Update user document
        batch.set(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          hasCreatedInstitution: true
        }, { merge: true });

        console.log('Institution creation queued:', schoolId);
        
        // Set as selected and view (will be applied after commit)
        setSelectedSchool(institutionData as any);
        setView('school-feed');
      }

      await batch.commit();
      console.log('Batch committed successfully');
      showNotification(editingSchool ? 'Institution updated successfully' : 'Institution created successfully');

      // Check for referral qualification after commit
      if (userDoc) {
        await checkReferralQualification(userDoc);
      }

      setNewSchool({ name: '', description: '', logo: '', type: 'school', category: 'School', educationalLevels: [] });
      setEditingSchool(null);
      setIsSchoolModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error in handleCreateSchool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Authorization failed: ${errorMessage}`, 'error');
      handleFirestoreError(error, OperationType.CREATE, 'institutions');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSchool = async () => {
    if (!user || !schoolToDelete) return;
    setIsUploading(true);
    try {
      // Check both collections
      await Promise.all([
        deleteDoc(doc(db, 'schools', schoolToDelete)),
        deleteDoc(doc(db, 'places', schoolToDelete))
      ]);
      showNotification('Institution deleted');
      setIsDeleteSchoolModalOpen(false);
      setSchoolToDelete(null);
    } catch (error) {
      showNotification('Failed to delete institution', 'error');
      handleFirestoreError(error, OperationType.DELETE, `institutions/${schoolToDelete}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateRecord = async () => {
    console.log('handleCreateRecord started', { user: !!user, studentName: newRecord.studentName, selectedSchool: !!selectedSchool });
    if (!user) { setView('login'); return; }
    if (!newRecord.studentName.trim() || !selectedSchool) {
      console.warn('handleCreateRecord: missing required fields', { studentName: newRecord.studentName, selectedSchool: !!selectedSchool });
      return;
    }
    setIsUploading(true);
    const path = 'studentRecords';
    try {
      if (editingRecord) {
        console.log('Updating record', editingRecord.id);
        await setDoc(doc(db, path, editingRecord.id), {
          studentName: newRecord.studentName.trim(),
          category: newRecord.category.trim() || 'General',
          paid: Number(newRecord.paid),
          balance: Number(newRecord.balance),
          visibility: newRecord.visibility,
          sharedWith: newRecord.sharedWith.split(',').map(e => e.trim()).filter(e => e),
        }, { merge: true });
      } else {
        console.log('Adding new record');
        await addDoc(collection(db, path), {
          schoolId: selectedSchool.id,
          studentName: newRecord.studentName.trim(),
          category: newRecord.category.trim() || 'General',
          creatorUid: user.uid,
          addedBy: user.displayName || 'Anonymous',
          paid: Number(newRecord.paid),
          balance: Number(newRecord.balance),
          type: recordTab,
          visibility: newRecord.visibility,
          sharedWith: newRecord.sharedWith.split(',').map(e => e.trim()).filter(e => e),
          timestamp: serverTimestamp()
        });
      }
      console.log('Record operation successful');
      showNotification(editingRecord ? 'Record updated' : 'Record synchronized');
      setNewRecord({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private', sharedWith: '' });
      setIsRecordModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Record operation failed', error);
      showNotification('Record operation failed', 'error');
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAttendance = async () => {
    console.log('handleCreateAttendance started', { user: !!user, selectedSchool: !!selectedSchool, teacherName: newAttendance.teacherName });
    if (!user || !selectedSchool || !newAttendance.teacherName.trim()) {
      console.warn('handleCreateAttendance aborted: missing required fields', { user: !!user, selectedSchool: !!selectedSchool, teacherName: newAttendance.teacherName });
      return;
    }
    setIsUploading(true);
    const path = 'teacherAttendance';
    try {
      console.log('Adding attendance record to:', path);
      await addDoc(collection(db, path), {
        schoolId: selectedSchool.id,
        teacherName: newAttendance.teacherName.trim(),
        status: newAttendance.status,
        date: new Date().toISOString().split('T')[0],
        addedBy: user.displayName || 'Anonymous',
        timestamp: serverTimestamp()
      });
      console.log('Attendance record added successfully');
      setNewAttendance({ teacherName: '', status: 'present' });
      setIsAttendanceModalOpen(false);
    } catch (error) {
      console.error('Attendance operation failed', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (activeChat) {
            await handleSendMessage(activeChat.uid, 'Voice Message', activeChat.isGroup, base64Audio);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      (mediaRecorder as any).interval = interval;
    } catch (err: any) {
      console.error('Microphone access error (recording):', err);
      if (err.name === 'NotAllowedError') {
        showNotification('Microphone permission denied. Please enable it in browser settings.', 'error');
      } else if (err.name === 'NotFoundError') {
        showNotification('No microphone found on this device.', 'error');
      } else {
        showNotification('Could not access microphone for recording', 'error');
      }
    }
  };

  const handleStopRecording = () => {
    if (recorder) {
      recorder.stop();
      clearInterval((recorder as any).interval);
      setRecorder(null);
      setIsRecording(false);
    }
  };

  const handleInitiateCall = async (receiverUid: string) => {
    if (!user) return;
    try {
      const callData = {
        callerUid: user.uid,
        receiverUid,
        participants: [user.uid, receiverUid],
        status: 'ringing',
        timestamp: serverTimestamp(),
        type: 'audio',
        chatId: [user.uid, receiverUid].sort().join('_')
      };
      await addDoc(collection(db, 'calls'), callData);
      showNotification('Calling...');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'calls');
    }
  };

  const handleEndCall = async (callId: string) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended'
      });
      if (activeCallStream) {
        activeCallStream.getTracks().forEach(t => t.stop());
        setActiveCallStream(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'calls');
    }
  };

  const handleAcceptCall = async (callId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveCallStream(stream);
      await updateDoc(doc(db, 'calls', callId), {
        status: 'active'
      });
    } catch (err: any) {
      console.error('Microphone access error (accept call):', err);
      if (err.name === 'NotAllowedError') {
        showNotification('Microphone permission denied. Please enable it to answer.', 'error');
      } else {
        showNotification('Could not access microphone to answer call', 'error');
      }
    }
  };

  const handleSendMessage = async (receiverUid: string, text: string, isGroup = false, mediaUrl?: string) => {
    if (!user) return;
    const chatId = isGroup ? receiverUid : [user.uid, receiverUid].sort().join('_');
    const groupData = isGroup ? chatGroups.find(g => g.id === receiverUid) : null;
    try {
      await addDoc(collection(db, 'messages'), {
        senderUid: user.uid,
        receiverUid: isGroup ? null : receiverUid,
        participants: isGroup ? (groupData?.members || [user.uid]) : [user.uid, receiverUid],
        text: text.trim().slice(0, 5000),
        timestamp: serverTimestamp(),
        chatId,
        status: 'sent',
        isGroup,
        mediaUrl,
        mediaType: mediaUrl ? 'voice' : null
      });
      
      if (!isGroup && !mediaUrl) {
        await handleCreateNotification(receiverUid, {
          type: 'message',
          title: 'New Message',
          text: `${user.displayName}: ${text.trim().slice(0, 50)}...`,
          senderUid: user.uid,
          targetId: user.uid
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showNotification('Please enter your email address first', 'error');
      return;
    }
    
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error: any) {
      console.error("Forgot password error:", error);
      let msg = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') msg = 'No user found with this email';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
      showNotification(msg, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleAddMember = async (groupId: string, memberUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'chatGroups', groupId), {
        members: arrayUnion(memberUid)
      });
      showNotification('Member added successfully');
      
      // Update participants for existing messages in this group (optional but good for consistency)
      // Actually, my rules for group messages now use the group members list via participants field in the message
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chatGroups');
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupData.name.trim()) {
      showNotification('Group name is required', 'error');
      return;
    }
    try {
      const groupData = {
        name: newGroupData.name.trim(),
        description: newGroupData.description.trim(),
        creatorUid: user.uid,
        members: [user.uid, ...newGroupData.members],
        admins: [user.uid],
        timestamp: serverTimestamp(),
        photoURL: newGroupData.photoURL?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(newGroupData.name)}&background=random`
      };
      await addDoc(collection(db, 'chatGroups'), groupData);
      showNotification('Group created successfully');
      setIsCreateGroupModalOpen(false);
      setNewGroupData({ name: '', description: '', members: [], photoURL: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chatGroups');
    }
  };

  const handleUpdateMessage = async (messageId: string, newText: string) => {
    if (!user || !newText.trim()) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: newText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  const markChatAsRead = async (otherUid: string, isGroup = false) => {
    if (!user) return;
    const chatId = isGroup ? otherUid : [user.uid, otherUid].sort().join('_');
    const unreadMessages = allMessages.filter(
      m => m.chatId === chatId && (isGroup ? m.senderUid !== user.uid : m.receiverUid === user.uid) && m.status !== 'read'
    );
    
    if (unreadMessages.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        batch.update(doc(db, 'messages', msg.id), { status: 'read' });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleEditRecord = (record: StudentRecord) => {
    setEditingRecord(record);
    setNewRecord({
      studentName: record.studentName,
      category: record.category,
      paid: record.paid,
      balance: record.balance,
      visibility: record.visibility,
      sharedWith: record.sharedWith?.join(', ') || ''
    });
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!user || !recordToDelete) return;
    setIsUploading(true);
    try {
      await deleteDoc(doc(db, 'studentRecords', recordToDelete));
      showNotification('Record deleted');
      setIsDeleteRecordModalOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      showNotification('Failed to delete record', 'error');
      handleFirestoreError(error, OperationType.DELETE, `studentRecords/${recordToDelete}`);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (selectedPostFiles.length === 0) {
      setPreviewPostUrls([]);
      return;
    }
    const urls = selectedPostFiles.map(file => URL.createObjectURL(file));
    setPreviewPostUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedPostFiles]);

  const handleCreateStory = async (file: File, schoolId?: string) => {
    if (!user) { setView('login'); return; }
    setIsCreatingStory(true);
    try {
      showNotification('Broadcasting to Story...');
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      
      let mediaUrl = '';
      if (mediaType === 'image') {
        const compressedBase64 = await compressImage(file, 1080, 0.6);
        const folder = schoolId ? 'institution_stories' : 'user_stories';
        const fileRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_story.jpg`);
        const response = await fetch(compressedBase64);
        const blob = await response.blob();
        await uploadBytes(fileRef, blob);
        mediaUrl = await getDownloadURL(fileRef);
      } else {
        const fileRef = ref(storage, `stories_video/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        mediaUrl = await getDownloadURL(fileRef);
      }

      const school = schoolId ? [...schools, ...places].find(s => s.id === schoolId) : null;

      await addDoc(collection(db, 'stories'), {
        authorUid: user.uid,
        authorName: school ? school.name : (user.displayName || 'Anonymous'),
        authorPhoto: school ? school.logo : (user.photoURL || ''),
        mediaUrl,
        mediaType,
        timestamp: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        schoolId: schoolId || null,
        viewers: []
      });
      showNotification('Story shared successfully!');
    } catch (error) {
      console.error('Story failed', error);
      showNotification('Story failed to upload', 'error');
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleMarkStoryAsSeen = async (storyId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        viewers: arrayUnion(user.uid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePost = async () => {
    if (!user) { setView('login'); return; }
    if (!newPostContent.trim()) return;
  
    const isEditing = !!editingPost;
    const content = newPostContent.trim();
    
    if (selectedPostFiles.length === 0 && !isEditing) {
      // Small cleanup logic if someone managed to trigger this without files and content
    }
  
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let mediaUrls: string[] = editingPost?.mediaUrls || (editingPost?.mediaUrl ? [editingPost.mediaUrl] : []);
      let mediaType: 'image' | 'video' | undefined = editingPost?.mediaType;
  
      if (previewPostUrls.length === 0) {
        mediaUrls = [];
        mediaType = undefined;
      }
  
      if (selectedPostFiles.length > 0) {
        console.log('Uploading multiple media files', selectedPostFiles.length);
        const newMediaUrls: string[] = [];
        
        // Determine overall media type from first file mostly, but could be mixed
        // In this app, we'll assume they are the same type or default to image
        mediaType = selectedPostFiles[0].type.startsWith('image/') ? 'image' : 'video';
  
        const totalFiles = selectedPostFiles.length;
        for (let i = 0; i < totalFiles; i++) {
          const file = selectedPostFiles[i];
          let fileToUpload: Blob | File = file;
          const isImage = file.type.startsWith('image/');
  
          if (isImage) {
            try {
              const compressedBase64 = await compressImage(file, 1200, 0.7);
              const response = await fetch(compressedBase64);
              fileToUpload = await response.blob();
            } catch (compErr) {
              console.error('Compression failed', compErr);
            }
          }
  
          const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${i}_${file.name}`);
          const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
  
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const individualProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                // Calculate total progress: (completed files * 100 + current file progress) / total files
                const overallProgress = ((i * 100) + individualProgress) / totalFiles;
                setUploadProgress(overallProgress);
              }, 
              (error) => {
                console.error('Upload failed for file', i, error);
                reject(error);
              }, 
              () => resolve(null)
            );
          });
          
          const downloadUrl = await getDownloadURL(fileRef);
          newMediaUrls.push(downloadUrl);
        }
        
        // If editing, we might want to append or replace. Let's replace for now if new files are selected.
        mediaUrls = newMediaUrls;
      }
  
      const isOfficial = canManageInstitution(view === 'school-feed' ? selectedSchool : null);
      const schoolId = (view === 'school-feed' && selectedSchool) ? selectedSchool.id : 'horizon';
      
      const postData: any = {
        authorUid: user.uid,
        authorName: isOfficial && selectedSchool ? selectedSchool.name : (user.displayName || 'Anonymous'),
        authorPhoto: isOfficial && selectedSchool ? selectedSchool.logo : (user.photoURL || ''),
        authorRole: userDoc?.role || 'user',
        schoolName: isOfficial && selectedSchool ? selectedSchool.name : 'Horizon Network',
        content,
        mediaUrls,
        mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : null, // Fallback for components still using mediaUrl
        mediaType: mediaType || null,
        timestamp: serverTimestamp(),
        isOfficial,
        schoolId
      };
  
      if (isEditing) {
        await setDoc(doc(db, 'posts', editingPost!.id), {
          content,
          mediaUrls,
          mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : null,
          mediaType: mediaType || null,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'posts'), {
          ...postData,
          likes: 0,
          likedBy: [],
          commentsCount: 0,
          reshares: 0,
        });
      }
      
      setNewPostContent('');
      setPreviewPostUrls([]);
      setSelectedPostFiles([]);
      setEditingPost(null);
      setIsPostModalOpen(false);
      showNotification(isEditing ? 'Broadcast updated' : 'Broadcast transmitted');
    } catch (error) {
      console.error('Post operation failed', error);
      showNotification('Transmission failed. Re-opening editor...', 'error');
      setIsPostModalOpen(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setNewPostContent(post.content);
    // Note: We don't set selectedFiles here because we use the existing mediaUrls if no new files are selected
    setPreviewPostUrls(post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []));
    setIsPostModalOpen(true);
  };

  const openNewPostModal = () => {
    setEditingPost(null);
    setNewPostContent('');
    setSelectedPostFiles([]);
    setPreviewPostUrls([]);
    setIsPostModalOpen(true);
  };

  const onDeletePostClick = (post: Post) => {
    setPostToDelete(post);
    setIsDeletePostModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!user || !postToDelete) return;
    try {
      await deleteDoc(doc(db, 'posts', postToDelete.id));
      showNotification('Broadcast deleted');
      setIsDeletePostModalOpen(false);
      setPostToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  };

  const handleLikePost = async (postId: string, likedBy: string[]) => {
    if (!user) { setView('login'); return; }
    const isLiked = likedBy.includes(user.uid);
    const newLikedBy = isLiked ? likedBy.filter(id => id !== user.uid) : [...likedBy, user.uid];
    
    // Optimistic Update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likedBy: newLikedBy, likes: newLikedBy.length } : p));
    showNotification(isLiked ? 'Unliked' : 'Liked');

    try {
      await setDoc(doc(db, 'posts', postId), { 
        likedBy: newLikedBy, 
        likes: newLikedBy.length 
      }, { merge: true });

      if (!isLiked) {
        // Trigger notification for post author
        const post = posts.find(p => p.id === postId);
        if (post && post.authorUid !== user.uid) {
           await handleCreateNotification(post.authorUid, {
              type: 'like',
              title: 'New Like',
              text: `${user.displayName} liked your broadcast`,
              senderUid: user.uid,
              targetId: postId
           });
        }
      }
    } catch (error) {
      // Rollback
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likedBy, likes: likedBy.length } : p));
      showNotification('Failed to update like', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleEditProfile = () => {
    setEditingProfile({
      displayName: user?.displayName || '',
      bio: userDoc?.bio || '',
      isPrivate: userDoc?.isPrivate || false
    });
    setIsEditingProfileInline(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: editingProfile.displayName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: editingProfile.displayName,
        bio: editingProfile.bio,
        isPrivate: editingProfile.isPrivate
      }, { merge: true });
      showNotification('Profile updated');
      setIsEditingProfileInline(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile', 'error');
    }
  };

  const handleResharePost = async (post: Post) => {
    if (!user) { setView('login'); return; }
    showNotification('Broadcasting reshare...');
    try {
      // Optimistically update reshare count on original post
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, reshares: (p.reshares || 0) + 1 } : p));

      await addDoc(collection(db, 'posts'), {
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        content: `Reshared: ${post.content.slice(0, 50)}...`,
        resharedFrom: {
          id: post.id,
          authorName: post.authorName,
          content: post.content
        },
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        reshares: 0,
        timestamp: serverTimestamp(),
        isOfficial: false
      });
      // Increment reshare count on original post
      await setDoc(doc(db, 'posts', post.id), { 
        reshares: (post.reshares || 0) + 1 
      }, { merge: true });
      showNotification('Broadcast reshared');
    } catch (error) {
      // Rollback
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, reshares: (p.reshares || 0) } : p));
      showNotification('Failed to reshare', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const handleForwardPost = async (post: Post) => {
    const shareData = {
      title: 'Exona Post',
      text: `${post.authorName}: ${post.content}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(`${post.authorName}: ${post.content}\n\nShared via Exona`);
      alert('Post content copied to clipboard!');
    }
  };

  const handleAddComment = async () => {
    if (!user || !activePostForComments || !commentText.trim()) return;
    try {
      await addDoc(collection(db, `posts/${activePostForComments.id}/comments`), {
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        text: commentText.trim(),
        timestamp: serverTimestamp()
      });
      // Increment comment count on post
      await updateDoc(doc(db, 'posts', activePostForComments.id), { 
        commentsCount: increment(1)
      });
      showNotification('Comment added');
      setCommentText('');

      // Create notification for post author
      if (activePostForComments.authorUid !== user.uid) {
        await handleCreateNotification(activePostForComments.authorUid, {
          type: 'comment',
          title: 'New Comment',
          text: `${user.displayName} commented on your broadcast`,
          senderUid: user.uid,
          targetId: activePostForComments.id
        });
      }
    } catch (error) {
      showNotification('Failed to add comment', 'error');
      handleFirestoreError(error, OperationType.CREATE, `posts/${activePostForComments.id}/comments`);
    }
  };

  const handleUpdateComment = async (postId: string, commentId: string, newText: string) => {
    if (!user || !newText.trim()) return;
    try {
      await updateDoc(doc(db, `posts/${postId}/comments`, commentId), {
        text: newText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      showNotification('Comment updated');
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      showNotification('Failed to update comment', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
      // Optionally decrement comment count on post
      if (activePostForComments) {
        await setDoc(doc(db, 'posts', activePostForComments.id), { 
          commentsCount: Math.max(0, (activePostForComments.commentsCount || 0) - 1) 
        }, { merge: true });
      }
      showNotification('Comment deleted');
    } catch (error) {
      showNotification('Failed to delete comment', 'error');
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  useEffect(() => {
    if (!activePostForComments) {
      setPostComments([]);
      return;
    }
    const q = query(collection(db, `posts/${activePostForComments.id}/comments`), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPostComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [activePostForComments]);


  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check for email verification
        if (!currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === 'password')) {
          setUser(currentUser);
          setLoading(false);
          return;
        }

        try {
          // Ensure doc exists and role is correct
          const storedRef = localStorage.getItem('exona_ref');
          const docData = await ensureUserDocument(currentUser, storedRef);
          
          if (!docData?.country) {
            setView('onboarding');
          }
          
          // Listen real-time to user document
          userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserDoc(data);
              
              if (!data.country && view !== 'splash') {
                setView('onboarding');
              }
              
              // Bootstrap admin role for owner email if not set
              if (currentUser.email === 'musstaphamusa@gmail.com' && data.role !== 'admin') {
                await setDoc(doc(db, 'users', currentUser.uid), { role: 'admin' }, { merge: true });
              }
            } else {
              // Create user doc if it doesn't exist
              const initialData = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || 'User',
                role: currentUser.email === 'musstaphamusa@gmail.com' ? 'admin' : 'user'
              };
              await setDoc(doc(db, 'users', currentUser.uid), initialData);
              setUserDoc(initialData);
            }
          });

          setUser(currentUser);
          // Only transition if we are already at the login screen. 
          // If we are at 'splash', let the splash timer handle the transition.
          setView(prev => (prev === 'login') ? 'feed' : prev);
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      } else {
        if (userUnsubscribe) userUnsubscribe();
        setUser(null);
        setUserDoc(null);
        setVerificationSent(false);
        // Allow guest to see feed by default
        setView(prev => prev !== 'splash' ? 'feed' : prev);
      }
      setLoading(false);
    });
    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (splashDone && !loading && view === 'splash') {
      if (userDoc?.role === 'admin') {
        setView('admin');
      } else {
        setView('feed');
      }
    }
  }, [splashDone, loading, user, userDoc, view]);

  // Data listeners - Master data (Schools/Places)
  useEffect(() => {
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'schools');
      }
    });

    const unsubPlaces = onSnapshot(collection(db, 'places'), (snap) => {
      setPlaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Place)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'places');
      }
    });

    return () => { unsubSchools(); unsubPlaces(); };
  }, []);

  // Data listeners - Personalized data (Posts, Admin data, Messages)
  useEffect(() => {
    let unsubPosts = () => {};
    let unsubAllRecords = () => {};
    let unsubAllAttendance = () => {};
    let unsubAllFinance = () => {};
    let unsubAllMessages = () => {};
    let unsubNotifications = () => {};
    let unsubStories = () => {};

    if (user && userDoc) {
      // Notifications
      const qNotifications = query(collection(db, `users/${user.uid}/notifications`), orderBy('timestamp', 'desc'), limit(50));
      unsubNotifications = onSnapshot(qNotifications, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      }, (error) => {
        console.error('Notifications listener error:', error);
        if (user) {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
        }
      });

      // Personalized Feed
      const following = userDoc.following || [];
      const managedIds = [
        ...schools.filter(s => s.creatorUid === user.uid).map(s => s.id),
        ...places.filter(p => p.creatorUid === user.uid).map(p => p.id)
      ];
      const relevantIds = [...new Set([user.uid, ...following, ...managedIds, selectedSchool?.id].filter(Boolean))];
      
      if (relevantIds.length > 0) {
        const limitedIds = relevantIds.slice(0, 30);
        
        const qAuthor = query(collection(db, 'posts'), where('authorUid', 'in', limitedIds), orderBy('timestamp', 'desc'), limit(postsLimit));
        const qSchool = query(collection(db, 'posts'), where('schoolId', 'in', limitedIds), orderBy('timestamp', 'desc'), limit(postsLimit));
        
        const unsubAuthor = onSnapshot(qAuthor, (snap) => {
          const authorPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          setPosts(prev => {
            const otherPosts = prev.filter(p => !authorPosts.find(ap => ap.id === p.id));
            const merged = [...otherPosts, ...authorPosts].sort((a, b) => {
              const tA = (a.timestamp as any)?.toMillis?.() || Date.now();
              const tB = (b.timestamp as any)?.toMillis?.() || Date.now();
              return tB - tA;
            });
            return merged;
          });
          setIsLoadingMore(false);
          // Simple check for more posts: if we get fewer than limit, we might be at the end
          if (authorPosts.length < postsLimit) {
            setHasMorePosts(false);
          } else {
            setHasMorePosts(true);
          }
        }, (error) => {
          setIsLoadingMore(false);
          if (!error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'posts (author)');
          }
        });

        const unsubSchool = onSnapshot(qSchool, (snap) => {
          const schoolPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          setPosts(prev => {
            const otherPosts = prev.filter(p => !schoolPosts.find(sp => sp.id === p.id));
            const merged = [...otherPosts, ...schoolPosts].sort((a, b) => {
              const tA = (a.timestamp as any)?.toMillis?.() || Date.now();
              const tB = (b.timestamp as any)?.toMillis?.() || Date.now();
              return tB - tA;
            });
            return merged;
          });
          setIsLoadingMore(false);
          if (schoolPosts.length < postsLimit && hasMorePosts) {
            // Only set false if authorPosts was also short (approximated)
          }
        }, (error) => {
          setIsLoadingMore(false);
          if (!error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'posts (school)');
          }
        });

        unsubPosts = () => { unsubAuthor(); unsubSchool(); };
      }

      // Data for Download Center / Reports
      if (userDoc.role === 'admin') {
        unsubAllRecords = onSnapshot(collection(db, 'studentRecords'), (snap) => {
          setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
        });
        unsubAllFinance = onSnapshot(collection(db, 'finance'), (snap) => {
          setAllFinance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'finance');
        });
      } else {
        // Non-admins see records for institutions they own, manage, OR follow (for complete access)
        const ownedIds = [...schools, ...places].filter(s => s.creatorUid === user.uid).map(s => s.id);
        const followedIds = [...schools, ...places].filter(s => s.followers?.includes(user.uid)).map(s => s.id);
        const viewerIds = [...schools, ...places].filter(s => s.administrativeViewers?.includes(user.uid)).map(s => s.id);
        
        const authorizedIds = Array.from(new Set([...ownedIds, ...followedIds, ...viewerIds]));
        
        if (authorizedIds.length > 0) {
          const qRecords = query(collection(db, 'studentRecords'), where('schoolId', 'in', authorizedIds));
          unsubAllRecords = onSnapshot(qRecords, (snap) => {
            setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
          });

          const qAttendance = query(collection(db, 'teacherAttendance'), where('schoolId', 'in', authorizedIds));
          unsubAllAttendance = onSnapshot(qAttendance, (snap) => {
            setAllAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAttendance)));
          });
        }
      }

      // Messages
      const messagesQuery = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
      unsubAllMessages = onSnapshot(messagesQuery, (snap) => {
        setAllMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      });

      // Stories listener
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const qStories = query(collection(db, 'stories'), where('timestamp', '>', yesterday), orderBy('timestamp', 'desc'));
      unsubStories = onSnapshot(qStories, (snap) => {
        setStories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
      }, (error) => {
        console.error('Stories listener error:', error);
      });
    }

    return () => { 
      unsubPosts(); 
      unsubAllRecords(); 
      unsubAllAttendance(); 
      unsubAllFinance(); 
      unsubAllMessages(); 
      unsubNotifications(); 
      unsubStories();
    };
  }, [user?.uid, userDoc?.role, userDoc?.following, schools.length, places.length, selectedSchool?.id, postsLimit]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMorePosts) return;
    setIsLoadingMore(true);
    setPostsLimit(prev => prev + 10);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (view !== 'feed') return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        if (!isLoadingMore && hasMorePosts) {
          handleLoadMore();
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMorePosts, view]);

  useEffect(() => {
    if (!selectedSchool) return;

    // Reset record entry states when switching institutions
    setNewRecord({ studentName: '', category: '', paid: 0, balance: 0, visibility: 'private' as Record['visibility'], sharedWith: '' });
    setEditingRecord(null);
    setCalcTuition('');
    setCalcPaid('');

    // Only set up listeners if user is authorized to see this data
    const canAccess = selectedSchool.creatorUid === user?.uid || 
                     userDoc?.role === 'admin' || 
                     selectedSchool.administrativeViewers?.includes(user?.uid || '');

    if (!canAccess) {
      setRecords([]);
      setFinance(null);
      setAttendance([]);
      return;
    }
    
    const q = query(collection(db, 'studentRecords'), where('schoolId', '==', selectedSchool.id));
    const unsubRecords = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord)));
    }, (error) => {
      console.error(`Error fetching ${labels.student.toLowerCase()} records:`, error);
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'studentRecords');
      }
    });

    const unsubFinance = onSnapshot(doc(db, 'finance', selectedSchool.id), (snap) => {
      if (snap.exists()) setFinance(snap.data() as SchoolFinance);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `finance/${selectedSchool.id}`);
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'teacherAttendance'), where('schoolId', '==', selectedSchool.id), orderBy('timestamp', 'desc')), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAttendance)));
    }, (error) => {
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'teacherAttendance');
      }
    });

    return () => { unsubRecords(); unsubFinance(); unsubAttendance(); };
  }, [selectedSchool, user?.uid, userDoc?.role]);

  const renderIconForNotification = (type: Notification['type']) => {
    switch (type) {
      case 'message': return <MessageSquare size={16} />;
      case 'follower_request': return <Users size={16} />;
      case 'like': return <Heart size={16} className="fill-red-500 text-red-500" />;
      case 'comment': return <MessageCircle size={16} />;
      case 'system': return <Settings size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e: any) { 
      console.error('Google Login Error:', e);
      setAuthError(e.message || 'Failed to sign in with Google.');
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !displayName) {
      setAuthError('Please enter your name, email, and a password.');
      return;
    }
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await ensureUserDocument(userCredential.user, localStorage.getItem('exona_ref'), {
        country: selectedSignupCountry.name,
        currency: selectedSignupCountry.currency
      });
      // Email verification is no longer mandatory for core features
    } catch (e: any) {
      console.error('Sign Up Error:', e);
      if (e.code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Try signing in instead.');
      } else if (e.code === 'auth/weak-password') {
        setAuthError('Your password is too weak. Please use at least 6 characters.');
      } else if (e.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError('Something went wrong. Please try again.');
      }
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      console.error('Sign In Error:', e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setAuthError('Incorrect email or password. Please try again.');
      } else if (e.code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please try again later.');
      } else {
        setAuthError('Failed to sign in. Please check your connection.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setAuthError(null);
    try {
      // Re-authenticate if it's a password user
      if (user.providerData.some(p => p.providerId === 'password')) {
        if (!deletePassword) {
          setAuthError('Please enter your password to confirm deletion.');
          setIsDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete user from Auth
      await deleteUser(user);
      
      showNotification('Account terminated');
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setView('login');
    } catch (e: any) {
      console.error('Delete Account Error:', e);
      showNotification('Termination failed', 'error');
      if (e.code === 'auth/requires-recent-login') {
        setAuthError('Please sign out and sign in again to delete your account.');
      } else {
        setAuthError(e.message || 'Failed to delete account.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      setView('login'); 
      showNotification('Logged out successfully');
    } catch (e) { 
      console.error('Logout Error:', e);
      showNotification('Logout failed', 'error');
    }
  };

  const handleUserClick = async (profile: { uid: string, name: string, photo: string }) => {
    setSelectedUserProfile(profile);
    setSelectedUserProfileDoc(null); // Reset while loading
    setView('user-profile');
    
    try {
      const docSnap = await getDoc(doc(db, 'users', profile.uid));
      if (docSnap.exists()) {
        setSelectedUserProfileDoc(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleInstitutionClick = (id: string) => {
    const inst = [...schools, ...places].find(i => i.id === id);
    if (inst) {
      setSelectedInstitutionForProfile(inst);
      setView('institution-profile');
    }
  };

  const handleMessageAuthor = (post: any) => {
    setActiveChat({
      uid: post.authorUid,
      displayName: post.authorName,
      photoURL: post.authorPhoto
    });
    setView('chat');
  };

  const handleSearchUsers = async (queryText: string) => {
    setGlobalSearch(queryText);
    if (!queryText.trim()) {
      setGlobalSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', queryText),
        where('displayName', '<=', queryText + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      const results: UserDoc[] = [];
      snap.forEach(doc => {
        if (doc.id !== user?.uid) {
          results.push(doc.data() as UserDoc);
        }
      });
      setGlobalSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleFollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }
    if (user.uid === targetUid) return;

    try {
      // Quick check if we have data to avoid unnecessary delay if it's already in view
      let targetData = selectedUserProfile?.uid === targetUid ? selectedUserProfileDoc : null;
      let isPrivate = false;

      if (!targetData) {
        const targetDoc = await getDoc(doc(db, 'users', targetUid));
        if (!targetDoc.exists()) return;
        targetData = targetDoc.data() as UserDoc;
      }
      
      isPrivate = targetData.isPrivate || false;

      if (isPrivate) {
        const pending = targetData.pendingFollowers || [];
        if (pending.includes(user.uid)) {
          showNotification('Request already sent');
          return;
        }
        await setDoc(doc(db, 'users', targetUid), { pendingFollowers: [...pending, user.uid] }, { merge: true });
        showNotification('Follow request sent');
      } else {
        const currentFollowing = userDoc.following || [];
        if (currentFollowing.includes(targetUid)) return;

        const newFollowing = [...currentFollowing, targetUid];
        const newTargetFollowers = [...(targetData.followers || []), user.uid];

        // Optimistic update
        setUserDoc({ ...userDoc, following: newFollowing });
        if (selectedUserProfile?.uid === targetUid) {
          setSelectedUserProfileDoc({ ...targetData, followers: newTargetFollowers });
        }
        showNotification('Following user');

        await setDoc(doc(db, 'users', user.uid), { following: newFollowing }, { merge: true });
        await setDoc(doc(db, 'users', targetUid), { followers: newTargetFollowers }, { merge: true });
      }
    } catch (error) {
      showNotification('Failed to follow user', 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAcceptFollower = async (requesterUid: string) => {
    if (!user || !userDoc) return;
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const requesterRef = doc(db, 'users', requesterUid);

      const newFollowers = [...(userDoc.followers || []), requesterUid];
      const newPending = (userDoc.pendingFollowers || []).filter(uid => uid !== requesterUid);
      
      await setDoc(currentUserRef, { 
        followers: newFollowers, 
        pendingFollowers: newPending 
      }, { merge: true });
      setUserDoc({ ...userDoc, followers: newFollowers, pendingFollowers: newPending });

      const requesterDoc = await getDoc(requesterRef);
      if (requesterDoc.exists()) {
        const requesterData = requesterDoc.data() as UserDoc;
        const newFollowing = [...(requesterData.following || []), user.uid];
        await setDoc(requesterRef, { following: newFollowing }, { merge: true });
      }

      showNotification('Follower accepted');
    } catch (error) {
      console.error('Error accepting follower:', error);
      showNotification('Failed to accept follower', 'error');
    }
  };

  const handleUnfollowUser = async (targetUid: string) => {
    if (!user || !userDoc) { setView('login'); return; }

    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUid);

      const currentFollowing = userDoc.following || [];
      const newFollowing = currentFollowing.filter((id: string) => id !== targetUid);
      
      // Optimistic update
      setUserDoc({ ...userDoc, following: newFollowing });
      if (selectedUserProfile?.uid === targetUid && selectedUserProfileDoc) {
        setSelectedUserProfileDoc({ 
          ...selectedUserProfileDoc, 
          followers: (selectedUserProfileDoc.followers || []).filter(id => id !== user.uid),
          pendingFollowers: (selectedUserProfileDoc.pendingFollowers || []).filter(id => id !== user.uid)
        });
      }
      showNotification('Unfollowed user');

      await setDoc(currentUserRef, { following: newFollowing }, { merge: true });
      await setDoc(targetUserRef, { 
        followers: arrayRemove(user.uid),
        pendingFollowers: arrayRemove(user.uid)
      }, { merge: true });
    } catch (error) {
      showNotification('Failed to unfollow user', 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeclineFollower = async (requesterUid: string) => {
    if (!user || !userDoc) return;
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const newPending = (userDoc.pendingFollowers || []).filter(uid => uid !== requesterUid);
      await setDoc(currentUserRef, { pendingFollowers: newPending }, { merge: true });
      setUserDoc({ ...userDoc, pendingFollowers: newPending });
      showNotification('Follow request declined');
    } catch (error) {
      console.error('Error declining follower:', error);
      showNotification('Failed to decline follower', 'error');
    }
  };

  const canManageInstitution = (school: School | Place | null) => {
    if (!user || !userDoc) return false;
    if (userDoc.role === 'admin') return true;
    if (!school) return false;
    // EXTENDED ACCESS: Creators, Administrative Viewers, and Approved Followers have access
    return school.creatorUid === user.uid || 
           school.administrativeViewers?.includes(user.uid) || 
           school.followers?.includes(user.uid);
  };



  const handleFollowInstitution = async (school: School | Place) => {
    if (!user) { setView('login'); return; }
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      if (school.followers?.includes(user.uid) || school.pendingFollowers?.includes(user.uid)) return;

      await setDoc(schoolRef, { 
        pendingFollowers: arrayUnion(user.uid) 
      }, { merge: true });
      
      // Notify institution owner
      if (school.creatorUid !== user.uid) {
        await handleCreateNotification(school.creatorUid, {
          type: 'follower_request',
          title: 'New Request',
          text: `${user.displayName} wants to join ${school.name}`,
          senderUid: user.uid,
          targetId: school.id
        });
      }

      showNotification('Follow request sent');
    } catch (error) {
      console.error('Error following institution:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleUnfollowInstitution = async (school: School | Place, targetUid?: string) => {
    if (!user || !userDoc) return;
    const uidToRemove = targetUid || user.uid;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      const userRef = doc(db, 'users', uidToRemove);
      
      await Promise.all([
        setDoc(schoolRef, { 
          followers: arrayRemove(uidToRemove),
          pendingFollowers: arrayRemove(uidToRemove)
        }, { merge: true }),
        setDoc(userRef, { 
          following: arrayRemove(school.id) 
        }, { merge: true })
      ]);
      showNotification('Unfollowed successfully');
    } catch (error) {
      console.error('Error unfollowing institution:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleApproveFollower = async (school: School | Place, followerUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      const userRef = doc(db, 'users', followerUid);
      const creatorRef = doc(db, 'users', school.creatorUid);
      
      await Promise.all([
        setDoc(schoolRef, { 
          followers: arrayUnion(followerUid),
          pendingFollowers: arrayRemove(followerUid)
        }, { merge: true }),
        setDoc(userRef, { 
          following: arrayUnion(school.id, school.creatorUid) 
        }, { merge: true }),
        school.creatorUid !== followerUid ? setDoc(creatorRef, {
          followers: arrayUnion(followerUid)
        }, { merge: true }) : Promise.resolve(),
        // Create notification for the new joiner
        handleCreateNotification(followerUid, {
          type: 'follower_request',
          title: 'Request Approved',
          text: `You have been approved by ${school.name}`,
          targetId: school.id
        })
      ]);
      showNotification('Member approved');
    } catch (error) {
      console.error('Error approving follower:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleRejectFollower = async (school: School | Place, followerUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await setDoc(schoolRef, { 
        pendingFollowers: arrayRemove(followerUid)
      }, { merge: true });
      showNotification('Request rejected');
    } catch (error) {
      console.error('Error rejecting follower:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleRequestAuditorAccess = async (school: School | Place) => {
    if (!user) { setView('login'); return; }
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      // We'll use a new field 'pendingAuditors' to store these requests
      await updateDoc(schoolRef, {
        pendingAuditors: arrayUnion(user.uid)
      });
      
      showNotification('Management request sent');
      
      // Also notify the creator
      if (school.creatorUid) {
        await handleCreateNotification(school.creatorUid, {
          type: 'message', 
          title: 'Auditor Request',
          text: `${user.displayName || 'A user'} requested auditor access for ${school.name}`,
          senderUid: user.uid,
          targetId: school.id,
          link: 'manage'
        });
      }
    } catch (error) {
      console.error('Error requesting auditor access:', error);
      handleFirestoreError(error, OperationType.UPDATE, `institutions/${school.id}`);
    }
  };

  const handleApproveAuditor = async (school: School | Place, applicantUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await updateDoc(schoolRef, {
        pendingAuditors: arrayRemove(applicantUid),
        administrativeViewers: arrayUnion(applicantUid)
      });
      
      showNotification('Auditor approved');
      
      await handleCreateNotification(applicantUid, {
        type: 'message',
        title: 'Auditor Approved',
        text: `Your auditor request for ${school.name} was approved!`,
        senderUid: user.uid,
        targetId: school.id,
        link: 'records'
      });
    } catch (error) {
      console.error('Error approving auditor:', error);
    }
  };

  const handleRejectAuditor = async (school: School | Place, applicantUid: string) => {
    if (!user) return;
    try {
      const collectionName = school.type === 'school' ? 'schools' : 'places';
      const schoolRef = doc(db, collectionName, school.id);
      
      await updateDoc(schoolRef, {
        pendingAuditors: arrayRemove(applicantUid)
      });
      
      showNotification('Request rejected');
    } catch (error) {
      console.error('Error rejecting auditor:', error);
    }
  };

  const canUserReply = (post: Post, school: any) => {
    if (!user) return false;
    if (canManageInstitution(school) || userDoc?.role === 'admin') return true;
    const permission = school?.replyPermission || 'everyone';
    if (permission === 'everyone') return true;
    if (permission === 'followers') return school?.followers?.includes(user.uid);
    return false;
  };

  const canAccessInstitutionData = (school: School | Place | null) => {
    if (!user || !school) return false;
    // Only creators, administrative viewers, and system admins can see sensitive institutional data
    return canManageInstitution(school) || userDoc?.role === 'admin';
  };

  const handleNavigateToData = (targetView: string) => {
    if (!selectedSchool) {
      showNotification('Please select an institution first', 'error');
      setView('schools');
      setSidebarOpen(false);
      return;
    }
    if (canAccessInstitutionData(selectedSchool)) {
      setView(targetView as any);
      setSidebarOpen(false);
    } else {
      showNotification('Access denied. You must be an approved member.', 'error');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'admin': {
        if (userDoc?.role !== 'admin') { setView('feed'); return null; }
        const schoolCount = schools.length;
        const placeCount = places.length;
        const totalMembers = allRecords.length;

        return (
          <div className="w-full max-w-[1600px] mx-auto py-8 sm:py-12 px-4 sm:px-8 pb-32 lg:pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-10 sm:mb-16">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl sm:text-5xl font-bold text-ink tracking-tight mb-2 font-display"
                >
                  Admin Terminal
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted text-[11px] font-bold uppercase tracking-[0.4em]"
                >
                  System Statistics & Oversight
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {[
                { label: 'Total Schools', value: schoolCount, color: 'accent' },
                { label: 'Total Places', value: placeCount, color: 'purple-600' },
                { label: 'Total Members', value: totalMembers, color: 'green-600' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 group hover:border-accent/20 transition-all shadow-sm"
                >
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-3 sm:mb-4">{stat.label}</p>
                  <h3 className={`text-2xl sm:text-3xl font-bold font-display text-${stat.color}`}>{stat.value}</h3>
                  <div className="mt-8 h-1.5 w-full bg-white border border-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className={`h-full bg-ink`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm"
              >
                <div className="p-6 sm:p-10 border-b border-gray-50 flex items-center justify-between">
                  <h4 className="font-extrabold text-xl sm:text-2xl text-ink tracking-tight">Institution Directory</h4>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white border border-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-muted">
                    <LayoutGrid size={20} />
                  </div>
                </div>
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institution</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Type</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Member Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...schools, ...places].map(school => {
                        const memberCount = allRecords.filter(r => r.schoolId === school.id).length;
                        return (
                          <tr key={school.id} className="hover:bg-white transition-colors group border-b border-gray-100">
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center">
                                  {school.logo ? (
                                    <img src={school.logo} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-muted text-[10px] font-bold">{school.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-ink text-[15px] tracking-tight">{school.name}</p>
                                  <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1">{school.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${school.type === 'school' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                {school.type}
                              </span>
                            </td>
                            <td className="px-10 py-8 font-mono font-bold text-ink text-sm">{memberCount} Members</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Admin Mobile Card View */}
                <div className="md:hidden">
                  {[...schools, ...places].map(school => {
                    const memberCount = allRecords.filter(r => r.schoolId === school.id).length;
                    return (
                      <div key={school.id} className="p-5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-11 w-11 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shadow-sm shrink-0">
                            {school.logo ? (
                              <img src={school.logo} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-muted text-[10px] font-black">{school.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 pr-2">
                            <p className="font-black text-ink text-[13px] truncate tracking-tight mb-0.5">{school.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${school.type === 'school' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {school.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                          <div>
                            <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-0.5">Community Size</p>
                            <p className="font-mono font-black text-ink text-xs">{memberCount} Members</p>
                          </div>
                          <ChevronRight size={14} className="text-muted/30" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {(userDoc?.role === 'admin' && pendingKeyRequests.length > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm"
                >
                  <div className="p-6 sm:p-10 border-b border-gray-50 flex items-center justify-between">
                    <h4 className="font-extrabold text-xl sm:text-2xl text-ink tracking-tight">Access Key Requests</h4>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                      <Lock size={20} />
                    </div>
                  </div>
                  <div className="p-6 sm:p-10 space-y-4">
                    {pendingKeyRequests.map(request => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-gray-100">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-sm tracking-tight">{request.institutionName}</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">ID: {request.institutionId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={async () => {
                              try {
                                const secretKey = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                                const batch = writeBatch(db);
                                
                                // Update request
                                batch.update(doc(db, 'keyRequests', request.id), {
                                  status: 'approved',
                                  approvedAt: serverTimestamp(),
                                  secretKey
                                });
                                
                                // Update institution in both possible collections
                                const schoolDoc = await getDoc(doc(db, 'schools', request.institutionId));
                                const collectionName = schoolDoc.exists() ? 'schools' : 'places';
                                
                                batch.update(doc(db, collectionName, request.institutionId), {
                                  portalSecretKey: secretKey,
                                  portalKeyStatus: 'approved'
                                });
                                
                                await batch.commit();
                                showNotification('Key request approved and key generated', 'success');
                              } catch (e) {
                                handleFirestoreError(e, OperationType.WRITE, 'keyRequests/batch');
                                showNotification('Failed to approve request', 'error');
                              }
                            }}
                            className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                          >
                            Approve
                          </button>
                          <button 
                             onClick={async () => {
                               try {
                                 await updateDoc(doc(db, 'keyRequests', request.id), { status: 'rejected' });
                                 showNotification('Request rejected');
                               } catch (e) {
                                 handleFirestoreError(e, OperationType.UPDATE, `keyRequests/${request.id}`);
                               }
                             }}
                             className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-100 text-muted rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        );
      }
      case 'feed': {
        return (
          <div className="w-full min-h-screen bg-gray-50/50">
            <div className="max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar max-w-[calc(100vw-80px)] sm:max-w-none">
                <button 
                  onClick={() => setFeedTab('institutions')}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${feedTab === 'institutions' ? 'bg-ink text-white shadow-lg' : 'text-muted hover:bg-white'}`}
                >
                  Institutions
                </button>
                <button 
                  onClick={() => setFeedTab('broadcasts')}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${feedTab === 'broadcasts' ? 'bg-ink text-white shadow-lg' : 'text-muted hover:bg-white'}`}
                >
                  Broadcasts
                </button>
              </div>
              {user && (
                <button 
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="h-12 w-12 bg-accent text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>

            {feedTab === 'institutions' ? (
              <>
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'school', 'place'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSchoolFilter(f as any)}
                      className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                        schoolFilter === f 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'bg-white text-muted border border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'school' ? 'Schools' : 'Places'}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-gray-100">
                  {[...schools, ...places]
                    .filter(s => s.name.toLowerCase().includes(globalSearch.toLowerCase()))
                    .filter(s => schoolFilter === 'all' || s.type === schoolFilter)
                    .filter(s => {
                      // If searching, show all matching
                      if (globalSearch.trim() !== '') return true;
                      // Admins see all
                      if (userDoc?.role === 'admin') return true;
                      // Otherwise only show created or where user is an administrative viewer
                      return s.creatorUid === user?.uid || 
                             s.administrativeViewers?.includes(user?.uid || '');
                    })
                    .map(school => {
                      const latestAnnouncement = posts.find(p => p.schoolId === school.id && p.authorUid === school.creatorUid);
                      return (
                        <div 
                          key={school.id}
                          className="py-6 border-b border-gray-50 group"
                        >
                          <div 
                            className="cursor-pointer mb-4 flex items-start gap-3"
                            onClick={() => { setSelectedInstitutionForProfile(school); setView('institution-profile'); }}
                          >
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden border border-gray-100 bg-white shrink-0 relative">
                              {school.logo ? (
                                <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-ink">{school.name.charAt(0)}</span>
                              )}
                              {isRecentlyActive(school.id) && (
                                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full ring-2 ring-white animate-pulse shadow-lg shadow-green-500/50" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[17px] font-extrabold text-ink mb-1">{school.name}</h4>
                              {latestAnnouncement ? (
                                <p className="text-[13px] text-muted line-clamp-2 leading-relaxed">
                                  {latestAnnouncement.content}
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted/40 font-bold uppercase tracking-widest">No announcements yet</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Institution Action Buttons */}
                          {(school.creatorUid === user?.uid || userDoc?.role === 'admin' || school.administrativeViewers?.includes(user?.uid || '')) && (
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                              <button 
                                onClick={() => { setSelectedSchool(school); handleNavigateToData('records'); }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                              >
                                <ClipboardList size={12} className="group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{getLabels(school.type).student} Records</span>
                              </button>
                              <button 
                                onClick={() => { setSelectedSchool(school); handleNavigateToData('attendance'); }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-muted hover:bg-ink hover:text-white rounded-lg transition-all duration-300 group/btn whitespace-nowrap flex-shrink-0"
                              >
                                <Calendar size={12} className="group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{getLabels(school.type).attendance}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {posts.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="h-20 w-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                      <MessageSquare size={32} className="text-gray-200" />
                    </div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-muted">No broadcasts yet</p>
                  </div>
                ) : (
                  posts.map(post => {
                    const school = schools.find(s => s.id === post.schoolId) || places.find(p => p.id === post.schoolId);
                    return (
                      <FeedPost 
                        key={post.id} 
                        post={post} 
                        onUserClick={handleUserClick}
                        onInstitutionClick={handleInstitutionClick}
                        onLike={handleLikePost}
                        onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                        onMessage={handleMessageAuthor}
                        onReshare={handleResharePost}
                        onForward={handleForwardPost}
                        onEdit={handleEditPost}
                        onDelete={onDeletePostClick}
                        currentUserId={user?.uid}
                        canManage={userDoc?.role === 'admin' || (post.schoolId && [...schools, ...places].find(s => s.id === post.schoolId)?.creatorUid === user?.uid)}
                        canReply={canUserReply(post, school)}
                      />
                    );
                  })
                )}

                {posts.length > 0 && hasMorePosts && (
                  <div className="py-12 flex flex-col items-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-10 py-5 bg-white border border-gray-100 text-ink rounded-3xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-50 transition-all flex items-center gap-3 disabled:opacity-50 ${isLoadingMore ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    >
                      {isLoadingMore ? (
                        <div className="h-4 w-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                      {isLoadingMore ? 'Synchronizing...' : 'Show More Broadcasts'}
                    </button>
                  </div>
                )}

                {!hasMorePosts && posts.length > 0 && (
                  <div className="py-16 text-center">
                    <div className="h-1 w-12 bg-gray-100 mx-auto rounded-full mb-6" />
                    <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">End of Transmission</p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        );
      }
      case 'school-feed': {
        if (!selectedSchool) { setView('schools'); return null; }
        const schoolPosts = posts.filter(p => p.schoolId === selectedSchool.id);
        const isFollowing = selectedSchool.followers?.includes(user?.uid || '');
        const isManager = canManageInstitution(selectedSchool);
        const isAdmin = userDoc?.role === 'admin';
        const canSeeContent = isFollowing || isManager || isAdmin;

        return (
          <div className="w-full max-w-xl mx-auto py-4 px-4">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('schools')} className="p-2 hover:bg-white border border-transparent hover:border-gray-100 rounded-full transition-colors text-accent">
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-100 bg-white flex items-center justify-center">
                      {selectedSchool.logo ? (
                        <img src={selectedSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-muted text-[10px] font-bold">{selectedSchool.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-ink text-base leading-tight">{selectedSchool.name}</h2>
                      <p className="text-[10px] text-muted font-bold">Online</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user && !isManager && !isAdmin && (
                    <>
                      {isFollowing ? (
                        <button 
                          onClick={() => handleUnfollowInstitution(selectedSchool)}
                          className="px-4 py-2 bg-white border border-gray-100 text-muted rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          Unfollow
                        </button>
                      ) : selectedSchool.pendingFollowers?.includes(user.uid) ? (
                        <button 
                          disabled
                          className="px-4 py-2 bg-white border border-gray-100 text-muted/50 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed"
                        >
                          Pending
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleFollowInstitution(selectedSchool)}
                          className="px-4 py-2 bg-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-colors"
                        >
                          Follow
                        </button>
                      )}
                    </>
                  )}
                  {isManager && (
                    <button 
                      onClick={() => openNewPostModal()}
                      className="h-10 w-10 bg-accent text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {isManager && (
                <div className="flex bg-white p-1 rounded-xl border border-gray-100">
                  <button 
                    onClick={() => setSchoolFeedTab('feed')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${schoolFeedTab === 'feed' ? 'bg-ink text-white' : 'text-muted hover:bg-gray-50'}`}
                  >
                    Feed
                  </button>
                  <button 
                    onClick={() => setSchoolFeedTab('manage')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${schoolFeedTab === 'manage' ? 'bg-ink text-white' : 'text-muted hover:bg-gray-50'}`}
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>

            {schoolFeedTab === 'feed' && isManager && (
              <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl overflow-hidden bg-accent/5 flex items-center justify-center text-accent font-bold border border-gray-100">
                    {selectedSchool.logo ? (
                      <img src={selectedSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-accent">{selectedSchool.name.charAt(0)}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => openNewPostModal()}
                    className="flex-1 text-left px-4 py-2.5 bg-gray-50 rounded-xl text-muted text-[13px] font-medium hover:bg-gray-100 transition-colors"
                  >
                    Post an official update...
                  </button>
                </div>
              </div>
            )}

            {!canSeeContent ? (
              <div className="py-20 text-center bg-white border border-gray-100 rounded-[2.5rem] px-8">
                <div className="h-20 w-20 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-center text-muted mx-auto mb-6">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Follow to see content</h3>
                <p className="text-sm text-muted font-bold mb-8">This institution's posts are only visible to approved followers.</p>
                {!selectedSchool.pendingFollowers?.includes(user?.uid || '') && (
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleFollowInstitution(selectedSchool)}
                      className="w-full px-8 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 transition-all"
                    >
                      Request to Join
                    </button>
                    {!selectedSchool.administrativeViewers?.includes(user?.uid || '') && !(selectedSchool as any).pendingAuditors?.includes(user?.uid || '') && (
                      <button 
                        onClick={() => handleRequestAuditorAccess(selectedSchool)}
                        className="w-full px-8 py-3 bg-white border border-gray-100 text-muted rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                      >
                        Request Management Access
                      </button>
                    )}
                    {(selectedSchool as any).pendingAuditors?.includes(user?.uid || '') && (
                      <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Management Request Pending</p>
                    )}
                  </div>
                )}
              </div>
            ) : schoolFeedTab === 'manage' ? (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-extrabold text-ink">Pending Approvals</h3>
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {selectedSchool.pendingFollowers?.length || 0} Requests
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {(!selectedSchool.pendingFollowers || selectedSchool.pendingFollowers.length === 0) ? (
                      <div className="py-10 text-center opacity-30">
                        <Users size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold">No pending requests</p>
                      </div>
                    ) : (
                      selectedSchool.pendingFollowers.map(uid => (
                        <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100 overflow-hidden">
                              {pendingFollowerProfilesMap[uid]?.photoURL ? (
                                <img src={pendingFollowerProfilesMap[uid].photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                pendingFollowerProfilesMap[uid]?.displayName?.charAt(0) || '?'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerProfilesMap[uid]?.displayName || 'Loading...'}</p>
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Wants to follow</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleRejectFollower(selectedSchool, uid)}
                              className="h-10 w-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-red-50 transition-colors"
                            >
                              <X size={18} />
                            </button>
                            <button 
                              onClick={() => handleApproveFollower(selectedSchool, uid)}
                              className="h-10 w-10 bg-ink text-white rounded-xl flex items-center justify-center hover:bg-ink/90 transition-colors"
                            >
                              <Check size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-extrabold text-ink">Approved Members</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {(!selectedSchool.followers || selectedSchool.followers.length === 0) ? (
                      <div className="py-10 text-center opacity-30">
                        <Users size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold">No members yet</p>
                      </div>
                    ) : (
                      selectedSchool.followers.map(uid => (
                        <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-accent font-bold border border-gray-100 overflow-hidden">
                              {pendingFollowerProfilesMap[uid]?.photoURL ? (
                                <img src={pendingFollowerProfilesMap[uid].photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                pendingFollowerProfilesMap[uid]?.displayName?.charAt(0) || '?'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">{pendingFollowerProfilesMap[uid]?.displayName || 'Loading...'}</p>
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Member</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleUnfollowInstitution(selectedSchool, uid)}
                            className="h-10 w-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-red-50 transition-colors"
                            title="Remove Member"
                          >
                            <UserMinus size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <h3 className="text-xl font-extrabold text-ink mb-8">Quick Management</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => handleNavigateToData('records')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Database size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Records</span>
                    </button>
                    <button 
                      onClick={() => handleNavigateToData('attendance')}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{labels.attendance}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                  <h3 className="text-xl font-extrabold text-ink mb-8">Institution Controls</h3>
                  
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Who can reply to posts</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['everyone', 'followers', 'none'] as const).map((perm) => (
                        <button
                          key={perm}
                          onClick={() => handleUpdateReplyPermission(selectedSchool.id, perm)}
                          className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            (selectedSchool.replyPermission || 'everyone') === perm
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:border-accent'
                          }`}
                        >
                          {perm}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Grant Data Access (Specific Owner)</p>
                    <div className="relative mb-4">
                      <input 
                        type="text" 
                        placeholder="Search account name..."
                        value={auditorSearch}
                        onChange={(e) => handleSearchAuditors(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-accent/20"
                      />
                      {isAuditorSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2"><Search className="animate-pulse text-muted" size={14} /></div>}
                    </div>

                    {auditorResults.length > 0 && (
                      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
                        {auditorResults.map(u => (
                          <button
                            key={u.uid}
                            onClick={() => { handleToggleAdminViewer(selectedSchool!.id, u.uid, 'add'); setAuditorResults([]); setAuditorSearch(''); }}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-100 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full border border-white" referrerPolicy="no-referrer" />
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-ink">{u.displayName}</p>
                              <p className="text-[9px] text-muted uppercase tracking-wider">{u.email.split('@')[0]}</p>
                            </div>
                            <Plus size={14} className="ml-auto text-accent" />
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedSchool.administrativeViewers && selectedSchool.administrativeViewers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest ml-4">Current Authorized Viewers</p>
                        {selectedSchool.administrativeViewers.map(uid => (
                          <div key={uid} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
                            <span className="text-[10px] font-bold text-ink font-mono">{uid.substring(0, 8)}...</span>
                            <button 
                              onClick={() => handleToggleAdminViewer(selectedSchool.id, uid, 'remove')}
                              className="text-[9px] font-bold text-red-600 uppercase tracking-widest hover:underline"
                            >
                              Revoke Access
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleEditSchool(selectedSchool)}
                      className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all group"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-ink shadow-sm group-hover:scale-110 transition-transform">
                        <Edit2 size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Edit Details</span>
                    </button>
                    {selectedSchool.creatorUid === user?.uid && (
                      <button 
                        onClick={() => { setSchoolToDelete(selectedSchool.id); setIsDeleteSchoolModalOpen(true); }}
                        className="flex flex-col items-center gap-3 p-6 bg-red-50/30 rounded-2xl border border-transparent hover:border-red-100 transition-all group"
                      >
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Trash2 size={20} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-600/70">Delete Space</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  {schoolPosts.map(post => (
                    <FeedPost 
                      key={post.id} 
                      post={post} 
                      onUserClick={handleUserClick}
                      onInstitutionClick={handleInstitutionClick}
                      onLike={handleLikePost}
                      onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                      onMessage={handleMessageAuthor}
                      onReshare={handleResharePost}
                      onForward={handleForwardPost}
                      onEdit={handleEditPost}
                      onDelete={onDeletePostClick}
                      currentUserId={user?.uid}
                      canManage={isManager || isAdmin}
                      canReply={canUserReply(post, selectedSchool)}
                    />
                  ))}
                  {schoolPosts.length === 0 && (
                    <div className="py-20 text-center text-muted">
                      <p className="text-sm font-medium">No posts yet from this institution.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }
      case 'user-profile': {
        if (!selectedUserProfile) { setView('feed'); return null; }
        const profilePosts = posts.filter(p => p.authorUid === selectedUserProfile.uid);
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-ink mb-1">{selectedUserProfile.name}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-ink text-[14px]">{selectedUserProfile.name?.toLowerCase().replace(/\s+/g, '')}</p>
                  <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-full text-muted text-[11px] font-bold">exona.io</span>
                </div>
              </div>
              <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                {selectedUserProfile.photo ? (
                  <img src={selectedUserProfile.photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full bg-white border border-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
                    {selectedUserProfile.name?.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <p className="text-ink text-[14px] mb-6 whitespace-pre-wrap">
              {selectedUserProfileDoc?.bio || "No bio yet."}
            </p>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-5 rounded-full border-2 border-white bg-white border border-gray-100" />
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-10">
              {user && user.uid !== selectedUserProfile.uid && (
                <button 
                  onClick={() => {
                    const isFollowing = userDoc?.following?.includes(selectedUserProfile.uid);
                    if (isFollowing) {
                      handleUnfollowUser(selectedUserProfile.uid);
                    } else {
                      handleFollowUser(selectedUserProfile.uid);
                    }
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-[14px] transition-all ${
                    userDoc?.following?.includes(selectedUserProfile.uid)
                    ? 'bg-white text-ink border border-gray-200 hover:bg-gray-50'
                    : 'bg-ink text-white hover:bg-ink/90'
                  }`}
                >
                  {userDoc?.following?.includes(selectedUserProfile.uid) ? 'Following' : 'Follow'}
                </button>
              )}
              {user && user.uid !== selectedUserProfile.uid && (
                <button 
                  onClick={() => {
                    setActiveChat({
                      uid: selectedUserProfile.uid,
                      displayName: selectedUserProfile.name,
                      photoURL: selectedUserProfile.photo
                    });
                    setView('chat');
                  }}
                  className="flex-1 py-2 bg-accent text-white rounded-xl font-bold text-[14px] hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  Message
                </button>
              )}
              <button className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-colors">
                Mention
              </button>
            </div>

            <div className="flex border-b border-gray-100 mb-4">
              <button className="flex-1 py-3 text-[14px] font-bold text-ink border-b-2 border-ink">Broadcasts</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Replies</button>
              <button className="flex-1 py-3 text-[14px] font-bold text-muted hover:text-ink transition-colors">Reposts</button>
            </div>

            <div className="flex flex-col">
              {profilePosts.map(post => {
                const school = post.schoolId ? (schools.find(s => s.id === post.schoolId) || places.find(p => p.id === post.schoolId)) : null;
                return (
                  <FeedPost 
                    key={post.id} 
                    post={post} 
                    onUserClick={handleUserClick}
                    onInstitutionClick={handleInstitutionClick}
                    onLike={handleLikePost}
                    onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                    onMessage={handleMessageAuthor}
                    onReshare={handleResharePost}
                    onForward={handleForwardPost}
                    onEdit={handleEditPost}
                    onDelete={onDeletePostClick}
                    currentUserId={user?.uid}
                    canManage={userDoc?.role === 'admin' || (post.schoolId && [...schools, ...places].find(s => s.id === post.schoolId)?.creatorUid === user?.uid)}
                    canReply={canUserReply(post, school || undefined)}
                  />
                );
              })}
            </div>
          </div>
        );
      }
      case 'schools': {
        const invitesCount = userDoc?.invitesCount || 0;
        const isQualified = userDoc?.isLifetimeFree || invitesCount >= 3;
        const inviteProgress = Math.min(invitesCount, 3);
        const myInstitutions = [...schools, ...places].filter(s => s.creatorUid === user?.uid);

        return (
          <div className="w-full max-w-xl mx-auto pb-32">
            <div className="flex items-center justify-between py-6 px-5">
              <h2 className="text-[28px] font-black text-ink tracking-tight font-display">Status</h2>
              <div className="flex gap-2">
                <button className="h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100">
                  <Search size={18} />
                </button>
                <button className="h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            {/* Stories Row */}
            <div className="px-5 mb-8">
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                {/* My Story Add Button */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative group">
                    <button 
                      onClick={() => setIsStoryModalOpen(true)}
                      className="h-[72px] w-[72px] rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center group-hover:border-accent transition-all duration-500 overflow-hidden"
                    >
                      {user?.photoURL ? (
                        <img src={user.photoURL} className="h-full w-full object-cover opacity-50 group-hover:opacity-70 grayscale transition-all" />
                      ) : (
                        <UserIcon size={24} className="text-gray-300" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent/40 group-hover:scale-110 transition-transform">
                          <Plus size={20} />
                        </div>
                      </div>
                    </button>
                    <p className="text-[10px] font-black text-ink tracking-tight mt-2 opacity-70">My Status</p>
                  </div>
                </div>

                {/* Active Stories */}
                {(Object.entries(storyGroups) as [string, Story[]][]).map(([id, group]) => {
                  const firstStory = group[0];
                  const hasUnseen = !group.every(s => s.viewers?.includes(user?.uid || ''));
                  return (
                    <button 
                      key={id}
                      onClick={() => { setSelectedStoryGroup(group); setActiveStoryIndex(0); setIsStoryViewerOpen(true); }}
                      className="flex-shrink-0 text-center group"
                    >
                      <div className={`h-[72px] w-[72px] p-1 rounded-[2rem] border-2 transition-all duration-500 ${hasUnseen ? 'border-accent animate-pulse shadow-lg shadow-accent/10' : 'border-gray-100 grayscale-[0.5]'}`}>
                        <div className="h-full w-full rounded-[1.8rem] overflow-hidden bg-gray-100 border border-white">
                          <img src={firstStory.authorPhoto || firstStory.mediaUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-ink tracking-tight mt-2 truncate w-[72px]">{firstStory.authorName.split(' ')[0]}</p>
                    </button>
                  );
                })}

                {/* Followed Institutions without stories */}
                {[...schools, ...places]
                  .filter(s => s.followers?.includes(user?.uid || '') && !storyGroups[s.id])
                  .map(school => (
                    <button 
                      key={school.id}
                      onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                      className="flex-shrink-0 text-center opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all group"
                    >
                      <div className="h-[72px] w-[72px] p-1 rounded-[2.2rem] border-2 border-gray-50 bg-white">
                        <div className="h-full w-full rounded-[2rem] overflow-hidden bg-gray-50 flex items-center justify-center">
                          {school.logo ? (
                            <img src={school.logo} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-gray-400">{school.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-muted tracking-tight mt-2 truncate w-[72px]">{school.name.split(' ')[0]}</p>
                    </button>
                  ))}
              </div>
            </div>

            {/* Premium Sections */}
            <div className="space-y-1">
              {myInstitutions.length > 0 && (
                <div className="px-5 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-black text-accent uppercase tracking-[0.3em]">Institutional Control</h2>
                    <span className="text-[10px] font-bold text-muted bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{myInstitutions.length} Active</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {myInstitutions.map(school => (
                      <button 
                        key={school.id}
                        onClick={() => { setSelectedSchool(school); setView('school-feed'); setSchoolFeedTab('manage'); }}
                        className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-[1.8rem] hover:border-accent/20 hover:bg-accent/[0.02] transition-all group shadow-sm text-left"
                      >
                        <div className="h-16 w-16 p-0.5 rounded-2xl border-2 border-accent/20 flex items-center justify-center group-hover:scale-105 transition-all overflow-hidden bg-white">
                          <div className="h-full w-full rounded-[0.85rem] overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                            {school.logo ? (
                              <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-lg font-black text-gray-200">{school.name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-ink text-[16px] tracking-tight mb-0.5 group-hover:text-accent transition-colors">{school.name}</h3>
                          <div className="flex gap-2">
                            <span className="text-[9px] font-black text-muted uppercase tracking-wider bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Portal ID: {school.id}</span>
                            <span className="text-[9px] font-black text-accent uppercase tracking-wider bg-accent/5 px-1.5 py-0.5 rounded border border-accent/10">Administrator</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-muted/30 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Status (WhatsApp Style) */}
              <div className="py-4 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[13px] font-bold text-accent uppercase tracking-widest">Followed Institutions</h2>
                  <button onClick={() => setView('feed')} className="text-[11px] font-bold text-muted hover:text-accent transition-colors">View All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {[...schools, ...places]
                    .filter(s => s.followers?.includes(user?.uid || ''))
                    .slice(0, 8).map(school => (
                    <button 
                      key={school.id}
                      onClick={() => { setSelectedSchool(school); setView('school-feed'); setSchoolFeedTab('feed'); }}
                      className="flex-shrink-0 w-16 text-center group"
                    >
                      <div className="h-14 w-14 p-0.5 rounded-2xl border-2 border-accent flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-all overflow-hidden bg-white shadow-sm">
                        <div className="h-full w-full rounded-[0.85rem] overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                          {school.logo ? (
                            <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg font-bold text-gray-300">{school.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-medium text-ink truncate w-full">{school.name}</p>
                    </button>
                  ))}
                  {[...schools, ...places].filter(s => s.followers?.includes(user?.uid || '')).length === 0 && (
                    <p className="text-[11px] text-muted font-medium py-4">You haven't followed any institutions yet.</p>
                  )}
                </div>
              </div>

               {/* Special Items */}
               <button 
                 onClick={() => setView('feed')}
                 className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
               >
                 <div className="h-12 w-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center shrink-0">
                   <GraduationCap size={24} />
                 </div>
                 <div className="flex-1">
                   <div className="flex justify-between items-center">
                     <h3 className="font-bold text-ink text-[15px]">Institutions Directory</h3>
                     <span className="text-[10px] text-muted font-medium">9:41 AM</span>
                   </div>
                   <p className="text-[13px] text-muted truncate">Explore and follow schools</p>
                 </div>
               </button>

               {(myInstitutions.length > 0 || userDoc?.role === 'admin' || schools.some(s => s.administrativeViewers?.includes(user?.uid || '')) || places.some(s => s.administrativeViewers?.includes(user?.uid || ''))) && (
                 <button 
                   onClick={() => handleNavigateToData('records')}
                   className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
                 >
                   <div className="h-12 w-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center shrink-0">
                     <Search size={24} />
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center">
                       <h3 className="font-bold text-ink text-[15px]">{labels.student} Records</h3>
                       <span className="text-[10px] text-muted font-medium">Yesterday</span>
                     </div>
                     <p className="text-[13px] text-muted truncate">Access all digitized profiles</p>
                   </div>
                 </button>
               )}

              {/* Followed & Managed Institutions as Home Feed */}
              {[...schools, ...places].filter(s => 
                userDoc?.following?.includes(s.id) || 
                s.creatorUid === user?.uid
              ).map(school => {
                const lastPost = posts.filter(p => p.schoolId === school.id).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
                return (
                  <button 
                    key={school.id}
                    onClick={() => { setSelectedSchool(school); setView('school-feed'); }}
                    className="w-full p-4 hover:bg-white border-b border-gray-100 transition-all text-left flex items-center gap-4 hover:border-gray-200"
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                      {school.logo ? (
                        <img src={school.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-muted text-[10px] font-bold">{school.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-ink text-[15px] truncate">{school.name}</h3>
                        <span className="text-[10px] text-muted font-medium">
                          {lastPost ? formatTime(lastPost.timestamp) : '9:41 AM'}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted truncate">
                        {lastPost ? lastPost.content : `Welcome to ${school.name}`}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Empty State / Explore */}
              {(!userDoc?.following || userDoc.following.length === 0) && (
                <div className="py-12 px-8 text-center bg-white border border-gray-100 rounded-3xl mt-4">
                  <div className="h-16 w-16 bg-white border border-gray-100 rounded-full flex items-center justify-center text-muted mx-auto mb-4">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">No active updates</h3>
                  <p className="text-sm text-muted mb-6">Follow institutions to see their updates here on your home feed.</p>
                  <button 
                    onClick={() => setView('feed')}
                    className="px-6 py-2.5 bg-accent text-white rounded-full font-bold text-sm shadow-md hover:bg-accent/90 transition-all"
                  >
                    Explore Institutions
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'records': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-full flex items-center justify-center text-accent mb-8">
                <Database size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-3">Select an Institution</h2>
              <p className="text-muted text-[14px] font-bold max-w-xs mb-10 leading-relaxed">
                To access institutional records, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-4 bg-accent text-white rounded-full font-bold text-sm hover:bg-accent/90 transition-all"
              >
                Open Directory
              </button>
            </div>
          );
        }
        const labels = getLabels(selectedSchool?.type);
        const filteredRecords = records
          .filter(r => r.type === recordTab)
          .filter(r => r.studentName.toLowerCase().includes(recordSearch.toLowerCase()))
          .sort((a, b) => {
            if (recordSort === 'alphabet') {
              return a.studentName.localeCompare(b.studentName);
            } else if (recordSort === 'amount') {
              return (b.paid || 0) - (a.paid || 0);
            } else if (recordSort === 'date') {
              const dateA = a.timestamp?.seconds || 0;
              const dateB = b.timestamp?.seconds || 0;
              return dateB - dateA;
            }
            return 0;
          });
        const totalPaid = filteredRecords.reduce((acc, r) => acc + (r.paid || 0), 0);
        const totalBalance = filteredRecords.reduce((acc, r) => acc + (r.balance || 0), 0);

        if (!hasChosenView && filteredRecords.length > 0) {
          return (
            <WordLayout 
              title="View Configuration"
              subtitle="Personalize your workflow"
              icon={LayoutGrid}
              branding={{ name: selectedSchool.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
            >
              <div className="py-20 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center justify-center p-4 bg-accent/5 rounded-3xl text-accent mb-8">
                  <Sparkles size={40} />
                </div>
                <h2 className="text-4xl font-black text-ink mb-4 tracking-tight">How would you like to see your records?</h2>
                <p className="text-muted font-bold text-lg mb-16 max-w-xl mx-auto leading-relaxed">
                  We've prepared three distinct layouts for your data. Choose the one that suits your management style.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { mode: 'classic', title: 'Classic View', desc: 'Standard professional table with mobile optimized cards.', icon: LayoutList, color: 'bg-indigo-50 text-indigo-600' },
                    { mode: 'microsoft', title: 'Microsoft View', desc: 'Dense, high-productivity grid design for heavy data entry.', icon: TableProperties, color: 'bg-blue-50 text-blue-600' },
                    { mode: 'bento', title: 'Bento Grid', desc: 'Modern, card-based layout with visual status indicators.', icon: LayoutGrid, color: 'bg-emerald-50 text-emerald-600' }
                  ].map((option) => (
                    <button 
                      key={option.mode}
                      onClick={() => { setRecordViewMode(option.mode as any); setHasChosenView(true); }}
                      className="group flex flex-col items-center p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] hover:border-accent hover:shadow-2xl hover:shadow-accent/10 transition-all text-center relative"
                    >
                      <div className={`h-16 w-16 ${option.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <option.icon size={28} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-xl font-black text-ink mb-3">{option.title}</h3>
                      <p className="text-xs text-muted font-bold leading-relaxed">{option.desc}</p>
                      <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Select View <ChevronRight size={12} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </WordLayout>
          );
        }

        return (
          <WordLayout 
            title="Institutional Records"
            subtitle={labels.system}
            icon={Database}
            branding={{ name: selectedSchool.name }}
            showNotification={showNotification}
            handlePrint={handlePrint}
            hideOfficialBadge={true}
            hideSaveImage={true}
            hideBranding={true}
            hideIcon={true}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap gap-1 bg-white border border-gray-100 p-1 rounded-lg">
                  {(['general', 'books', 'uniforms'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setRecordTab(tab)}
                      className={`px-3 sm:px-4 py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${recordTab === tab ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                    >
                      {tab === 'general' ? labels.general : tab === 'books' ? labels.books : labels.uniforms}
                    </button>
                  ))}
                </div>
                <div className="hidden sm:block h-6 w-[1px] bg-gray-100" />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-100 p-1 rounded-lg">
                    <div className="px-2 text-muted mr-1 border-r border-gray-50">
                      <ArrowUpDown size={10} />
                    </div>
                    {(['alphabet', 'amount', 'date'] as const).map(s => (
                      <button 
                        key={s}
                        onClick={() => setRecordSort(s)}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${recordSort === s ? 'bg-gray-50 text-ink' : 'text-muted hover:text-ink'}`}
                      >
                        {s === 'alphabet' ? 'A-Z' : s === 'amount' ? 'Paid' : 'Date'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {(['classic', 'microsoft', 'bento'] as const).map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setRecordViewMode(mode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recordViewMode === mode ? 'bg-white text-accent shadow-sm ring-1 ring-black/5' : 'text-muted hover:text-ink'}`}
                      >
                        {mode === 'classic' && <LayoutList size={12} strokeWidth={2.5} />}
                        {mode === 'microsoft' && <TableProperties size={12} strokeWidth={2.5} />}
                        {mode === 'bento' && <LayoutGrid size={12} strokeWidth={2.5} />}
                        <span className="hidden lg:inline">{mode}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-0 outline-none transition-all text-[11px] font-medium placeholder:text-gray-400 w-32 sm:w-48" 
                    />
                  </div>
                  {canManageInstitution(selectedSchool) && (
                    <button 
                      onClick={() => setIsRecordModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-ink/90 transition-all"
                    >
                      <Plus size={14} />
                      New Record
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <p className="text-muted text-xs font-bold uppercase tracking-[0.3em]">{recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Records • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              {[
                { label: `Total ${labels.students}`, value: filteredRecords.length, icon: Users },
                { label: 'Total Paid', value: `${currencySymbol}${totalPaid.toLocaleString()}`, icon: CreditCard },
                { label: 'Total Balance', value: `${currencySymbol}${totalBalance.toLocaleString()}`, icon: Wallet }
              ].map((stat, i) => (
                <div key={i} className="border-l-2 border-accent/20 pl-6">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-ink font-display">{stat.value}</p>
                </div>
              ))}
            </div>

            {canManageInstitution(selectedSchool) && (
              <div className="md:hidden mb-12">
                <button 
                  onClick={() => setIsRecordModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 active:scale-[0.98] transition-all"
                >
                  <Plus size={20} />
                  New Record
                </button>
              </div>
            )}

            {recordViewMode === 'classic' ? (
              <>
                <div className="hidden md:block overflow-x-auto custom-scrollbar border border-gray-200 rounded-sm">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-white border-b border-gray-200">
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">{labels.student}</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Category</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Paid</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Balance</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Added By</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Date</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center">
                            <p className="font-bold text-lg text-muted">No records found in this section</p>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-white border-b border-gray-100 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-bold text-ink text-sm">{record.studentName}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{record.category}</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-green-600 text-[13px]">{currencySymbol}{record.paid.toLocaleString()}</td>
                            <td className="px-6 py-4 font-mono font-bold text-red-600 text-[13px]">{currencySymbol}{record.balance.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[8px] font-bold text-ink">
                                  {record.addedBy?.charAt(0) || 'A'}
                                </div>
                                <span className="text-[10px] font-medium text-ink">{record.addedBy || 'Admin'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-medium text-muted">
                                {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(record.creatorUid === user?.uid || canManageInstitution(selectedSchool)) && (
                                  <>
                                    <button 
                                      onClick={() => { setRecordForReceipt(record); setIsReceiptModalOpen(true); }}
                                      className="p-2 text-muted hover:text-accent transition-all"
                                      title="Export Receipt"
                                    >
                                      <FileText size={14} />
                                    </button>
                                    <button onClick={() => handleEditRecord(record)} className="p-2 text-muted hover:text-ink transition-all">
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-2 text-muted hover:text-red-600 transition-all">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredRecords.length === 0 ? (
                    <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="font-bold text-muted">No records found</p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                      <div key={record.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-ink">{record.studentName}</h4>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{record.category}</p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setRecordForReceipt(record); setIsReceiptModalOpen(true); }}
                              className="p-2 text-muted hover:text-accent transition-all"
                            >
                              <FileText size={14} />
                            </button>
                            {(record.creatorUid === user?.uid || canManageInstitution(selectedSchool)) && (
                              <>
                                <button onClick={() => handleEditRecord(record)} className="p-2 text-muted hover:text-ink transition-all">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-2 text-muted hover:text-red-600 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Paid</p>
                            <p className="font-mono font-bold text-green-600 text-sm">{currencySymbol}{record.paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Balance</p>
                            <p className="font-mono font-bold text-red-600 text-sm">{currencySymbol}{record.balance.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[7px] font-bold text-ink">
                              {record.addedBy?.charAt(0) || 'A'}
                            </div>
                            <span className="text-[10px] font-medium text-muted">{record.addedBy || 'Admin'}</span>
                          </div>
                          <span className="text-[10px] font-medium text-muted">
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : recordViewMode === 'microsoft' ? (
              <div className="overflow-hidden border border-gray-200 rounded-[2px] bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#f3f2f1] border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">{labels.student}</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">Category</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">Amount Paid</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">Pending Balance</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">Recorder</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200">Last Modified</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 italic md:not-italic">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted italic">There are no items to show in this view.</td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-[#f3f2f1]/50 border-b border-gray-50 group">
                          <td className="px-4 py-2.5 font-semibold text-[#0078d4] border-r border-gray-50">{record.studentName}</td>
                          <td className="px-4 py-2.5 border-r border-gray-50">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-gray-100 text-[9px] font-semibold text-gray-600 uppercase">
                              {record.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-green-700 border-r border-gray-50 bg-green-50/20">{currencySymbol}{record.paid.toLocaleString()}</td>
                          <td className="px-4 py-2.5 font-bold text-red-700 border-r border-gray-50 bg-red-50/20">{currencySymbol}{record.balance.toLocaleString()}</td>
                          <td className="px-4 py-2.5 border-r border-gray-50 text-gray-500">{record.addedBy || 'N/A'}</td>
                          <td className="px-4 py-2.5 border-r border-gray-50 text-gray-500">
                             {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditRecord(record)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><Edit2 size={12} /></button>
                              <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="bg-[#f3f2f1] px-4 py-1 border-t border-gray-200 text-[9px] text-gray-500 font-medium">
                  {filteredRecords.length} items found
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecords.length === 0 ? (
                   <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                     <p className="font-bold text-muted">No record entries available</p>
                   </div>
                ) : (
                  filteredRecords.map(record => (
                    <div key={record.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
                      
                      <div className="relative">
                        <div className="flex justify-between items-start mb-6">
                          <div className="h-10 w-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                            <Users size={20} strokeWidth={2.5} />
                          </div>
                          <div className="flex gap-1 translate-x-2">
                             <button onClick={() => handleEditRecord(record)} className="p-2 text-muted hover:text-ink hover:bg-gray-50 rounded-full transition-all"><Edit2 size={14} /></button>
                             <button onClick={() => { setRecordToDelete(record.id); setIsDeleteRecordModalOpen(true); }} className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <h4 className="text-lg font-black text-ink mb-1 truncate">{record.studentName}</h4>
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6">{record.category}</p>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-2xl ring-1 ring-green-100">
                            <span className="text-[9px] font-black text-green-800 uppercase tracking-wider">Paid</span>
                            <span className="text-sm font-black text-green-600">{currencySymbol}{record.paid.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-2xl ring-1 ring-red-100">
                            <span className="text-[9px] font-black text-red-800 uppercase tracking-wider">Balance</span>
                            <span className="text-sm font-black text-red-600">{currencySymbol}{record.balance.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-gray-100 flex items-center justify-center text-[8px] font-black text-muted">
                              {record.addedBy?.charAt(0) || 'A'}
                            </div>
                            <span className="text-[10px] font-bold text-muted truncate max-w-[80px]">{record.addedBy || 'System'}</span>
                          </div>
                          <button 
                            onClick={() => { setRecordForReceipt(record); setIsReceiptModalOpen(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-accent hover:text-white transition-all"
                          >
                            <FileText size={12} />
                            Receipt
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Authorized Signature</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'finance': {
        if (!user) { setView('login'); return null; }
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center text-muted mb-8">
                <Wallet size={48} strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-extrabold text-ink mb-4">Select an Institution</h2>
              <p className="text-muted text-sm font-bold max-w-xs mb-10 leading-relaxed">
                To access financial data, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
              >
                Open Directory
              </button>
            </div>
          );
        }

        const canManage = canManageInstitution(selectedSchool);

        return (
          <WordLayout 
            title="Institutional Wallet"
            subtitle="Institutional Financial Terminal"
            icon={Wallet}
            branding={{ name: selectedSchool.name }}
            showNotification={showNotification}
            handlePrint={handlePrint}
            hideOfficialBadge={true}
            hideSaveImage={true}
            hideBranding={true}
            hideIcon={true}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Status:</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
            }
          >
            <div className="space-y-12">
              {/* OPay Style Balance Card */}
              <div className="relative bg-ink rounded-[2.5rem] p-10 overflow-hidden text-white shadow-2xl shadow-ink/30 h-64 flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                  <Wallet size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Total Balance</p>
                    <button className="h-5 w-5 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                      <Compass size={10} className="text-white/60" />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-accent">{currencySymbol}</span>
                    <h2 className="text-5xl font-black tracking-tighter">{(finance?.institutionBalance || 0).toLocaleString()}</h2>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Incoming</p>
                      <p className="text-sm font-black text-green-400">+{currencySymbol}0</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Outgoing</p>
                      <p className="text-sm font-black text-red-400">-{currencySymbol}0</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSettlementStep('deposit')} className="px-5 py-2.5 bg-accent text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20">Deposit</button>
                    <button onClick={() => setSettlementStep('other')} className="px-5 py-2.5 bg-white/10 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Transfer</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Panel: Services & Actions */}
                <div className="space-y-10">
                  <div className="flex items-center justify-between px-2">
                    <div className="border-l-4 border-accent pl-6">
                      <h4 className="font-extrabold text-xl text-ink uppercase tracking-tight">Financial Services</h4>
                      <p className="text-xs text-muted font-medium mt-1">Manage platform settlements and direct transfers.</p>
                    </div>
                    {settlementStep !== 'selection' && (
                      <button 
                        onClick={() => setSettlementStep('selection')}
                        className="px-4 py-2 bg-gray-50 text-ink rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                      >
                        Back to Services
                      </button>
                    )}
                  </div>

                  {settlementStep === 'selection' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Transfer Actions */}
                      <button 
                        onClick={() => setSettlementStep('exona')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <UserIcon size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">To Exona</span>
                      </button>

                      <button 
                        onClick={() => setSettlementStep('other')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Banknote size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">To Bank</span>
                      </button>

                      <button 
                        onClick={() => setSettlementStep('airtime')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Smartphone size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">Airtime</span>
                      </button>

                      <button 
                        onClick={() => setSettlementStep('data')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Globe size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">Data Plan</span>
                      </button>

                      <button 
                        onClick={() => setSettlementStep('bills')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Receipt size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">Pay Bills</span>
                      </button>

                      <button 
                        onClick={() => setSettlementStep('deposit')}
                        className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-dotted border-accent/30 hover:border-accent hover:shadow-lg transition-all group"
                      >
                        <div className="h-14 w-14 bg-accent/5 text-accent rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Plus size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-wider">Deposit Hub</span>
                      </button>
                    </div>
                ) : (settlementStep === 'exona' || settlementStep === 'other') ? (
                  <div className="space-y-8">
                    {/* Settlement Detail Form */}
                    <div className={`${settlementStep === 'exona' ? 'bg-ink text-white' : 'bg-white border border-gray-100 shadow-xl shadow-gray-100/50'} rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden`}>
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center backdrop-blur-md ${settlementStep === 'exona' ? 'bg-white/10 text-white' : 'bg-accent/10 text-accent'}`}>
                            {settlementStep === 'exona' ? <BadgeCheck size={32} /> : <Banknote size={32} />}
                          </div>
                          <div>
                            <h5 className={`font-black text-xl tracking-tight ${settlementStep === 'exona' ? 'text-white' : 'text-ink'}`}>
                              {settlementStep === 'exona' ? 'Transfer to Exona Bank' : 'Transfer to Other Bank'}
                            </h5>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${settlementStep === 'exona' ? 'text-white/40' : 'text-muted'}`}>
                              {settlementStep === 'exona' ? 'Direct Settlement' : 'Global Network Settlements'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {settlementStep === 'other' && (
                            <div>
                              <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Select Destination Bank</label>
                              <select 
                                value={selectedSettlementBank}
                                onChange={(e) => setSelectedSettlementBank(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-bold text-ink outline-none focus:border-accent appearance-none cursor-pointer"
                              >
                                {NIGERIAN_BANKS.map(bank => (
                                  <option key={bank} value={bank}>{bank}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ${settlementStep === 'exona' ? 'text-white/40' : 'text-muted'}`}>Account Number</label>
                            <div className="relative">
                              <input 
                                type="text"
                                maxLength={10}
                                value={recipientAccount}
                                onChange={(e) => setRecipientAccount(e.target.value.replace(/\D/g, ''))}
                                className={`w-full px-5 py-5 rounded-2xl text-2xl font-black outline-none transition-all ${
                                  settlementStep === 'exona' 
                                    ? 'bg-white/10 text-white focus:bg-white/15 border-white/10' 
                                    : 'bg-gray-50 text-ink focus:bg-white border-gray-100 focus:border-accent'
                                }`}
                                placeholder="10 Digits Account No."
                              />
                            </div>
                            {isVerifying ? (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="h-2 w-2 bg-accent rounded-full animate-ping" />
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${settlementStep === 'exona' ? 'text-white/40' : 'text-muted'}`}>Verifying Account...</p>
                              </div>
                            ) : verificationError ? (
                                <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">{verificationError}</p>
                            ) : verifiedName && (
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{verifiedName}</p>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${settlementStep === 'exona' ? 'bg-accent/20 text-accent' : 'bg-green-100 text-green-600'}`}>Verified</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ${settlementStep === 'exona' ? 'text-white/40' : 'text-muted'}`}>Enter Amount</label>
                            <div className="relative">
                              <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl ${settlementStep === 'exona' ? 'text-white' : 'text-ink'}`}>{currencySymbol}</span>
                              <input 
                                type="number"
                                value={settlementAmount}
                                onChange={(e) => setSettlementAmount(e.target.value)}
                                className={`w-full pl-12 pr-5 py-5 rounded-2xl text-2xl font-black outline-none transition-all ${
                                  settlementStep === 'exona' 
                                    ? 'bg-white/10 text-white focus:bg-white/15 border-white/10' 
                                    : 'bg-gray-50 text-ink focus:bg-white border-gray-100 focus:border-accent'
                                }`}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="mt-2 flex justify-between px-1">
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${settlementStep === 'exona' ? 'text-white/30' : 'text-muted'}`}>Available Balance</p>
                              <p className={`text-[10px] font-black ${settlementStep === 'exona' ? 'text-accent' : 'text-ink'}`}>{currencySymbol}{(finance?.institutionBalance || 0).toLocaleString()}</p>
                            </div>
                          </div>

                          <button 
                            disabled={!verifiedName || !settlementAmount || parseFloat(settlementAmount) <= 0}
                            onClick={() => setSettlementStep('pin')}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                              settlementStep === 'exona' ? 'bg-white text-ink hover:bg-gray-100' : 'bg-ink text-white hover:bg-ink/90'
                            }`}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (settlementStep === 'airtime' || settlementStep === 'data' || settlementStep === 'bills') ? (
                  <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-xl">
                    <div className="flex items-center gap-4 mb-10">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                        settlementStep === 'airtime' ? 'bg-green-50 text-green-600' : 
                        settlementStep === 'data' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {settlementStep === 'airtime' ? <Smartphone size={32} /> : 
                         settlementStep === 'data' ? <Globe size={32} /> : <Receipt size={32} />}
                      </div>
                      <div>
                        <h5 className="font-black text-xl text-ink tracking-tight uppercase">
                          {settlementStep === 'airtime' ? 'Buy Airtime' : 
                           settlementStep === 'data' ? 'Buy Data' : 'Pay Bills'}
                        </h5>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Settlement</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {(settlementStep === 'airtime' || settlementStep === 'data') && (
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Select Network</label>
                          <div className="grid grid-cols-4 gap-3">
                            {NETWORK_PROVIDERS.map(net => (
                              <button 
                                key={net}
                                onClick={() => setSelectedProvider(net)}
                                className={`py-4 rounded-xl font-black text-[10px] border transition-all ${
                                  selectedProvider === net ? 'bg-accent text-white border-accent' : 'bg-gray-50 text-muted border-gray-100'
                                }`}
                              >
                                {net}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {settlementStep === 'bills' && (
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Biller Category</label>
                          <select 
                            value={selectedBillType}
                            onChange={(e) => setSelectedBillType(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-bold text-ink outline-none focus:border-accent appearance-none"
                          >
                            <option value="">Select Category</option>
                            {BILL_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">
                          {settlementStep === 'bills' ? 'Customer/Meter ID' : 'Phone Number'}
                        </label>
                        <input 
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-black text-ink outline-none focus:border-accent"
                          placeholder={settlementStep === 'bills' ? 'e.g. 1029384756' : '081...'}
                        />
                      </div>

                      {settlementStep === 'data' && (
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Select Data Plan</label>
                          <div className="space-y-3">
                            {DATA_PLANS.filter(p => p.network === selectedProvider).map(plan => (
                              <button 
                                key={plan.id}
                                onClick={() => {
                                  setSelectedDataPlan(plan.id);
                                  setSettlementAmount(plan.price.toString());
                                }}
                                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                  selectedDataPlan === plan.id ? 'border-accent bg-accent/5' : 'border-gray-100 bg-gray-50'
                                }`}
                              >
                                <span className="font-bold text-xs text-ink">{plan.name}</span>
                                <span className="font-black text-accent text-sm">{currencySymbol}{plan.price}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {settlementStep !== 'data' && (
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Amount</label>
                          <input 
                            type="number"
                            value={settlementAmount}
                            onChange={(e) => setSettlementAmount(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-bold text-ink outline-none focus:border-accent"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      <button 
                        disabled={!settlementAmount || (settlementStep !== 'bills' && !selectedProvider)}
                        onClick={() => setSettlementStep('pin')}
                        className="w-full py-5 bg-ink text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-[0.2em] shadow-xl"
                      >
                        Proceed to Payment
                      </button>
                    </div>
                  </div>
                ) : settlementStep === 'pin' ? (
                  <div className="bg-[#f8f9fc] rounded-[3rem] p-12 flex flex-col items-center">
                    <div className="h-24 w-24 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-8">
                      <Lock size={40} />
                    </div>
                    <h5 className="text-[32px] font-black text-ink mb-2 tracking-tight">Security PIN</h5>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-12">Enter your 4-digit transaction PIN</p>
                    
                    <div className="w-full max-w-[280px] space-y-8">
                      <input 
                        type="password"
                        maxLength={4}
                        value={transactionPin}
                        onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-5 py-6 bg-white border-2 border-gray-100 rounded-[2rem] text-4xl font-black tracking-[1em] text-center text-ink outline-none focus:border-accent transition-all shadow-sm"
                        placeholder="••••"
                      />
                      
                      <button 
                        disabled={transactionPin.length !== 4 || isProcessingSettlement}
                        onClick={handleInitiateSettlement}
                        className="w-full py-5 bg-ink text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/20 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isProcessingSettlement ? 'Initiating...' : 'Confirm Transfer'}
                      </button>

                      <button 
                        onClick={() => setSettlementStep('exona')}
                        className="w-full text-[10px] font-black text-muted uppercase tracking-widest hover:text-ink transition-colors"
                      >
                        Back to details
                      </button>
                    </div>
                  </div>
                ) : settlementStep === 'deposit' ? (
                  <div className="bg-ink text-white rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-2xl shadow-ink/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700 font-black text-6xl">
                      DEPOSIT
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-14 w-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                          <Plus size={32} strokeWidth={3} />
                        </div>
                        <div>
                          <h5 className="font-black text-xl tracking-tight">Add Funds to Wallet</h5>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Institutional Deposit Path</p>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6 backdrop-blur-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Settlement Bank</p>
                            <p className="text-[15px] font-bold tracking-tight">OPAY / Exona Reserve</p>
                          </div>
                          <span className="text-[9px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">Instant Funding</span>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Your Deposit Account</p>
                            <div className="flex items-center gap-3">
                              <p className="text-[28px] font-mono font-black text-accent tracking-tighter">8134567890</p>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText('8134567890');
                                  showNotification('Account copied to clipboard');
                                }}
                                className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Beneficiary Name</p>
                            <p className="text-[15px] font-bold tracking-tight uppercase">EXONA • {selectedSchool.name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="mt-1"><ShieldCheck size={18} className="text-accent" /></div>
                        <div>
                          <p className="text-[11px] text-white/80 leading-relaxed font-bold uppercase tracking-tight mb-1">Direct Bank Transfer</p>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                            Transfer any amount to the account details above from your banking app. Your wallet will be credited automatically once fixed.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : settlementStep === 'success' ? (
                  <div className="bg-white border-2 border-green-500/10 rounded-[3rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-green-900/5">
                    <div className="h-24 w-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-green-500/20">
                      <Check size={48} strokeWidth={3} />
                    </div>
                    <h5 className="text-[32px] font-black text-ink mb-3 tracking-tight">Transfer Sent!</h5>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] mb-12 max-w-[240px] leading-relaxed">
                      Your transfer of <span className="text-ink">{currencySymbol}{parseFloat(settlementAmount).toLocaleString()}</span> to <span className="text-ink">{verifiedName}</span> was successful.
                    </p>
                    <button 
                      onClick={() => {
                        setSettlementStep('selection');
                        setSettlementAmount('');
                        setRecipientAccount('');
                        setVerifiedName('');
                        setTransactionPin('');
                      }}
                      className="px-12 py-5 bg-ink text-white rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div />
                )}

              </div>

              {/* Settlement History */}
              <div className="space-y-10">
                <div className="border-l-4 border-accent pl-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xl text-ink uppercase tracking-tight">Recent Activity</h4>
                    <p className="text-xs text-muted font-medium mt-1">Transaction history and settlement status.</p>
                  </div>
                </div>

                            <div className="space-y-4">
                              {settlements.length === 0 ? (
                                <div className="py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-gray-200 mx-auto mb-4 border border-gray-100">
                                    <Clock size={24} />
                                  </div>
                                  <p className="font-bold text-muted uppercase tracking-widest text-[10px]">No recent transactions</p>
                                </div>
                              ) : (
                                settlements.map((s) => (
                                  <div 
                                    key={s.id}
                                    className="group bg-white p-5 rounded-3xl border border-gray-50 hover:border-accent/10 hover:shadow-xl transition-all flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                                        s.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                      }`}>
                                        <ArrowUpDown size={18} strokeWidth={2.5} />
                                      </div>
                                      <div className="min-w-0">
                                        <h6 className="font-black text-ink tracking-tight uppercase text-[11px] truncate whitespace-nowrap">{s.bankName || 'Wallet Transfer'}</h6>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] text-muted font-bold tracking-widest uppercase truncate max-w-[80px]">{s.recipientId}</p>
                                          <span className="w-1 h-1 bg-gray-200 rounded-full shrink-0" />
                                          <p className="text-[10px] text-muted font-medium truncate">
                                            {s.timestamp?.toDate ? s.timestamp.toDate().toLocaleDateString() : 'Processing...'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-black text-ink tracking-tight text-sm">-{currencySymbol}{s.amount.toLocaleString()}</p>
                                      <p className={`text-[9px] font-black uppercase ${
                                        s.status === 'completed' ? 'text-green-600' : 'text-orange-500'
                                      }`}>{s.status}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                <div className="bg-[#f0f9ff] p-8 rounded-[2.5rem] border border-[#bae6fd] shadow-sm">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-[#0284c7] shrink-0 border border-[#bae6fd]">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h6 className="text-[11px] font-black text-[#0369a1] uppercase tracking-widest mb-1.5 line-clamp-1">Financial Integrity Unit</h6>
                      <p className="text-[10px] text-[#075985] font-medium leading-relaxed opacity-80">
                        Exona employs military-grade encryption for all financial settlements. Our automated reconciliation system ensures 100% accuracy in platform disbursements.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Financial Integrity Unit</p>
                <p className="text-[10px] text-muted tracking-tight font-medium">Verified by Exona SecNet</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Report Generated</p>
                <p className="text-[10px] text-muted font-medium">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'attendance': {
        if (!user) { setView('login'); return null; }
        const labels = selectedSchool ? getLabels(selectedSchool.type) : getLabels();
        if (!selectedSchool) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-24 w-24 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center text-muted mb-8">
                <Compass size={48} strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-extrabold text-ink mb-4">Select an Institution</h2>
              <p className="text-muted text-sm font-bold max-w-xs mb-10 leading-relaxed">
                To view or record {labels.attendance.toLowerCase()}, please first select an institution from your directory.
              </p>
              <button 
                onClick={() => setView('schools')}
                className="px-10 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
              >
                Open Directory
              </button>
            </div>
          );
        }
        const filteredAttendance = attendance.filter(r => 
          r.teacherName.toLowerCase().includes(attendanceSearch.toLowerCase())
        );
        const presentToday = filteredAttendance.filter(r => r.status === 'present').length;
        const absentToday = filteredAttendance.filter(r => r.status === 'absent').length;

        return (
          <WordLayout 
            title="Participation Records"
            subtitle={labels.attendance}
            icon={Compass}
            branding={{ name: selectedSchool.name }}
            showNotification={showNotification}
            handlePrint={handlePrint}
            hideOfficialBadge={true}
            hideSaveImage={true}
            hideBranding={true}
            hideIcon={true}
            toolbar={
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-ink transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder={`Search ${labels.teachers.toLowerCase()}...`} 
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-0 outline-none transition-all text-[11px] font-medium placeholder:text-gray-400 w-32 sm:w-48" 
                    />
                  </div>
                      {canManageInstitution(selectedSchool) && (
                        <button 
                          onClick={() => setIsAttendanceModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-ink/90 transition-all"
                        >
                          <Plus size={14} />
                          Record {labels.attendance}
                        </button>
                      )}
                </div>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">{selectedSchool.name}</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">{labels.attendance} Log • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              {[
                { label: 'Total Records', value: filteredAttendance.length, icon: ClipboardList },
                { label: 'Present Today', value: presentToday, icon: CheckCircle2 },
                { label: 'Absent Today', value: absentToday, icon: XCircle }
              ].map((stat, i) => (
                <div key={i} className="border-l border-gray-100 pl-6">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-ink">{stat.value}</p>
                </div>
              ))}
            </div>

            {canManageInstitution(selectedSchool) && (
              <div className="md:hidden mb-12">
                <button 
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-ink/10 active:scale-[0.98] transition-all"
                >
                  <Plus size={20} />
                  Record {labels.attendance}
                </button>
              </div>
            )}

            <div className="hidden md:block overflow-x-auto custom-scrollbar border border-gray-200 rounded-sm">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">{labels.teacher} Name</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Status</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted">Date</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <p className="font-bold text-lg text-muted">No {labels.attendance.toLowerCase()} records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-white border-b border-gray-100 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-ink text-sm">{record.teacherName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            record.status === 'present' ? 'bg-white text-green-600 border border-gray-100' : 'bg-white text-red-600 border border-gray-100'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-muted">{record.date}</td>
                        <td className="px-6 py-4 text-right text-[12px] font-medium text-muted">{record.addedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredAttendance.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="font-bold text-muted">No {labels.attendance.toLowerCase()} records found</p>
                </div>
              ) : (
                filteredAttendance.map((record) => (
                  <div key={record.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-ink">{record.teacherName}</h4>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        record.status === 'present' ? 'bg-white text-green-600 border border-gray-100' : 'bg-white text-red-600 border border-gray-100'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Recorded By</span>
                        <span className="text-[10px] font-medium text-ink">{record.addedBy}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted">{record.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Generated by Exona</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Authorized Signature</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'institution-profile': {
        const inst = selectedInstitutionForProfile;
        if (!inst) { setView('feed'); return null; }

        const institutionPosts = posts.filter(p => p.schoolId === inst.id);
        const isFollowing = userDoc?.following?.includes(inst.id);
        const canManage = userDoc?.role === 'admin' || inst.creatorUid === user?.uid || inst.administrativeViewers?.includes(user?.uid || '');
        const instLabels = getLabels(inst.type);

        return (
          <div className="flex flex-col bg-card pb-32">
            {/* Header / Cover area */}
            <div className="relative h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
              <button 
                onClick={() => setView('feed')}
                className="absolute top-6 left-6 h-12 w-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-muted hover:text-ink transition-all shadow-sm z-10"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="absolute -bottom-12 left-6 h-24 w-24 rounded-3xl bg-white border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                {inst.logo ? (
                  <img src={inst.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-black text-accent">{inst.name.charAt(0)}</span>
                )}
              </div>
            </div>

            <div className="px-6 pt-16">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-3xl font-black text-ink mb-1 tracking-tight truncate">{inst.name}</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent bg-accent/5 px-2 py-0.5 rounded-full">{inst.type}</span>
                    {inst.type === 'place' && (inst as Place).category && (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted bg-gray-50 px-2 py-0.5 rounded-full">{(inst as Place).category}</span>
                    )}
                  </div>
                  <p className="text-[14px] text-muted leading-relaxed whitespace-pre-wrap">{inst.description || "No description provided."}</p>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0">
                  {user && user.uid !== inst.creatorUid && (
                    <>
                      {isFollowing ? (
                        <button 
                          onClick={() => handleUnfollowInstitution(inst)}
                          className="px-8 py-3 rounded-2xl text-sm font-bold bg-ink text-white shadow-ink/20 hover:bg-red-600 transition-all shadow-xl group"
                        >
                          <span className="group-hover:hidden">Following</span>
                          <span className="hidden group-hover:inline">Unfollow</span>
                        </button>
                      ) : inst.pendingFollowers?.includes(user.uid) ? (
                        <button 
                          disabled
                          className="px-8 py-3 rounded-2xl text-sm font-bold bg-gray-100 text-muted/50 cursor-not-allowed shadow-sm"
                        >
                          Pending
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleFollowInstitution(inst)}
                          className="px-8 py-3 rounded-2xl text-sm font-bold bg-accent text-white shadow-accent/20 hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                          Follow
                        </button>
                      )}
                    </>
                  )}
                  {canManage && (
                    <button 
                      onClick={() => { setSelectedSchool(inst as School); setView('school-feed'); }}
                      className="px-8 py-3 rounded-2xl text-sm font-bold bg-white border border-gray-200 text-ink hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings size={16} /> Manage
                    </button>
                  )}
                </div>
              </div>

              {/* Stats / Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Followers</p>
                  <p className="text-xl font-black text-ink">{(inst.followers?.length || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Posts</p>
                  <p className="text-xl font-black text-ink">{institutionPosts.length.toLocaleString()}</p>
                </div>
              </div>

              {/* Admin Quick Actions */}
              {canManage && (
                <div className="mb-10">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 ml-1">Administrative Access</p>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => { setSelectedSchool(inst as School); handleNavigateToData('records'); }}
                      className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-ink hover:border-accent/20 hover:shadow-xl hover:shadow-gray-100 rounded-2xl transition-all group"
                    >
                      <ClipboardList size={18} className="text-accent group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">{instLabels.student} Records</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedSchool(inst as School); handleNavigateToData('attendance'); }}
                      className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-ink hover:border-accent/20 hover:shadow-xl hover:shadow-gray-100 rounded-2xl transition-all group"
                    >
                      <Calendar size={18} className="text-accent group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">{instLabels.attendance}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Posts Section */}
              <div className="border-t border-gray-100 pt-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-ink tracking-tight">Recent Broadcasts</h3>
                  <div className="h-0.5 flex-1 mx-6 bg-gray-50" />
                </div>

                {institutionPosts.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted border border-gray-100">
                      <MessageSquare size={24} className="opacity-20" />
                    </div>
                    <p className="text-sm font-bold text-muted">No broadcasts from this institution yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {institutionPosts.map(post => (
                      <FeedPost 
                        key={post.id} 
                        post={post} 
                        onUserClick={handleUserClick}
                        onInstitutionClick={handleInstitutionClick}
                        onLike={handleLikePost}
                        onComment={(p: Post) => { setActivePostForComments(p); setIsCommentModalOpen(true); }}
                        onMessage={handleMessageAuthor}
                        onReshare={handleResharePost}
                        onForward={handleForwardPost}
                        onEdit={handleEditPost}
                        onDelete={onDeletePostClick}
                        currentUserId={user?.uid}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'search': {
        const query = globalSearch.toLowerCase();
        const filteredInstitutions = [...schools, ...places].filter(inst => 
          inst.name.toLowerCase().includes(query)
        );

        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="md:hidden flex items-center gap-4 mb-8">
              <button 
                onClick={() => { setView('feed'); setGlobalSearch(''); }}
                className="h-12 w-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-muted hover:text-ink transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-accent/20 outline-none transition-all text-sm font-medium" 
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-8">
              {/* Institutions Section */}
              {filteredInstitutions.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 px-1">Institutions</p>
                  <div className="grid grid-cols-1 gap-3">
                    {filteredInstitutions.map(inst => (
                      <button 
                        key={inst.id}
                        onClick={() => {
                          setSelectedInstitutionForProfile(inst);
                          setView('institution-profile');
                        }}
                        className="w-full p-4 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group flex items-center gap-4"
                      >
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-accent group-hover:scale-110 transition-transform overflow-hidden border border-gray-100">
                          {inst.logo ? (
                            <img src={inst.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <GraduationCap size={20} />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-ink tracking-tight truncate">{inst.name}</p>
                          <p className="text-[10px] text-muted font-medium uppercase tracking-widest">{inst.type}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* People Section */}
              {(globalSearchResults.length > 0 || isSearchingUsers) && (
                <section>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 px-1">People</p>
                  {isSearchingUsers ? (
                    <div className="p-8 text-center">
                      <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {globalSearchResults.map(result => (
                        <button 
                          key={result.uid}
                          onClick={() => handleUserClick({ uid: result.uid, name: result.displayName || 'User', photo: result.photoURL || '' })}
                          className="w-full p-4 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group flex items-center gap-4"
                        >
                          <div className="h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                            {result.photoURL ? (
                              <img src={result.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full bg-gray-50 flex items-center justify-center text-muted">
                                <UserIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-ink tracking-tight truncate">{result.displayName}</p>
                            <p className="text-[10px] text-muted font-medium truncate">@{result.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
                          </div>
                          <ChevronRight size={14} className="text-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {filteredInstitutions.length === 0 && globalSearchResults.length === 0 && !isSearchingUsers && (
                <div className="py-20 text-center px-8">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                    <Search size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">
                    {globalSearch ? `No results for "${globalSearch}"` : 'Search for anything'}
                  </h3>
                  <p className="text-sm text-muted">
                    {globalSearch ? 'Try a different keyword' : 'Search for schools, colleges, institutions, or people on Exona.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'chat': {
        if (!user) { setView('login'); return null; }
        
        if (activeChat) {
          const chatMessages = allMessages
            .filter(m => m.chatId === (activeChat.isGroup ? activeChat.uid : [user.uid, activeChat.uid].sort().join('_')))
            .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

          return (
            <div className="flex flex-col bg-card h-full relative">
              {/* Group Settings Modal */}
              {isGroupSettingsOpen && activeGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-end p-0 md:p-4 bg-ink/60 backdrop-blur-md">
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="bg-white w-full max-w-md h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <div>
                        <h3 className="text-lg font-black text-ink tracking-tight">Group Info</h3>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Settings & Members</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsGroupSettingsOpen(false);
                          setIsEditingGroup(false);
                        }}
                        className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-muted hover:text-ink"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {/* Header Info */}
                      <div className="p-8 flex flex-col items-center text-center border-b border-gray-50">
                        <div className="relative group/photo mb-6">
                          <div className="w-24 h-24 rounded-[2rem] bg-ink/5 overflow-hidden flex items-center justify-center border-2 border-white shadow-xl">
                            {activeGroup.photoURL ? (
                              <img src={activeGroup.photoURL} alt={activeGroup.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Users size={32} className="text-muted/30" />
                            )}
                          </div>
                          {activeGroup.admins?.includes(user?.uid) && (
                            <button 
                              onClick={() => setIsEditingGroup(!isEditingGroup)}
                              className="absolute -bottom-2 -right-2 h-8 w-8 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg transform group-hover/photo:scale-110 transition-all"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </div>

                        {isEditingGroup ? (
                          <div className="w-full space-y-3">
                            <div className="relative group/edit-group-photo mb-6">
                              <div className="w-24 h-24 rounded-[2rem] bg-ink/5 overflow-hidden flex items-center justify-center border-2 border-white shadow-xl relative">
                                {isUploadingGroupPhoto ? (
                                  <div className="h-full w-full flex items-center justify-center bg-white/80 animate-pulse">
                                    <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : editingGroupData.photoURL ? (
                                  <img src={editingGroupData.photoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Users size={32} className="text-muted/30" />
                                )}
                              </div>
                              <label className="absolute -bottom-2 -right-2 h-8 w-8 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all">
                                <Camera size={14} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => handleGroupPhotoUpload(e, false)} 
                                />
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder="Group Name"
                              value={editingGroupData.name}
                              onChange={(e) => setEditingGroupData({ ...editingGroupData, name: e.target.value })}
                              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-ink outline-none"
                            />
                            <textarea
                              placeholder="Group Description"
                              value={editingGroupData.description}
                              onChange={(e) => setEditingGroupData({ ...editingGroupData, description: e.target.value })}
                              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-ink outline-none min-h-[80px]"
                            />
                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={handleUpdateGroup}
                                className="flex-1 py-3 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20"
                              >
                                Save Changes
                              </button>
                              <button 
                                onClick={() => setIsEditingGroup(false)}
                                className="px-6 py-3 bg-gray-100 text-muted rounded-xl text-[10px] font-black uppercase tracking-widest"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-xl font-black text-ink tracking-tight mb-2">{activeGroup.name}</h4>
                            <p className="text-sm text-muted font-medium px-4 line-clamp-3">
                              {activeGroup.description || 'No description provided.'}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Member Management */}
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest">{activeGroup.members?.length || 0} Members</label>
                          {activeGroup.admins?.includes(user?.uid) && (
                            <button 
                              onClick={() => {
                                setIsGroupSettingsOpen(false);
                                setIsAddingMember(true);
                              }}
                              className="flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest hover:underline"
                            >
                              <Plus size={14} /> Add Member
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {activeGroupMembers.map((member: any) => (
                            <div key={member.uid} className="flex items-center justify-between group/user">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-ink/5 overflow-hidden flex items-center justify-center border border-gray-100">
                                  {member.photoURL ? (
                                    <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserIcon size={18} className="text-muted/30" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-ink">{member.displayName}</p>
                                  <p className="text-[9px] text-muted font-medium"> @{member.uid.slice(0, 8)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {activeGroup.admins?.includes(member.uid) && (
                                  <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest">Admin</span>
                                )}
                                {activeGroup.admins?.includes(user?.uid) && member.uid !== user?.uid && (
                                  <button 
                                    onClick={async () => {
                                      try {
                                        const groupRef = doc(db, 'chatGroups', activeGroup.id);
                                        await updateDoc(groupRef, {
                                          members: arrayRemove(member.uid),
                                          admins: arrayRemove(member.uid)
                                        });
                                        showNotification('Member removed');
                                      } catch (err) {
                                        console.error("Error removing member:", err);
                                      }
                                    }}
                                    className="h-8 w-8 hover:bg-red-50 text-red-500 rounded-xl transition-all flex items-center justify-center"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-gray-50/50 border-t border-gray-100 space-y-3">
                      <button 
                        onClick={handleLeaveGroup}
                        className="w-full py-4 border-2 border-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <LogOut size={16} /> Leave Group
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 border-b border-gray-100 sticky top-0 bg-card/80 backdrop-blur-md z-30">
                <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                
                <div 
                  className={`flex items-center gap-3 flex-1 min-w-0 p-1 rounded-2xl transition-all ${activeChat.isGroup ? 'cursor-pointer hover:bg-gray-50 group/header' : ''}`}
                  onClick={() => {
                    if (activeChat.isGroup) {
                      const group = chatGroups.find(g => g.id === activeChat.uid);
                      setEditingGroupData({ 
                        name: group?.name || activeChat.displayName || '', 
                        description: group?.description || '', 
                        photoURL: group?.photoURL || activeChat.photoURL || '' 
                      });
                      setIsGroupSettingsOpen(true);
                    }
                  }}
                >
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                    {activeChat.photoURL || chatGroups.find(g => g.id === activeChat.uid)?.photoURL ? (
                      <img 
                        src={activeChat.isGroup ? (chatGroups.find(g => g.id === activeChat.uid)?.photoURL || activeChat.photoURL) : activeChat.photoURL} 
                        className="h-full w-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : activeChat.isGroup ? (
                      <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
                        <Users size={18} />
                      </div>
                    ) : (
                      <span className="text-muted text-[10px] font-bold">{activeChat.displayName?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-tight truncate group-hover/header:text-accent transition-colors">
                      {activeChat.displayName || chatGroups.find(g => g.id === activeChat.uid)?.name || 'Group'}
                    </h3>
                    <div className="flex items-center gap-1">
                      {activeChat.isGroup ? (
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest">
                          {chatGroups.find(g => g.id === activeChat.uid)?.members?.length || activeChat.membersCount || 0} Members
                        </span>
                      ) : isOtherTyping ? (
                        <p className="text-[10px] text-accent font-bold animate-pulse uppercase tracking-widest">Typing...</p>
                      ) : (
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest text-xs">Online</p>
                      )}
                    </div>
                  </div>
                </div>

                {!activeChat.isGroup && (
                  <button 
                    onClick={() => handleInitiateCall(activeChat.uid)}
                    className="h-9 w-9 bg-accent/5 text-accent rounded-xl flex items-center justify-center hover:bg-accent/15 transition-all shrink-0"
                    title="Audio Call"
                  >
                    <Phone size={16} />
                  </button>
                )}
                
                {activeChat.isGroup && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingMember(true);
                    }}
                    className="h-9 w-9 bg-accent/5 text-accent rounded-xl flex items-center justify-center hover:bg-accent/15 transition-all shrink-0"
                    title="Add Member"
                  >
                    <UserPlus size={16} />
                  </button>
                )}
              </div>
              <CallOverlay />

              {isAddingMember && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                   >
                     <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                       <h3 className="font-black text-ink">Add to "{activeChat.displayName}"</h3>
                       <button onClick={() => setIsAddingMember(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
                     </div>
                     <div className="p-6 overflow-y-auto space-y-2">
                       {groupCandidates
                         .filter(f => !chatGroups.find(g => g.id === activeChat.uid)?.members?.includes(f.uid))
                         .map(follower => (
                           <button
                             key={follower.uid}
                             onClick={() => {
                               handleAddMember(activeChat.uid, follower.uid);
                               setIsAddingMember(false);
                             }}
                             className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-accent/5 hover:scale-[1.02] transition-all group"
                           >
                             <div className="h-10 w-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border border-gray-100">
                               {follower.photoURL ? <img src={follower.photoURL} className="h-full w-full object-cover" /> : <span className="font-bold text-xs">{follower.displayName?.charAt(0)}</span>}
                             </div>
                             <div className="flex-1 text-left">
                               <p className="text-sm font-bold text-ink">{follower.displayName}</p>
                               <p className="text-[10px] text-muted font-bold tracking-widest uppercase">Follower</p>
                             </div>
                             <Plus size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                         ))
                       }
                       {groupCandidates.filter(f => !chatGroups.find(g => g.id === activeChat.uid)?.members?.includes(f.uid)).length === 0 && (
                         <div className="text-center py-12">
                           <Users size={32} className="mx-auto mb-4 text-muted/20" />
                           <p className="text-xs text-muted font-bold">No new members to add</p>
                         </div>
                       )}
                     </div>
                   </motion.div>
                </div>
              )}

              <div className="p-4 space-y-4 pb-48">
                {chatMessages.length === 0 ? (
                  <div className="py-20 text-center opacity-30">
                    <MessageSquare size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">No messages yet. Say hi!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className="relative group max-w-[80%]">
                        {activeChat.isGroup && msg.senderUid !== user.uid && (
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1 ml-2">
                             {chatUsers.find(u => u.uid === msg.senderUid)?.displayName || 'User'}
                          </p>
                        )}
                        <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm relative ${
                          msg.senderUid === user.uid 
                            ? 'bg-ink text-white rounded-tr-none' 
                            : 'bg-gray-100 text-ink rounded-tl-none'
                        }`}>
                          {msg.mediaType === 'voice' ? (
                            <div className="flex items-center gap-3 min-w-[150px]">
                              <button 
                                onClick={() => {
                                  if (activeVoiceMessage === msg.id) {
                                    setActiveVoiceMessage(null);
                                    (document.getElementById(`audio-${msg.id}`) as HTMLAudioElement)?.pause();
                                  } else {
                                    setActiveVoiceMessage(msg.id);
                                    (document.getElementById(`audio-${msg.id}`) as HTMLAudioElement)?.play();
                                  }
                                }}
                                className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${msg.senderUid === user.uid ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-accent/10 hover:bg-accent/20 text-accent'}`}
                              >
                                {activeVoiceMessage === msg.id ? <Pause size={18} /> : <Play size={18} />}
                              </button>
                              <div className="flex-1">
                                <div className="h-1 w-full bg-current opacity-20 rounded-full overflow-hidden">
                                   <motion.div 
                                      animate={activeVoiceMessage === msg.id ? { x: ['0%', '100%'] } : { x: '0%' }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                      className="h-full w-1/3 bg-current opacity-60" 
                                    />
                                </div>
                                <p className="text-[10px] mt-1 opacity-60 font-bold uppercase tracking-widest">Voice Memo</p>
                              </div>
                              <audio 
                                id={`audio-${msg.id}`} 
                                src={msg.mediaUrl} 
                                onEnded={() => setActiveVoiceMessage(null)}
                                className="hidden" 
                              />
                            </div>
                          ) : editingMessageId === msg.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                className="bg-white/10 text-white border-none outline-none rounded-lg p-2 resize-none h-20"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="text-[10px] font-bold uppercase py-1 px-2 border border-white/20 rounded">Cancel</button>
                                <button onClick={() => handleUpdateMessage(msg.id, editingMessageText)} className="text-[10px] font-bold uppercase py-1 px-2 bg-white text-black rounded">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                              <div className={`flex items-center gap-1 mt-1 opacity-70 ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}>
                                {msg.isEdited && <span className="text-[8px] italic mr-1">edited</span>}
                                <span className="text-[9px]">{formatTime(msg.timestamp)}</span>
                                {msg.senderUid === user.uid && (
                                  <span className={msg.status === 'read' ? 'text-blue-400' : 'text-gray-400'}>
                                    {msg.status === 'sent' ? <Check size={12} /> : <CheckCheck size={12} />}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {msg.senderUid === user.uid && editingMessageId !== msg.id && (
                          <div className="absolute top-1/2 -left-10 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                if (activeMessageMenuId === msg.id) {
                                  setActiveMessageMenuId(null);
                                } else {
                                  setActiveMessageMenuId(msg.id);
                                }
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-gray-100 rounded-full"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {activeMessageMenuId === msg.id && (
                              <div className="absolute bottom-full mb-2 left-0 w-32 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <button 
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingMessageText(msg.text);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-ink hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDeleteMessage(msg.id);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={12} /> Unsend
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-card border border-gray-100 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 z-40">
                {!activeChat.isGroup && isOtherTyping && (
                  <div className="px-4 py-1 flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1 w-1 bg-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1 w-1 bg-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1 w-1 bg-accent rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest italic">{activeChat.displayName} is typing...</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                   {isRecording ? (
                    <div className="flex-1 bg-accent/5 flex items-center justify-between px-4 py-3 rounded-xl border border-accent/20">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }} 
                          transition={{ repeat: Infinity, duration: 1 }} 
                          className="h-2 w-2 bg-red-500 rounded-full" 
                        />
                        <span className="text-xs font-black text-ink font-mono">
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Recording...</span>
                      </div>
                      <button 
                        onClick={handleStopRecording}
                        className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Stop & Send
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        placeholder="Type a message..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (handleSendMessage(activeChat.uid, chatInput, activeChat.isGroup), setChatInput(''))}
                        className="flex-1 bg-gray-50 border-none outline-none px-4 py-3 rounded-xl text-sm font-medium"
                      />
                      <button 
                         onClick={handleStartRecording}
                         className="h-10 w-10 text-muted hover:text-accent hover:bg-accent/5 rounded-xl flex items-center justify-center transition-all shrink-0"
                         title="Record Voice"
                      >
                         <Mic size={18} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => { handleSendMessage(activeChat.uid, chatInput, activeChat.isGroup); setChatInput(''); }}
                    className="h-10 w-10 bg-ink text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="w-full max-w-xl mx-auto pb-32">
            <div className="flex items-center justify-between py-8 px-4">
              <h2 className="text-3xl font-bold text-ink tracking-tight font-display">Chats</h2>
              <button 
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="h-10 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-ink hover:bg-gray-100 transition-all flex items-center gap-2"
              >
                <Users size={14} /> New Group
              </button>
            </div>
            
            <div className="flex border-b border-gray-100 mb-6 px-4">
              <button 
                onClick={() => setChatTab('chats')}
                className={`flex-1 py-3 text-[14px] font-bold transition-all border-b-2 ${chatTab === 'chats' ? 'text-ink border-ink' : 'text-muted border-transparent'}`}
              >
                Messages
              </button>
              <button 
                onClick={() => setChatTab('requests')}
                className={`flex-1 py-3 text-[14px] font-bold transition-all border-b-2 relative ${chatTab === 'requests' ? 'text-ink border-ink' : 'text-muted border-transparent'}`}
              >
                Requests
                {unreadRequestsCount > 0 && (
                  <span className="absolute top-2 right-4 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            </div>

            {chatTab === 'chats' ? (
              <div className="divide-y divide-gray-100">
                {recentChats.length === 0 ? (
                  <div className="py-20 text-center px-8">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">No messages yet</h3>
                    <p className="text-sm text-muted">Start a conversation by finding someone in the search bar or visiting their profile.</p>
                  </div>
                ) : (
                  recentChats.map(chat => {
                    const group = chat.isGroup ? chatGroups.find(g => g.id === chat.otherUid) : null;
                    const otherUser = !chat.isGroup ? (connectedUsers.find(u => u.uid === chat.otherUid) || chatUsers.find(u => u.uid === chat.otherUid) || { uid: chat.otherUid, displayName: 'User', photoURL: null }) : null;
                    const unreadCount = allMessages.filter(m => m.chatId === chat.lastMessage.chatId && m.receiverUid === (chat.isGroup ? chat.otherUid : user.uid) && m.status !== 'read').length;

                    return (
                      <button 
                        key={chat.lastMessage.chatId}
                        onClick={() => setActiveChat({
                          uid: chat.otherUid,
                          displayName: chat.isGroup ? group?.name : (otherUser?.displayName || (otherUser as any)?.name),
                          photoURL: chat.isGroup ? group?.photoURL : (otherUser?.photoURL || (otherUser as any)?.photo),
                          isGroup: chat.isGroup
                        })}
                        className="w-full p-4 hover:bg-gray-50 transition-all text-left flex items-center gap-4 group"
                      >
                        <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                          {chat.isGroup ? (
                            group?.photoURL ? (
                              <img src={group.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                               <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
                                 <Users size={20} />
                               </div>
                            )
                          ) : (
                            (otherUser?.photoURL || (otherUser as any)?.photo) ? (
                              <img src={otherUser?.photoURL || (otherUser as any)?.photo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-muted text-xs font-bold">{(otherUser?.displayName || (otherUser as any)?.name)?.charAt(0)}</span>
                            )
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-ink text-[15px] truncate">{chat.isGroup ? group?.name : (otherUser?.displayName || (otherUser as any)?.name)}</h3>
                            <span className="text-[10px] text-muted font-medium ml-2">
                              {formatTime(chat.lastMessage.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-1 truncate">
                              {chat.lastMessage.senderUid === user.uid && (
                                <span className={chat.lastMessage.status === 'read' ? 'text-blue-400' : 'text-gray-400'}>
                                  {chat.lastMessage.status === 'sent' ? <Check size={12} /> : <CheckCheck size={12} />}
                                </span>
                              )}
                              <p className={`text-[13px] truncate ${unreadCount > 0 ? 'text-ink font-bold' : 'text-muted'}`}>
                                {chat.isGroup && <span className="font-bold text-accent mr-1">Group:</span>}
                                {chat.lastMessage.text}
                              </p>
                            </div>
                            {unreadCount > 0 && (
                              <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full ml-2">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {unifiedFollowRequests.length === 0 ? (
                  <div className="py-20 text-center px-8">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-muted">
                      <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Inbox is empty</h3>
                    <p className="text-sm text-muted">Follow requests for you and your institutions will appear here.</p>
                  </div>
                ) : (
                  unifiedFollowRequests.map(req => (
                    <div key={req.id} className="w-full p-4 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                        {req.requesterPhoto ? (
                          <img src={req.requesterPhoto} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-muted text-xs font-bold">{req.requesterName?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-ink text-[15px] truncate">{req.requesterName}</h3>
                        <p className="text-[12px] text-muted truncate">
                          {req.type === 'user_follow' ? 'wants to follow you' : 
                           req.type === 'institution_follow' ? `wants to join ${req.institutionName}` :
                           `wants management access for ${req.institutionName}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (req.type === 'user_follow') handleAcceptFollower(req.requesterUid);
                            else if (req.type === 'institution_follow') handleApproveFollower(req.institution, req.requesterUid);
                            else handleApproveAuditor(req.institution, req.requesterUid);
                          }}
                          className="px-4 py-2 bg-ink text-white rounded-xl font-bold text-[12px] hover:bg-ink/90 transition-all"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => {
                            if (req.type === 'user_follow') handleDeclineFollower(req.requesterUid);
                            else if (req.type === 'institution_follow') handleRejectFollower(req.institution, req.requesterUid);
                            else handleRejectAuditor(req.institution, req.requesterUid);
                          }}
                          className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-[12px] hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      }
      case 'notifications': {
        if (!user) { setView('login'); return null; }
        return (
          <div className="w-full max-w-xl mx-auto py-8">
            <div className="px-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-ink tracking-tight font-display">Notice Center</h2>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{unreadNotificationsCount} unread alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMarkAllNotificationsRead}
                  className="p-2.5 text-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={20} />
                </button>
                <button 
                  onClick={clearNotifications}
                  className="p-2.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Clear all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 mb-6 space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['all', 'message', 'like', 'comment', 'follower_request'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setNotificationTypeFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      notificationTypeFilter === f 
                        ? 'bg-ink text-white shadow-lg' 
                        : 'bg-white border border-gray-100 text-muted hover:border-gray-300'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setNotificationReadFilter('all')}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      notificationReadFilter === 'all' ? 'bg-gray-100 text-ink' : 'text-muted'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setNotificationReadFilter('unread')}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      notificationReadFilter === 'unread' ? 'bg-gray-100 text-ink' : 'text-muted'
                    }`}
                  >
                    Unread
                  </button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 border-t border-gray-50">
              {groupedNotifications.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-muted/20">
                    <Bell size={40} />
                  </div>
                  <p className="text-muted font-bold">No notifications found.</p>
                </div>
              ) : (
                groupedNotifications.map((group, groupIdx) => {
                  const firstNotif = group[0];
                  const count = group.length;
                  const isRead = group.every(n => n.isRead);

                  return (
                    <div 
                      key={groupIdx}
                      className={`p-5 transition-all flex items-start gap-4 relative group ${!isRead ? 'bg-accent/5' : 'hover:bg-gray-50/50'}`}
                    >
                      <div className="shrink-0 pt-1">
                        {firstNotif.type === 'like' && <Heart className="text-red-500 fill-red-500" size={20} />}
                        {firstNotif.type === 'comment' && <MessageCircle className="text-blue-500" size={20} />}
                        {firstNotif.type === 'message' && <MessageSquare className="text-accent" size={20} />}
                        {firstNotif.type === 'follower_request' && <UserPlus className="text-purple-500" size={20} />}
                        {firstNotif.type === 'system' && <Settings className="text-gray-500" size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-[15px] ${!isRead ? 'font-bold' : 'font-medium'} text-ink truncate`}>
                            {firstNotif.title} {count > 1 && <span className="text-muted text-[13px] font-medium ml-1">and {count - 1} more</span>}
                          </h4>
                          <span className="text-[10px] text-muted font-medium shrink-0 ml-2">
                            {formatTime(firstNotif.timestamp)}
                          </span>
                        </div>
                        <p className="text-[13px] text-muted line-clamp-2 leading-relaxed">
                          {firstNotif.text}
                        </p>
                        
                        <div className="mt-3 flex items-center gap-3">
                          {!isRead && (
                            <button 
                              onClick={() => {
                                group.forEach(n => handleMarkNotificationRead(n.id));
                              }}
                              className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                            >
                              Mark seen
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              group.forEach(n => handleDismissNotification(n.id));
                            }}
                            className="text-[10px] font-bold text-muted uppercase tracking-widest hover:text-red-600"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>

                      {/* Dot for unread */}
                      {!isRead && (
                        <div className="absolute top-6 left-2 w-2 h-2 bg-accent rounded-full" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }
      case 'workspace': {
        const workspaceFeatures = [
          { id: 'docs', name: 'Documents', description: 'Create and manage your professional documents with ease.', icon: FileText, color: 'blue-600' },
          { id: 'pdf', name: 'PDF Studio', description: 'Advanced PDF tools for conversion, compression, and signing.', icon: FileJson, color: 'red-600' },
          { id: 'editor', name: 'Creative Editor (Premium)', description: 'Powerful editor for technical writing. Upgrade to premium to unlock.', icon: PenTool, color: 'purple-600' },
          { id: 'storage', name: 'Cloud Storage', description: 'Secure cloud storage for your institution\'s important assets.', icon: HardDrive, color: 'emerald-600' },
          { id: 'e-test', name: 'E-Test Portal', description: 'Conduct and manage electronic tests for students and staff with real-time tracking.', icon: BadgeCheck, color: 'indigo-600' },
          { id: 'e-exam', name: 'E-Examination', description: 'Comprehensive examination system for school-wide assessments and professional certifications.', icon: FileBarChart, color: 'rose-600' },
        ];

        if (activeWorkspaceTool === 'e-test') {
          const activeInst = selectedSchool || selectedPlace || schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid);
          return (
            <WordLayout
              title="E-Test Portal"
              subtitle={`${activeInst?.name || 'Institutional'} Assessment System`}
              icon={BadgeCheck}
              branding={{ name: activeInst?.name || 'Institution' }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-5xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <h3 className="text-3xl font-black text-ink">Active Assignments</h3>
                    <p className="text-sm font-bold text-muted">Manage your student and personnel evaluations</p>
                  </div>
                  <button className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-indigo-200">
                    <Plus size={18} />
                    New Test Module
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    {[
                      { id: 1, title: 'Mid-Term Science Quiz', category: 'Secondary School', students: 124, status: 'ongoing' },
                      { id: 2, title: 'Staff Competency Assessment', category: 'Human Resources', students: 45, status: 'completed' },
                      { id: 3, title: 'Physics 101 Preliminary', category: 'University', students: 89, status: 'draft' }
                    ].map(test => (
                      <div key={test.id} className="p-6 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-between hover:border-indigo-600 transition-all group">
                        <div className="flex items-center gap-6">
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${test.status === 'ongoing' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-muted'}`}>
                            <ClipboardList size={24} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-ink mb-1">{test.title}</h4>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">{test.category} • {test.students} Participants</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            test.status === 'ongoing' ? 'bg-green-50 text-green-600' : 
                            test.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-muted'
                          }`}>
                            {test.status}
                          </span>
                          <button className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-muted group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 bg-indigo-600 text-white rounded-[3rem] shadow-2xl shadow-indigo-200">
                      <h4 className="text-xl font-black mb-2">Institution Stats</h4>
                      <p className="text-white/70 text-xs font-bold mb-8">Weekly performance overview</p>
                      
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Completion Rate</span>
                             <span className="text-xs font-black">94%</span>
                          </div>
                          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                             <div className="h-full bg-white w-[94%]" />
                          </div>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                           <p className="text-3xl font-black">2,450</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Tests Conducted</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start mt-12">
                  <button 
                    onClick={() => setActiveWorkspaceTool(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    <ArrowLeft size={14} />
                    Back to Workspace
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeWorkspaceTool === 'e-exam') {
          const activeInst = selectedSchool || selectedPlace || schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid);
          
          if (isExamStarted) {
            const currentQuestions = examQuestionsStore[examCurrentSubject] || [];
            const currentQ = currentQuestions[examCurrentQuestionIndex];
            const subjects = Object.keys(examQuestionsStore);
            
            return (
              <div className="fixed inset-0 z-[150] bg-[#f0f2f5] flex flex-col font-sans select-none overflow-hidden">
                {/* JAMB HEADER */}
                <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-11 bg-gray-100 border border-gray-300 rounded overflow-hidden flex items-center justify-center">
                      {user?.photoURL ? (
                        <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Candidate Name</span>
                      <span className="text-sm font-black text-ink uppercase">{user?.displayName || 'Guest Candidate'}</span>
                      <div className="flex gap-4 mt-0.5">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Reg Number</span>
                          <span className="text-[10px] font-bold text-ink font-mono">{mockRegNumber}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Center</span>
                          <span className="text-[10px] font-bold text-ink uppercase tracking-tight">{activeInst?.name || 'Main Hall A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="bg-rose-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-3 shadow-sm">
                      <Clock size={18} className="animate-pulse" />
                      <div className="flex flex-col leading-none">
                         <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Time Remaining</span>
                         <span className="text-xl font-black font-mono tracking-tighter">{formatExamTime(examTimeRemaining)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                         <motion.div 
                          className="h-full bg-rose-500" 
                          animate={{ width: `${(examTimeRemaining / 7200) * 100}%` }}
                         />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUBJECT TABS */}
                <div className="bg-[#e7e9eb] px-6 flex items-end gap-1 pt-2">
                  {subjects.map((sub) => {
                    const isActive = examCurrentSubject === sub;
                    const answers = Object.keys(examAnswers[sub] || {}).length;
                    const total = examQuestionsStore[sub].length;
                    return (
                      <button
                        key={sub}
                        onClick={() => {
                          setExamCurrentSubject(sub);
                          setExamCurrentQuestionIndex(0);
                        }}
                        className={`px-6 py-3 rounded-t-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                          isActive 
                            ? 'bg-white text-ink border-t-2 border-rose-600 shadow-sm' 
                            : 'bg-gray-200/80 text-muted hover:bg-gray-200'
                        }`}
                      >
                        {sub}
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] text-muted">
                          {answers}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* MAIN EXAM AREA */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left: Question Content (Expanded) */}
                  <div className="flex-1 bg-white p-8 md:p-14 overflow-y-auto border-r border-gray-200">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex items-center gap-4 mb-10">
                        <div className="px-4 py-2 bg-ink text-white rounded-lg flex items-center justify-center font-black text-xs uppercase tracking-widest">
                          Question {examCurrentQuestionIndex + 1}
                        </div>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>

                      <div className="text-2xl font-bold text-ink leading-relaxed mb-16 min-h-[120px]">
                        {currentQ?.question}
                      </div>

                      <div className="grid grid-cols-1 gap-5">
                        {['A', 'B', 'C', 'D'].map((option) => {
                          const isSelected = examAnswers[examCurrentSubject]?.[examCurrentQuestionIndex] === option;
                          return (
                            <button
                              key={option}
                              onClick={() => handleExamAnswer(option)}
                              className={`w-full p-6 rounded-[2rem] border-2 text-left flex items-center justify-between transition-all group ${
                                isSelected 
                                  ? 'bg-rose-50 border-rose-600 shadow-xl shadow-rose-100' 
                                  : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-6">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                                  isSelected ? 'bg-rose-600 text-white' : 'bg-white text-ink border border-gray-200 group-hover:border-rose-400'
                                }`}>
                                  {option}
                                </div>
                                <span className={`text-lg font-bold ${isSelected ? 'text-rose-900' : 'text-ink'}`}>
                                  {currentQ?.options[option]}
                                </span>
                              </div>
                              {isSelected && <CheckCircle2 size={24} className="text-rose-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Navigation Grid (Compact Sidebar) */}
                  <div className="w-64 bg-[#f7f9fb] p-5 overflow-y-auto flex flex-col border-l border-gray-100">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted mb-5 flex items-center gap-2">
                       <LayoutGrid size={12} /> Question Map
                    </h3>

                    <div className="grid grid-cols-4 gap-1.5 mb-8">
                      {currentQuestions.map((_, idx) => {
                        const isCurrent = examCurrentQuestionIndex === idx;
                        const isAnswered = !!examAnswers[examCurrentSubject]?.[idx];
                        return (
                          <button
                            key={idx}
                            onClick={() => setExamCurrentQuestionIndex(idx)}
                            className={`h-9 rounded-md text-[10px] font-black transition-all ${
                              isCurrent 
                                ? 'bg-ink text-white ring-2 ring-ink/10 scale-105 z-10' 
                                : isAnswered 
                                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' 
                                  : 'bg-white text-ink border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto space-y-3">
                       <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-muted mb-3 flex items-center justify-between">
                             Legend
                             <HelpCircle size={10} />
                          </h5>
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-ink">
                                <div className="h-3 w-3 bg-rose-500 rounded-sm" /> Answered
                             </div>
                             <div className="flex items-center gap-2 text-[10px] font-bold text-ink">
                                <div className="h-3 w-3 bg-ink rounded-sm" /> Current
                             </div>
                             <div className="flex items-center gap-2 text-[10px] font-bold text-ink">
                                <div className="h-3 w-3 bg-white border border-gray-200 rounded-sm" /> Not Visited
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={handleExamPrev}
                            className="py-4 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-ink hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <ArrowLeft size={14} /> (P) rev
                          </button>
                          <button 
                            onClick={handleExamNext}
                            className="py-4 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-ink hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            (N) ext <ArrowRight size={14} />
                          </button>
                       </div>
                       <button 
                        onClick={() => setExamShowSubmitConfirm(true)}
                        className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-rose-700 active:scale-95 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3"
                       >
                         <Lock size={16} /> Finish Exam (S)
                       </button>
                    </div>
                  </div>
                </div>

                {/* OVERLAY: SUBMIT CONFIRMATION */}
                <AnimatePresence>
                  {examShowSubmitConfirm && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[200] bg-ink/90 backdrop-blur-md flex items-center justify-center p-6"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white rounded-[3rem] w-full max-w-lg p-12 text-center shadow-2xl relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <Shield size={200} />
                         </div>

                         <div className="h-20 w-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <AlertTriangle size={40} />
                         </div>

                         <h2 className="text-3xl font-black text-ink mb-4 leading-tight">Ready to Submit?</h2>
                         <p className="text-muted font-bold mb-10 leading-relaxed">
                            You are about to end your session. You cannot return to your questions once you submit.
                            Please review all subjects before final transmission.
                         </p>

                         <div className="grid grid-cols-2 gap-4">
                            <button 
                              onClick={() => setExamShowSubmitConfirm(false)}
                              className="py-5 bg-gray-50 text-muted rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                            >
                               <ArrowLeft size={14} /> (R) eturn
                            </button>
                            <button 
                              onClick={handleExamSubmit}
                              className="py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all flex items-center justify-center gap-2"
                            >
                               Confirm (S) <ArrowRight size={14} />
                            </button>
                         </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          if (examResult) {
             return (
              <WordLayout
                title="Examination Results"
                subtitle="Official Assessment Transcript"
                icon={BadgeCheck}
                branding={{ name: activeInst?.name || 'Institution' }}
                showNotification={showNotification}
                handlePrint={handlePrint}
                hideSaveImage={true}
                toolbar={
                  <button 
                    onClick={() => { setExamResult(null); setActiveWorkspaceTool(null); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                  >
                    <ArrowLeft size={14} />
                    Exit Results
                  </button>
                }
              >
                <div className="max-w-4xl mx-auto">
                   <div className="bg-white border border-gray-100 rounded-[3rem] p-12 shadow-xl mb-12 relative overflow-hidden">
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                         <div className="h-48 w-48 bg-rose-50 border-8 border-white rounded-full flex flex-col items-center justify-center shadow-2xl">
                            <span className="text-5xl font-black text-rose-600 tracking-tighter">{examResult.totalScore}</span>
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Aggregate</span>
                         </div>
                         <div className="flex-1 text-center md:text-left">
                           <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest">Verified Transcript</div>
                              <div className="px-3 py-1 bg-ink text-white rounded-full text-[9px] font-black uppercase tracking-widest">JAMB Standard</div>
                           </div>
                           <h2 className="text-4xl font-black text-ink mb-2">Detailed Performance</h2>
                           <p className="text-muted font-bold leading-relaxed">Generated result for {user?.displayName || 'Candidate'}. Registration Number: {mockRegNumber}. Verified on {new Date().toLocaleDateString()}.</p>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {Object.entries(examResult.subjectScores).map(([sub, score]: any) => (
                        <div key={sub} className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 flex items-center justify-between group hover:bg-white transition-all shadow-sm hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1">
                           <div>
                              <h4 className="text-sm font-black text-muted uppercase tracking-[0.2em] mb-1">{sub}</h4>
                              <div className="h-2 w-32 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                 <motion.div 
                                    className={`h-full ${score >= 50 ? 'bg-green-500' : 'bg-rose-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${score}%` }}
                                 />
                              </div>
                           </div>
                           <div className="text-3xl font-black text-ink group-hover:text-rose-600 transition-colors">{score}</div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="flex justify-center mt-12 gap-4">
                      <button 
                        onClick={() => handlePrint()}
                        className="px-10 py-5 bg-ink text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3"
                      >
                         <Printer size={16} /> Print Result Slip
                      </button>
                      <button 
                        onClick={() => { setExamResult(null); setActiveWorkspaceTool(null); }}
                        className="px-10 py-5 bg-white border border-gray-200 text-ink rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
                      >
                         Discard Result
                      </button>
                   </div>
                </div>
              </WordLayout>
             );
          }

          return (
            <WordLayout
              title="Official E-Examination"
              subtitle={`${activeInst?.name || 'Institutional'} High-Stakes Assessment Suite`}
              icon={FileBarChart}
              branding={{ name: activeInst?.name || 'Institution' }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-5xl">
                <div className="p-12 bg-white border border-gray-100 rounded-[4rem] mb-12 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                      <FileBarChart size={240} />
                   </div>
                   
                   <div className="relative z-10 max-w-2xl">
                     <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-8">
                       <Shield size={32} />
                     </div>
                     <h3 className="text-4xl font-black text-ink mb-4 leading-tight">Secure Examination Environment</h3>
                     <p className="text-muted font-bold text-lg mb-10 leading-relaxed">
                       Our examination module provides AI-driven proctoring, secure browser lockdown, and multi-factor authentication for official school boards.
                     </p>
                     
                     <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={() => {
                            setIsExamStarted(true);
                            setExamTimeRemaining(7200);
                            setExamAnswers({});
                            setExamCurrentSubject('Use of English');
                            setExamCurrentQuestionIndex(0);
                          }}
                          className="px-10 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-rose-200 hover:scale-105 transition-transform"
                        >
                          Start Mock Exam Session
                        </button>
                        <button className="px-10 py-5 bg-white border-2 border-gray-100 text-ink rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">
                          Review Results
                        </button>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                        <Users size={20} />
                      </div>
                      <h4 className="text-xl font-black text-ink mb-2">Student Verification</h4>
                      <p className="text-xs text-muted font-bold leading-relaxed mb-8">Manage biometric and ID verification for current examinees.</p>
                      <button className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                         View Portal <ArrowRight size={14} />
                      </button>
                   </div>
                   <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                        <Database size={20} />
                      </div>
                      <h4 className="text-xl font-black text-ink mb-2">Question Bank</h4>
                      <p className="text-xs text-muted font-bold leading-relaxed mb-8">Access our encrypted repository of curriculum-standard questions.</p>
                      <button className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                         Configure Store <ArrowRight size={14} />
                      </button>
                   </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeWorkspaceTool === 'docs') {
          const docs = cloudFiles.filter(f => f.category === 'document' || f.type.includes('pdf') || f.type.includes('text'));
          return (
            <WordLayout
              title="Documents"
              subtitle="Manage your professional files"
              icon={FileText}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-5xl">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black text-ink">Recent Documents</h3>
                  <button 
                    onClick={() => {
                      setEditingFileId(null);
                      setEditorContent('# Creative Studio\n\nStart crafting your technical document here...');
                      setActiveWorkspaceTool('editor');
                    }}
                    className="flex items-center gap-2 px-8 py-3.5 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                  >
                    <Plus size={16} />
                    New Document
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {docs.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                      <FileText className="mx-auto text-muted mb-4 opacity-20" size={48} />
                      <p className="font-bold text-muted">No documents found</p>
                      <button 
                        onClick={() => setActiveWorkspaceTool('editor')}
                        className="text-[10px] font-black text-accent mt-4 uppercase tracking-widest"
                      >
                        Create your first document
                      </button>
                    </div>
                  ) : (
                    docs.map((file) => (
                      <div 
                        key={file.id} 
                        onClick={() => setViewingFile(file)}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-accent hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
                      >
                         <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                           <FileText size={20} />
                         </div>
                         <h4 className="text-lg font-black text-ink mb-1 group-hover:text-accent transition-colors truncate">{file.name}</h4>
                         <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-8">
                           {file.type.split('/')[1] || 'DOC'} • {file.timestamp?.toDate ? file.timestamp.toDate().toLocaleDateString() : 'Just now'}
                         </p>
                         
                         <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                           <span className="text-[10px] font-black text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                           <div className="flex gap-2">
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this document?')) {
                                    await deleteDoc(doc(db, 'cloudFiles', file.id));
                                    showNotification('Document deleted');
                                  }
                                }}
                                className="p-2 text-muted hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFileId(file.id);
                                  setEditorContent(file.content || '');
                                  setActiveWorkspaceTool('editor');
                                }}
                                className="p-2 text-muted hover:text-accent transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadFile(file);
                                }}
                                className="p-2 text-muted hover:text-ink transition-colors"
                              >
                                <Download size={14} />
                              </button>
                           </div>
                         </div>
                      </div>
                    ))
                  )}
                </div>

                {viewingFile && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/60 backdrop-blur-md">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                    >
                      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-ink">{viewingFile.name}</h3>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Document Viewer</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleDownloadFile(viewingFile)}
                            className="h-10 px-6 bg-white border border-gray-200 text-ink rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => setViewingFile(null)}
                            className="h-10 w-10 bg-white border border-gray-200 text-muted rounded-xl flex items-center justify-center hover:text-ink"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-10 prose prose-slate max-w-none bg-white">
                        <div className="markdown-body">
                          <Markdown>{viewingFile.content || "_No content available_"}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                <div className="flex justify-start mt-12">
                  <button 
                    onClick={() => setActiveWorkspaceTool(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    <ArrowLeft size={14} />
                    Back to Workspace
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeWorkspaceTool === 'storage') {
          const totalSize = cloudFiles.reduce((acc, f) => acc + (f.size || 0), 0);
          const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
          const limitMB = 100;
          const usagePercent = Math.min((parseFloat(sizeInMB) / limitMB) * 100, 100);

          const categories = {
            documents: cloudFiles.filter(f => f.category === 'document').length,
            images: cloudFiles.filter(f => f.category === 'image').length,
            others: cloudFiles.filter(f => f.category === 'other' || !f.category).length
          };

          return (
            <WordLayout
              title="Cloud Storage"
              subtitle="Secure File Management"
              icon={HardDrive}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-5xl">
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                  <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-xl font-black text-ink">My Files</h3>
                        <p className="text-xs text-muted font-bold">Manage your institutional assets</p>
                      </div>
                      <label className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-accent/20">
                        <Upload size={14} />
                        Upload File
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user) return;
                            setIsUploading(true);
                            try {
                              await addDoc(collection(db, 'cloudFiles'), {
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                url: '#', // In real app, upload to storage
                                ownerUid: user.uid,
                                timestamp: serverTimestamp(),
                                category: file.type.startsWith('image/') ? 'image' : 'document'
                              });
                              showNotification('File metadata saved to cloud');
                            } catch (err) {
                              showNotification('Failed to upload', 'error');
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {cloudFiles.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                          <HardDrive className="mx-auto text-muted mb-4 opacity-20" size={48} />
                          <p className="font-bold text-muted">No files in your cloud yet</p>
                          <p className="text-[10px] text-muted/60 mt-2">Upload your first document to get started</p>
                        </div>
                      ) : (
                        cloudFiles.map(file => (
                          <div key={file.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-white hover:ring-1 hover:ring-gray-200 transition-all group">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${file.category === 'image' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                              {file.category === 'image' ? <Camera size={20} /> : <FileText size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-ink truncate">{file.name}</h4>
                              <p className="text-[10px] text-muted font-medium uppercase tracking-wider">
                                {(file.size / 1024).toFixed(1)} KB • {file.timestamp?.toDate ? file.timestamp.toDate().toLocaleDateString() : 'Just now'}
                              </p>
                            </div>
                            <button 
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this file?')) {
                                  await deleteDoc(doc(db, 'cloudFiles', file.id));
                                  showNotification('File removed');
                                }
                              }}
                              className="p-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-80 space-y-6">
                    <div className="bg-ink p-8 rounded-[2.5rem] text-white">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">Storage Usage</h4>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-black">{sizeInMB} MB</span>
                        <span className="text-[10px] font-black text-white/40">of {limitMB} MB</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-8">
                        <div 
                          className="h-full bg-accent rounded-full shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)] transition-all duration-500" 
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Upgrade Storage
                      </button>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-6">Categories</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'Documents', count: categories.documents, icon: FileText, color: 'text-blue-600' },
                          { label: 'Images', count: categories.images, icon: Camera, color: 'text-purple-600' },
                          { label: 'Other', count: categories.others, icon: HardDrive, color: 'text-emerald-600' }
                        ].map(cat => (
                          <div key={cat.label} className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                              <cat.icon size={14} className={cat.color} />
                              <span className="text-xs font-bold text-ink group-hover:text-accent transition-colors">{cat.label}</span>
                            </div>
                            <span className="text-[10px] font-black text-muted bg-gray-50 px-2 py-1 rounded-lg">{cat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <button 
                    onClick={() => setActiveWorkspaceTool(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    <ArrowLeft size={14} />
                    Back to Workspace
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeWorkspaceTool === 'pdf') {
          return (
            <WordLayout
              title="PDF Studio"
              subtitle="Professional PDF Utilities"
              icon={FileJson}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  {[
                    { id: 'convert', name: 'Convert to PDF', desc: 'Turn images and documents into high-quality PDFs.', icon: FileBarChart, color: 'blue-500' },
                    { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDF files into one seamless document.', icon: Files, color: 'purple-500' },
                    { id: 'compress', name: 'Compress PDF', desc: 'Reduce file size while maintaining visual quality.', icon: ArrowUpDown, color: 'amber-500' },
                  ].map(tool => (
                    <button key={tool.id} className="p-8 bg-white border border-gray-100 rounded-[2rem] hover:border-accent hover:shadow-xl transition-all text-left group">
                      <div className={`h-14 w-14 bg-${tool.color.split('-')[0]}-50 text-${tool.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <tool.icon size={24} />
                      </div>
                      <h4 className="text-lg font-black text-ink mb-2">{tool.name}</h4>
                      <p className="text-[11px] text-muted font-bold leading-relaxed mb-6">{tool.desc}</p>
                      <div className="h-10 px-6 bg-gray-50 rounded-full inline-flex items-center text-[10px] font-black uppercase tracking-widest text-ink group-hover:bg-accent group-hover:text-white transition-all">
                        Launch Tool
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-gray-50 p-10 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
                  <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                    <Upload size={32} className="text-muted" />
                  </div>
                  <h3 className="text-xl font-black text-ink mb-2">Drop your files here</h3>
                  <p className="text-sm text-muted font-medium mb-8 max-w-sm mx-auto">Select a tool above, then upload your files to start the professional processing.</p>
                  <label className="px-10 py-4 bg-white border border-gray-200 text-ink rounded-2xl font-black text-sm cursor-pointer hover:bg-gray-50 transition-all inline-block">
                    Browse Files
                    <input type="file" className="hidden" />
                  </label>
                </div>

                <div className="flex justify-start mt-12">
                  <button 
                    onClick={() => setActiveWorkspaceTool(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    <ArrowLeft size={14} />
                    Back to Workspace
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeWorkspaceTool === 'editor') {
          return (
            <WordLayout
              title="Creative Editor"
              subtitle="Structured Content & Documents"
              icon={PenTool}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideSaveImage={true}
              toolbar={
                <button 
                  onClick={() => setActiveWorkspaceTool(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-ink border border-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={14} />
                  Workspace
                </button>
              }
            >
              <div className="max-w-6xl w-full">
                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[700px] flex flex-col md:flex-row">
                  {/* Editor Side */}
                  <div className="flex-1 flex flex-col border-r border-gray-100">
                    <div className="h-14 border-b border-gray-100 px-6 flex items-center justify-between bg-gray-50/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Editor (Markdown)</span>
                      <div className="flex gap-2">
                         <button className="h-8 px-3 bg-white border border-gray-100 rounded-lg text-muted hover:text-ink transition-colors">
                           <Copy size={14} />
                         </button>
                      </div>
                    </div>
                    <textarea 
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      className="flex-1 p-8 outline-none text-sm font-mono leading-relaxed bg-white resize-none text-ink"
                      placeholder="Start writing..."
                    />
                  </div>

                  {/* Preview Side */}
                  <div className="flex-1 flex flex-col bg-gray-50/30">
                    <div className="h-14 border-b border-gray-100 px-6 flex items-center justify-between bg-gray-50/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Document Preview</span>
                      <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              if (!editorContent.trim() || !user) return;
                              const title = editorContent.split('\n')[0].replace(/[#*`]/g, '').trim() || 'Untitled Document';
                              try {
                                if (editingFileId) {
                                  await updateDoc(doc(db, 'cloudFiles', editingFileId), {
                                    name: title + '.md',
                                    size: new Blob([editorContent]).size,
                                    timestamp: serverTimestamp(),
                                    content: editorContent
                                  });
                                  showNotification('Document updated successfully');
                                } else {
                                  await addDoc(collection(db, 'cloudFiles'), {
                                    name: title + '.md',
                                    type: 'text/markdown',
                                    size: new Blob([editorContent]).size,
                                    url: '#',
                                    ownerUid: user.uid,
                                    timestamp: serverTimestamp(),
                                    category: 'document',
                                    content: editorContent
                                  });
                                  showNotification('Document saved to Cloud');
                                }
                              } catch (err) {
                                showNotification('Failed to save', 'error');
                              }
                            }}
                            className="h-8 px-4 bg-accent text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                          >
                            Save
                          </button>
                         <button className="h-8 px-4 bg-white border border-gray-200 text-ink rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                           Export
                         </button>
                      </div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto prose prose-slate prose-sm max-w-none">
                      <div className="markdown-body">
                         <Markdown>{editorContent}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start mt-8">
                  <button 
                    onClick={() => setActiveWorkspaceTool(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    <ArrowLeft size={14} />
                    Back to Workspace
                  </button>
                </div>
              </div>
            </WordLayout>
          );
        }

        return (
          <WordLayout
            title="Workspace"
            subtitle="Productivity & Document Suite"
            icon={LayoutGrid}
            showNotification={showNotification}
            handlePrint={handlePrint}
            hideSaveImage={true}
          >
            <div className="flex flex-col gap-12 max-w-5xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workspaceFeatures.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleWorkspaceToolClick(item.id)}
                    className="group p-8 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-accent hover:shadow-2xl hover:shadow-accent/10 transition-all text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative">
                      <div className={`h-16 w-16 bg-${item.color.split('-')[0]}-50 text-${item.color} rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform`}>
                        <item.icon size={32} strokeWidth={2.5} />
                      </div>
                      
                      <h3 className="text-2xl font-black text-ink mb-3">{item.name}</h3>
                      <p className="text-[13px] text-muted font-bold leading-relaxed max-w-[240px]">
                        {item.description}
                      </p>
                      
                      <div className="mt-12 flex items-center gap-3">
                        <div className="h-10 px-6 bg-gray-50 rounded-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-ink group-hover:bg-accent group-hover:text-white transition-all">
                          Launch Service
                        </div>
                        <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center text-muted group-hover:bg-accent/10 group-hover:text-accent transition-all">
                          <ArrowUpRight size={18} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recent Activity - Live Data */}
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-ink">Recent Activity</h3>
                    <p className="text-xs text-muted font-bold">Your live workspace records</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Synced Live</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {cloudFiles.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                         <Activity size={20} className="text-muted opacity-20" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-muted">No recent activity detected</p>
                    </div>
                  ) : (
                    cloudFiles.slice(0, 5).map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl group hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all cursor-pointer" onClick={() => setActiveWorkspaceTool(file.category === 'document' ? 'docs' : 'storage')}>
                         <div className="flex items-center gap-4">
                           <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${file.category === 'image' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                              {file.category === 'image' ? <Camera size={18} /> : <FileText size={18} />}
                           </div>
                           <div>
                             <h4 className="text-sm font-bold text-ink">{file.name}</h4>
                             <p className="text-[10px] text-muted font-medium uppercase tracking-widest">
                               {file.type.split('/')[1] || 'FILE'} • Saved {file.timestamp?.toDate ? file.timestamp.toDate().toLocaleDateString() : 'Just now'}
                             </p>
                           </div>
                         </div>
                         <ArrowUpRight size={16} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="md:col-span-2 mt-8 p-10 bg-gradient-to-br from-ink to-gray-800 rounded-[3rem] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest mb-6">
                      <Sparkles size={12} className="text-accent" />
                      Pro Features
                    </div>
                    <h3 className="text-3xl font-black mb-4">Integrated Document Workflow</h3>
                    <p className="text-white/60 font-bold text-sm max-w-md leading-relaxed">
                      Connect your documents with your institutional workflow. Sign, share, and store everything in one secure place.
                    </p>
                  </div>
                  <div className="flex gap-4">
                     <button className="h-14 px-8 bg-accent text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-accent/20">
                       Upgrade Account
                     </button>
                     <button className="h-14 px-8 bg-white/10 text-white rounded-2xl font-black text-sm hover:bg-white/20 transition-all border border-white/10">
                       Doc Guide
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'tools': {
        const isOwner = selectedSchool?.creatorUid === user?.uid;
        const canAccessAdmin = isOwner || selectedSchool?.administrativeViewers?.includes(user?.uid || '');

        const userInstitution = canAccessAdmin ? selectedSchool : (schools.find(s => s.creatorUid === user?.uid) || places.find(p => p.creatorUid === user?.uid));
        
        const tools = [
          { id: 'calculator', name: 'Fee Calculator', description: 'Quickly calculate student fees and balances', icon: Calculator, color: 'accent' },
          { id: 'export', name: 'Download Center', description: 'Download complete institutional records and full history', icon: Download, color: 'blue-600' },
          { id: 'export-attendance', name: 'Participation Hub', description: 'Export attendance and participation records', icon: Users, color: 'orange-600' },
          { id: 'export-wallet', name: 'Wallet Center', description: 'Download wallet statements and financial history', icon: Wallet, color: 'green-600' },
          { id: 'penalty', name: 'Penalty Board', description: 'View disciplinary records and notices', icon: ShieldAlert, color: 'red-600' },
          { id: 'referral', name: 'Referral Hub', description: 'Manage your referrals and rewards', icon: Gift, color: 'green-600' },
          { id: 'id-gen', name: 'ID Generator', description: 'Generate student and staff ID cards', icon: IdCard, color: 'blue-600' },
          { id: 'reports', name: 'Report Center', description: 'Generate financial and academic reports', icon: FileBarChart, color: 'purple-600' },
          { id: 'secret-key', name: 'Secret Keys', description: 'Manage access keys for E-Test & Examination', icon: Lock, color: 'indigo-600' },
          { id: 'brain-battle', name: 'Brain Battle', description: 'Challenge your intellect and win rewards', icon: Zap, color: 'yellow-500' },
          { id: 'exona-premium', name: 'Exona Premium Quiz', description: 'The ultimate challenge for elite scholars with exclusive rewards.', icon: Stars, color: 'yellow-600' },
        ];

        if (activeTool === 'export-attendance') {
          const baseAttendance = allAttendance.length > 0 ? allAttendance : attendance;
          const filteredAttendance = baseAttendance.filter(a => {
            if (!exportStartDate && !exportEndDate) return true;
            const recordDate = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date);
            if (exportStartDate && recordDate < new Date(exportStartDate)) return false;
            if (exportEndDate) {
              const end = new Date(exportEndDate);
              end.setHours(23, 59, 59, 999);
              if (recordDate > end) return false;
            }
            return true;
          });

          return (
            <WordLayout 
              title="Participation records"
              subtitle="Attendance & Activity Export"
              icon={Users}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-sm"
                  >
                    All Participation
                  </button>
                </div>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Institutional Attendance System • Generated on {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 mb-12 no-print">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Duration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Start Date</label>
                        <input 
                          type="date" 
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">End Date</label>
                        <input 
                          type="date" 
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-8 py-4 bg-white border border-gray-200 text-ink rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Date</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Name</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-20 text-center text-muted font-medium italic">No participation records found</td>
                      </tr>
                    ) : (
                      filteredAttendance.map((a, i) => (
                        <tr key={a.id} className="border-b border-gray-100">
                          <td className="py-4 text-xs font-mono text-muted">{new Date(a.timestamp?.toDate?.() || a.date).toLocaleDateString()}</td>
                          <td className="py-4 text-sm font-bold text-ink">{a.teacherName}</td>
                          <td className="py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              a.status === 'present' ? 'bg-green-100 text-green-600' :
                              a.status === 'late' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'export-wallet') {
          return (
            <WordLayout 
              title="Wallet statement"
              subtitle="Financial Position & Account Summary"
              icon={Wallet}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Wallet Summary Statement</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Institutional Wallet Terminal • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Account Name</p>
                    <p className="text-lg font-bold text-ink uppercase tracking-tight">{finance?.accountName || 'Not Set'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Wallet ID</p>
                    <p className="text-sm font-mono font-bold text-ink">{finance?.accountNumber || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-accent">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Asset Description</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 text-sm font-bold text-ink">Locked Balance (Fees Pending)</td>
                      <td className="py-4 text-sm font-bold text-ink text-right">{currencySymbol}{allRecords.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-ink text-white">
                      <td className="py-6 px-6 text-xs font-black uppercase tracking-widest">Gross Institutional Worth (Pending)</td>
                      <td className="py-6 px-6 text-xl font-black text-right">{currencySymbol}{allRecords.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'calculator') {
          const balance = (Number(calcTuition) || 0) - (Number(calcPaid) || 0);
          return (
            <WordLayout 
              title="Fee Calculator"
              subtitle="Institutional Financial Utility"
              icon={Calculator}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Fee Calculator</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Financial Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] border border-gray-100">
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Total Tuition Fee</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={calcTuition}
                        onChange={(e) => setCalcTuition(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block">Amount Paid</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-ink">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={calcPaid}
                        onChange={(e) => setCalcPaid(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                  <div className="pt-8 border-t border-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-bold text-muted uppercase tracking-widest">Outstanding Balance</p>
                      <p className="text-3xl font-extrabold text-red-600">{currencySymbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <button className="w-full py-5 bg-ink text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 transition-all">Generate Invoice Preview</button>
                  </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'export') {
          const baseRecords = allRecords.length > 0 ? allRecords : records;
          const filteredRecords = baseRecords.filter(r => {
            // Category Filter
            if (exportCategory !== 'all' && r.type !== exportCategory) return false;
            
            // Date Filter
            if (!exportStartDate && !exportEndDate) return true;
            const recordDate = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
            if (exportStartDate && recordDate < new Date(exportStartDate)) return false;
            if (exportEndDate) {
              const end = new Date(exportEndDate);
              end.setHours(23, 59, 59, 999);
              if (recordDate > end) return false;
            }
            return true;
          });

          const downloadCSV = () => {
            const headers = ['Date', 'Student Name', 'Category', 'Paid', 'Balance', 'Type'];
            const rows = filteredRecords.map(r => [
              new Date(r.timestamp?.toDate?.() || r.timestamp).toLocaleDateString(),
              r.studentName,
              r.category,
              r.paid,
              r.balance,
              r.type
            ]);
            
            const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const fileName = `${userInstitution?.name?.toLowerCase().replace(/\s+/g, '-') || 'exona'}-records-${new Date().getTime()}.csv`;
            
            // Check if we are in Telegram Mini App
            const isTelegram = (window as any).Telegram?.WebApp?.initData;
            if (isTelegram) {
               // For CSV in Telegram, we can't easily "download". 
               // Best is to open as text in new window or provide a copyable version
               const newWin = window.open();
               if (newWin) {
                 newWin.document.write(`<pre style="word-wrap: break-word; white-space: pre-wrap;">${csvContent}</pre>`);
                 newWin.document.title = fileName;
                 showNotification('Data opened. You can select all and copy.');
               } else {
                 showNotification('Popup blocked. Accessing records via Vercel browser is recommended for downloads.');
               }
            } else {
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", fileName);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          };

          const categories: { id: typeof exportCategory, label: string }[] = [
            { id: 'all', label: 'All Records' },
            { id: 'general', label: 'General' },
            { id: 'books', label: 'Books' },
            { id: 'uniforms', label: 'Uniforms' },
            { id: 'services', label: 'Services' },
            { id: 'products', label: 'Products' },
          ];

          return (
            <WordLayout 
              title="Download Center"
              subtitle="Data Export & Archival"
              icon={Download}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                    className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Load Full Record
                  </button>
                  <button 
                    onClick={downloadCSV}
                    className="px-4 py-1.5 bg-ink text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-sm flex items-center gap-2"
                  >
                    <FileText size={14} />
                    Download CSV
                  </button>
                </div>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Record Summary</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Institutional Data Terminal • Generated on {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 mb-12 no-print flex flex-col gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setExportCategory(cat.id)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          exportCategory === cat.id 
                            ? 'bg-ink text-white shadow-lg shadow-ink/20' 
                            : 'bg-white text-muted border border-gray-100 hover:border-accent/20 hover:text-ink'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Filter by Duration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Start Date</label>
                        <input 
                          type="date" 
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">End Date</label>
                        <input 
                          type="date" 
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-accent/20" 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setExportStartDate(''); setExportEndDate(''); setExportCategory('all'); }} 
                    className="px-8 py-4 bg-white border border-gray-200 text-ink rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Date</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Name</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink">Category</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Paid</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-ink text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-muted font-medium italic">No records found for the selected period</td>
                      </tr>
                    ) : (
                      filteredRecords.map((record, i) => (
                        <tr key={record.id} className="border-b border-gray-100">
                          <td className="py-4 text-xs font-mono text-muted">{new Date(record.timestamp?.toDate?.() || record.timestamp).toLocaleDateString()}</td>
                          <td className="py-4 text-sm font-bold text-ink">{record.studentName}</td>
                          <td className="py-4 text-[10px] font-bold text-muted uppercase tracking-widest">{record.category}</td>
                          <td className="py-4 text-sm font-bold text-ink text-right tabular-nums">{currencySymbol}{record.paid.toLocaleString()}</td>
                          <td className="py-4 text-sm font-bold text-red-600 text-right tabular-nums">{currencySymbol}{record.balance.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredRecords.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-ink">Institutional Total</td>
                        <td className="py-4 px-4 text-base font-black text-ink text-right tabular-nums">
                          {currencySymbol}{filteredRecords.reduce((acc, r) => acc + r.paid, 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-base font-black text-red-600 text-right tabular-nums">
                          {currencySymbol}{filteredRecords.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-[10px] font-medium text-muted uppercase tracking-[0.4em] mb-2">End of Official Record</p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'penalty') {
          return (
            <WordLayout 
              title="Penalty Board"
              subtitle="Disciplinary Records & Notices"
              icon={ShieldAlert}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12 text-center">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Conduct Report</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Confidential • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-green-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <ShieldCheck size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Exemplary Record</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  No disciplinary actions or penalties have been recorded for your account. Maintain this standard of excellence.
                </p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'referral') {
          return (
            <WordLayout 
              title="Referral Hub"
              subtitle="Growth & Rewards Program"
              icon={Gift}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Referral Program</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Rewards Terminal • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100">
                  <h4 className="font-extrabold text-2xl text-ink mb-8">Your Referral Link</h4>
                  <div className="flex gap-4 mb-8">
                    <input 
                      readOnly 
                      value={`https://exona.app/ref/${user?.uid?.slice(0, 8)}`}
                      className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl font-mono text-xs text-ink outline-none" 
                    />
                    <button className="px-6 py-4 bg-ink text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-all">Copy</button>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10">
                    <p className="text-xs font-bold text-accent leading-relaxed">
                      Share this link with other institutions. For every successful registration, you earn {currencySymbol}5,000 in credits.
                    </p>
                  </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100">
                  <h4 className="font-extrabold text-2xl text-ink mb-8">Performance</h4>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Referrals</p>
                      <p className="text-2xl font-extrabold text-ink">0</p>
                    </div>
                    <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Earned Rewards</p>
                      <p className="text-2xl font-extrabold text-green-600">{currencySymbol}0.00</p>
                    </div>
                  </div>
                </div>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'id-gen') {
          return (
            <WordLayout 
              title="ID Generator"
              subtitle="Institutional Identity Utility"
              icon={IdCard}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">ID Card Generator</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Identity Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-blue-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <IdCard size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Coming Soon</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  The digital ID card generator is currently under development. Soon you will be able to generate and print official identification cards for all members.
                </p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'reports') {
          return (
            <WordLayout 
              title="Report Center"
              subtitle="Analytical Intelligence Utility"
              icon={FileBarChart}
              branding={{ name: userInstitution?.name || selectedSchool?.name }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Report Center</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Analytical Tool • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-24 w-24 bg-white text-purple-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                  <FileBarChart size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-extrabold text-3xl text-ink mb-4">Coming Soon</h3>
                <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                  Advanced financial and academic reporting tools are being integrated. You will soon be able to export comprehensive institutional data.
                </p>
              </div>
            </WordLayout>
          );
        }

        if (activeTool === 'secret-key') {
          const institutionId = userInstitution?.id || selectedSchool?.id;
          const institutionName = userInstitution?.name || selectedSchool?.name;

          return (
            <WordLayout 
              title="Secret Keys"
              subtitle="Portal Access Management"
              icon={Lock}
              branding={{ name: institutionName }}
              showNotification={showNotification}
              handlePrint={handlePrint}
              hideOfficialBadge={true}
              hideSaveImage={true}
              hideBranding={true}
              hideIcon={true}
              toolbar={
                <button onClick={() => setActiveTool(null)} className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-50 transition-all">Back to Tools</button>
              }
            >
              <div className="mb-16 border-b border-gray-100 pb-12">
                <h1 className="text-4xl font-extrabold text-ink mb-2">Access Key Management</h1>
                <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Security Terminal • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="max-w-2xl mx-auto">
                {userInstitution?.portalSecretKey ? (
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-indigo-50 text-center">
                    <div className="h-20 w-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                      <ShieldCheck size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-ink mb-4">Portal Access Approved</h3>
                    <p className="text-muted font-medium mb-10 leading-relaxed">
                      Your institution has been granted access to the E-Test and Examination portals. Use the secret key below to authenticate access.
                    </p>
                    
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-dashed border-gray-200 mb-8 relative group">
                      <p className="text-[10px] font-black text-muted uppercase tracking-[0.4em] mb-4">Official Secret Key</p>
                      <p className="text-3xl font-mono font-black text-ink tracking-widest break-all select-all">{userInstitution.portalSecretKey}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(userInstitution.portalSecretKey || '');
                          showNotification('Key copied to clipboard');
                        }}
                        className="absolute top-4 right-4 h-10 w-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-muted hover:text-ink transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <Copy size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-6 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Keep this key confidential
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-indigo-50">
                    <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-8">
                      <Lock size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-ink mb-4">Add Access Keys</h3>
                    <p className="text-muted font-medium mb-12 leading-relaxed">
                      To conduct e-tests and examinations, your institution must add a security access key. You can generate one instantly below to begin.
                    </p>

                    <div className="flex flex-col gap-4">
                      <button 
                        disabled={isRequestingKey}
                        onClick={async () => {
                          if (!institutionId) return;
                          setIsRequestingKey(true);
                          try {
                            const newKey = Math.random().toString(36).substring(2, 10).toUpperCase();
                            const schoolType = userInstitution?.type === 'school' ? 'schools' : 'places';
                            await updateDoc(doc(db, schoolType, institutionId), {
                              portalSecretKey: newKey
                            });
                            showNotification('Secret Key Generated Successfully', 'success');
                          } catch (e) {
                            showNotification('Failed to generate key', 'error');
                          } finally {
                            setIsRequestingKey(false);
                          }
                        }}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-[0.98]"
                      >
                        Generate Secret Key
                      </button>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                        <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-black text-muted"><span className="bg-white px-4">Or Request Support</span></div>
                      </div>

                      {activeKeyRequest?.status === 'pending' ? (
                      <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2rem] text-center">
                        <Clock className="mx-auto text-amber-500 mb-4" size={32} />
                        <h4 className="text-lg font-bold text-amber-700 mb-2">Application Pending</h4>
                        <p className="text-sm font-medium text-amber-600">Your request is currently being reviewed by our administrators. Please check back later.</p>
                      </div>
                    ) : (
                      <button 
                        disabled={isRequestingKey}
                        onClick={async () => {
                          if (!institutionId) return;
                          setIsRequestingKey(true);
                          try {
                            const requestId = `REQ-${Date.now()}`;
                            await setDoc(doc(db, 'keyRequests', requestId), {
                              institutionId,
                              institutionName,
                              requesterUid: user?.uid,
                              status: 'pending',
                              timestamp: serverTimestamp()
                            });
                            
                            // Also update institution status
                            const schoolType = userInstitution?.type === 'school' ? 'schools' : 'places';
                            await updateDoc(doc(db, schoolType, institutionId), {
                              portalKeyStatus: 'pending'
                            });

                            showNotification('Access key request submitted');
                            setActiveKeyRequest({ status: 'pending' });
                          } catch (e) {
                            handleFirestoreError(e, OperationType.WRITE, 'keyRequests');
                            showNotification('Failed to submit request', 'error');
                          } finally {
                            setIsRequestingKey(false);
                          }
                        }}
                        className="w-full py-6 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 shadow-xl shadow-ink/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      >
                        {isRequestingKey ? (
                          <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Plus size={18} />
                        )}
                        {isRequestingKey ? 'Submitting Application...' : 'Apply for Secret Key'}
                      </button>
                    )}
                  </div>
                </div>
                )}
              </div>
            </WordLayout>
          );
        }

        return (
          <WordLayout 
            title={userInstitution ? userInstitution.name : "Institutional Hub"}
            subtitle={canAccessAdmin && !isOwner ? "Authorized Access" : "Institutional Utility Suite"}
            icon={Cpu}
            branding={userInstitution ? { logo: userInstitution.logo, name: userInstitution.name } : undefined}
            showNotification={showNotification}
            handlePrint={handlePrint}
          >
            <div className="mb-16 border-b border-gray-100 pb-12">
              <h1 className="text-4xl font-extrabold text-ink mb-2">Utility Terminal</h1>
              <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">
                {userInstitution ? `${userInstitution.name} Operations` : 'System Tools'} • {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (tool.id === 'brain-battle') {
                      if (!isBattleWindowOpen()) {
                        fetchLeaderboard();
                        setIsBrainBattleActive(true);
                        setBattleStep('leaderboard');
                        return;
                      }
                      const shuffled = [...BRAIN_BATTLE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 20);
                      setCurrentBattleQuestions(shuffled);
                      setIsBrainBattleActive(true);
                      setBattleStep('welcome');
                    } else if (tool.id === 'exona-premium') {
                      showNotification('Exona Premium Quiz is coming soon! Upgrade to Premium to be the first to play.', 'success');
                    } else {
                      setActiveTool(tool.id);
                    }
                  }}
                  className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 text-left group hover:border-accent/20 transition-all"
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-${tool.color} mb-6 group-hover:scale-110 transition-transform`}>
                    <tool.icon size={28} />
                  </div>
                  <h3 className="text-xl font-extrabold text-ink mb-2 tracking-tight">{tool.name}</h3>
                  <p className="text-muted text-xs font-medium leading-relaxed">{tool.description}</p>
                </motion.button>
              ))}
            </div>
          </WordLayout>
        );
      }
      case 'penalty': {
        return (
          <WordLayout 
            title="Penalty Board"
            subtitle="Disciplinary Records & Notices"
            icon={ShieldCheck}
            branding={{ name: selectedSchool?.name || 'Institution' }}
            showNotification={showNotification}
            handlePrint={handlePrint}
            hideOfficialBadge={true}
            hideSaveImage={true}
            hideBranding={true}
            hideIcon={true}
            toolbar={
              <div className="flex items-center gap-4">
                <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all">Filter</button>
                <button className="px-4 py-1.5 bg-white border border-gray-200 text-ink rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all">Export</button>
              </div>
            }
          >
            <div className="mb-16 border-b border-gray-100 pb-12 text-center">
              <h1 className="text-4xl font-extrabold text-ink mb-2">Institutional Conduct Report</h1>
              <p className="text-muted text-xs font-medium uppercase tracking-[0.2em]">Confidential • {new Date().toLocaleDateString()}</p>
            </div>

            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="h-24 w-24 bg-white text-green-600 rounded-full flex items-center justify-center mb-8 border border-gray-100">
                <ShieldCheck size={48} strokeWidth={1.5} />
              </div>
              <h3 className="font-extrabold text-3xl text-ink mb-4">Exemplary Record</h3>
              <p className="text-muted text-sm font-medium max-w-sm leading-relaxed">
                You have no active penalties or disciplinary notices. Your commitment to institutional standards is noted and appreciated.
              </p>
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Institutional Document</p>
                <p className="text-[10px] text-muted">{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Office of Conduct</p>
                <div className="h-8 w-32 border-b border-gray-200" />
              </div>
            </div>
          </WordLayout>
        );
      }
      case 'profile': {
        if (!user) { setView('login'); return null; }
        return (
          <div className="w-full max-w-xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 mr-4 min-h-[80px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {isEditingProfileInline ? (
                    <motion.div 
                      key="edit-name"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Display Name</label>
                      <input 
                        type="text" 
                        value={editingProfile.displayName}
                        onChange={(e) => setEditingProfile({...editingProfile, displayName: e.target.value})}
                        className="text-xl font-bold text-ink bg-gray-50 border border-gray-100 outline-none rounded-xl px-4 py-2 w-full focus:bg-white focus:border-accent/20 transition-all"
                        placeholder="Your name..."
                        autoFocus
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-name"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h2 className="text-2xl font-bold text-ink mb-1">{user.displayName}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-ink text-[14px]">{user.email?.split('@')[0]}</p>
                        <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-full text-muted text-[11px] font-bold">institutional portal</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative group h-20 w-20 shrink-0">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-100">
                  {isUploadingProfile ? (
                    <div className="h-full w-full bg-white border border-gray-100 flex flex-col items-center justify-center">
                      <div className="h-5 w-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                      <p className="text-[8px] font-bold text-ink mt-2">Uploading...</p>
                    </div>
                  ) : userDoc?.photoURL || user.photoURL ? (
                    <img src={userDoc?.photoURL || user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-white border border-gray-100 flex items-center justify-center text-ink font-bold text-2xl">
                      {user.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                {!isUploadingProfile && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Camera size={20} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleUpdateProfilePicture}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mb-6 min-h-[60px]">
              <AnimatePresence mode="wait">
                {isEditingProfileInline ? (
                  <motion.div 
                    key="edit-bio"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Bio</label>
                    <textarea 
                      value={editingProfile.bio}
                      onChange={(e) => setEditingProfile({...editingProfile, bio: e.target.value})}
                      className="w-full text-ink text-[14px] bg-gray-50 border border-gray-100 outline-none rounded-xl p-4 h-32 resize-none focus:bg-white focus:border-accent/20 transition-all leading-relaxed"
                      placeholder="Tell the world about yourself..."
                    />
                  </motion.div>
                ) : (
                  <motion.p 
                    key="view-bio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-ink text-[14px] whitespace-pre-wrap"
                  >
                    {userDoc?.bio || "No bio yet."}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3 mb-10">
              <AnimatePresence mode="wait">
                {isEditingProfileInline ? (
                  <motion.div 
                    key="edit-actions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4 w-full"
                  >
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-ink">Private Account</p>
                        <p className="text-[10px] text-muted font-medium">Only followers can see your broadcasts</p>
                      </div>
                      <button 
                        onClick={() => setEditingProfile({...editingProfile, isPrivate: !editingProfile.isPrivate} as any)}
                        className={`w-12 h-6 rounded-full transition-all relative ${editingProfile.isPrivate ? 'bg-accent' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full"
                          animate={{ x: editingProfile.isPrivate ? 24 : 0 }}
                        />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleUpdateProfile}
                        className="flex-1 py-3 bg-ink text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10 flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Save
                      </button>
                      <button 
                        onClick={() => setIsEditingProfileInline(false)}
                        className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="view-actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-3 w-full"
                  >
                    <button 
                      onClick={handleEditProfile}
                      className="flex-1 py-3 bg-ink text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
                    >
                      Edit profile
                    </button>
                    <button className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-gray-50 transition-all">
                      Share profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-12 mt-12">
              {/* Institutional Profile Management */}
              {(() => {
                const myInstitutions = [...schools, ...places].filter(inst => inst.creatorUid === user?.uid);
                if (myInstitutions.length === 0) return null;
                return (
                  <section>
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Managed Institutions</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {myInstitutions.map((inst) => (
                        <div key={inst.id} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-card group hover:border-accent/10 transition-all">
                          <div className="flex items-center gap-5">
                            <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-white group-hover:scale-105 transition-transform">
                              {uploadingInstitutionId === inst.id ? (
                                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1">
                                  <div className="h-5 w-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                                </div>
                              ) : inst.logo ? (
                                <img src={inst.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full bg-gray-50 flex items-center justify-center text-muted font-bold text-xl uppercase">
                                  {inst.name.charAt(0)}
                                </div>
                              )}
                              <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera size={18} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => handleUpdateInstitutionLogo(inst, e)}
                                />
                              </label>
                            </div>
                            <div className="text-left">
                              <p className="text-[15px] font-bold text-ink tracking-tight">{inst.name}</p>
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{inst.type}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingSchool(inst as any);
                              setIsSchoolModalOpen(true);
                            }}
                            className="h-10 px-4 bg-gray-50 text-ink rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              <section>
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Workspace Settings</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: Shield, label: 'Security & Privacy', desc: 'Manage your account protection', color: 'blue-600' },
                    { icon: Bell, label: 'Notification Center', desc: 'Configure your alert preferences', color: 'orange-500' },
                    { icon: Sparkles, label: 'Appearance', desc: `Current: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`, color: 'purple-600', onClick: () => setIsThemeModalOpen(true) },
                    { icon: Database, label: 'Data & Storage', desc: 'Manage your institutional data', color: 'accent' }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={item.onClick}
                      className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-card hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-bold text-ink tracking-tight">{item.label}</p>
                          <p className="text-[11px] text-muted font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={14} className="text-ink" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mb-6 px-2">Support & Legal</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: AlertCircle, label: 'Help Center', desc: 'Get assistance and documentation' },
                    { icon: FileText, label: 'Terms of Service', desc: 'Review our legal agreements' }
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-gray-50 bg-white hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-muted group-hover:text-ink transition-colors">
                          <item.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-bold text-ink tracking-tight">{item.label}</p>
                          <p className="text-[11px] text-muted font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={14} className="text-ink" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-gray-100">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full py-5 bg-red-50 text-red-600 rounded-[2rem] font-bold text-xs uppercase tracking-[0.3em] hover:bg-red-100 transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
                <p className="text-center text-[10px] text-muted font-bold uppercase tracking-[0.4em] mt-8 opacity-30">Operations Terminal v1.0.5</p>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  if (view === 'splash') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-paper text-ink overflow-hidden relative">
        {/* Immersive background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gray-100 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-50 blur-[100px] rounded-full animate-pulse [animation-delay:1s]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 2 }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <h1 className="text-8xl font-bold tracking-tight text-ink mb-2 font-display">Exona</h1>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-ink/10 to-transparent mb-8"></div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col items-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.8em] text-muted mb-12">Mastering Records</p>
            
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 bg-ink/10 rounded-full animate-bounce"></div>
              <div className="h-1 w-1 bg-ink/20 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="h-1 w-1 bg-ink/10 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (loading) return null;

  if (view === 'onboarding') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-sm text-center"
        >
          <div className="bg-white border border-gray-100 p-8 sm:p-12 rounded-[3.5rem] shadow-2xl shadow-ink/5">
             <div className="h-20 w-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-8">
               <Compass size={32} />
             </div>
             <h2 className="text-3xl font-black text-ink mb-2 tracking-tight">Final Step</h2>
             <p className="text-muted text-sm font-medium mb-10 leading-relaxed uppercase tracking-[0.05em]">
               Initialize your localization preferences to complete registration.
             </p>
             
             <div className="space-y-4 mb-10 text-left">
               <div className="relative group">
                  <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 block ml-4">Country & Base Currency</label>
                  <select 
                    value={onboardingCountry.code}
                    onChange={(e) => {
                      const country = COUNTRIES.find(c => c.code === e.target.value);
                      if (country) setOnboardingCountry(country);
                    }}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-[38px] pointer-events-none text-muted">
                    <ChevronDown size={18} />
                  </div>
               </div>
             </div>

             <button 
               onClick={async () => {
                 if (!user) return;
                 setIsUploading(true);
                 try {
                   await setDoc(doc(db, 'users', user.uid), { 
                     country: onboardingCountry.name,
                     currency: onboardingCountry.currency
                   }, { merge: true });
                   setView('feed');
                   showNotification('Globalization protocol finalized');
                 } catch (error) {
                   showNotification('Handshake failed', 'error');
                 } finally {
                   setIsUploading(false);
                 }
               }}
               disabled={isUploading}
               className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-ink/90 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
             >
               {isUploading ? (
                 <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               ) : (
                 <BadgeCheck size={18} />
               )}
               Authorize Profile
             </button>
          </div>
          <div className="mt-8 text-center">
            <button onClick={handleLogout} className="text-xs font-bold text-muted hover:text-ink transition-colors uppercase tracking-[0.2em]">Abort & Sign Out</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'login') {
    if (verificationSent || (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password'))) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-white p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-sm text-center"
          >
            <h1 className="text-4xl font-extrabold mb-8">Exona</h1>
            <div className="bg-white border border-border p-10 rounded-xl mb-4">
              <h2 className="text-xl font-bold mb-4">Check your email</h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                We've sent a verification link to <span className="text-ink font-bold">{user?.email || email}</span>. Please click the link in your email to verify your account.
                <br /><br />
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest italic animate-pulse">Tip: Check your spam folder if you can't see it in your inbox!</span>
              </p>
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    if (auth.currentUser) {
                      await auth.currentUser.reload();
                      if (auth.currentUser.emailVerified) {
                        const docData = await ensureUserDocument(auth.currentUser);
                        setUserDoc(docData);
                        setUser(auth.currentUser);
                        setView('feed');
                      } else {
                        setAuthError('Email not verified yet. Please check your inbox.');
                      }
                    }
                  }} 
                  className="w-full py-2 bg-accent text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all"
                >
                  I've verified my email
                </button>
                <button 
                  onClick={() => {
                    setVerificationSent(false);
                    signOut(auth);
                  }} 
                  className="w-full py-2 text-accent font-bold text-sm hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </motion.div>
          {renderBrainBattle()}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-sm"
        >
          <div className="bg-white border border-gray-100 p-8 sm:p-12 rounded-[2.5rem] mb-4 flex flex-col items-center shadow-xl shadow-ink/5">
            <h1 className="text-5xl sm:text-6xl font-bold mb-8 sm:mb-12 mt-4 font-display">Exona</h1>
            
            {authError && (
              <div className="mb-6 p-4 w-full bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs text-center font-bold">
                {authError}
              </div>
            )}

            <div className="w-full space-y-3 mb-6">
              {authMode === 'signup' && (
                <>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                  />
                  <div className="relative group">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 block ml-4">Select Country (Currency)</label>
                    <select 
                      value={selectedSignupCountry.code}
                      onChange={(e) => {
                        const country = COUNTRIES.find(c => c.code === e.target.value);
                        if (country) setSelectedSignupCountry(country);
                      }}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold appearance-none cursor-pointer"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-[38px] pointer-events-none text-muted">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </>
              )}
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                />
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
            </div>

            <button 
              onClick={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp} 
              className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-sm hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all mb-4 active:scale-[0.98]"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="w-full flex items-center gap-4 mb-4">
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Or</span>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>

            <button 
              onClick={() => {
                if (!isBattleWindowOpen()) {
                  fetchLeaderboard();
                  setIsBrainBattleActive(true);
                  setBattleStep('leaderboard');
                  return;
                }
                const shuffled = [...BRAIN_BATTLE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 20);
                setCurrentBattleQuestions(shuffled);
                setIsBrainBattleActive(true);
                setBattleStep('welcome');
              }}
              className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-ink/90 shadow-lg shadow-ink/20 transition-all mb-8 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Zap size={18} className="text-yellow-400 fill-yellow-400" />
              Play Brain Battle
            </button>

            {authMode === 'signin' && (
              <button 
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className={`text-xs font-bold text-accent hover:underline transition-all ${isResettingPassword ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isResettingPassword ? 'Sending reset link...' : 'Forgot password?'}
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] text-center shadow-xl shadow-ink/5">
            <p className="text-sm font-medium text-muted">
              {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthError(null);
                }} 
                className="text-accent font-bold hover:underline"
              >
                {authMode === 'signin' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-muted">Exona from Antigravity</p>
          </div>
        </motion.div>
        {renderBrainBattle()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden overflow-x-hidden">
      {/* Global Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-ink text-white border-white/10' 
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {!isOnline && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-orange-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl flex items-center gap-2"
        >
          <Clock size={12} className="animate-spin" />
          Offline Mode: Data will sync when back online
        </motion.div>
      )}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-8 sm:p-12 border border-gray-100"
            >
              <div className="h-20 w-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-600 mb-8">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Terminate Identity?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">
                This protocol is permanent and cannot be reversed. Are you absolutely certain you wish to purge your Exona identity from the mainframe?
              </p>

              {authError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-8 p-5 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-[11px] font-bold flex items-center gap-3"
                >
                  <AlertCircle size={18} />
                  {authError}
                </motion.div>
              )}

              {user?.providerData.some(p => p.providerId === 'password') && (
                <div className="mb-10">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4">Security Key Confirmation</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter key to authorize"
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-red-500/10 focus:bg-white border border-transparent focus:border-red-100 transition-all text-sm font-medium pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-700 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isDeleting ? 'Purging...' : 'Confirm Termination'}
                </button>
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword('');
                    setAuthError(null);
                  }}
                  disabled={isDeleting}
                  className="w-full py-5 bg-white text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 disabled:opacity-50 transition-all border border-gray-100"
                >
                  Abort Protocol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/20 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl bg-card rounded-[3.5rem] p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">{editingPost ? 'Refine Broadcast' : 'Initialize Broadcast'}</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Horizon Network Transmission</p>
                </div>
                <button 
                  onClick={() => setIsPostModalOpen(false)} 
                  className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative mb-6">
                <textarea 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's happening in your school?"
                  className="w-full h-56 p-8 bg-white rounded-[2.5rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-gray-100 transition-all text-lg font-bold resize-none placeholder:text-gray-300 leading-relaxed"
                />
                <div className="absolute bottom-6 right-8 flex items-center gap-3">
                  <div className={`text-[10px] font-bold tracking-widest uppercase ${newPostContent.length > 450 ? 'text-red-500' : 'text-muted'}`}>
                    {newPostContent.length} / 500
                  </div>
                  <div className="h-4 w-4 rounded-full border border-gray-100 flex items-center justify-center p-[2px]">
                    <motion.div 
                      initial={false}
                      animate={{ 
                        height: `${Math.min((newPostContent.length / 500) * 100, 100)}%`,
                        backgroundColor: newPostContent.length > 450 ? '#ef4444' : '#0095F6'
                      }}
                      className="w-full rounded-full"
                    />
                  </div>
                </div>
              </div>

              {previewPostUrls.length > 0 && (
                <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previewPostUrls.map((url, idx) => (
                    <div key={idx} className="aspect-square bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 relative group ring-4 ring-accent/5">
                      {selectedPostFiles[idx]?.type.startsWith('image/') || (editingPost?.mediaType === 'image' && !selectedPostFiles[idx]) ? (
                        <img src={url} className="w-full h-full object-cover" />
                      ) : (
                        <video src={url} className="w-full h-full object-cover" controls={!isUploading} />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      <button 
                        onClick={() => { 
                          const newFiles = [...selectedPostFiles];
                          newFiles.splice(idx, 1);
                          setSelectedPostFiles(newFiles);
                        }} 
                        className="absolute top-4 right-4 h-10 w-10 bg-white/90 backdrop-blur-md text-ink rounded-xl flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 z-20"
                      >
                        <X size={16} />
                      </button>

                      {isUploading && (
                        <div className="absolute inset-0 bg-ink/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-30 text-center">
                           <span className="text-white text-[10px] font-black">{Math.round(uploadProgress)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isUploading && (
                     <div className="col-span-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-accent"
                       />
                     </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <label className="h-14 w-14 bg-gray-50 text-muted rounded-2xl hover:bg-gray-100 cursor-pointer transition-all flex items-center justify-center border border-gray-100 active:scale-90">
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedPostFiles(prev => [...prev, ...files]);
                    }} />
                  </label>
                  <label className="h-14 w-14 bg-gray-50 text-muted rounded-2xl hover:bg-gray-100 cursor-pointer transition-all flex items-center justify-center border border-gray-100 active:scale-90">
                    <VideoIcon size={22} />
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedPostFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                  </label>
                </div>
                <button 
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isUploading}
                  className="px-12 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.25em] hover:bg-ink/90 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-[0.98]"
                >
                  {isUploading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {editingPost ? 'Synchronizing...' : 'Transmitting...'}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {editingPost ? 'Update Broadcast' : 'Post to Horizon'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCreateGroupModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-ink text-lg">Create New Group</h3>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Chat with multiple people</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group/new-photo">
                      <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        {isUploadingGroupPhoto ? (
                          <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
                        ) : newGroupData.photoURL ? (
                          <img src={newGroupData.photoURL} className="h-full w-full object-cover" />
                        ) : (
                          <Camera size={32} className="text-gray-300" />
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-all">
                        <Plus size={20} />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleGroupPhotoUpload(e, true)}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Group Picture</p>
                  </div>
                  
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest">Group Info</label>
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupData.name}
                    onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold text-ink outline-none"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newGroupData.description}
                    onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                    className="w-full h-24 bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold text-ink outline-none resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest">Select Members ({groupCandidates.length})</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                    {groupCandidates.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted italic font-bold">No members found to add</p>
                    ) : (
                      groupCandidates.map(follower => {
                        const isSelected = newGroupData.members.includes(follower.uid);
                        return (
                          <button
                            key={follower.uid}
                            onClick={() => {
                              if (isSelected) {
                                setNewGroupData({ ...newGroupData, members: newGroupData.members.filter(id => id !== follower.uid) });
                              } else {
                                setNewGroupData({ ...newGroupData, members: [...newGroupData.members, follower.uid] });
                              }
                            }}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isSelected ? 'bg-accent/5 border-accent' : 'bg-white border-gray-100 hover:border-accent/40'}`}
                          >
                            <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                               {follower.photoURL ? <img src={follower.photoURL} className="h-full w-full object-cover" /> : <span className="font-bold text-xs">{follower.displayName?.charAt(0)}</span>}
                            </div>
                            <div className="flex-1 text-left">
                               <p className="text-sm font-bold text-ink">{follower.displayName}</p>
                               <p className="text-[10px] text-muted font-bold">@{follower.uid.slice(0, 8)}</p>
                            </div>
                            {isSelected ? <CheckCircle2 size={18} className="text-accent" /> : <Circle size={18} className="text-gray-200" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                 <button 
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                 <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupData.name.trim()}
                  className="px-10 py-3.5 bg-accent text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDeletePostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-card rounded-[3rem] premium-shadow p-12 border border-gray-100 text-center"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Retract Broadcast?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the transmission from the Horizon network. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeletePost}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Retraction
                </button>
                <button 
                  onClick={() => {
                    setIsDeletePostModalOpen(false);
                    setPostToDelete(null);
                  }}
                  className="w-full py-5 bg-white text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all border border-gray-100"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isRecordModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-card rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-12 border border-gray-100 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8 sm:mb-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-1">
                    {editingRecord 
                      ? `Edit ${recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Record` 
                      : `Add ${recordTab === 'general' ? labels.general : recordTab === 'books' ? labels.books : labels.uniforms} Record`}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Data Entry</p>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="h-10 w-10 sm:h-12 sm:w-12 bg-white text-muted rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">{labels.student} Name</label>
                  <input 
                    type="text" 
                    value={newRecord.studentName}
                    onChange={(e) => setNewRecord({...newRecord, studentName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Category/{labels.educationalLevel}</label>
                  {selectedSchool?.educationalLevels && selectedSchool.educationalLevels.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 px-2">
                        {selectedSchool.educationalLevels.map(level => {
                          const currentCategories = newRecord.category.split(',').map(c => c.trim()).filter(c => c);
                          const isSelected = currentCategories.includes(level);
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                let newCategories;
                                if (isSelected) {
                                  newCategories = currentCategories.filter(c => c !== level);
                                } else {
                                  newCategories = [...currentCategories, level];
                                }
                                setNewRecord({...newRecord, category: newCategories.join(', ')});
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                isSelected
                                  ? 'bg-ink text-white border-ink'
                                  : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                      <input 
                        type="text" 
                        value={newRecord.category}
                        onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                        placeholder="Or specify exact class (e.g. SS3 A)"
                        className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                      />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={newRecord.category}
                      onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}
                      placeholder="e.g. JSS1, SS3"
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Paid ({currencySymbol})</label>
                    <input 
                      type="number" 
                      value={newRecord.paid}
                      onChange={(e) => setNewRecord({...newRecord, paid: Number(e.target.value)})}
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Balance ({currencySymbol})</label>
                    <input 
                      type="number" 
                      value={newRecord.balance}
                      onChange={(e) => setNewRecord({...newRecord, balance: Number(e.target.value)})}
                      className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white border border-transparent focus:border-gray-100 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateRecord}
                  disabled={!newRecord.studentName.trim() || isUploading}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/10 hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      {editingRecord ? 'Synchronizing...' : 'Authorizing...'}
                    </>
                  ) : (
                    editingRecord ? 'Update Record' : 'Synchronize Record'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeleteRecordModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-12 border border-gray-100 text-center my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Erase Record?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove the {labels.student.toLowerCase()} information from the institutional database. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteRecord}
                  disabled={isUploading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Erasing...
                    </>
                  ) : (
                    'Confirm Erasure'
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsDeleteRecordModalOpen(false);
                    setRecordToDelete(null);
                  }}
                  disabled={isUploading}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeleteSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[3rem] p-12 border border-gray-100 text-center my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
                <Trash2 size={32} />
              </div>
              <h3 className="text-3xl font-extrabold text-ink mb-3 tracking-tight">Erase Institution?</h3>
              <p className="text-muted font-medium mb-10 leading-relaxed">This action is permanent and will remove this institution and all its associated data from the system. Are you sure?</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDeleteSchool}
                  disabled={isUploading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Erasing...
                    </>
                  ) : (
                    'Confirm Deletion'
                  )}
                </button>
                <button 
                  onClick={() => { setIsDeleteSchoolModalOpen(false); setSchoolToDelete(null); }}
                  disabled={isUploading}
                  className="w-full py-5 bg-gray-50 text-muted rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSchoolModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-card rounded-3xl sm:rounded-[3.5rem] p-6 sm:p-8 md:p-12 border border-gray-100 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8 sm:mb-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-1">{editingSchool ? 'Refine Institution' : 'Create Institution'}</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Profile Setup</p>
                </div>
                <button onClick={() => { setIsSchoolModalOpen(false); setEditingSchool(null); setNewSchool({ name: '', description: '', logo: '', type: 'school' }); }} className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Classification</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['school', 'place'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewSchool({ ...newSchool, type: t as any })}
                        className={`py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          newSchool.type === t 
                            ? 'bg-ink text-white shadow-xl shadow-ink/10' 
                            : 'bg-gray-50 text-muted border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {newSchool.type === 'school' && (
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Educational Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {['Pre-Nursery', 'Nursery', 'Primary', 'Secondary', 'Tertiary'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            const levels = newSchool.educationalLevels || [];
                            if (levels.includes(level)) {
                              setNewSchool({ ...newSchool, educationalLevels: levels.filter(l => l !== level) });
                            } else {
                              setNewSchool({ ...newSchool, educationalLevels: [...levels, level] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            (newSchool.educationalLevels || []).includes(level)
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newSchool.type === 'place' && (
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Space Category</label>
                    <div className="flex flex-wrap gap-2">
                      {['School', 'Business', 'Community', 'Personal', 'Other'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSchool({ ...newSchool, category: c as any })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            newSchool.category === c
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Institution Name</label>
                  <input 
                    type="text" 
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                    placeholder="e.g. Horizon International"
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Description</label>
                  <textarea 
                    value={newSchool.description}
                    onChange={(e) => setNewSchool({...newSchool, description: e.target.value})}
                    placeholder="Brief institutional overview..."
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold resize-none h-32 leading-relaxed"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">Visual Identity</label>
                  <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-[2rem] transition-all">
                    <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-gray-100">
                      {previewUrl || newSchool.logo ? (
                        <img src={previewUrl || newSchool.logo} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={24} className="text-muted/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-ink transition-all cursor-pointer border border-gray-100">
                        <Upload size={14} />
                        Upload Logo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <p className="text-[9px] text-muted mt-2 ml-1 font-medium">Recommended: 400x400px PNG/JPG</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-12">
                <button 
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name.trim() || isUploading}
                  className="flex-1 py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      {editingSchool ? 'Synchronizing...' : 'Designing...'}
                    </>
                  ) : (
                    editingSchool ? 'Synchronize Updates' : 'Start Institution'
                  )}
                </button>
                {editingSchool && editingSchool.creatorUid === user?.uid && (
                  <button 
                    onClick={() => {
                      setSchoolToDelete(editingSchool.id);
                      setIsDeleteSchoolModalOpen(true);
                    }}
                    className="px-10 py-5 bg-red-50 text-red-600 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Trash2 size={18} />
                    Delete Institution
                  </button>
                )}
              </div>
              {isUploading && (
                <div className="mt-6">
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                  <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-2 text-center">{Math.round(uploadProgress)}% Transmission Complete</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {isAttendanceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-card rounded-3xl sm:rounded-[3.5rem] p-6 sm:p-8 md:p-12 border border-gray-100 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8 sm:mb-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-1">Record {labels.attendance}</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Institutional Presence Log</p>
                </div>
                <button onClick={() => setIsAttendanceModalOpen(false)} className="h-10 w-10 sm:h-12 sm:w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-2 block ml-4 group-focus-within:text-ink transition-colors">{labels.teacher} Name</label>
                  <input 
                    type="text" 
                    value={newAttendance.teacherName}
                    onChange={(e) => setNewAttendance({...newAttendance, teacherName: e.target.value})}
                    placeholder="Full Legal Name"
                    className="w-full px-8 py-5 bg-white border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 block ml-4">Presence Status</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['present', 'absent', 'late'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewAttendance({ ...newAttendance, status: s })}
                        className={`py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                          newAttendance.status === s 
                            ? 'bg-ink text-white border-ink' 
                            : 'bg-white text-muted border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-12">
                <button 
                  onClick={handleCreateAttendance}
                  disabled={!newAttendance.teacherName.trim() || isUploading}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Recording...
                    </>
                  ) : (
                    'Authorize Presence'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isThemeModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-card rounded-[3rem] p-10 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-ink mb-1">Appearance</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Visual Interface Protocol</p>
                </div>
                <button onClick={() => setIsThemeModalOpen(false)} className="h-12 w-12 bg-gray-50 text-muted rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'light', name: 'Classic', color: '#F8FAFC', border: '#E2E8F0', text: '#0F172A' },
                  { id: 'dark', name: 'Midnight', color: '#020617', border: '#1E293B', text: '#F8FAFC' },
                  { id: 'blue', name: 'Cobalt', color: '#EFF6FF', border: '#DBEAFE', text: '#1E3A8A' },
                  { id: 'purple', name: 'Amethyst', color: '#FAF5FF', border: '#F3E8FF', text: '#581C87' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setCurrentTheme(theme.id as any);
                      setIsThemeModalOpen(false);
                      showNotification(`${theme.name} theme applied`);
                    }}
                    className={`p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group ${
                      currentTheme === theme.id ? 'border-accent bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-4 relative z-10">
                      <div 
                        className="h-10 w-10 rounded-xl border border-gray-200/20 shadow-sm"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <div>
                        <p className="text-sm font-bold text-ink">{theme.name}</p>
                        <p className="text-[10px] text-muted font-medium">Interface Mode</p>
                      </div>
                    </div>
                    {currentTheme === theme.id && (
                      <div className="absolute top-4 right-4 h-6 w-6 bg-accent rounded-full flex items-center justify-center text-white">
                        <Check size={12} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCommentModalOpen && activePostForComments && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-white rounded-[3.5rem] flex flex-col max-h-[85vh] border border-gray-100"
            >
              <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-extrabold text-ink mb-1">Broadcast Replies</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Community Interactions</p>
                </div>
                <button onClick={() => setIsCommentModalOpen(false)} className="h-12 w-12 bg-white text-muted rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 active:scale-90">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {postComments.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle size={64} strokeWidth={1} className="mx-auto mb-6" />
                    <p className="font-bold text-xl">No replies yet. Start the conversation.</p>
                  </div>
                ) : (
                  postComments.map(comment => (
                    <div key={comment.id} className="flex gap-6 group">
                      <div className="relative">
                        {comment.authorPhoto ? (
                          <img src={comment.authorPhoto} className="h-14 w-14 rounded-2xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-accent/5 flex items-center justify-center text-accent font-extrabold text-2xl border border-accent/10">
                            {comment.authorName?.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center border border-gray-100">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 group-hover:border-gray-200 transition-all duration-500">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold text-ink tracking-tight">{comment.authorName}</p>
                              {comment.isEdited && <span className="text-[9px] text-muted italic font-medium px-1.5 py-0.5 bg-gray-50 rounded-md ring-1 ring-gray-100">edited</span>}
                            </div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                              {comment.timestamp ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </p>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-4">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent/20 transition-all text-sm font-medium resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-3">
                                <button 
                                  onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}
                                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleUpdateComment(activePostForComments.id, comment.id, editingCommentText)}
                                  className="px-6 py-2 bg-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-all"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[14px] text-ink/70 leading-relaxed font-medium">{comment.text}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 mt-4 ml-6">
                          {user && user.uid === comment.authorUid && !editingCommentId && (
                            <>
                              <button 
                                onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }}
                                className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors flex items-center gap-1.5"
                              >
                                <Edit2 size={10} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(activePostForComments.id, comment.id)}
                                className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] hover:text-red-600 transition-colors flex items-center gap-1.5"
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </>
                          )}
                          <button className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors">Approve</button>
                          <button className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hover:text-accent transition-colors">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-10 border-t border-gray-100 bg-white">
                <div className="flex gap-5 items-center">
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your perspective..."
                      className="w-full pl-10 pr-20 py-6 bg-white rounded-[2rem] border border-gray-100 outline-none focus:ring-2 focus:ring-ink/5 focus:bg-white focus:border-gray-200 transition-all text-[15px] font-bold placeholder:text-gray-300"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button className="p-2 text-muted hover:text-accent transition-colors"><Smile size={20} /></button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="h-16 w-16 bg-ink text-white rounded-2xl flex items-center justify-center hover:bg-ink/90 disabled:opacity-50 transition-all active:scale-90"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isReceiptModalOpen && recordForReceipt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              <div className="flex justify-between items-center px-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-[0.2em]">Preview Receipt</h3>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="h-10 w-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all font-display"
                >
                  <X size={20} />
                </button>
              </div>

              {/* The Receipt Captured Area */}
              <div ref={receiptRef} className="bg-white p-8 rounded-3xl shadow-2xl relative overflow-hidden print-content">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-ink/5 rounded-full -ml-24 -mb-24" />
                
                <div className="relative z-10">
                  <div className="flex flex-col items-center mb-10 text-center">
                    {(() => {
                      const recordInstitution = schools.find(s => s.id === recordForReceipt?.schoolId) || 
                                              places.find(p => p.id === recordForReceipt?.schoolId);
                      const displayTitle = recordInstitution?.name || selectedSchool?.name || 'Institutional Record';
                      return (
                        <>
                          {(recordInstitution?.logo || selectedSchool?.logo) ? (
                            <img 
                              src={recordInstitution?.logo || selectedSchool?.logo} 
                              className="h-14 w-14 rounded-2xl object-cover mb-4 shadow-xl shadow-ink/10" 
                              referrerPolicy="no-referrer" 
                              crossOrigin="anonymous" 
                            />
                          ) : (
                            <div className="h-14 w-14 bg-ink text-white rounded-2xl flex items-center justify-center font-black text-2xl mb-4 shadow-xl shadow-ink/20">
                              {displayTitle.charAt(0)}
                            </div>
                          )}
                          <h2 className="text-xl font-black text-ink tracking-tighter uppercase">{displayTitle}</h2>
                          <p className="text-[8px] font-bold text-muted uppercase tracking-[0.5em] mt-1">Official Transaction Receipt</p>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-end mb-8 pb-8 border-b border-gray-100">
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Receipt Number</p>
                      <p className="text-sm font-mono font-bold text-ink">#REC-{Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Date Issued</p>
                      <p className="text-[11px] font-bold text-ink">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-6 mb-12">
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Institution</p>
                      <p className="text-sm font-bold text-ink">
                      {(schools.find(s => s.id === recordForReceipt?.schoolId) || 
                        places.find(p => p.id === recordForReceipt?.schoolId))?.name || 
                        selectedSchool?.name || 
                        'Institutional Record'}
                    </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">{selectedSchool?.type === 'school' ? 'Student' : 'Subject'} Name</p>
                      <p className="text-sm font-bold text-ink underline decoration-ink/10 underline-offset-4">{recordForReceipt.studentName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">{selectedSchool?.type === 'school' ? 'Class/Level' : 'Category'}</p>
                        <p className="text-xs font-bold text-ink uppercase tracking-wider">{recordForReceipt.category}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Payment For</p>
                        <p className="text-xs font-bold text-ink uppercase tracking-wider">{(recordForReceipt as any).type || 'General'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4 mb-10 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Amount Paid</span>
                      <span className="text-lg font-mono font-bold text-green-600">{currencySymbol}{recordForReceipt.paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Balance</span>
                      <span className="text-sm font-mono font-bold text-red-600">{currencySymbol}{recordForReceipt.balance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-6 border-t border-dashed border-gray-200">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={16} className="text-green-500" />
                       <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Verified Payment</span>
                    </div>
                    <div className="h-10 w-full flex items-center justify-center opacity-30">
                       <ShieldCheck size={24} />
                    </div>
                    <p className="text-[7px] text-center text-muted uppercase tracking-[0.2em] leading-relaxed">
                      This receipt is electronically generated and verified. <br />
                      Valid for institutional records authentication.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDownloadReceipt}
                  disabled={isExporting}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-ink/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isExporting ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isExporting ? 'Generating...' : 'Save as Image'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handlePrint}
                    disabled={isExporting}
                    className="py-5 bg-white text-ink border border-gray-200 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button 
                    onClick={() => setIsReceiptModalOpen(false)}
                    disabled={isExporting}
                    className="py-5 bg-white/10 text-white border border-white/20 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/5 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <X size={18} />
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSecretKeyModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[400] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Lock size={120} />
              </div>
              
              <div className="relative z-10">
                <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-black text-ink mb-2">Authentication Required</h3>
                <p className="text-muted font-bold text-sm mb-10 leading-relaxed">
                  Please enter your institution's secret access key to continue to the portal. If your institution doesn't have a key, the owner must add one first.
                </p>

                <div className="space-y-6 mb-10">
                  <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.4em] mb-4 block">Security Key</label>
                    <input 
                      type="password"
                      value={secretKeyInput}
                      onChange={(e) => setSecretKeyInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white text-center font-mono text-xl tracking-[0.5em] transition-all"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifySecretKey()}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleVerifySecretKey}
                    className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.3em] hover:bg-ink/90 shadow-xl shadow-ink/20 transition-all active:scale-[0.98]"
                  >
                    Verify & Unlock
                  </button>
                  <button 
                    onClick={() => {
                      setIsSecretKeyModalOpen(false);
                      setSecretKeyInput('');
                    }}
                    className="w-full py-5 text-muted font-bold text-[10px] uppercase tracking-widest hover:text-ink transition-all"
                  >
                    Cancel Access
                  </button>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed">
                    Don't have a key? <br />
                    <button 
                      onClick={() => {
                        setIsSecretKeyModalOpen(false);
                        setView('tools');
                      }}
                      className="text-indigo-600 hover:underline"
                    >
                      Apply in Institutional Hub
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      {/* Sidebar Navigation */}
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[150] no-print"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-[160] flex flex-col border-r border-gray-100 no-print"
            >
              <div className="p-6 bg-ink text-white flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Menu</h2>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                {user && (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-white/20">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full bg-accent flex items-center justify-center text-xl font-bold">
                          {user.displayName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-base">{user.displayName}</p>
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="px-4 py-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Navigation</p>
                </div>
                <SidebarItem 
                  icon={Home} 
                  label="Chats" 
                  active={view === 'feed'} 
                  onClick={() => { setView('feed'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={GraduationCap} 
                  label="Institutions" 
                  active={view === 'schools'} 
                  onClick={() => { setView('schools'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={LayoutGrid} 
                  label="Workspace" 
                  active={view === 'workspace'} 
                  onClick={() => { setView('workspace'); setSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Cpu} 
                  label="Institutional Hub" 
                  active={view === 'tools'} 
                  onClick={() => { setView('tools'); setSidebarOpen(false); }} 
                />
                
                {(schools.some(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')) || 
                  places.some(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')) || 
                  userDoc?.role === 'admin') && (
                  <>
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Management</p>
                    </div>
                    <SidebarItem 
                      icon={ClipboardList} 
                      label={`${labels.student} Records`} 
                      active={view === 'records'} 
                      onClick={() => handleNavigateToData('records')} 
                    />
                    <SidebarItem 
                      icon={Calendar} 
                      label={labels.attendance} 
                      active={view === 'attendance'} 
                      onClick={() => handleNavigateToData('attendance')} 
                    />
                    <SidebarItem 
                      icon={Shield} 
                      label="Penalty System" 
                      active={view === 'penalty'} 
                      onClick={() => { setView('penalty'); setSidebarOpen(false); }} 
                    />
                  </>
                )}

                <div className="px-4 py-4">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">System</p>
                </div>
                <SidebarItem 
                  icon={UserIcon} 
                  label="Settings" 
                  active={view === 'profile'} 
                  onClick={() => { setView(user ? 'profile' : 'login'); setSidebarOpen(false); }} 
                />
                {userDoc?.role === 'admin' && (
                  <SidebarItem 
                    icon={ShieldCheck} 
                    label="Admin Console" 
                    active={view === 'admin'} 
                    onClick={() => { setView('admin'); setSidebarOpen(false); }} 
                  />
                )}

              </div>

              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <header className="h-14 sm:h-16 bg-card/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 no-print">
        <div className="flex items-center gap-4 sm:gap-8 h-full">
          <button 
            onClick={() => setView('feed')}
            className={`h-full flex flex-col items-center justify-center gap-1 relative px-1 sm:px-2 transition-all ${view === 'feed' ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            <span className={`text-[12px] sm:text-[13px] font-bold tracking-tight ${view === 'feed' ? 'text-ink' : 'text-muted'}`}>Home</span>
            {view === 'feed' && (
              <motion.div layoutId="header-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button 
            onClick={() => setView('schools')}
            className={`h-full flex flex-col items-center justify-center gap-1 relative px-1 sm:px-2 transition-all ${view === 'schools' ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            <span className={`text-[12px] sm:text-[13px] font-bold tracking-tight ${view === 'schools' ? 'text-ink' : 'text-muted'}`}>Story</span>
            {view === 'schools' && (
              <motion.div layoutId="header-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>

        <div className="flex-1 max-w-md mx-4 relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search institutions or people..." 
            value={globalSearch}
            onChange={(e) => {
              const val = e.target.value;
              setGlobalSearch(val);
              handleSearchUsers(val);
              if (val.trim()) setView('search');
            }}
            onFocus={() => {
              if (globalSearch) setView('search');
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-accent/20 outline-none transition-all text-xs font-medium" 
          />
        </div>

        <div className="flex items-center gap-2 text-ink">
          <button 
            onClick={() => {
              if (user) {
                setView('notifications');
              } else {
                setView('login');
              }
            }}
            className={`relative p-2.5 hover:bg-gray-50 rounded-xl transition-colors ${view === 'notifications' ? 'text-accent bg-accent/5' : 'text-muted hover:text-ink'}`}
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setView('search')}
            className={`md:hidden p-2.5 hover:bg-gray-50 rounded-xl transition-colors ${view === 'search' ? 'text-accent bg-accent/5' : 'text-muted hover:text-ink'}`}
          >
            <Search size={20} />
          </button>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-muted hover:text-ink"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main 
        className="flex-1 overflow-y-auto bg-card relative"
        onScroll={(e) => {
          if (refreshing) return;
          const target = e.currentTarget;
          if (target.scrollTop === 0) {
            // Can start pull
          }
        }}
      >
        <AnimatePresence>
          {(refreshing || pullDistance > 0) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: refreshing ? 80 : Math.min(pullDistance, 100),
                opacity: 1 
              }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full flex items-center justify-center overflow-hidden bg-gray-50/50"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div 
                  animate={{ rotate: refreshing ? 360 : pullDistance * 2 }}
                  transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                  className="text-accent"
                >
                  <Repeat size={24} className={refreshing ? "animate-pulse" : ""} />
                </motion.div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {refreshing ? 'Updating Terminal...' : pullDistance > 70 ? 'Release to refresh' : 'Pull to update'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          style={{ y: refreshing ? 0 : Math.min(pullDistance * 0.5, 50) }}
        >
          {renderView()}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/90 backdrop-blur-xl border border-gray-100 h-16 sm:h-18 px-6 flex items-center justify-around rounded-[2rem] shadow-2xl shadow-ink/10 w-[92%] sm:w-auto sm:min-w-[420px] no-print">
        <NavButton 
          active={view === 'workspace'} 
          onClick={() => setView('workspace')} 
          icon={LayoutGrid} 
          label="Workspace"
        />
        <NavButton 
          active={view === 'tools'} 
          onClick={() => setView('tools')} 
          icon={Cpu} 
          label="Tools"
        />
        <NavButton 
          active={view === 'chat'} 
          onClick={() => setView('chat')} 
          icon={MessageSquare} 
          label="Chat"
        />
        <NavButton 
          active={view === 'finance'} 
          onClick={handleWalletClick} 
          icon={Wallet} 
          label="Wallet"
        />
        <NavButton 
          active={view === 'profile'} 
          onClick={() => user ? setView('profile') : setView('login')} 
          icon={UserIcon} 
          label="Settings"
        />
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {isStoryViewerOpen && selectedStoryGroup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[300] flex flex-col no-print"
          >
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {selectedStoryGroup.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: i === activeStoryIndex ? '100%' : i < activeStoryIndex ? '100%' : '0%' }}
                    transition={{ duration: i === activeStoryIndex ? 5 : 0, ease: 'linear' }}
                    onAnimationStart={() => {
                      if (i === activeStoryIndex) {
                        handleMarkStoryAsSeen(selectedStoryGroup[i].id);
                      }
                    }}
                    onAnimationComplete={() => {
                      if (i === activeStoryIndex) {
                        if (activeStoryIndex < selectedStoryGroup.length - 1) {
                          setActiveStoryIndex(prev => prev + 1);
                        } else {
                          setIsStoryViewerOpen(false);
                        }
                      }
                    }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-white/10">
                  <img src={selectedStoryGroup[activeStoryIndex].authorPhoto} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm shadow-sm">{selectedStoryGroup[activeStoryIndex].authorName}</p>
                  <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest">
                    {new Date(selectedStoryGroup[activeStoryIndex].timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsStoryViewerOpen(false)}
                className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative">
              {selectedStoryGroup[activeStoryIndex].mediaType === 'image' ? (
                <img 
                  src={selectedStoryGroup[activeStoryIndex].mediaUrl} 
                  className="max-h-full max-w-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <video 
                  src={selectedStoryGroup[activeStoryIndex].mediaUrl} 
                  className="max-h-full max-w-full object-contain" 
                  autoPlay
                  controls={false}
                />
              )}
              
              {/* Navigation Zones */}
              <div 
                className="absolute inset-y-0 left-0 w-1/3" 
                onClick={() => setActiveStoryIndex(prev => Math.max(0, prev - 1))}
              />
              <div 
                className="absolute inset-y-0 right-0 w-1/3" 
                onClick={() => {
                  if (activeStoryIndex < selectedStoryGroup.length - 1) {
                    setActiveStoryIndex(prev => prev + 1);
                  } else {
                    setIsStoryViewerOpen(false);
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderBrainBattle()}

      {/* Story Upload Modal */}
      <AnimatePresence>
        {isStoryModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-xl z-[300] flex items-center justify-center p-6"
            onClick={(e) => e.target === e.currentTarget && setIsStoryModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20" />
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-ink mb-1">New Status</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">{isCreatingStory ? 'Transmitting to network...' : 'Share a moment with others'}</p>
                </div>
                <button onClick={() => setIsStoryModalOpen(false)} className="h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {isCreatingStory ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <div className="h-16 w-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <p className="text-[11px] font-black text-ink uppercase tracking-widest animate-pulse">Uploading Media...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-widest text-center">Post as Author:</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {/* Post as Personal */}
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleCreateStory(file);
                              setIsStoryModalOpen(false);
                            }
                          };
                          input.click();
                        }}
                        className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-accent hover:bg-accent/[0.02] transition-all group shrink-0 w-[120px]"
                      >
                        <div className="h-14 w-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {user?.photoURL ? (
                            <img src={user.photoURL} className="h-full w-full object-cover rounded-2xl" />
                          ) : (
                            <UserIcon size={24} className="text-gray-300" />
                          )}
                        </div>
                        <span className="text-[9px] font-black text-ink uppercase tracking-widest">Personal</span>
                      </button>

                      {/* Post as Institution */}
                      {[...schools, ...places].filter(s => s.creatorUid === user?.uid).map(s => (
                        <button 
                          key={s.id}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,video/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                handleCreateStory(file, s.id);
                                setIsStoryModalOpen(false);
                              }
                            };
                            input.click();
                          }}
                          className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-accent hover:bg-accent/[0.02] transition-all group shrink-0 w-[120px]"
                        >
                          <div className="h-14 w-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                            {s.logo ? (
                              <img src={s.logo} className="h-full w-full object-cover" />
                            ) : (
                              <LayoutGrid size={24} className="text-gray-300" />
                            )}
                          </div>
                          <span className="text-[9px] font-black text-ink uppercase tracking-widest truncate w-full text-center">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Selector Modal */}
      <AnimatePresence>
        {isWalletSelectorOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-xl z-[300] flex items-center justify-center p-6"
            onClick={(e) => e.target === e.currentTarget && setIsWalletSelectorOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-ink mb-1">Select Wallet</h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Choose institution to access terminal</p>
                </div>
                <button onClick={() => setIsWalletSelectorOpen(false)} className="h-10 w-10 bg-gray-50 text-muted rounded-xl flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {[...schools, ...places].filter(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')).length === 0 ? (
                  <div className="py-12 text-center text-muted font-bold text-sm italic">
                    No institutional wallets found.
                  </div>
                ) : (
                  [...schools, ...places].filter(s => s.creatorUid === user?.uid || s.administrativeViewers?.includes(user?.uid || '')).map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        setSelectedSchool(s as School);
                        setView('finance');
                        setSettlementStep('selection');
                        setIsWalletSelectorOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-accent hover:bg-accent/[0.02] transition-all group"
                    >
                      <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {s.logo ? (
                          <img src={s.logo} className="h-full w-full object-cover" />
                        ) : (
                          <Wallet size={20} className="text-muted" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-black text-ink truncate uppercase tracking-tight">{s.name}</p>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.type === 'school' ? 'School' : 'Business'}</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-accent transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    );
  }

const BRAIN_BATTLE_QUESTIONS_END = []; // Placeholder to remove old constant

export default function App() {
  return (
    <ErrorBoundary>
      <ExonaApp />
    </ErrorBoundary>
  );
}

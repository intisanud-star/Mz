import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, Plus, Image as ImageIcon, Save, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase'; // verify path later
import { v4 as uuidv4 } from 'uuid';

interface AdsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  schools: any[];
  places: any[];
}

export default function AdsManagerModal({ isOpen, onClose, user, showNotification, schools, places }: AdsManagerModalProps) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [adTargetType, setAdTargetType] = useState<'profile' | 'institution'>('profile');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adMediaUrl, setAdMediaUrl] = useState('');
  
  const myInstitutions = [...schools, ...places].filter(inst => 
    inst.creatorUid === user?.uid || inst.administrativeViewers?.includes(user?.uid)
  );

  useEffect(() => {
    if (isOpen && user) {
      fetchMyAds();
    }
  }, [isOpen, user]);

  const fetchMyAds = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'ads'), where('creatorUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const adsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error('Error fetching ads:', error);
      showNotification('Failed to fetch your ad campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxWidth = 800; // max width/height for ads
              
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
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // compress to 70% quality JPEG
            };
            img.onerror = error => reject(error);
          };
          reader.onerror = error => reject(error);
        });
        
        setAdMediaUrl(compressedBase64);
      } catch (error) {
        console.error('Error compressing image:', error);
        showNotification('Failed to process image. Please try a smaller one.', 'error');
      }
    }
  };

  const handleSubmitAd = async () => {
    if (!adTitle.trim() || !adDescription.trim()) {
      showNotification('Please provide a title and description for your ad', 'error');
      return;
    }
    if (adTargetType === 'institution' && !selectedInstitutionId) {
      showNotification('Please select an institution to promote', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAd = {
        creatorUid: user.uid,
        creatorName: user.displayName,
        targetType: adTargetType,
        targetId: adTargetType === 'institution' ? selectedInstitutionId : user.uid,
        title: adTitle.trim(),
        description: adDescription.trim(),
        mediaUrl: adMediaUrl.trim() || null,
        status: 'pending',
        clicks: 0,
        impressions: 0,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'ads'), newAd);
      showNotification('Ad campaign submitted for review!', 'success');
      
      // Reset form
      setAdTitle('');
      setAdDescription('');
      setAdMediaUrl('');
      setSelectedInstitutionId('');
      setIsCreating(false);
      
      fetchMyAds();
    } catch (error) {
      console.error('Error submitting ad:', error);
      showNotification('Failed to submit ad campaign', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('Are you sure you want to delete this ad campaign?')) return;
    try {
      await deleteDoc(doc(db, 'ads', adId));
      setAds(prev => prev.filter(a => a.id !== adId));
      showNotification('Ad campaign deleted', 'success');
    } catch (error) {
      console.error('Error deleting ad:', error);
      showNotification('Failed to delete ad campaign', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-ink/70 backdrop-blur-3xl p-4 sm:p-8">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-150">
            <div>
              <h2 className="text-2xl font-black text-ink mb-1 flex items-center gap-2">
                <Megaphone className="text-indigo-600" size={24} />
                Ads Manager
              </h2>
              <p className="text-xs font-bold text-muted uppercase tracking-widest">Promote your profile or institutions</p>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-muted transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            {isCreating ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-ink">Create New Campaign</h3>
                  <button onClick={() => setIsCreating(false)} className="text-sm font-bold text-muted hover:text-ink">Cancel</button>
                </div>

                <div className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">What do you want to promote?</label>
                    <select 
                      value={adTargetType}
                      onChange={(e) => setAdTargetType(e.target.value as any)}
                      className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                    >
                      <option value="profile">My Personal Profile</option>
                      <option value="institution">My Institution / Group</option>
                    </select>
                  </div>

                  {adTargetType === 'institution' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest">Select Institution</label>
                      <select 
                        value={selectedInstitutionId}
                        onChange={(e) => setSelectedInstitutionId(e.target.value)}
                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select an institution --</option>
                        {myInstitutions.map(inst => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Ad Title</label>
                    <input 
                      type="text"
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="E.g., Join the best coding school!"
                      maxLength={60}
                      className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Ad Description</label>
                    <textarea 
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      placeholder="Tell people why they should check this out..."
                      rows={3}
                      maxLength={150}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Ad Image (Optional)</label>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                        {adMediaUrl ? (
                          <img src={adMediaUrl} alt="Ad Preview" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon size={28} />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="inline-flex items-center justify-center h-10 px-4 bg-white border border-gray-200 text-xs font-bold text-ink rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <span>Upload Picture</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                        </label>
                        <div className="mt-2 text-[10px] text-muted">Or enter URL manually:</div>
                        <input 
                          type="url"
                          value={adMediaUrl}
                          onChange={(e) => setAdMediaUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full h-8 px-3 mt-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSubmitAd}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : (
                    <>
                      <Save size={18} />
                      Submit for Review
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-muted font-medium mt-2">
                  All ads are subject to review by administrators before becoming active.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full p-6 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-muted hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-600 transition-all gap-2"
                >
                  <Plus size={24} />
                  <span className="text-sm font-black uppercase tracking-widest">Create New Campaign</span>
                </button>

                <div>
                  <h3 className="text-[10px] font-black text-muted uppercase tracking-widest mb-4 px-2">Your Campaigns</h3>
                  
                  {loading ? (
                    <div className="text-center py-12 text-muted font-bold text-sm">Loading campaigns...</div>
                  ) : ads.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                      <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-bold">No campaigns yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ads.map(ad => (
                        <div key={ad.id} className="bg-white border border-gray-150 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          {ad.mediaUrl ? (
                            <img src={ad.mediaUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
                              <ImageIcon size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-black text-ink truncate">{ad.title}</h4>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                ad.status === 'approved' || ad.status === 'active' ? 'bg-green-100 text-green-700' :
                                ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {ad.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted font-medium truncate mb-2">{ad.description}</p>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <span>Target: {ad.targetType}</span>
                              <span>Clicks: {ad.clicks || 0}</span>
                            </div>
                          </div>
                          
                          <div className="shrink-0 flex sm:flex-col gap-2">
                            <button 
                              onClick={() => handleDeleteAd(ad.id)}
                              className="h-8 w-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                              title="Delete Campaign"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

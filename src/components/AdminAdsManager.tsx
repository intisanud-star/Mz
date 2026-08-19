import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, XCircle, Megaphone, Clock, Trash2, Shield, Eye } from 'lucide-react';

export default function AdminAdsManager({ showNotification }: { showNotification: any }) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'ads'));
      const querySnapshot = await getDocs(q);
      const adsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error('Error fetching ads:', error);
      showNotification('Failed to fetch ad campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (adId: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to mark this ad as ${newStatus}?`)) return;
    try {
      await updateDoc(doc(db, 'ads', adId), {
        status: newStatus
      });
      setAds(prev => prev.map(a => a.id === adId ? { ...a, status: newStatus } : a));
      showNotification(`Ad marked as ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating ad status:', error);
      showNotification('Failed to update ad status', 'error');
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pendingAds = ads.filter(a => a.status === 'pending');
  const activeAds = ads.filter(a => a.status === 'approved' || a.status === 'active');
  const pastAds = ads.filter(a => a.status === 'rejected' || a.status === 'completed' || a.status === 'paused');

  return (
    <div className="space-y-8">
      {/* Pending Ads Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
            <Clock size={20} />
          </div>
          <h3 className="text-lg font-black text-ink uppercase tracking-tight">Pending Approval ({pendingAds.length})</h3>
        </div>
        
        {pendingAds.length === 0 ? (
          <div className="text-center py-12 text-muted bg-gray-50/50 rounded-2xl">
            <Megaphone size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold">No ads waiting for approval</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingAds.map(ad => (
              <AdAdminCard key={ad.id} ad={ad} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </section>

      {/* Active Ads Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-lg font-black text-ink uppercase tracking-tight">Active Ads ({activeAds.length})</h3>
        </div>
        
        {activeAds.length === 0 ? (
          <div className="text-center py-12 text-muted bg-gray-50/50 rounded-2xl">
            <Shield size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold">No active ads</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeAds.map(ad => (
              <AdAdminCard key={ad.id} ad={ad} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </section>

      {/* Other Ads Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 opacity-80">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 text-gray-500 rounded-xl">
            <Megaphone size={20} />
          </div>
          <h3 className="text-lg font-black text-ink uppercase tracking-tight">Past / Rejected Ads ({pastAds.length})</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {pastAds.map(ad => (
            <AdAdminCard key={ad.id} ad={ad} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdAdminCard({ ad, onUpdateStatus }: { ad: any, onUpdateStatus: (id: string, status: string) => void, key?: string }) {
  return (
    <div className="border border-gray-150 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start">
      {ad.mediaUrl ? (
        <img src={ad.mediaUrl} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0 bg-gray-100" />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
          <Megaphone size={32} />
        </div>
      )}
      
      <div className="flex-1 min-w-0 space-y-2 w-full">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-ink truncate pr-4">{ad.title}</h4>
          <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
            ad.status === 'approved' || ad.status === 'active' ? 'bg-green-100 text-green-700' :
            ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
            ad.status === 'pending' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {ad.status}
          </span>
        </div>
        
        <p className="text-sm text-muted font-medium">{ad.description}</p>
        
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50">
          <span>Tier: <strong className={ad.tier === 'normal' ? "text-emerald-600" : "text-amber-600"}>{ad.tier === 'normal' ? 'Normal Ad' : 'Premium Ad'}</strong></span>
          <span>Target Type: <strong className="text-gray-600">{ad.targetType}</strong></span>
          <span>Target ID: <strong className="text-gray-600">{ad.targetId}</strong></span>
          <span>Creator: <strong className="text-gray-600">{ad.creatorName || ad.creatorUid}</strong></span>
          <span>Clicks: <strong className="text-indigo-500">{ad.clicks || 0}</strong></span>
          <span>Views: <strong className="text-indigo-500">{ad.impressions || 0}</strong></span>
        </div>
      </div>
      
      <div className="shrink-0 flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        {ad.status === 'pending' && (
          <>
            <button 
              onClick={() => onUpdateStatus(ad.id, 'active')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
            >
              <CheckCircle2 size={16} /> Approve
            </button>
            <button 
              onClick={() => onUpdateStatus(ad.id, 'rejected')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
            >
              <XCircle size={16} /> Reject
            </button>
          </>
        )}
        {(ad.status === 'active' || ad.status === 'approved') && (
          <button 
            onClick={() => onUpdateStatus(ad.id, 'paused')}
            className="w-full flex items-center justify-center gap-1.5 px-4 h-10 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            Pause Ad
          </button>
        )}
        {(ad.status === 'paused' || ad.status === 'rejected') && (
          <button 
            onClick={() => onUpdateStatus(ad.id, 'active')}
            className="w-full flex items-center justify-center gap-1.5 px-4 h-10 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            Activate Ad
          </button>
        )}
      </div>
    </div>
  );
}

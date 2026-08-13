import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, Clock, ShieldCheck, Link2, 
  FileText, MessageSquare, RefreshCw, Trash2, Filter, Check, X
} from 'lucide-react';
import { 
  collection, query, getDocs, doc, updateDoc, 
  deleteDoc, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

interface AdminVerificationManagerProps {
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AdminVerificationManager({ showNotification }: AdminVerificationManagerProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [remarksInput, setRemarksInput] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'verification_requests'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort: pending first, then by date descending
      const sorted = list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setRequests(sorted);
    } catch (e) {
      console.error('Error loading verification requests:', e);
      showNotification('Failed to load verification requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (req: any, newStatus: 'approved' | 'rejected') => {
    const remarks = remarksInput[req.id] || '';
    
    if (newStatus === 'rejected' && !remarks.trim()) {
      showNotification('Please enter admin remarks explaining the rejection.', 'error');
      return;
    }

    setIsProcessing(prev => ({ ...prev, [req.id]: true }));
    try {
      // 1. Update verification request document in Firestore
      const reqRef = doc(db, 'verification_requests', req.id);
      await updateDoc(reqRef, {
        status: newStatus,
        adminRemarks: remarks.trim(),
        updatedAt: new Date()
      });

      // 2. If approved, automatically set official/verified badges!
      if (newStatus === 'approved') {
        if (req.type === 'personal') {
          // Update user doc
          const userRef = doc(db, 'users', req.applicantUid);
          await updateDoc(userRef, {
            isVerified: true,
            isOfficial: true,
            verifiedCategory: req.category
          });
          showNotification(`Successfully approved and verified ${req.legalName}'s profile!`, 'success');
        } else if (req.type === 'institution' && req.institutionId) {
          // Update school/place doc
          // First check in schools, then places
          let updated = false;
          try {
            const schoolRef = doc(db, 'schools', req.institutionId);
            await updateDoc(schoolRef, {
              isOfficial: true,
              verifiedCategory: req.category
            });
            updated = true;
          } catch (err) {
            // Might be a place
          }

          if (!updated) {
            try {
              const placeRef = doc(db, 'places', req.institutionId);
              await updateDoc(placeRef, {
                isOfficial: true,
                verifiedCategory: req.category
              });
            } catch (err) {
              console.error('Failed to locate institution in schools or places');
            }
          }
          showNotification(`Successfully verified institution: ${req.institutionName}!`, 'success');
        }
      } else {
        showNotification(`Verification request rejected for ${req.legalName}.`, 'info');
      }

      // Clear input
      setRemarksInput(prev => {
        const copy = { ...prev };
        delete copy[req.id];
        return copy;
      });

      // Reload
      fetchRequests();
    } catch (e: any) {
      console.error('Error processing verification request:', e);
      showNotification(e.message || 'Error updating request status.', 'error');
    } finally {
      setIsProcessing(prev => ({ ...prev, [req.id]: false }));
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this request log?')) return;
    try {
      await deleteDoc(doc(db, 'verification_requests', id));
      showNotification('Verification log deleted.', 'info');
      fetchRequests();
    } catch (e) {
      showNotification('Failed to delete log.', 'error');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-8">
      
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-5 rounded-[2rem] border border-gray-150">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-ink tracking-tight">Oversight Panel</h3>
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Manage system-wide verification badges</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-gray-200 p-1 rounded-xl gap-0.5 shrink-0 overflow-x-auto max-w-full">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                filter === status 
                  ? 'bg-white text-indigo-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-ink'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <RefreshCw size={32} className="animate-spin text-indigo-600" />
          <p className="text-xs font-bold uppercase tracking-wider">Retrieving pending applications...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border border-gray-150 border-dashed max-w-xl mx-auto px-6">
          <div className="h-16 w-16 bg-white border border-gray-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-lg font-black text-ink mb-2">No Requests Found</h3>
          <p className="text-muted text-xs font-semibold leading-relaxed">
            There are no verification requests matching your selected filter. Fresh applications will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const processing = isProcessing[req.id] || false;

            return (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-150 rounded-[2.5rem] p-6 sm:p-8 hover:shadow-sm transition-all relative overflow-hidden"
              >
                {/* Visual Accent Badge */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                }`} />

                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-5 mb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-ink tracking-tight">{req.legalName}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        req.type === 'personal' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {req.type} Account
                      </span>
                      <span className="bg-gray-100 text-zinc-600 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        {req.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted font-semibold">
                      Submitted by: <span className="font-extrabold text-ink">{req.applicantName}</span> ({req.applicantEmail})
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Timestamp */}
                    <span className="text-[10px] text-muted font-bold uppercase tracking-tight">
                      {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : new Date(req.createdAt).toLocaleDateString()}
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      req.status === 'approved' 
                        ? 'bg-green-50 text-green-700 border-green-150'
                        : req.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-150'
                        : 'bg-amber-50 text-amber-700 border-amber-150'
                    }`}>
                      {req.status === 'approved' && <CheckCircle2 size={10} />}
                      {req.status === 'rejected' && <XCircle size={10} />}
                      {req.status === 'pending' && <Clock size={10} className="animate-pulse" />}
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Main description section */}
                <div className="space-y-4">
                  {req.institutionName && (
                    <div className="text-xs font-semibold bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-xl text-indigo-900">
                      Target Institution: <span className="font-extrabold">{req.institutionName}</span> (ID: {req.institutionId})
                    </div>
                  )}

                  {/* Proof Link */}
                  {req.proofUrl && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 hover:underline">
                      <Link2 size={14} className="shrink-0" />
                      <a href={req.proofUrl} target="_blank" rel="noopener noreferrer" className="truncate select-all">
                        {req.proofUrl}
                      </a>
                    </div>
                  )}

                  {/* Reason Text */}
                  <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} />
                      Application Cover Note
                    </p>
                    <p className="text-xs text-zinc-700 font-semibold leading-relaxed whitespace-pre-wrap">
                      "{req.reason}"
                    </p>
                  </div>

                  {/* Admin Action Box */}
                  {isPending ? (
                    <div className="pt-4 border-t border-gray-100 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider block">Admin Remarks / Feedback</label>
                        <textarea
                          placeholder="Provide explanation for approval context, or detail reasons for rejection (remarks are required for rejection)."
                          value={remarksInput[req.id] || ''}
                          onChange={(e) => setRemarksInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-ink focus:outline-none focus:border-indigo-500 leading-relaxed resize-none h-20"
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleUpdateStatus(req, 'rejected')}
                          disabled={processing}
                          className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <X size={14} />
                          Reject Application
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus(req, 'approved')}
                          disabled={processing}
                          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                        >
                          <Check size={14} />
                          Approve & Verify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {req.adminRemarks && (
                        <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                          <span className="font-black text-ink">Remarks:</span> "{req.adminRemarks}"
                        </p>
                      )}
                      
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="px-4 py-2 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-zinc-500 border border-gray-150 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-colors self-end sm:self-auto"
                      >
                        <Trash2 size={12} />
                        Delete Request Log
                      </button>
                    </div>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}

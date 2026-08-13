import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, ShieldCheck, HelpCircle, 
  User, Building2, Link2, FileText, ChevronRight,
  Info, AlertCircle, Clock, Trash2, RefreshCw
} from 'lucide-react';
import { 
  collection, addDoc, query, where, getDocs, 
  deleteDoc, doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

interface VerificationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  schools: any[];
  places: any[];
}

export default function VerificationRequestModal({ 
  isOpen, 
  onClose, 
  user, 
  showNotification,
  schools,
  places
}: VerificationRequestModalProps) {
  const [requestType, setRequestType] = useState<'personal' | 'institution'>('personal');
  const [selectedInstId, setSelectedInstId] = useState('');
  const [legalName, setLegalName] = useState('');
  const [category, setCategory] = useState('Educator');
  const [proofUrl, setProofUrl] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastRequests, setPastRequests] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filter schools/places where user is creator or administrator
  const userManagedInsts = [...schools, ...places].filter(
    inst => inst.creatorUid === user?.uid || inst.administrativeViewers?.includes(user?.uid || '')
  );

  // Fetch previous verification requests for this user
  const fetchPastRequests = async () => {
    if (!user?.uid) return;
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'verification_requests'),
        where('applicantUid', '==', user.uid)
      );
      const list: any[] = [];
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPastRequests(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) {
      console.error('Error fetching past verification requests:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.uid) {
      fetchPastRequests();
    }
  }, [isOpen, user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      showNotification('You must be signed in to submit requests.', 'error');
      return;
    }

    if (!legalName.trim()) {
      showNotification('Please enter your full legal or registered name.', 'error');
      return;
    }

    if (requestType === 'institution' && !selectedInstId) {
      showNotification('Please select the institution or group to verify.', 'error');
      return;
    }

    if (!reason.trim() || reason.length < 20) {
      showNotification('Please provide a descriptive reason (at least 20 characters).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let instName = '';
      if (requestType === 'institution') {
        const found = userManagedInsts.find(i => i.id === selectedInstId);
        instName = found ? found.name : '';
      }

      const requestPayload = {
        applicantUid: user.uid,
        applicantName: user.displayName || 'Anonymous User',
        applicantEmail: user.email || '',
        type: requestType,
        institutionId: requestType === 'institution' ? selectedInstId : null,
        institutionName: requestType === 'institution' ? instName : null,
        legalName: legalName.trim(),
        category,
        proofUrl: proofUrl.trim(),
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date(), // Local fallback or serverTimestamp()
        adminRemarks: ''
      };

      await addDoc(collection(db, 'verification_requests'), requestPayload);
      showNotification('Verification request submitted successfully!', 'success');
      
      // Reset form
      setLegalName('');
      setProofUrl('');
      setReason('');
      
      // Refresh list
      fetchPastRequests();
    } catch (error: any) {
      console.error('Error submitting verification request:', error);
      showNotification(error.message || 'Failed to submit request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this verification request?')) return;
    try {
      await deleteDoc(doc(db, 'verification_requests', requestId));
      showNotification('Request withdrawn successfully.', 'info');
      fetchPastRequests();
    } catch (e: any) {
      showNotification('Failed to withdraw request.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-ink tracking-tight font-display">Verification Application</h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Get a checkmark badge on Exona</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Badge Preview & Explanation banner */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-100 p-5 rounded-2xl flex gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm self-start shrink-0 text-[#0095f6]">
              <CheckCircle2 size={32} className="fill-[#0095f6] text-white" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">The Exona Verification Badge</h4>
              <p className="text-[12px] text-indigo-900 leading-relaxed font-semibold">
                Verified accounts receive a high-visibility checkmark representing official status, authentic representation, and verified community trust.
              </p>
              <div className="flex gap-4 pt-1.5 text-[10px] text-indigo-800/80 font-bold uppercase tracking-tight">
                <span>✓ High Credibility</span>
                <span>• Official Protection</span>
                <span>• Exclusive Access</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Request Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-muted uppercase tracking-wider">Verification Target</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRequestType('personal');
                    setSelectedInstId('');
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    requestType === 'personal'
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-zinc-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${requestType === 'personal' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-zinc-500'}`}>
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black">Personal Account</p>
                    <p className="text-[10px] font-bold text-muted mt-0.5">Verify your personal bio/profile</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('institution')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    requestType === 'institution'
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-zinc-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${requestType === 'institution' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-zinc-500'}`}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black">Institution / Group</p>
                    <p className="text-[10px] font-bold text-muted mt-0.5">Verify a managed school or hub</p>
                  </div>
                </button>
              </div>
            </div>

            {/* If Institution Type, Choose Which One */}
            {requestType === 'institution' && (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted uppercase tracking-wider block">Select Managed Institution / Group</label>
                {userManagedInsts.length === 0 ? (
                  <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 flex gap-3 text-amber-900">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black">No Managed Institutions Found</p>
                      <p className="text-[11px] font-semibold mt-0.5">
                        You do not own or manage any schools, spaces, or places yet. Please create or join an institution as a administrator first!
                      </p>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-black text-ink focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose School, Hub, or Place --</option>
                    {userManagedInsts.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.type || 'hub'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Legal or Registered Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-muted uppercase tracking-wider block">
                {requestType === 'personal' ? 'Full Legal Name' : 'Official Registered Entity Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  required
                  placeholder={requestType === 'personal' ? 'e.g. Professor John Doe' : 'e.g. Horizon International College'}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted uppercase tracking-wider block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-ink focus:outline-none focus:border-indigo-500"
                >
                  <option value="Educator">Educator / Academic Staff</option>
                  <option value="Student Union">Student Union / Leader</option>
                  <option value="Academic Institution">Academic Institution (School/College)</option>
                  <option value="Community Hub">Community Hub / NGO</option>
                  <option value="Professional">Professional / Expert</option>
                  <option value="Government Entity">Government / Public Entity</option>
                  <option value="Creator / Media">Creator / Media Entity</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              {/* Supporting Document / Web Link */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted uppercase tracking-wider block">Supporting Link (Website, Bio or ID Proof)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <Link2 size={15} />
                  </div>
                  <input
                    type="url"
                    placeholder="e.g. https://institution.edu/staff/john-doe"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-ink focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Reason/Cover Note */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-muted uppercase tracking-wider block">Why should this account be verified?</label>
              <div className="relative">
                <div className="absolute top-3 left-4 text-zinc-400">
                  <FileText size={15} />
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details about your official capacity, credentials, role, and why your representation on Exona needs a verified checkmark (at least 20 characters)."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-ink focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                />
              </div>
              <p className="text-[10px] text-muted font-semibold">Min 20 characters. Applications are reviewed manually by network administrators.</p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-gray-250 text-zinc-600 text-xs font-bold uppercase hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (requestType === 'institution' && userManagedInsts.length === 0)}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Past Request History section */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <h4 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-zinc-500" />
              Your Verification History
            </h4>

            {isLoadingHistory ? (
              <div className="py-6 flex justify-center text-zinc-400">
                <RefreshCw size={16} className="animate-spin" />
              </div>
            ) : pastRequests.length === 0 ? (
              <p className="text-[11px] text-muted font-bold text-center py-4 bg-gray-50 rounded-2xl border border-gray-150 border-dashed">
                No past verification requests found for your account.
              </p>
            ) : (
              <div className="space-y-3">
                {pastRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="border border-gray-150 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-ink">{req.legalName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${
                          req.type === 'personal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {req.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-semibold">
                        Category: <span className="font-bold text-ink">{req.category}</span>
                        {req.institutionName && (
                          <> • Institution: <span className="font-bold text-indigo-700">{req.institutionName}</span></>
                        )}
                      </p>
                      {req.adminRemarks && (
                        <div className="mt-2 text-[10px] bg-slate-50 border border-slate-150 p-2 rounded-xl text-slate-700 font-semibold">
                          <span className="font-extrabold text-ink block mb-0.5">Admin Response:</span>
                          {req.adminRemarks}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        req.status === 'approved' 
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 size={10} />}
                        {req.status === 'rejected' && <AlertCircle size={10} />}
                        {req.status === 'pending' && <Clock size={10} className="animate-pulse" />}
                        {req.status}
                      </span>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Withdraw Application"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}

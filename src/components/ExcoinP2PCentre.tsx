import React, { useState, useEffect } from 'react';
import { 
  Repeat, Shield, User, DollarSign, Calendar, MessageSquare, Plus, Check, 
  CheckCircle2, ChevronRight, X, Phone, UserCheck, AlertTriangle, Search, 
  Clock, ShieldCheck, Building, Copy, Send, HelpCircle, ArrowRightLeft, 
  Landmark, Info, Filter, ArrowUpRight, ArrowDownLeft, Trash2, Coins, ExternalLink, Star
} from 'lucide-react';
import { 
  collection, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc, 
  serverTimestamp, onSnapshot, query, orderBy, where, runTransaction 
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface ExcoinP2PCentreProps {
  user: any;
  userDoc: any;
  excoinBalance: number;
  handleCreditExcoin: (amount: number, description: string) => Promise<any>;
  handleDebitExcoin: (amount: number, description: string) => Promise<boolean>;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  currencySymbol: string;
}

export default function ExcoinP2PCentre({
  user,
  userDoc,
  excoinBalance,
  handleCreditExcoin,
  handleDebitExcoin,
  showNotification,
  currencySymbol
}: ExcoinP2PCentreProps) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-ads' | 'my-trades' | 'transfer'>('buy');
  
  // Direct Transfer state
  const [targetUid, setTargetUid] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Real-time Firestore state
  const [offers, setOffers] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  
  // Filtering states
  const [filterAmount, setFilterAmount] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');

  // Modals / Actions state
  const [isNewAdModalOpen, setIsNewAdModalOpen] = useState(false);
  const [selectedOfferForTrade, setSelectedOfferForTrade] = useState<any>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [activeTradeItem, setActiveTradeItem] = useState<any>(null);

  // Form states for creating a new P2P Offer Ad
  const [newAdForm, setNewAdForm] = useState({
    type: 'sell', // User's offer to 'sell' or 'buy' Excoin
    amount: '',
    price: '',
    minLimit: '',
    maxLimit: '',
    paymentMethod: 'Bank Transfer',
    paymentDetails: '',
    contactInfo: ''
  });

  // Pre-populate contact handle from telemetry if available
  useEffect(() => {
    if (userDoc) {
      setNewAdForm(prev => ({
        ...prev,
        contactInfo: userDoc.username ? `@${userDoc.username}` : userDoc.email || '',
        paymentDetails: `Bank: Exona Virtual Bank\nAccount: ${user?.uid?.slice(0, 10).toUpperCase() || ''}\nName: ${userDoc.displayName || ''}`
      }));
    }
  }, [userDoc, user]);

  // Subscribe to real-time p2pOffers
  useEffect(() => {
    const qOffers = query(
      collection(db, 'p2pOffers'),
      where('status', '==', 'active'),
      orderBy('timestamp', 'desc')
    );
    
    const unsub = onSnapshot(qOffers, (snap) => {
      setOffers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Failed to load P2P offers:", err);
    });

    return () => unsub();
  }, []);

  // Subscribe to trade orders where user is buyer or seller
  useEffect(() => {
    if (!user) return;
    const qTrades = query(
      collection(db, 'p2pTrades'),
      orderBy('timestamp', 'desc')
    );
    
    const unsub = onSnapshot(qTrades, (snap) => {
      const allTrades = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter clientside to include orders where user is either buyer or seller
      const userTrades = allTrades.filter((t: any) => t.buyerUid === user.uid || t.sellerUid === user.uid);
      setTrades(userTrades);
      
      // If we are currently viewing a trade inside details modal, keep it updated
      if (activeTradeItem) {
        const updated = userTrades.find((t: any) => t.id === activeTradeItem.id);
        if (updated) {
          setActiveTradeItem(updated);
        }
      }
    }, (err) => {
      console.error("Failed to load P2P trades:", err);
    });

    return () => unsub();
  }, [user, activeTradeItem]);

  // Handle post new Ad offer
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showNotification('Please log in first to post an offer', 'error');
      return;
    }

    const { type, amount, price, minLimit, maxLimit, paymentMethod, paymentDetails, contactInfo } = newAdForm;

    if (!amount || !price || !minLimit || !maxLimit || !paymentDetails || !contactInfo) {
      showNotification('All fields are required to publish an offer', 'error');
      return;
    }

    const amtNum = parseFloat(amount);
    const priceNum = parseFloat(price);
    const minNum = parseFloat(minLimit);
    const maxNum = parseFloat(maxLimit);

    if (amtNum <= 0 || priceNum <= 0) {
      showNotification('Amount and price must be greater than 0', 'error');
      return;
    }

    if (minNum > maxNum) {
      showNotification('Minimum limit cannot exceed maximum limit', 'error');
      return;
    }

    // Safety: if selling EX, the user should have enough EX to fulfill the listing!
    if (type === 'sell' && excoinBalance < amtNum) {
      showNotification(`Insufficient Excoin balance. You only have ${excoinBalance} EX.`, 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'p2pOffers'), {
        uid: user.uid,
        name: userDoc?.displayName || user?.displayName || 'Exona Trader',
        type, // 'sell' -> other people see it as 'Buy EX'. 'buy' -> other people see it as 'Sell EX'.
        amount: amtNum,
        price: priceNum,
        minLimit: minNum,
        maxLimit: maxNum,
        paymentMethod,
        paymentDetails,
        contactInfo,
        timestamp: serverTimestamp(),
        status: 'active'
      });

      // Deduct balance from seller immediately as an escrow guarantee if they are selling!
      if (type === 'sell') {
        const debited = await handleDebitExcoin(amtNum, `P2P Sell Offer Escrow Allocation #${user.uid.slice(0, 4)}`);
        if (!debited) {
          showNotification('Escrow balance deduction failed.', 'error');
          return;
        }
      }

      showNotification('Your Excoin P2P Listing is now live!', 'success');
      setIsNewAdModalOpen(false);
      // Reset form quantity
      setNewAdForm(prev => ({
        ...prev,
        amount: '',
        price: '',
        minLimit: '',
        maxLimit: ''
      }));
    } catch (err) {
      console.error(err);
      showNotification('Failed to create P2P offer', 'error');
    }
  };

  // Cancel an offer (return escrow to seller if applicable)
  const handleCancelOffer = async (offer: any) => {
    try {
      await deleteDoc(doc(db, 'p2pOffers', offer.id));
      
      // If it was a sell offer, return the escrowed Excoin back to the seller's wallet!
      if (offer.type === 'sell') {
        await handleCreditExcoin(offer.amount, `Refund P2P Sell Offer Escrow Cancellation`);
      }
      
      showNotification('Listing removed and escrow refunded (if applicable).', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to cancel listing', 'error');
    }
  };

  // Initiate a trade with an active offer
  const handleInitiateTrade = async () => {
    if (!user) {
      showNotification('Please log in first to engage in trade.', 'error');
      return;
    }

    const tradeAmtNum = parseFloat(tradeAmount);
    if (!tradeAmount || isNaN(tradeAmtNum) || tradeAmtNum <= 0) {
      showNotification('Please specify a valid trade amount.', 'error');
      return;
    }

    if (tradeAmtNum > selectedOfferForTrade.amount) {
      showNotification(`Maximum available EX for this offer is ${selectedOfferForTrade.amount} EX.`, 'error');
      return;
    }

    const totalCostOfTrade = tradeAmtNum * selectedOfferForTrade.price;
    if (totalCostOfTrade < selectedOfferForTrade.minLimit || totalCostOfTrade > selectedOfferForTrade.maxLimit) {
      showNotification(`Order total (${currencySymbol}${totalCostOfTrade.toLocaleString()}) must be within the merchant limits: ${currencySymbol}${selectedOfferForTrade.minLimit.toLocaleString()} - ${currencySymbol}${selectedOfferForTrade.maxLimit.toLocaleString()}`, 'error');
      return;
    }

    // Safety: if the current user is selling EX to a buy ad, the current user must have enough EX!
    if (selectedOfferForTrade.type === 'buy' && excoinBalance < tradeAmtNum) {
      showNotification(`You do not have enough Excoins. Your balance: ${excoinBalance} EX.`, 'error');
      return;
    }

    try {
      // Determine buyer/seller details
      // If ad type is 'sell', others are buying from the ad-creator. So ad-creator is Seller, current user is Buyer.
      // If ad type is 'buy', others are selling to the ad-creator. So ad-creator is Buyer, current user is Seller.
      const isAdSellType = selectedOfferForTrade.type === 'sell';
      const sellerUid = isAdSellType ? selectedOfferForTrade.uid : user.uid;
      const sellerName = isAdSellType ? selectedOfferForTrade.name : (userDoc?.displayName || user.displayName || 'Exona Seller');
      const buyerUid = isAdSellType ? user.uid : selectedOfferForTrade.uid;
      const buyerName = isAdSellType ? (userDoc?.displayName || user.displayName || 'Exona Buyer') : selectedOfferForTrade.name;

      const tradeDocRef = await addDoc(collection(db, 'p2pTrades'), {
        offerId: selectedOfferForTrade.id,
        buyerUid,
        buyerName,
        sellerUid,
        sellerName,
        amount: tradeAmtNum,
        price: selectedOfferForTrade.price,
        totalCost: totalCostOfTrade,
        status: 'pending_payment',
        paymentMethod: selectedOfferForTrade.paymentMethod,
        sellerPaymentDetails: selectedOfferForTrade.paymentDetails || 'Bank Transfer',
        contactInfo: selectedOfferForTrade.contactInfo,
        timestamp: serverTimestamp(),
        tradeInitiatorUid: user.uid
      });

      // Update offer listings to subtract/lock the engaged amount
      const remainingOfferAmount = selectedOfferForTrade.amount - tradeAmtNum;
      const offersDocRef = doc(db, 'p2pOffers', selectedOfferForTrade.id);
      
      if (remainingOfferAmount <= 0.01) {
        await updateDoc(offersDocRef, {
          amount: 0,
          status: 'completed'
        });
      } else {
        await updateDoc(offersDocRef, {
          amount: remainingOfferAmount
        });
      }

      // If ad was 'buy', the current user is the seller. Deduct escrow from current user!
      if (!isAdSellType) {
        const debited = await handleDebitExcoin(tradeAmtNum, `P2P Sale engage to ${selectedOfferForTrade.name}`);
        if (!debited) {
          showNotification('Escrow allocation failed.', 'error');
          return;
        }
      }

      showNotification('Trade order initiated successfully!', 'success');
      
      // Close initial modal and open active trade view
      setSelectedOfferForTrade(null);
      setTradeAmount('');
      
      // Load this trade in full screen detail
      const snapDoc = {
        id: tradeDocRef.id,
        buyerUid,
        buyerName,
        sellerUid,
        sellerName,
        amount: tradeAmtNum,
        price: selectedOfferForTrade.price,
        totalCost: totalCostOfTrade,
        status: 'pending_payment',
        paymentMethod: selectedOfferForTrade.paymentMethod,
        sellerPaymentDetails: selectedOfferForTrade.paymentDetails,
        contactInfo: selectedOfferForTrade.contactInfo,
        timestamp: new Date()
      };
      setActiveTradeItem(snapDoc);
    } catch (err) {
      console.error(err);
      showNotification('Failed to lock trade order.', 'error');
    }
  };

  // Helper actions for active P2P trade flow
  const handleMarkAsPaid = async (trade: any) => {
    try {
      await updateDoc(doc(db, 'p2pTrades', trade.id), {
        status: 'paid_confirming',
        paymentConfirmedAt: serverTimestamp()
      });
      showNotification('Marked as paid! Awaiting seller release.', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to update status', 'error');
    }
  };

  const handleReleaseCoins = async (trade: any) => {
    try {
      // Release Excoin to Buyer
      // First, credit the buyer dynamically on the platform
      // Since buyer is `trade.buyerUid`, if user is currently buyer, we call handleCreditExcoin!
      // But we must do it securely so both get credited. Since the Firestore rules enforce the state,
      // let's run a local or global wallet balance action.
      // If the current user is the seller releasing the trade, we have already debited other user or current user as escrow.
      // Now, we must credit the BUYER with `trade.amount`!
      
      // Let's perform a dual wallet update inside trade execution
      const tradeRef = doc(db, 'p2pTrades', trade.id);
      
      // Perform final settlement update
      await updateDoc(tradeRef, {
        status: 'completed'
      });

      // Special balance updates:
      // If CURRENT user is the buyer, credit them EX!
      if (user.uid === trade.buyerUid) {
        await handleCreditExcoin(trade.amount, `P2P EX Buy fulfilled by ${trade.sellerName}`);
      } else {
        // If current user is the seller releasing, we credit the other user (buyer) inside Firestore if possible,
        // or since they will fetch their balance on snapshot, we write to their wallet/history! Let's do it cleanly:
        const buyerWalletRef = doc(db, 'wallets', trade.buyerUid);
        
        await runTransaction(db, async (transaction) => {
          const buyerWalletDoc = await transaction.get(buyerWalletRef);
          if (buyerWalletDoc.exists()) {
            const currentCoins = buyerWalletDoc.data().excoin_balance || 0;
            transaction.update(buyerWalletRef, {
              excoin_balance: currentCoins + trade.amount,
              last_transaction: serverTimestamp()
            });
            
            const historyRef = doc(collection(db, `wallets/${trade.buyerUid}/history`));
            transaction.set(historyRef, {
              amount: trade.amount,
              type: 'credit',
              currency: 'excoins',
              description: `P2P EX Buy from ${trade.sellerName} fulfilled`,
              timestamp: serverTimestamp()
            });
          }
        });
      }

      showNotification('Excoins released successfully! Trade complete.', 'success');
      setActiveTradeItem(null);
    } catch (err) {
      console.error(err);
      showNotification('Release transaction failed', 'error');
    }
  };

  const handleCancelTrade = async (trade: any) => {
    try {
      await updateDoc(doc(db, 'p2pTrades', trade.id), {
        status: 'cancelled'
      });

      // Refund the seller (since they was escrowed)
      // Escrow belongs to `trade.sellerUid`
      if (user.uid === trade.sellerUid) {
        await handleCreditExcoin(trade.amount, `Refund P2P Escrow - Cancelled Trade #${trade.id.slice(0, 4)}`);
      } else {
        const sellerWalletRef = doc(db, 'wallets', trade.sellerUid);
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(sellerWalletRef);
          if (docSnap.exists()) {
            const currentCoins = docSnap.data().excoin_balance || 0;
            transaction.update(sellerWalletRef, {
              excoin_balance: currentCoins + trade.amount,
              last_transaction: serverTimestamp()
            });
            const hRef = doc(collection(db, `wallets/${trade.sellerUid}/history`));
            transaction.set(hRef, {
              amount: trade.amount,
              type: 'credit',
              currency: 'excoins',
              description: `Refund P2P Escrow - Cancelled Trade`,
              timestamp: serverTimestamp()
            });
          }
        });
      }

      // Restore engaged quantity back to the Offer if it's active
      try {
        const offerRef = doc(db, 'p2pOffers', trade.offerId);
        const offerSnap = await setDoc(offerRef, {
          amount: trade.amount,
          status: 'active'
        }, { merge: true });
      } catch (restErr) {
        console.warn("Could not restore offer quantity", restErr);
      }

      showNotification('Trade cancelled. Escrow refunded to seller.', 'success');
      setActiveTradeItem(null);
    } catch (err) {
      console.error(err);
      showNotification('Cancellation failed', 'error');
    }
  };

  // Direct Transfer Helpers
  const handleVerifyUid = async () => {
    const trimmed = targetUid.trim();
    if (!trimmed) {
      showNotification('Please enter a UID to verify.', 'error');
      return;
    }
    if (trimmed === user?.uid) {
      showNotification('You cannot transfer Excoins to yourself!', 'error');
      setVerifiedRecipient(null);
      return;
    }
    setIsVerifying(true);
    try {
      // 1. Try to fetch user entry
      const userRef = doc(db, 'users', trimmed);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const d = userSnap.data();
        setVerifiedRecipient({
          uid: trimmed,
          displayName: d.displayName || d.username || d.name || 'Exona User',
          email: d.email || 'Private Workspace User',
          institution: d.institutionName || d.school || ''
        });
        showNotification('Recipient workspace profile verified!', 'success');
      } else {
        // 2. Try to fetch wallet address directly
        const walletRef = doc(db, 'wallets', trimmed);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          setVerifiedRecipient({
            uid: trimmed,
            displayName: 'Exona Wallet Holder',
            email: 'Registered Wallet Address',
            institution: ''
          });
          showNotification('Recipient Wallet verified!', 'success');
        } else {
          showNotification('System found no wallet or profile with this user ID.', 'error');
          setVerifiedRecipient(null);
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('Verification error. Please confirm ID spelling.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!user) {
      showNotification('Please authenticate your workspace first.', 'error');
      return;
    }
    if (!verifiedRecipient) {
      showNotification('You must verify the beneficiary UID first!', 'error');
      return;
    }
    
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      showNotification('Please state a valid transfer volume higher than 0 EX.', 'error');
      return;
    }

    if (excoinBalance < amt) {
      showNotification(`Insufficient funds. Your transfer balance is ${excoinBalance} EX.`, 'error');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const senderWalletRef = doc(db, 'wallets', user.uid);
      const recipientWalletRef = doc(db, 'wallets', verifiedRecipient.uid);

      await runTransaction(db, async (transaction) => {
        // Double check sender balance in transaction
        const senderSnap = await transaction.get(senderWalletRef);
        const currentSenderBalance = senderSnap.exists() ? (senderSnap.data().excoin_balance || 0) : 0;
        if (currentSenderBalance < amt) {
          throw new Error('Transaction execution block: Insufficient wallet balance!');
        }

        // Get recipient balance
        const recipientSnap = await transaction.get(recipientWalletRef);
        const currentRecipientBalance = recipientSnap.exists() ? (recipientSnap.data().excoin_balance || 0) : 0;

        // Perform balance adjustments
        transaction.update(senderWalletRef, {
          excoin_balance: currentSenderBalance - amt,
          last_transaction: serverTimestamp()
        });

        if (recipientSnap.exists()) {
          transaction.update(recipientWalletRef, {
            excoin_balance: currentRecipientBalance + amt,
            last_transaction: serverTimestamp()
          });
        } else {
          transaction.set(recipientWalletRef, {
            excoin_balance: amt,
            last_transaction: serverTimestamp()
          });
        }

        // Append histories
        const sHistRef = doc(collection(db, `wallets/${user.uid}/history`));
        const rHistRef = doc(collection(db, `wallets/${verifiedRecipient.uid}/history`));

        transaction.set(sHistRef, {
          amount: amt,
          type: 'debit',
          currency: 'excoins',
          description: `Direct wallet transfer to ${verifiedRecipient.displayName}. Note: ${transferNote || 'None'}`,
          timestamp: serverTimestamp()
        });

        transaction.set(rHistRef, {
          amount: amt,
          type: 'credit',
          currency: 'excoins',
          description: `Direct wallet transfer from ${userDoc?.displayName || user.email || 'Exona Peer'}. Note: ${transferNote || 'None'}`,
          timestamp: serverTimestamp()
        });
      });

      showNotification(`Successfully transferred ${amt} EX to ${verifiedRecipient.displayName}!`, 'success');
      
      // Cleanup transfer state
      setTransferAmount('');
      setTransferNote('');
      setTargetUid('');
      setVerifiedRecipient(null);
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Direct UID transfer failed.', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setIsCopied(true);
    showNotification('System User ID copied to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filter listings based on criteria
  const filteredOffers = offers.filter(ad => {
    // 1. Filter type: 
    // Tab "buy" -> displays SELL ads (people who are selling, so you can buy from them!)
    // Tab "sell" -> displays BUY ads (people who are buying, so you can sell to them!)
    const isTabMatch = activeTab === 'buy' ? ad.type === 'sell' : ad.type === 'buy';
    if (!isTabMatch) return false;

    // 2. Filter by merchant / active user UID
    // Hide own ads from listings, so users trade with others (unless in 'my-ads' tab)
    if (ad.uid === user?.uid) return false;

    // 3. Filter by amount
    if (filterAmount) {
      const filterAmtNum = parseFloat(filterAmount);
      if (!isNaN(filterAmtNum)) {
        const totalAdFiatValue = ad.amount * ad.price;
        if (totalAdFiatValue < filterAmtNum) {
          return false;
        }
      }
    }

    // 4. Filter by payment method
    if (filterPayment !== 'All') {
      if (ad.paymentMethod !== filterPayment) return false;
    }

    return true;
  });

  // User's own ads listings
  const myAds = offers.filter(ad => ad.uid === user?.uid);

  return (
    <div className="w-full text-left">
      {/* Overview Cards & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white flex flex-col justify-between relative overflow-hidden shadow-lg shadow-amber-500/10">
          <div className="absolute right-0 bottom-0 text-white/5 font-bold text-9xl leading-none select-none pointer-events-none translate-y-8 translate-x-4">
            EX
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-100">Excoin Wallet</span>
            <Coins className="text-amber-100 animate-pulse" size={20} />
          </div>
          <div className="relative z-10 mb-2">
            <p className="text-[11px] font-medium text-orange-100">Engagable Balance</p>
            <p className="text-4xl font-extrabold tracking-tight font-mono whitespace-nowrap">
              {excoinBalance.toLocaleString()} <span className="text-lg font-bold">EX</span>
            </p>
          </div>
          <p className="text-[10px] text-orange-200 mt-2 border-t border-white/10 pt-2 flex items-center gap-1.5 font-medium">
            <ShieldCheck size={12} className="inline" /> 100% Escrow Guaranteed By System
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Excoin P2P Directory</span>
            </div>
            <h4 className="text-xl font-bold text-ink mb-1">Zero-Fee Peer Market</h4>
            <p className="text-xs text-muted leading-relaxed font-normal">
              Direct peer-to-peer trading. Real users, secure system-escrow locks, bank transfers.
            </p>
          </div>
          <div className="flex gap-4 border-t border-gray-50 pt-3 mt-4">
            <div>
              <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Real-time Ads</span>
              <span className="text-sm font-extrabold text-ink">{offers.length} Online</span>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Your Trades</span>
              <span className="text-sm font-extrabold text-amber-500">{trades.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length} Active</span>
            </div>
          </div>
        </div>

        {/* Action Call Card */}
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Merchant Hub</span>
            <h4 className="text-xl font-bold text-ink mt-2 mb-1">Register as Trader</h4>
            <p className="text-xs text-muted leading-relaxed font-normal">
              Post your custom rate and trade lists to buy or sell Excoins at profit.
            </p>
          </div>
          <button 
            onClick={() => {
              if (!user) {
                showNotification('Please log in first to create P2P listings', 'error');
                return;
              }
              setIsNewAdModalOpen(true);
            }}
            className="w-full py-3 bg-ink hover:bg-ink/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-4"
          >
            <Plus size={16} /> Post Custom Offer
          </button>
        </div>
      </div>

      {/* Main Filter & Navigation Row */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
        {/* Navigation Tabs */}
        <div className="flex bg-gray-50 p-1.5 rounded-2xl w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'buy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <ArrowUpRight size={14} className="text-emerald-500" /> Buy Excoin
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'sell' ? 'bg-white text-rose-600 shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <ArrowDownLeft size={14} className="text-rose-500" /> Sell Excoin
          </button>
          <button
            onClick={() => setActiveTab('my-ads')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeTab === 'my-ads' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <Building size={14} /> My Ads ({myAds.length})
          </button>
          <button
            onClick={() => setActiveTab('my-trades')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeTab === 'my-trades' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <Clock size={14} /> Orders ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeTab === 'transfer' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <Send size={14} /> Send & Receive
          </button>
        </div>

        {/* Directory Search & Filter fields */}
        {(activeTab === 'buy' || activeTab === 'sell') && (
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto self-stretch lg:self-center">
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input 
                type="text" 
                placeholder={`Min Value (e.g. 500)`}
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-ink outline-none focus:bg-white focus:border-gray-200 transition-all"
              />
            </div>
            
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-ink outline-none cursor-pointer focus:bg-white focus:border-gray-200 transition-all block"
            >
              <option value="All">All Payments</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Kuda Bank">Kuda Bank</option>
              <option value="Opay">Opay / PalmPay</option>
            </select>
            
            {(filterAmount || filterPayment !== 'All') && (
              <button 
                onClick={() => { setFilterAmount(''); setFilterPayment('All'); }}
                className="p-2.5 text-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-all self-center"
                title="Clear Filters"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main List Rendering */}
      <div className="space-y-4">
        {activeTab === 'transfer' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
            {/* Left side: Receive Excoin & Copy UID Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                    <ArrowDownLeft size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-ink">Receive Excoin</h4>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Share your UID to receive payments</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 p-6 rounded-[2rem] gap-4 mb-6">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted block mb-3">Your Secure Wallet Address</span>
                  
                  <div className="flex items-center gap-3 bg-white p-3.5 border border-gray-100 rounded-xl relative">
                    <div className="bg-orange-500/10 text-orange-600 font-mono text-xs font-bold px-2 py-1.5 rounded-lg select-all max-w-[12rem] sm:max-w-xs overflow-x-auto whitespace-nowrap scrollbar-none">
                      {user?.uid || 'Unknown Address'}
                    </div>
                    <button 
                      onClick={handleCopyUid}
                      className="ml-auto h-9 px-4 bg-gray-50 hover:bg-gray-100 text-ink rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-gray-200/50"
                    >
                      {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={13} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3.5 border-t border-gray-100 pt-5">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                      <span>Transfers are fully instant and settlement is done automatically.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                      <span>Funds are pulled directly from sender's excoin balance.</span>
                    </div>
                  </div>
                </div>

                {/* FAQ Tips */}
                <div className="bg-amber-50/40 border border-amber-50 p-6 rounded-[2rem]">
                  <div className="flex gap-3">
                    <ShieldCheck size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-extrabold text-[11px] uppercase tracking-widest text-amber-800 mb-1">Direct Transfer Security</h5>
                      <p className="text-xs text-amber-700/80 leading-relaxed font-normal">
                        Every direct peer transfer is written into the secure Exona dual-currency ledger. Make sure the sender double-checks the display name before releasing any volume.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Send Excoin Form */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Send size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-ink">Send Excoin via UID</h4>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Instant secure peer-to-peer sending</p>
                </div>
              </div>

              <div className="space-y-5 flex-1">
                {/* Beneficiary UID Input */}
                <div>
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Recipient UID (User ID)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. kJu87yUjH764G6g..."
                      value={targetUid}
                      onChange={(e) => {
                        setTargetUid(e.target.value);
                        setVerifiedRecipient(null); // Clear previous if input changes
                      }}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-ink outline-none focus:bg-white focus:border-gray-200 transition-all font-mono"
                    />
                    <button
                      onClick={handleVerifyUid}
                      disabled={isVerifying || !targetUid.trim()}
                      className="px-4 bg-ink hover:bg-ink/90 disabled:bg-gray-200 disabled:text-muted text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      {isVerifying ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* Verified Recipient Card */}
                {verifiedRecipient && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-sm text-ink leading-tight">{verifiedRecipient.displayName}</p>
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        </div>
                        <p className="text-[10px] text-muted font-mono tracking-tight mt-0.5">{verifiedRecipient.email}</p>
                        {verifiedRecipient.institution && (
                          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">{verifiedRecipient.institution}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Transfer Amount */}
                <div>
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Transfer Amount (EX)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full pl-5 pr-12 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-ink outline-none focus:bg-white focus:border-gray-200 transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted uppercase tracking-wider">EX</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5 px-1">
                    <span className="text-[9px] text-muted font-bold block">Available Balance: {excoinBalance} EX</span>
                    {excoinBalance > 0 && (
                      <button 
                        onClick={() => setTransferAmount(excoinBalance.toString())}
                        className="text-[9px] font-extrabold text-orange-500 hover:text-orange-600 uppercase"
                      >
                        Send Max
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional description note */}
                <div>
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Description Note (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Reimbursement for lunch"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-ink outline-none focus:bg-white focus:border-gray-200 transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-gray-150">
                  <button
                    onClick={handleExecuteTransfer}
                    disabled={isSubmittingTransfer || !verifiedRecipient || !transferAmount || parseFloat(transferAmount) <= 0}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-100 disabled:text-muted text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/10"
                  >
                    {isSubmittingTransfer ? 'Processing Transfer...' : 'Execute Instant Transfer'} <ArrowRightLeft size={14} />
                  </button>
                  <p className="text-[9px] text-center text-muted font-bold uppercase tracking-wider mt-3">
                    ⚠ Warning: Peer-to-peer transfers are non-refundable once committed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-ads' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <h5 className="font-extrabold text-sm text-ink uppercase tracking-wider">Your Active P2P Trade Listings</h5>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{myAds.length} Ads Published</span>
            </div>
            {myAds.length === 0 ? (
              <div className="py-20 text-center text-muted flex flex-col items-center justify-center px-4">
                <Repeat size={48} className="stroke-1.25 mb-4 text-gray-200" />
                <p className="font-bold text-ink text-base mb-1">No Active Ads</p>
                <p className="text-muted text-xs max-w-xs leading-relaxed font-normal mb-6">
                  You haven't posted any buy or sell offers yet. Post a custom offer to start trading with other school members.
                </p>
                <button 
                  onClick={() => setIsNewAdModalOpen(true)}
                  className="px-6 py-2.5 bg-ink text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Create Your First Ad
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myAds.map((ad) => (
                  <div key={ad.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-gray-50/20 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${ad.type === 'sell' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {ad.type === 'sell' ? 'Selling Excoin' : 'Buying Excoin'}
                        </span>
                        <span className="text-[10px] text-muted font-bold">Published {ad.timestamp?.toDate ? ad.timestamp.toDate().toLocaleDateString() : 'Now'}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
                        <div>
                          <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Quantity Left</span>
                          <span className="text-sm font-extrabold text-ink">{ad.amount.toLocaleString()} EX</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Price Rate</span>
                          <span className="text-sm font-extrabold text-amber-500 font-mono">{currencySymbol}{ad.price} / EX</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Limits Frame</span>
                          <span className="text-xs font-bold text-ink whitespace-nowrap">{currencySymbol}{ad.minLimit.toLocaleString()} - {currencySymbol}{ad.maxLimit.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Payment</span>
                          <span className="text-xs font-bold text-ink">{ad.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCancelOffer(ad)}
                      className="px-4 py-2 border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all self-end md:self-center"
                    >
                      <Trash2 size={13} /> Cancel Ad
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-trades' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <h5 className="font-extrabold text-sm text-ink uppercase tracking-wider">Active & Historic Trade Orders</h5>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{trades.length} Orders Total</span>
            </div>
            {trades.length === 0 ? (
              <div className="py-20 text-center text-muted flex flex-col items-center justify-center px-4">
                <Clock size={48} className="stroke-1.25 mb-4 text-gray-200" />
                <p className="font-bold text-ink text-base mb-1">No Orders Found</p>
                <p className="text-muted text-xs max-w-xs leading-relaxed font-normal mb-2">
                  Initiate a trade by clicking the "Buy EX" or "Sell EX" button on any active market listing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {trades.map((trade) => {
                  const isUserBuyer = user.uid === trade.buyerUid;
                  const tradeRole = isUserBuyer ? 'Buyer' : 'Seller';
                  const isPending = trade.status === 'pending_payment';
                  const isConfirming = trade.status === 'paid_confirming';
                  const isCompleted = trade.status === 'completed';
                  const isCancelled = trade.status === 'cancelled';

                  return (
                    <div 
                      key={trade.id} 
                      onClick={() => setActiveTradeItem(trade)}
                      className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/20 transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isUserBuyer ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            You are {tradeRole}
                          </span>
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                            Order #{trade.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-muted font-bold">
                            {trade.timestamp?.toDate ? trade.timestamp.toDate().toLocaleDateString() : 'Now'}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-ink">
                          {isUserBuyer ? `Buying Excoin from ${trade.sellerName}` : `Selling Excoin to ${trade.buyerName}`}
                        </p>
                        <div className="flex gap-6 mt-3">
                          <div>
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Volume</span>
                            <span className="text-xs font-bold text-ink pr-3">{trade.amount.toLocaleString()} EX</span>
                          </div>
                          <div className="border-l border-gray-100 pl-4">
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Ad Price</span>
                            <span className="text-xs font-bold text-ink">{currencySymbol}{trade.price}</span>
                          </div>
                          <div className="border-l border-gray-100 pl-4">
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Total Cost</span>
                            <span className="text-xs font-extrabold text-amber-500 font-mono">{currencySymbol}{trade.totalCost.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right hidden sm:block">
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest leading-none mb-1">Status</p>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                            isPending ? 'bg-orange-50 text-orange-600' :
                            isConfirming ? 'bg-indigo-50 text-indigo-600' :
                            isCompleted ? 'bg-green-50 text-green-600' :
                            'bg-gray-100 text-muted'
                          }`}>
                            {trade.status.replace('_', ' ')}
                          </span>
                        </div>
                        <ChevronRight className="text-muted group-hover:translate-x-1.5 transition-transform" size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'buy' || activeTab === 'sell') && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <h5 className="font-extrabold text-sm text-ink uppercase tracking-wider">
                {activeTab === 'buy' ? 'Active Offers To Buy Excoin' : 'Active Offers To Sell Excoin'}
              </h5>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{filteredOffers.length} Listings matches criteria</span>
            </div>
            
            {filteredOffers.length === 0 ? (
              <div className="py-28 text-center text-muted flex flex-col items-center justify-center px-4">
                <Info size={40} className="stroke-1.25 mb-4 text-gray-200" />
                <p className="font-bold text-ink text-base mb-1">No Offers Available</p>
                <p className="text-muted text-xs max-w-xs leading-relaxed font-normal mb-6">
                  There are currently no matching trade offers from other members. Adjust your filters or be the first to post.
                </p>
                <button 
                  onClick={() => setIsNewAdModalOpen(true)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 transition-all"
                >
                  <Plus size={16} /> Publish Your Offer
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredOffers.map((ad) => {
                  const adTotalValue = ad.amount * ad.price;

                  return (
                    <div 
                      key={ad.id} 
                      className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-gray-50/20 transition-all"
                    >
                      {/* Merchant detail column */}
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
                          <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center text-muted font-bold text-sm border border-gray-100">
                            {ad.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h6 className="font-extrabold text-sm text-ink leading-none">{ad.name}</h6>
                              <div className="px-1.5 py-0.5 bg-yellow-400/10 text-yellow-600 rounded-full text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                <Star size={8} fill="currentColor" /> Verified
                              </div>
                            </div>
                            <span className="text-[8px] font-bold text-muted uppercase tracking-wider block mt-1">98% Trades Completed • fast release</span>
                          </div>
                        </div>

                        {/* Stats block */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Available EX</span>
                            <span className="text-xs font-extrabold text-ink leading-tight">{ad.amount.toLocaleString()} EX</span>
                          </div>
                          <div className="border-l border-gray-150 pl-3 md:pl-4">
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Fiat Price Rate</span>
                            <span className="text-xs font-mono font-black text-emerald-600 leading-tight">
                              {currencySymbol}{ad.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="border-l border-gray-150 pl-3 md:pl-4 col-span-2">
                            <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Ad limits frame</span>
                            <span className="text-xs font-bold text-ink leading-tight">
                              {currencySymbol}{ad.minLimit.toLocaleString()} - {currencySymbol}{ad.maxLimit.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment and action column */}
                      <div className="flex lg:flex-col justify-between lg:justify-end items-center lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 border-t lg:border-t-0 border-gray-50 pt-4 lg:pt-0">
                        <div className="flex flex-col text-left lg:text-right">
                          <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Supported Payment</span>
                          <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Landmark size={12} /> {ad.paymentMethod}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            if (!user) {
                              showNotification('Please authenticate your workspace first to trade.', 'error');
                              return;
                            }
                            setSelectedOfferForTrade(ad);
                          }}
                          className={`px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all shadow-md shadow-black/5 ${
                            activeTab === 'buy'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {activeTab === 'buy' ? 'Buy Excoin' : 'Sell Excoin'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- FLOATING MODALS --- */}
      <AnimatePresence>
        {/* Modal: Publish New Ad */}
        {isNewAdModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto no-scrollbar"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 border border-gray-100 flex flex-col relative my-8"
            >
              <button 
                onClick={() => setIsNewAdModalOpen(false)} 
                className="absolute top-6 right-6 h-10 w-10 bg-gray-50 text-muted rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Plus size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-ink">Publish P2P Offer</h4>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">List your buy / sell advertisement</p>
                </div>
              </div>

              <form onSubmit={handleCreateAd} className="space-y-4">
                {/* Switcher */}
                <div className="bg-gray-50 p-1 rounded-xl flex gap-1 mb-4">
                  <button
                    type="button"
                    onClick={() => setNewAdForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 py-2 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all ${newAdForm.type === 'sell' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted'}`}
                  >
                    I Want to SELL/LIST EX
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAdForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 py-2 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all ${newAdForm.type === 'buy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted'}`}
                  >
                    I Want to BUY EX
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Total EX Volume</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 1000"
                      value={newAdForm.amount}
                      onChange={(e) => setNewAdForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Price Rate per Excoin</label>
                    <input 
                      type="number" 
                      placeholder={`e.g. 150`}
                      value={newAdForm.price}
                      onChange={(e) => setNewAdForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Min Trade Limit ({currencySymbol})</label>
                    <input 
                      type="number" 
                      placeholder="Min e.g. 500"
                      value={newAdForm.minLimit}
                      onChange={(e) => setNewAdForm(prev => ({ ...prev, minLimit: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Max Trade Limit ({currencySymbol})</label>
                    <input 
                      type="number" 
                      placeholder="Max e.g. 50000"
                      value={newAdForm.maxLimit}
                      onChange={(e) => setNewAdForm(prev => ({ ...prev, maxLimit: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Payment Method</label>
                  <select
                    value={newAdForm.paymentMethod}
                    onChange={(e) => setNewAdForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (Naira Account)</option>
                    <option value="Kuda Bank">Kuda Microfinance Bank</option>
                    <option value="Opay">Opay / PalmPay Wallet</option>
                    <option value="Stars Swap">Exona Stars Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Payment Account Instructions / Details</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide Bank Name, Account Number and Registered Name where trader will send the payment."
                    value={newAdForm.paymentDetails}
                    onChange={(e) => setNewAdForm(prev => ({ ...prev, paymentDetails: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-gray-150 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block ml-2">Contact Details (Telegram Handle preferred)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Telegram: @traderpro, Whatsapp / Phone: 080..."
                    value={newAdForm.contactInfo}
                    onChange={(e) => setNewAdForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-gray-150 transition-all"
                  />
                </div>

                {newAdForm.type === 'sell' && (
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-2.5">
                    <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] font-bold text-orange-850 leading-relaxed">
                      Escrow Policy: When posting a Sell Offer, the listed Excoin volume will be securely locked from your balance to back the trades. This is returned if you cancel.
                    </p>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-ink text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-ink/95 transition-all mt-6"
                >
                  Publish Advertisement
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Engaging in Trade with Selected Merchant */}
        {selectedOfferForTrade && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-8 border border-gray-100 relative"
            >
              <button 
                onClick={() => { setSelectedOfferForTrade(null); setTradeAmount(''); }} 
                className="absolute top-6 right-6 h-10 w-10 bg-gray-50 text-muted rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${selectedOfferForTrade.type === 'sell' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {selectedOfferForTrade.type === 'sell' ? <ArrowUpRight size={22} /> : <ArrowDownLeft size={22} />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-ink">
                    {selectedOfferForTrade.type === 'sell' ? 'Buy Excoin' : 'Sell Excoin'} Trade Initiate
                  </h4>
                  <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Trading with {selectedOfferForTrade.name}</p>
                </div>
              </div>

              {/* Rate and limits info box */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100/30 space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Rate Rate</span>
                  <span className="font-extrabold text-ink font-mono">{currencySymbol}{selectedOfferForTrade.price} / EX</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2.5">
                  <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Available volume</span>
                  <span className="font-extrabold text-ink">{selectedOfferForTrade.amount} EX</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2.5">
                  <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Merchant Trade Limits</span>
                  <span className="font-extrabold text-amber-500">{currencySymbol}{selectedOfferForTrade.minLimit.toLocaleString()} - {currencySymbol}{selectedOfferForTrade.maxLimit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2.5">
                  <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Payment Method</span>
                  <span className="font-extrabold text-indigo-600">{selectedOfferForTrade.paymentMethod}</span>
                </div>
              </div>

              {/* Amount form */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider ml-1">Trade volume of Excoin</label>
                    <button 
                      onClick={() => setTradeAmount(selectedOfferForTrade.amount.toString())}
                      className="text-[9px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-600"
                    >
                      Use Max
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Enter EX Volume"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="w-full pl-6 pr-16 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-extrabold outline-none focus:bg-white focus:border-gray-150 transition-all font-mono"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted">
                      EX
                    </div>
                  </div>
                </div>

                {tradeAmount && !isNaN(parseFloat(tradeAmount)) && (
                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-[10px] font-black text-muted uppercase tracking-wider">Total Fiat Cost</span>
                    <span className="text-lg font-black text-emerald-600 font-mono">
                      {currencySymbol}{(parseFloat(tradeAmount) * selectedOfferForTrade.price).toLocaleString()}
                    </span>
                  </div>
                )}

                <button 
                  onClick={handleInitiateTrade}
                  className="w-full py-4 bg-ink text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-ink/95 transition-all mt-4"
                >
                  Lock Escrow & Confirm Trade Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Full Screen Interactive Trade details and flow status */}
        {activeTradeItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/70 backdrop-blur-md z-[650] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-white rounded-[2.5rem] p-8 sm:p-10 border border-gray-100 relative my-6 text-left"
            >
              <button 
                onClick={() => setActiveTradeItem(null)} 
                className="absolute top-6 right-6 h-10 w-10 bg-gray-50 text-muted rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                <div>
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-1">Peer Escrow Lock Trade</span>
                  <h4 className="text-xl font-extrabold text-ink leading-tight">Order ID: #{activeTradeItem.id.slice(0, 10).toUpperCase()}</h4>
                </div>
                <div className="px-3.5 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-ink">
                  Status: <span className="text-amber-500 text-xs font-black uppercase tracking-wider ml-1">{activeTradeItem.status.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Timeline Status Graphics */}
              <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${activeTradeItem.status === 'pending_payment' ? 'bg-orange-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
                    {activeTradeItem.status === 'pending_payment' ? '1' : <Check size={14} />}
                  </div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-widest mt-2">Payment</span>
                </div>
                <div className="flex-1 h-0.5 max-w-[20%] bg-gray-100" />
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${activeTradeItem.status === 'paid_confirming' ? 'bg-indigo-500 text-white animate-pulse' : activeTradeItem.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-muted'}`}>
                    {activeTradeItem.status === 'completed' ? <Check size={14} /> : '2'}
                  </div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-widest mt-2">Release</span>
                </div>
                <div className="flex-1 h-0.5 max-w-[20%] bg-gray-100" />
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${activeTradeItem.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-muted'}`}>
                    {activeTradeItem.status === 'completed' ? <CheckCircle2 size={16} /> : '3'}
                  </div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-widest mt-2">Fulfilled</span>
                </div>
              </div>

              {/* Trade Details Block */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100/30 grid grid-cols-2 gap-6 mb-6">
                <div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Excoin Amount</span>
                  <span className="text-base font-extrabold text-ink leading-tight">{activeTradeItem.amount} EX</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Agreed price</span>
                  <span className="text-base font-extrabold text-ink leading-tight">{currencySymbol}{activeTradeItem.price} / EX</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Total Fiat Cost</span>
                  <span className="text-lg font-black text-emerald-600 font-mono leading-tight">{currencySymbol}{activeTradeItem.totalCost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-muted uppercase tracking-wider block">Payment Option</span>
                  <span className="text-base font-extrabold text-ink leading-tight">{activeTradeItem.paymentMethod}</span>
                </div>
              </div>

              {/* Payment flow instructions based on role */}
              {user.uid === activeTradeItem.buyerUid ? (
                // BUYER FLOW
                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl">
                    <h5 className="font-extrabold text-xs uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-1.5">
                      <Landmark size={14} className="text-indigo-600" /> Seller's Payment Account
                    </h5>
                    <div className="p-3 bg-white rounded-xl border border-indigo-50 text-xs font-mono text-indigo-950 font-semibold whitespace-pre-line leading-relaxed mb-4">
                      {activeTradeItem.sellerPaymentDetails || 'Bank Details will be loaded...'}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 bg-indigo-100/30 p-2.5 rounded-lg border border-indigo-100/10">
                      <span>Trader Telegram Chat handle:</span>
                      <span className="font-black font-mono select-all bg-indigo-50 px-2 py-0.5 rounded cursor-pointer hover:bg-white transition-all">
                        {activeTradeItem.contactInfo || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    Make manual bank transfer/transfer of <span className="text-ink font-bold">{currencySymbol}{activeTradeItem.totalCost.toLocaleString()}</span> to the seller account listed above. Once done, click "I Have Sent Payment". Do not cancel after paying!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    {activeTradeItem.status === 'pending_payment' && (
                      <>
                        <button 
                          onClick={() => handleCancelTrade(activeTradeItem)}
                          className="w-full py-4 border border-gray-100 hover:bg-red-50 hover:text-red-600 text-muted rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Cancel Trade
                        </button>
                        <button 
                          onClick={() => handleMarkAsPaid(activeTradeItem)}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check size={16} /> I Have Sent Payment
                        </button>
                      </>
                    )}
                    {activeTradeItem.status === 'paid_confirming' && (
                      <div className="col-span-2 p-4 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl text-center text-xs font-bold leading-relaxed">
                        Payment Confirmation Sent. Waiting for seller to release Excoins from escrow lock. Feel free to contact at <span className="font-black text-indigo-850 select-all font-mono">{activeTradeItem.contactInfo}</span>.
                      </div>
                    )}
                    {activeTradeItem.status === 'completed' && (
                      <div className="col-span-2 p-6 bg-green-50 border border-green-150 rounded-2xl text-center text-green-700 text-xs font-bold flex flex-col items-center gap-2">
                        <CheckCircle2 size={36} className="text-green-500 animate-bounce" />
                        Excoins Escrow Released! The {activeTradeItem.amount} EX are now credited to your balance.
                      </div>
                    )}
                    {activeTradeItem.status === 'cancelled' && (
                      <div className="col-span-2 p-4 bg-gray-50 border border-gray-105 rounded-xl text-center text-muted text-xs font-bold leading-relaxed">
                        This P2P trade was cancelled. Escrow returned.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // SELLER FLOW
                <div className="space-y-4">
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                    <h5 className="font-extrabold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Shield size={14} className="text-amber-500" /> Seller Verification Center
                    </h5>
                    <p className="text-xs text-amber-850 leading-relaxed font-semibold">
                      Please confirm receipts in your banking app before click releasing.
                    </p>
                    <div className="text-xs font-bold text-amber-900 border-t border-amber-200/50 pt-2.5 flex items-center justify-between">
                      <span>Buyer Contact Handle:</span>
                      <span className="font-black select-all text-amber-950 font-mono bg-white px-2 py-0.5 rounded border border-amber-100">
                        {activeTradeItem.contactInfo || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {activeTradeItem.status === 'pending_payment' && (
                      <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl text-center text-xs font-bold leading-relaxed">
                        Waiting for Buyer to complete payment. Once buyer pays, they will mark it as paid.
                      </div>
                    )}
                    {activeTradeItem.status === 'paid_confirming' && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted leading-relaxed">
                          Buyer has confirmed sending <span className="font-bold text-lnk">{currencySymbol}{activeTradeItem.totalCost.toLocaleString()}</span>. Please check your bank statement. If received, release EX below.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleCancelTrade(activeTradeItem)}
                            className="py-4 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                          >
                            Dispute / Cancel Match
                          </button>
                          <button 
                            onClick={() => handleReleaseCoins(activeTradeItem)}
                            className="py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                          >
                            <Repeat size={14} /> Fulfill & Release Coins
                          </button>
                        </div>
                      </div>
                    )}
                    {activeTradeItem.status === 'completed' && (
                      <div className="p-6 bg-green-50 border border-green-150 rounded-2xl text-center text-green-700 text-xs font-bold flex flex-col items-center gap-2">
                        <CheckCircle2 size={36} className="text-green-500" />
                        Success! EX Escrow Released and credited to the buyer. You have received cash payment.
                      </div>
                    )}
                    {activeTradeItem.status === 'cancelled' && (
                      <div className="p-4 bg-gray-50 border border-gray-105 rounded-xl text-center text-muted text-xs font-bold leading-relaxed">
                        This match was cancelled.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

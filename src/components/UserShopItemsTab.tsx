import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, FeedVideoPlayer } from './WorldMarketplace';
import { Package, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserShopItemsTab = ({ userId, onCountUpdate }: { userId: string, onCountUpdate?: (count: number) => void }) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'marketplace_products'),
      where('sellerId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: Product[] = [];
      snap.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Product);
      });
      
      // Sort in memory by timestamp if available or just by name
      fetched.sort((a: any, b: any) => {
        if (b.timestamp && a.timestamp) {
          return b.timestamp.seconds - a.timestamp.seconds;
        }
        return 0;
      });

      setItems(fetched);
      if (onCountUpdate) onCountUpdate(fetched.length);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user shop items:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, onCountUpdate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
          <Package size={28} />
        </div>
        <h3 className="text-sm font-bold text-ink">No Shop Items</h3>
        <p className="text-xs text-muted mt-1 max-w-xs">This user has not listed any products in the marketplace yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 py-2">
        {items.map((product) => {
          const displayPrice = product.price > 0 ? (
             (product as any).currency ? `${(product as any).currency === 'USD' ? '$' : (product as any).currency === 'NGN' ? '₦' : (product as any).currency === 'EUR' ? '€' : (product as any).currency === 'GBP' ? '£' : (product as any).currency === 'EXC' ? '🪙' : ''}${product.price.toLocaleString()}` : `$${product.price.toLocaleString()}`
          ) : 'Free';
          
          return (
            <div key={product.id} onClick={() => setSelectedItem(product)} className="group cursor-pointer bg-white border border-stone-100/70 hover:border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col active:scale-[0.98]">
              <div className="relative aspect-[4/5] bg-stone-50 overflow-hidden">
                {product.videoUrl ? (
                  <FeedVideoPlayer src={product.videoUrl} className="w-full h-full object-cover pointer-events-none" controls={false} />
                ) : (
                  <img src={product.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" alt={product.name} />
                )}
                
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-black text-stone-800 shadow-sm">
                  {displayPrice}
                </div>
                
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-stone-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white tracking-widest uppercase shadow-sm">
                  <span className="text-[10px] leading-none">{product.countryFlag}</span>
                  <span className="truncate max-w-[60px]">{product.originCountry}</span>
                </div>
              </div>
              
              <div className="p-3 bg-white border-t border-stone-50/50 flex flex-col flex-1">
                <p className="text-[9px] font-bold text-[#2481CC] uppercase tracking-[0.1em] mb-1 truncate">{product.category}</p>
                <h3 className="font-bold text-xs sm:text-sm text-stone-800 leading-tight line-clamp-2 mb-1 flex-1 group-hover:text-stone-950">{product.name}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Modal / Feed View */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedItem(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-stone-150 relative z-10 max-h-[85vh] sm:max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 h-8 w-8 bg-black/40 hover:bg-black/60 rounded-full text-white flex items-center justify-center transition-colors cursor-pointer z-20"
              >
                <X size={16} />
              </button>

              <div className="overflow-y-auto w-full max-h-full">
                {/* Media */}
                <div className="w-full bg-stone-50 border-b border-stone-100 flex flex-col justify-between relative overflow-hidden group/gallery">
                  {selectedItem.videoUrl ? (
                    <FeedVideoPlayer src={selectedItem.videoUrl} className="w-full aspect-[4/5] object-contain bg-black" controls={true} autoPlay={true} />
                  ) : (
                    <img src={selectedItem.imageUrl} className="w-full aspect-[4/5] object-contain bg-black" referrerPolicy="no-referrer" alt={selectedItem.name} />
                  )}
                  
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    {selectedItem.featured && (
                      <div className="bg-rose-500/90 backdrop-blur text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">
                        Verified Deal
                      </div>
                    )}
                    <div className="bg-stone-900/80 backdrop-blur text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                      <span>{selectedItem.countryFlag}</span>
                      <span>{selectedItem.originCountry}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-black text-[#2481CC] uppercase tracking-widest mb-1">{selectedItem.category}</p>
                      <h3 className="text-xl font-black text-stone-900 leading-tight pr-4">{selectedItem.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-emerald-600 font-sans">
                        {selectedItem.price > 0 ? (
                           (selectedItem as any).currency ? `${(selectedItem as any).currency === 'USD' ? '$' : (selectedItem as any).currency === 'NGN' ? '₦' : (selectedItem as any).currency === 'EUR' ? '€' : (selectedItem as any).currency === 'GBP' ? '£' : (selectedItem as any).currency === 'EXC' ? '🪙' : ''}${selectedItem.price.toLocaleString()}` : `$${selectedItem.price.toLocaleString()}`
                        ) : 'Free'}
                      </p>
                    </div>
                  </div>

                  {selectedItem.description && (
                    <div className="mt-4 pb-4">
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Details</h4>
                      <p className="text-sm text-stone-600 leading-relaxed font-medium whitespace-pre-wrap">
                        {selectedItem.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

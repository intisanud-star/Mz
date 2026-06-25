import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from './WorldMarketplace';
import { Package } from 'lucide-react';

export const UserShopItemsTab = ({ userId }: { userId: string }) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchItems = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'marketplace_products'),
          where('sellerId', '==', userId)
        );
        const snap = await getDocs(q);
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

        if (isMounted) setItems(fetched);
      } catch (err) {
        console.error("Error fetching user shop items:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (userId) {
      fetchItems();
    }
  }, [userId]);

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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 py-2">
      {items.map((product) => {
        const displayPrice = product.price > 0 ? (
           (product as any).currency ? `${(product as any).currency === 'USD' ? '$' : (product as any).currency === 'NGN' ? '₦' : (product as any).currency === 'EUR' ? '€' : (product as any).currency === 'GBP' ? '£' : (product as any).currency === 'EXC' ? '🪙' : ''}${product.price.toLocaleString()}` : `$${product.price.toLocaleString()}`
        ) : 'Free';
        
        return (
          <div key={product.id} className="group cursor-pointer bg-white border border-stone-100/70 hover:border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col active:scale-[0.98]">
            <div className="relative aspect-[4/5] bg-stone-50 overflow-hidden">
              {product.videoUrl ? (
                <video src={product.videoUrl} className="w-full h-full object-cover pointer-events-none" muted loop playsInline />
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
  );
};

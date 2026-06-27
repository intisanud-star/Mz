import React, { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product, FeedVideoPlayer } from "./WorldMarketplace";
import {
  Package,
  X,
  ArrowLeft,
  Heart,
  ShoppingCart,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const UserShopItemsTab = ({
  userId,
  onCountUpdate,
}: {
  userId: string;
  onCountUpdate?: (count: number) => void;
}) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedItem) {
      setTimeout(() => {
        const el = document.getElementById(`feed-item-${selectedItem.id}`);
        if (el) el.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(
      collection(db, "marketplace_products"),
      where("sellerId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetched: Product[] = [];
        snap.forEach((doc) => {
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
      },
      (err) => {
        console.error("Error fetching user shop items:", err);
        setLoading(false);
      },
    );

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
        <p className="text-xs text-muted mt-1 max-w-xs">
          This user has not listed any products in the marketplace yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 py-2">
        {items.map((product) => {
          const displayPrice =
            product.price > 0
              ? (product as any).currency
                ? `${(product as any).currency === "USD" ? "$" : (product as any).currency === "NGN" ? "₦" : (product as any).currency === "EUR" ? "€" : (product as any).currency === "GBP" ? "£" : (product as any).currency === "EXC" ? "🪙" : ""}${product.price.toLocaleString()}`
                : `$${product.price.toLocaleString()}`
              : "Free";

          return (
            <div
              key={product.id}
              onClick={() => setSelectedItem(product)}
              className="group cursor-pointer bg-white border border-stone-100/70 hover:border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col active:scale-[0.98]"
            >
              <div className="relative aspect-[4/5] bg-stone-50 overflow-hidden">
                {product.videoUrl ? (
                  <FeedVideoPlayer
                    src={product.videoUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    controls={false}
                  />
                ) : (
                  <img
                    src={product.imageUrl}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    alt={product.name}
                  />
                )}

                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-black text-stone-800 shadow-sm">
                  {displayPrice}
                </div>

                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-stone-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white tracking-widest uppercase shadow-sm">
                  <span className="text-[10px] leading-none">
                    {product.countryFlag}
                  </span>
                  <span className="truncate max-w-[60px]">
                    {product.originCountry}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border-t border-stone-50/50 flex flex-col flex-1">
                <p className="text-[9px] font-bold text-[#2481CC] uppercase tracking-[0.1em] mb-1 truncate">
                  {product.category}
                </p>
                <h3 className="font-bold text-xs sm:text-sm text-stone-800 leading-tight line-clamp-2 mb-1 flex-1 group-hover:text-stone-950">
                  {product.name}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Modal / Feed View */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-stone-950 z-[250] flex flex-col md:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white md:rounded-[2rem] w-full h-full md:max-w-xl md:mx-auto overflow-hidden shadow-2xl flex flex-col relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-stone-150 sticky top-0 bg-white/90 backdrop-blur z-20">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 -ml-1 text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={22} />
                </button>
                <div className="flex flex-col items-center">
                  <h3 className="font-bold text-stone-900 text-[13px] uppercase tracking-widest">
                    Posts
                  </h3>
                </div>
                <div className="w-9" />
              </div>

              {/* Scrollable Feed */}
              <div
                className="overflow-y-auto w-full h-full bg-stone-100 flex flex-col"
                ref={feedContainerRef}
              >
                {items.map((item) => {
                  const displayPrice =
                    item.price > 0
                      ? (item as any).currency
                        ? `${(item as any).currency === "USD" ? "$" : (item as any).currency === "NGN" ? "₦" : (item as any).currency === "EUR" ? "€" : (item as any).currency === "GBP" ? "£" : (item as any).currency === "EXC" ? "🪙" : ""}${item.price.toLocaleString()}`
                        : `$${item.price.toLocaleString()}`
                      : "Free";

                  return (
                    <div
                      key={item.id}
                      id={`feed-item-${item.id}`}
                      className="w-full bg-white mb-2 border-b border-stone-200"
                    >
                      {/* Post header */}
                      <div className="flex items-center p-3 gap-3">
                        <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-xs text-stone-500 overflow-hidden">
                          {(item as any).sellerPhoto ? (
                            <img
                              src={(item as any).sellerPhoto}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (item as any).sellerName?.[0] || "S"
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-stone-900">
                            {(item as any).sellerName || "Seller"}
                          </p>
                          <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <span>{item.countryFlag}</span>
                            <span>{item.originCountry}</span>
                          </p>
                        </div>
                      </div>

                      {/* Media */}
                      <div className="w-full bg-stone-950 flex items-center justify-center relative overflow-hidden">
                        {item.videoUrl ? (
                          <div className="w-full aspect-[4/5] sm:aspect-video relative">
                            <FeedVideoPlayer
                              src={item.videoUrl}
                              className="w-full h-full object-contain"
                              controls={true}
                              badgeText="Video"
                            />
                          </div>
                        ) : (
                          <img
                            src={item.imageUrl}
                            className="w-full h-auto max-h-[85vh] object-contain"
                            referrerPolicy="no-referrer"
                            alt={item.name}
                          />
                        )}
                      </div>

                      {/* Footer / Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-black text-[#2481CC] uppercase tracking-widest">
                            {item.category}
                          </p>
                          <p className="text-lg font-black text-emerald-600 font-sans">
                            {displayPrice}
                          </p>
                        </div>
                        <p className="font-bold text-[14px] text-stone-900 leading-snug">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-stone-700 mt-2 leading-relaxed whitespace-pre-wrap">
                            {item.description}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-stone-100/60 flex items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-2 select-none shrink-0">
                            {/* ❤️ Like Pill Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert("Liked!");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold select-none cursor-pointer active:scale-95 bg-stone-50 text-stone-600 border-stone-200/60 hover:bg-stone-100"
                              title="Like posting"
                            >
                              <Heart size={13} className="text-stone-400" />
                              <span>Like</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-stone-200/60 text-stone-700">
                                {Math.floor(Math.random() * 20) + 1}
                              </span>
                            </button>

                            {/* 💬 Chat Pill Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert("Chat opened");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold select-none cursor-pointer active:scale-95 bg-stone-50 text-stone-600 border-stone-200/60 hover:bg-stone-100"
                              title="Chat / Open Discussion"
                            >
                              <MessageCircle
                                size={13}
                                className="text-stone-400"
                              />
                              <span>Chat</span>
                            </button>
                          </div>

                          {/* 🛒 Buy Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("Proceeding to checkout...");
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all text-[11px] font-bold select-none cursor-pointer active:scale-95 ml-auto bg-[#2481CC] text-white border-[#2481CC] hover:bg-[#1E71B3]"
                            title="Buy directly"
                          >
                            <ShoppingCart size={13} />
                            <span>Buy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

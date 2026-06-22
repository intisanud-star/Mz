import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  X, 
  Send, 
  Star, 
  Package, 
  Truck, 
  CreditCard, 
  AlertCircle, 
  Clock, 
  MessageCircle,
  Heart,
  Repeat,
  MapPin,
  HelpCircle,
  ArrowRight,
  Monitor,
  BadgeCheck,
  Users
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import LogisticsDeliveryMap from './LogisticsDeliveryMap';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  originCountry: string;
  countryFlag: string;
  imageUrl: string;
  stock: number;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  sellerName: string;
  sellerId?: string;
  sellerPhoto?: string;
  isCustom?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  buyerId: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    originCountry: string;
  }[];
  total: number;
  status: 'pending' | 'dispatched' | 'customs' | 'out_for_delivery' | 'delivered';
  trackingUpdates: { status: string; time: string; desc: string }[];
  address: string;
  country: string;
  timestamp: any;
}

interface WorldMarketplaceProps {
  user: any;
  userDoc: any;
  storyGroups: { [key: string]: any[] };
  onViewStoryGroup: (group: any[]) => void;
  onNewStoryClick: () => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  excoinBalance?: number;
  handleDebitExcoin?: (amount: number, description: string) => Promise<boolean>;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod_bonsai",
    name: "Zen Kyoto Bonsai Selection Kit",
    description: "An authentic, curated organic bonsai kit direct from botanical experts in Kyoto. Contains premium miniature juniper seeds, handcrafted copper shears, seasoned soil pods, and a hand-painted ceramic pot with an illustrated step-by-step Japanese styling guide.",
    price: 34.99,
    category: "Crafts & Art",
    originCountry: "Japan",
    countryFlag: "🇯🇵",
    imageUrl: "https://images.unsplash.com/photo-1512428813824-f47d9f04953a?w=450&q=80",
    stock: 12,
    rating: 4.9,
    reviewsCount: 142,
    featured: true,
    sellerName: "Kyoto Heritage Gardens"
  },
  {
    id: "prod_quantum",
    name: "Exona Neural Quantum Core v4",
    description: "The next-generation desktop edge computing chip. Powered by 64 topological qubit cores optimized for heavy local neural simulation, dynamic learning algorithms, and local agent synthesis. Includes premium thermal compound and an active glowing heatsink.",
    price: 549.00,
    category: "Electronics",
    originCountry: "United Kingdom",
    countryFlag: "🇬🇧",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=450&q=80",
    stock: 5,
    rating: 4.8,
    reviewsCount: 37,
    featured: true,
    sellerName: "Exonasoft Labs UK"
  },
  {
    id: "prod_ankara",
    name: "Artisan Handwoven Ankara Kimono",
    description: "A breathtaking fusion of premium West African wax-print Ankara cotton and contemporary minimal styling. Exclusively handwoven by local textile masters in Lagos, Nigeria. Features dynamic geometric graphics and premium double-stitched cotton lining.",
    price: 85.00,
    category: "Fashion & Apparel",
    originCountry: "Nigeria",
    countryFlag: "🇳🇬",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=450&q=80",
    stock: 8,
    rating: 5.0,
    reviewsCount: 61,
    featured: true,
    sellerName: "Lagos Threads Co."
  },
  {
    id: "prod_messenger",
    name: "Florence Leather Messenger Bag",
    description: "Handcrafted in the heart of Florence, Italy, using standard full-grain vegetable-tanned Italian leather. This durable bag features spacious brass-buckled compartments, a padded laptop holder, and an adjustable canvas shoulder band that ages into a gorgeous vintage patina.",
    price: 159.00,
    category: "Fashion & Apparel",
    originCountry: "Italy",
    countryFlag: "🇮🇹",
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=450&q=80",
    stock: 15,
    rating: 4.7,
    reviewsCount: 98,
    featured: false,
    sellerName: "Florentine Leatherworks"
  },
  {
    id: "prod_projector",
    name: "Silicon Valley AI Holographic Projector",
    description: "Bring digital assets, models, and spatial interfaces into real-life depth mapping. This portable smart projector projects rich stereoscopic holograms seamlessly onto any off-white wall without 3D glasses. Integrates with voice and hand gesture analysis.",
    price: 179.99,
    category: "Electronics",
    originCountry: "United States",
    countryFlag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=450&q=80",
    stock: 10,
    rating: 4.6,
    reviewsCount: 112,
    featured: true,
    sellerName: "Spatial Intelligence SF"
  },
  {
    id: "prod_tea",
    name: "Matchkeeping Imperial Jasmine Tea",
    description: "A meticulously guarded reserve grade jasmine green tea harvested during early spring in Fujian Province. Hand-rolled into clean pearl balls that blossom elegantly inside hot water, releasing a deep floral aroma with natural sweet undertones.",
    price: 24.50,
    category: "Snacks & Treats",
    originCountry: "China",
    countryFlag: "🇨🇳",
    imageUrl: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=450&q=80",
    stock: 45,
    rating: 4.9,
    reviewsCount: 210,
    featured: false,
    sellerName: "Fujian Emperor Reserve"
  },
  {
    id: "prod_notebook",
    name: "Munich Technical Precision Notebook",
    description: "Engineered specifically for complex visual thinkers, architects, and programmers. Features bulletproof water-resistant black linen binding, 160 pages of thick non-bleed mathematical grids, and dual bookmarking ribbons. Completely flat-opening layout.",
    price: 18.99,
    category: "Books & Novels",
    originCountry: "Germany",
    countryFlag: "🇩🇪",
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=450&q=80",
    stock: 30,
    rating: 4.8,
    reviewsCount: 84,
    featured: false,
    sellerName: "Munich Design Systems"
  },
  {
    id: "prod_clay",
    name: "Amazonian Rainforest Healing Mask",
    description: "Revitalize skin depth with premium organic white clay gathered from the mineral-abundant banks of the Amazon River basin. Rich in raw calcium, iron, and active zinc to purify and balance skin moisture. Cruelty-free and chemical-free formulation.",
    price: 28.00,
    category: "Beauty & Makeup",
    originCountry: "Brazil",
    countryFlag: "🇧🇷",
    imageUrl: "https://images.unsplash.com/photo-1567894192231-d22d9c1349b0?w=450&q=80",
    stock: 22,
    rating: 4.5,
    reviewsCount: 55,
    featured: false,
    sellerName: "Amazonia Pure Skincare"
  }
];

export const WorldMarketplace: React.FC<WorldMarketplaceProps> = ({
  user,
  userDoc,
  storyGroups,
  onViewStoryGroup,
  onNewStoryClick,
  showNotification,
  excoinBalance = 0,
  handleDebitExcoin
}) => {
  const isAdmin = userDoc?.role === 'admin' || user?.email === 'musstaphamusa@gmail.com';
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('Global');
  const [sortBy, setSortBy] = useState<'rating' | 'priceAsc' | 'priceDesc' | 'reviews'>('rating');
  
  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(`cart_${user?.uid || 'guest'}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout process state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCountry, setShippingCountry] = useState('United States');
  const [shippingSpeed, setShippingSpeed] = useState<'standard' | 'express' | 'supersonic'>('standard');
  const [paymentNote, setPaymentNote] = useState('');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'standard' | 'excoin' | 'p2p'>('standard');
  const [p2pReceiptImg, setP2pReceiptImg] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [p2pSenderName, setP2pSenderName] = useState('');
  const [p2pReference, setP2pReference] = useState('');

  // Listing State (Sell on Exona)
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Electronics');
  const [newProductCountry, setNewProductCountry] = useState('United States');
  const [newProductStock, setNewProductStock] = useState('10');
  const [newProductImg, setNewProductImg] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Selected Product Detail Modal
  const [selectedDetailedProduct, setSelectedDetailedProduct] = useState<Product | null>(null);

  // Seller Follow States
  const [followedSellers, setFollowedSellers] = useState<string[]>([]);
  const [onlyShowFollowing, setOnlyShowFollowing] = useState(false);

  // Orders Tab
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeMarketView, setActiveMarketView] = useState<'browse' | 'orders'>('browse');

  // Threads Social States
  const [likedPosts, setLikedPosts] = useState<{ [productId: string]: boolean }>({});
  const [threadLikesCount, setThreadLikesCount] = useState<{ [productId: string]: number }>({});
  const [expandedReviews, setExpandedReviews] = useState<{ [productId: string]: boolean }>({});
  const [newReplyTexts, setNewReplyTexts] = useState<{ [productId: string]: string }>({});

  // Real-time Collaborative Reviews, Likes, and Reshares
  const [collaborativeReviews, setCollaborativeReviews] = useState<{ [productId: string]: any[] }>({});
  const [likesDocuments, setLikesDocuments] = useState<any[]>([]);
  const [resharesDocuments, setResharesDocuments] = useState<any[]>([]);

  // Pinned/Sticky AI Shopping Assistant chat
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: "Greetings, Exona explorer! Ask me anything about regional shipping pipelines, customs fees, size conversions, or specific product models." }
  ]);
  const [isGeneratingAiResponse, setIsGeneratingAiResponse] = useState(false);

  // Currencies list
  const currencyModes = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
    { code: 'GBP', name: 'UK Pound', symbol: '£', rate: 0.78 },
    { code: 'NGN', name: 'Naira', symbol: '₦', rate: 1450 },
    { code: 'JPY', name: 'Yen', symbol: '¥', rate: 156 },
    { code: 'EXC', name: 'Exona Coin', symbol: '🪙', rate: 2.5 }
  ];
  const [currencyCode, setCurrencyCode] = useState('USD');
  const activeCurrency = useMemo(() => {
    return currencyModes.find(c => c.code === currencyCode) || currencyModes[0];
  }, [currencyCode]);

  // Sync Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem(`cart_${user?.uid || 'guest'}`, JSON.stringify(cart));
  }, [cart, user?.uid]);

  // Categories list
  const categoriesList = ['All', 'Electronics', 'Fashion & Apparel', 'Beauty & Makeup', 'Books & Novels', 'Snacks & Treats', 'Crafts & Art'];

  // Global countries list
  const countriesFlags: { [key: string]: string } = {
    'Global': '🌐',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Nigeria': '🇳🇬',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'Germany': '🇩🇪',
    'Brazil': '🇧🇷',
    'Italy': '🇮🇹'
  };
  const countriesList = Object.keys(countriesFlags);

  // Initial products setup in Firestore or fallback to default
  useEffect(() => {
    const fetchAndInitializeProducts = async () => {
      try {
        const qProd = query(collection(db, 'marketplace_products'), orderBy('rating', 'desc'));
        const unsubscribe = onSnapshot(qProd, async (snap) => {
          if (snap.empty) {
            console.log("Seeding marketplace_products database...");
            for (const dp of DEFAULT_PRODUCTS) {
              const docRef = doc(collection(db, 'marketplace_products'), dp.id);
              await setDoc(docRef, {
                ...dp,
                sellerId: 'system_vendor',
                timestamp: new Date()
              });
            }
          } else {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(list);
            setIsLoadingProducts(false);
          }
        }, (err) => {
          console.error("error fetching products from firestore. Using local array fallback.", err);
          setProducts(DEFAULT_PRODUCTS);
          setIsLoadingProducts(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Setup products failed:", error);
        setProducts(DEFAULT_PRODUCTS);
        setIsLoadingProducts(false);
      }
    };

    fetchAndInitializeProducts();
  }, []);

  // Sync / Listen to Orders
  useEffect(() => {
    if (!user) return;
    try {
      const qOrders = query(collection(db, 'marketplace_orders'), orderBy('timestamp', 'desc'));
      const unsubOrders = onSnapshot(qOrders, (snap) => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Order))
          .filter(o => o.buyerId === user.uid);
        setOrders(list);
      });
      return () => unsubOrders();
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Listen to Collaborative Reviews in Real-time from Firestore
  useEffect(() => {
    try {
      const qReviews = query(collection(db, 'marketplace_reviews'), orderBy('timestamp', 'asc'));
      const unsubReviews = onSnapshot(qReviews, (snap) => {
        const grouped: { [productId: string]: any[] } = {};
        snap.docs.forEach(doc => {
          const r = { id: doc.id, ...doc.data() };
          const pId = (r as any).productId;
          if (pId) {
            if (!grouped[pId]) grouped[pId] = [];
            grouped[pId].push(r);
          }
        });
        setCollaborativeReviews(grouped);
      });
      return () => unsubReviews();
    } catch (err) {
      console.error("Failed to listen to collaborative reviews:", err);
    }
  }, []);

  // Listen to Marketplace Likes in Real-time from Firestore
  useEffect(() => {
    try {
      const qLikes = query(collection(db, 'marketplace_likes'));
      const unsubLikes = onSnapshot(qLikes, (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLikesDocuments(docs);
      });
      return () => unsubLikes();
    } catch (err) {
      console.error("Failed to listen to marketplace likes:", err);
    }
  }, []);

  // Listen to Marketplace Reshares in Real-time from Firestore
  useEffect(() => {
    try {
      const qReshares = query(collection(db, 'marketplace_reshares'));
      const unsubReshares = onSnapshot(qReshares, (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setResharesDocuments(docs);
      });
      return () => unsubReshares();
    } catch (err) {
      console.error("Failed to listen to marketplace reshares:", err);
    }
  }, []);

  // Seed default comments if no reviews are loaded from Firestore
  const getProductComments = (productId: string) => {
    const list = collaborativeReviews[productId] || [];
    if (list.length > 0) return list;

    // Hardcoded beautiful default replies so the threads are immediately vivid
    const defaults: { [key: string]: any[] } = {
      prod_bonsai: [
        { id: 'def_b1', userName: 'Alex Chen', text: '🌱 My seeds sprouted in just 6 days! Handcraft packaging was pristine.', timestamp: { toDate: () => new Date() } },
        { id: 'def_b2', userName: 'Yuki Sato', text: 'The handcrafted copper shears are robust and extremely precise for pruning!', timestamp: { toDate: () => new Date() } }
      ],
      prod_quantum: [
        { id: 'def_q1', userName: 'Elena R.', text: 'TOPOLOGICAL logic simulator works beautifully with local learning agents! Heavy speed improvements.', timestamp: { toDate: () => new Date() } }
      ],
      prod_ankara: [
        { id: 'def_a1', userName: 'K. Adewale', text: 'Fabric has amazing geometric depth. Best piece in my spring wardrobe.', timestamp: { toDate: () => new Date() } }
      ],
      prod_messenger: [
        { id: 'def_m1', userName: 'Mateo Ross', text: 'Smells of exquisite Florence leather. Perfect vintage feel.', timestamp: { toDate: () => new Date() } }
      ]
    };
    return defaults[productId] || [];
  };

  // Sync followed sellers in real-time
  useEffect(() => {
    const fId = user?.uid || 'guest';
    try {
      const qFollows = query(
        collection(db, 'marketplace_follows'),
        where('followerId', '==', fId)
      );
      const unsubFollows = onSnapshot(qFollows, (snap) => {
        const uids = snap.docs.map(doc => doc.data().sellerId as string);
        setFollowedSellers(uids);
      }, (error) => {
        console.error("Error listening to follows, using localStorage fallback:", error);
        const saved = localStorage.getItem(`follows_${fId}`);
        if (saved) {
          setFollowedSellers(JSON.parse(saved));
        }
      });
      return () => unsubFollows();
    } catch (err) {
      console.error("Firestore follows query setup failed:", err);
      const saved = localStorage.getItem(`follows_${fId}`);
      if (saved) {
        setFollowedSellers(JSON.parse(saved));
      }
    }
  }, [user?.uid]);

  // Handle follow/unfollow vendor toggle
  const handleToggleFollow = async (sellerId: string, sellerName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const fId = user?.uid || 'guest';
    const isFollowing = followedSellers.includes(sellerId);
    
    try {
      if (isFollowing) {
        // Unfollow: delete doc
        const q = query(
          collection(db, 'marketplace_follows'),
          where('followerId', '==', fId),
          where('sellerId', '==', sellerId)
        );
        const snap = await getDocs(q);
        const batchPromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'marketplace_follows', docSnap.id)));
        await Promise.all(batchPromises);
        
        const nextFollows = followedSellers.filter(id => id !== sellerId);
        setFollowedSellers(nextFollows);
        localStorage.setItem(`follows_${fId}`, JSON.stringify(nextFollows));
        
        showNotification(`Unfollowed vendor: ${sellerName}.`, "info");
      } else {
        // Follow: create doc
        const followData = {
          followerId: fId,
          sellerId,
          sellerName,
          timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, 'marketplace_follows'), followData);
        
        const nextFollows = [...followedSellers, sellerId];
        setFollowedSellers(nextFollows);
        localStorage.setItem(`follows_${fId}`, JSON.stringify(nextFollows));
        
        showNotification(`You are now following ${sellerName}! You will see their postings.`, "success");
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      // Fallback local operation
      if (isFollowing) {
        const nextFollows = followedSellers.filter(id => id !== sellerId);
        setFollowedSellers(nextFollows);
        localStorage.setItem(`follows_${fId}`, JSON.stringify(nextFollows));
        showNotification(`Unfollowed vendor ${sellerName} (locally).`, "info");
      } else {
        const nextFollows = [...followedSellers, sellerId];
        setFollowedSellers(nextFollows);
        localStorage.setItem(`follows_${fId}`, JSON.stringify(nextFollows));
        showNotification(`Now following ${sellerName} (locally).`, "success");
      }
    }
  };

  // Submit Collaborative Review Reply on a Product Thread
  const handleAddReviewReply = async (productId: string) => {
    const text = newReplyTexts[productId];
    if (!text || !text.trim()) return;

    try {
      const reviewData = {
        productId,
        userId: user?.uid || 'guest',
        userName: userDoc?.displayName || user?.displayName || 'Exona Scholar',
        text: text.trim(),
        timestamp: new Date()
      };

      await addDoc(collection(db, 'marketplace_reviews'), reviewData);
      
      // Update local placeholder values
      setNewReplyTexts(prev => ({ ...prev, [productId]: '' }));
      showNotification("Community perspective posted directly to the Thread!", "success");
    } catch (err) {
      console.error("Failed to add review reply:", err);
      showNotification("Error broadcasting perspective.", "error");
    }
  };

  // Filter & Search Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesCategory = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesCountry = selectedCountry === 'Global' || p.originCountry.toLowerCase() === selectedCountry.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.originCountry.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFollowing = !onlyShowFollowing || followedSellers.includes(p.sellerId || '');
        return matchesCategory && matchesCountry && matchesSearch && matchesFollowing;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;
        if (sortBy === 'reviews') return b.reviewsCount - a.reviewsCount;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedCountry, sortBy, onlyShowFollowing, followedSellers]);

  // Cart operations
  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    showNotification(`Added ${product.name} to checkout cart!`, 'success');
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showNotification("Product removed from order cart.", "info");
  };

  const cartSubtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  
  const shippingCost = useMemo(() => {
    if (cart.length === 0) return 0;
    if (shippingSpeed === 'standard') return 4.99;
    if (shippingSpeed === 'express') return 14.99;
    return 49.99; // Super fast drone transport
  }, [shippingSpeed, cart.length]);

  const cartTotal = cartSubtotal + shippingCost;

  // Format dynamic currency prices based on user active conversion code
  const formatPrice = (usdAmount: number) => {
    const converted = usdAmount * activeCurrency.rate;
    const formatted = converted.toLocaleString(undefined, { 
      minimumFractionDigits: usdAmount % 1 === 0 ? 0 : 2, 
      maximumFractionDigits: 2 
    });
    return `${activeCurrency.symbol}${formatted}`;
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification("Please select a valid image file (PNG/JPG).", "error");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onerror = () => {
      showNotification("Failed to read image file.", "error");
      setIsUploadingImage(false);
    };

    reader.onload = (event) => {
      const imgElement = document.createElement('img');
      imgElement.src = event.target?.result as string;
      
      imgElement.onerror = () => {
        showNotification("Failed to load image element helper.", "error");
        setIsUploadingImage(false);
      };

      imgElement.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; // Optimal size for high performance web image listings
        const MAX_HEIGHT = 500;
        let width = imgElement.width;
        let height = imgElement.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgElement, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75); // Compact yet high quality
          setNewProductImg(compressedDataUrl);
          showNotification("Product photo added successfully!", "success");
        } else {
          setNewProductImg(event.target?.result as string);
        }
        setIsUploadingImage(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification("Please select a valid image file (PNG/JPG).", "error");
      return;
    }

    setIsUploadingReceipt(true);
    const reader = new FileReader();
    reader.onerror = () => {
      showNotification("Failed to read receipt file.", "error");
      setIsUploadingReceipt(false);
    };

    reader.onload = (event) => {
      const imgElement = document.createElement('img');
      imgElement.src = event.target?.result as string;
      
      imgElement.onerror = () => {
        showNotification("Failed to load receipt image helper.", "error");
        setIsUploadingReceipt(false);
      };

      imgElement.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = imgElement.width;
        let height = imgElement.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgElement, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setP2pReceiptImg(compressedDataUrl);
          showNotification("Payment receipt screenshot imported successfully!", "success");
        } else {
          setP2pReceiptImg(event.target?.result as string);
        }
        setIsUploadingReceipt(false);
      };
    };
    reader.readAsDataURL(file);
  };

  // List dynamic new custom product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showNotification("Please sign in to list items or post advertisements.", "error");
      return;
    }
    if (!newProductName.trim()) {
      showNotification("Please enter a valid product name.", "error");
      return;
    }
    const parsedPrice = parseFloat(newProductPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showNotification("Please provide a valid numeric positive price.", "error");
      return;
    }

    setIsCreatingProduct(true);
    try {
      let fallbackImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=450&q=80';
      if (newProductCategory.toLowerCase().includes('fashion')) {
        fallbackImg = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=450&q=80';
      } else if (newProductCategory.toLowerCase().includes('beauty')) {
        fallbackImg = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=450&q=80';
      } else if (newProductCategory.toLowerCase().includes('electronics')) {
        fallbackImg = 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=450&q=80';
      } else if (newProductCategory.toLowerCase().includes('snack') || newProductCategory.toLowerCase().includes('treat')) {
        fallbackImg = 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=450&q=80';
      } else if (newProductCategory.toLowerCase().includes('book')) {
        fallbackImg = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=450&q=80';
      }

      const flag = countriesFlags[newProductCountry] || '🌐';

      const customProd = {
        name: newProductName,
        description: newProductDesc || "Premium international item curated for the Exona world marketplace.",
        price: parsedPrice,
        category: newProductCategory,
        originCountry: newProductCountry,
        countryFlag: flag,
        imageUrl: newProductImg.trim() || fallbackImg,
        stock: parseInt(newProductStock) || 10,
        rating: 5.0, 
        reviewsCount: 1,
        sellerName: userDoc?.displayName || user?.displayName || "Global Merchant",
        sellerId: user?.uid || "custom-seller",
        sellerPhoto: user?.photoURL || "",
        timestamp: new Date(),
        isCustom: true
      };

      await addDoc(collection(db, 'marketplace_products'), customProd);
      
      showNotification(`Item "${newProductName}" has been uploaded to the international marketplace!`, 'success');
      
      setNewProductName('');
      setNewProductDesc('');
      setNewProductPrice('');
      setNewProductImg('');
      setIsListModalOpen(false);
    } catch (e) {
      console.error(e);
      showNotification(`Error listing product in database: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Remove international product listing - ADMIN ONLY
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!isAdmin) {
      showNotification("Security Error: Only network administrators can remove products.", "error");
      return;
    }
    try {
      if (confirm(`Are you absolutely sure you want to remove this product "${productName}" from the marketplace?`)) {
        if (!productId.startsWith('prod_')) {
          await deleteDoc(doc(db, 'marketplace_products', productId));
        }
        setProducts(prev => prev.filter(p => p.id !== productId));
        showNotification(`Product "${productName}" has been successfully removed from Exona Marketplace.`, 'success');
        setSelectedDetailedProduct(null);
      }
    } catch (err) {
      console.error("Error removing product: ", err);
      showNotification("Could not delete product.", "error");
    }
  };

  // Submit Order via Mock checkout wizard
  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      showNotification("Please supply an accurate global delivery address.", "error");
      return;
    }
    setIsProcessingOrder(true);
    try {
      if (checkoutPaymentMethod === 'excoin') {
        const totalInExcoins = Math.ceil(cartTotal * 2.5);
        if (excoinBalance < totalInExcoins) {
          showNotification(`Insufficient Excoin balance! You need ${totalInExcoins} EXC. Your balance is ${excoinBalance} EXC.`, "error");
          setIsProcessingOrder(false);
          return;
        }

        if (handleDebitExcoin) {
          const description = `World Marketplace purchase: ${cart.length} item(s)`;
          const debitSuccess = await handleDebitExcoin(totalInExcoins, description);
          if (!debitSuccess) {
            showNotification("Failed to process Excoin debit. Please check funds.", "error");
            setIsProcessingOrder(false);
            return;
          }
        } else {
          showNotification("Excoin transaction client not initialized.", "error");
          setIsProcessingOrder(false);
          return;
        }
      }

      if (checkoutPaymentMethod === 'p2p') {
        if (!p2pReceiptImg) {
          showNotification("Please upload your peer-to-peer payment transfer receipt.", "error");
          setIsProcessingOrder(false);
          return;
        }
        if (!p2pSenderName.trim()) {
          showNotification("Please enter sender's name or reference account for proof.", "error");
          setIsProcessingOrder(false);
          return;
        }
      }

      const orderData = {
        buyerId: user?.uid || 'anonymous',
        buyerName: userDoc?.displayName || user?.displayName || 'Customer',
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.imageUrl,
          originCountry: item.product.originCountry
        })),
        subtotal: cartSubtotal,
        shippingSpeed,
        shippingCost,
        total: cartTotal,
        paymentMethod: checkoutPaymentMethod,
        totalExcoins: checkoutPaymentMethod === 'excoin' ? Math.ceil(cartTotal * 2.5) : null,
        p2pReceiptImg: checkoutPaymentMethod === 'p2p' ? p2pReceiptImg : null,
        p2pSenderName: checkoutPaymentMethod === 'p2p' ? p2pSenderName : null,
        p2pReference: checkoutPaymentMethod === 'p2p' ? p2pReference : null,
        address: shippingAddress,
        country: shippingCountry,
        paymentNote: paymentNote,
        status: 'pending',
        timestamp: new Date(),
        trackingUpdates: [
          { status: 'pending', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: 'Order verified. Awaiting dispatch from native international hub.' }
        ]
      };

      await addDoc(collection(db, 'marketplace_orders'), orderData);
      
      for (const item of cart) {
        if (!item.product.isCustom) {
          try {
            const docRef = doc(db, 'marketplace_products', item.product.id);
            await updateDoc(docRef, {
              stock: Math.max(0, item.product.stock - item.quantity)
            });
          } catch (invErr) {
            console.warn("Stock reduce ignored for item", item.product.id, invErr);
          }
        }
      }

      setCart([]);
      setP2pReceiptImg('');
      setP2pSenderName('');
      setP2pReference('');
      setCheckoutStep(3); 
      showNotification("International transaction successful! Order tracking activated.", "success");
    } catch (e) {
      console.error(e);
      showNotification("Order processing error.", "error");
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Trigger floating AI merchant recommendations
  const handleSendAiMessage = async () => {
    if (!aiChatInput.trim() || isGeneratingAiResponse) return;
    const userMsg = aiChatInput.trim();
    setAiChatInput('');
    setAiChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsGeneratingAiResponse(true);

    try {
      const prompt = `You are the Exona World Marketplace AI Expert assistant. A user is asking about our products, global logistic pathways, shipping speeds, tax rules, or customs options. Here are our active items:\n${products.map(p => `- ${p.name} from ${p.originCountry} at $${p.price}`).join('\n')}\n\nUser Question: "${userMsg}"\nProvide a warm, premium, highly customized response addressing their specific prompt. Suggest 1 or 2 matching items from our actual active list above using bold text! Keep your response under 100 words.`;
      
      const serverRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, stream: false })
      });

      if (!serverRes.ok) throw new Error("Server API breakdown");
      const dat = await serverRes.json();
      const reply = dat.response || dat.text || "I apologize, my shipping database maps are updating in the background. Please ask again in a moment!";
      
      setAiChatHistory(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      console.error(e);
      setAiChatHistory(prev => [...prev, { role: 'ai', text: "I apologize, my local neural simulation model reported a transmission error. Let me verify our active listings for you!" }]);
    } finally {
      setIsGeneratingAiResponse(false);
    }
  };

  const toggleHeartPost = async (productId: string) => {
    const fId = user?.uid || 'guest';
    const existingLike = likesDocuments.find(l => l.productId === productId && l.userId === fId);
    
    try {
      if (existingLike) {
        await deleteDoc(doc(db, 'marketplace_likes', existingLike.id));
        showNotification("Item removed from your favorites thread.", "info");
      } else {
        const likeData = {
          productId,
          userId: fId,
          timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, 'marketplace_likes'), likeData);
        showNotification("Item saved to your favorites thread live!", "success");
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Fallback local operation
      const isLiked = !likedPosts[productId];
      setLikedPosts(prev => ({ ...prev, [productId]: isLiked }));
      setThreadLikesCount(prev => {
        const existing = prev[productId] || Math.floor(Math.random() * 25) + 5;
        return { ...prev, [productId]: isLiked ? existing + 1 : Math.max(0, existing - 1) };
      });
      showNotification("Saved to wishlist locally.", "info");
    }
  };

  const getThreadLikesCount = (productId: string) => {
    // True live count from firestore database
    const liveCount = likesDocuments.filter(l => l.productId === productId).length;
    // Stable organic base seed
    const fallbackCount = Math.floor(productId.charCodeAt(productId.length - 1 || 0) % 18) + 6;
    return liveCount + fallbackCount;
  };

  const handleResharePost = async (productId: string, productName: string) => {
    const fId = user?.uid || 'guest';
    const uName = userDoc?.displayName || user?.displayName || 'Exona Scholar';
    try {
      const reshareData = {
        productId,
        userId: fId,
        userName: uName,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'marketplace_reshares'), reshareData);
      showNotification(`Product "${productName}" has been successfully forwarded and reshared live!`, "success");
    } catch (err) {
      console.error("Error creating reshare:", err);
      showNotification("Shared product link (locally).", "info");
    }
  };

  const getProductResharesCount = (productId: string) => {
    const liveReshares = resharesDocuments.filter(r => r.productId === productId).length;
    const baseSeed = Math.floor(productId.charCodeAt(0) % 7) + 2;
    return liveReshares + baseSeed;
  };

  return (
    <div id="marketplace_p2p_portal" className="w-full h-full flex flex-col bg-[#FAF9F6] text-stone-900 font-sans overflow-hidden select-none">
      
      {/* INSTAGRAM-STYLE HEADER */}
      <div className="bg-white border-b border-stone-150/70 sticky top-0 z-40 px-4 py-3 md:px-6 md:py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] shrink-0">
        <div className="flex flex-col max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side: Brand Wordmark Logo */}
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif italic text-2xl font-black tracking-normal text-stone-900 select-none cursor-pointer">
                Exona
              </h1>
              
              {/* Super compact Currency Dropdown */}
              <div className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-200/60 rounded-xl px-2 py-1 text-[9px] font-black tracking-tight text-stone-600 cursor-pointer shadow-2xs">
                <Globe size={10.5} className="text-[#2481CC]" />
                <select 
                  value={currencyCode} 
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="bg-transparent outline-none border-none py-0 pr-1 text-stone-850 font-black cursor-pointer uppercase text-[8.5px]"
                >
                  {currencyModes.map(c => (
                    <option key={c.code} value={c.code} className="text-stone-900 bg-white font-bold">{c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Side: Clean Instagram Action Row */}
            <div className="flex items-center gap-4.5">
              {/* Search Toggle Button */}
              <button 
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={`p-1 transition-all hover:scale-105 cursor-pointer ${
                  showSearchBar ? 'text-[#2481CC]' : 'text-stone-400 hover:text-stone-950'
                }`}
                title="Search Products"
              >
                <Search size={21} className="stroke-[2.2px]" />
              </button>

              {/* Home Feed Button (Instagram-like) */}
              <button 
                onClick={() => {
                  setActiveMarketView('browse');
                  setSelectedCategory('ALL'); // Reset category filter to show all
                  setSearchQuery(''); // Reset search
                }}
                className={`relative p-1 transition-all hover:scale-105 cursor-pointer ${
                  activeMarketView === 'browse' ? 'text-stone-950 scale-102 font-black' : 'text-stone-400 hover:text-stone-600'
                }`}
                title="Home Feed"
              >
                <ShoppingBag size={21} className={activeMarketView === 'browse' ? 'text-stone-950 stroke-[2.2px]' : 'text-stone-400'} />
              </button>

              {/* Create Post Button (Instagram-like PlusSquare decoration) - Unlocked for everyone! */}
              <button
                onClick={() => setIsListModalOpen(true)}
                className="p-1 px-1.5 text-stone-700 hover:text-stone-950 hover:scale-105 transition-all cursor-pointer"
                title="Create Advert Post"
              >
                <div className="p-0.5 border-[2px] border-stone-800 rounded-md hover:border-stone-950 transition-colors flex items-center justify-center h-[18px] w-[18px]">
                  <Plus size={11} className="stroke-[3.5px]" />
                </div>
              </button>

              {/* Activity Orders Button (Instagram-like Heart icon) */}
              <button 
                onClick={() => setActiveMarketView('orders')}
                className={`relative p-1 transition-all hover:scale-105 cursor-pointer ${
                  activeMarketView === 'orders' ? 'text-rose-500 scale-102' : 'text-stone-400 hover:text-stone-600'
                }`}
                title="Orders Activity"
              >
                <Heart size={21} className={activeMarketView === 'orders' ? 'fill-rose-500 text-rose-500' : 'text-stone-400 stroke-[2px]'} />
                {orders.some(o => o.status !== 'delivered') && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full ring-[2px] ring-white animate-pulse" />
                )}
              </button>

              {/* Direct Message or Custom Shopping Cart Bag */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-1 text-stone-400 hover:text-stone-950 hover:scale-105 transition-all cursor-pointer"
                title="Your Shopping Bag"
              >
                <ShoppingCart size={21} className={cart.length > 0 ? 'text-stone-900 stroke-[2px]' : 'text-stone-400'} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#2481CC] text-white text-[8px] font-black h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white select-none">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Slide-down Search Bar */}
          <AnimatePresence>
            {showSearchBar && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="relative flex items-center w-full">
                  <input 
                    type="text" 
                    placeholder="Search premium crafts, products, creators..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 rounded-xl outline-none text-xs font-bold text-stone-800 placeholder:text-stone-400 transition-all font-sans"
                    autoFocus
                  />
                  <Search size={14} className="absolute left-3 text-stone-400" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 text-stone-400 hover:text-stone-950 p-0.5">
                      <X size={12.5} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MAIN THREADS STREAM VIEWPORT */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-4 md:px-6 pt-5 pb-28 min-h-0">
        
        {activeMarketView === 'orders' ? (
          /* ==================== ACTIVE ORDERS TIMELINE ==================== */
          <div className="space-y-6">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-900">Customs Transit Timeline</h3>
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mt-1">Cross-border logistics tracker nodes</p>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center bg-white border border-stone-150 rounded-[2rem] flex flex-col items-center gap-4 justify-center px-6">
                <div className="h-12 w-12 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 border border-stone-200">
                  <Package size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-900 uppercase">No cargo transits found</h4>
                  <p className="text-[10px] text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed font-semibold uppercase tracking-wider">Acquire designs in the Market Stream. Transits clear customs in real-time!</p>
                </div>
                <button 
                  onClick={() => setActiveMarketView('browse')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white text-[9px] uppercase font-black tracking-widest rounded-xl transition-all"
                >
                  Explore Stream
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((o) => {
                  const stepIdx = o.status === 'pending' ? 1 : o.status === 'dispatched' ? 2 : o.status === 'customs' ? 3 : o.status === 'out_for_delivery' ? 4 : 5;
                  const statusLabels = {
                    pending: 'Pending Verification',
                    dispatched: 'Dispatched from Regional Hub',
                    customs: 'Clearing Customs Inspection',
                    out_for_delivery: 'Out for Local Delivery',
                    delivered: 'Arrived & Delivered Successfully'
                  };

                  return (
                    <div key={o.id} className="bg-white border border-stone-150 rounded-[2rem] overflow-hidden shadow-sm">
                      {/* Tracking Card Header */}
                      <div className="bg-stone-50 p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-stone-600 font-bold">
                        <div>
                          <p className="text-stone-400 uppercase font-black tracking-widest text-[8.5px]">Global Node Tracking ID</p>
                          <p className="font-mono font-black text-stone-900 text-xs mt-0.5">{o.id.toUpperCase()}</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-left">
                          <div>
                            <p className="text-stone-400 uppercase font-black tracking-widest text-[8.5px]">Items Total</p>
                            <p className="font-black text-emerald-600 mt-0.5">{formatPrice(o.total)}</p>
                          </div>
                          <div>
                            <p className="text-stone-400 uppercase font-black tracking-widest text-[8.5px]">Courier Routing</p>
                            <p className="font-black text-stone-950 mt-0.5 truncate max-w-[150px] uppercase font-mono">{o.address}, {o.country}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5.5 space-y-5">
                        {/* Dynamic Step Line Indicator */}
                        <div className="grid grid-cols-5 gap-2 relative pt-2">
                          {[
                            { label: 'Pending', step: 1 },
                            { label: 'Dispatched', step: 2 },
                            { label: 'Customs', step: 3 },
                            { label: 'Transit', step: 4 },
                            { label: 'Arrived', step: 5 }
                          ].map((s) => {
                            const isDone = s.step <= stepIdx;
                            const isCurrent = s.step === stepIdx;
                            return (
                              <div key={s.label} className="text-center space-y-1.5 relative">
                                <div className={`h-1 mx-auto rounded-full ${isDone ? 'bg-stone-900' : 'bg-stone-200'}`} />
                                <p className={`text-[8px] font-black uppercase tracking-wider ${isCurrent ? 'text-[#2481CC]' : isDone ? 'text-stone-900' : 'text-stone-300'}`}>
                                  {s.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order nested items */}
                        <div className="border-t border-stone-100 pt-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-3 block">Package Contents</p>
                          <div className="space-y-2">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="flex gap-3 items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150/40">
                                <img src={it.imageUrl} className="h-9 w-9 rounded-lg object-cover bg-white" />
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-[11px] font-bold text-stone-900 truncate leading-snug">{it.name}</h5>
                                  <p className="text-[9.5px] mt-0.5 flex items-center gap-1.5 text-stone-500 font-semibold">
                                    <span className="text-emerald-600 font-extrabold">{formatPrice(it.price)}</span>
                                    <span>Quantity: {it.quantity}</span>
                                    <span className="text-stone-400">{it.originCountry}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Real-time Logistics Stream updates */}
                        <div className="bg-stone-50 p-4 rounded-xl space-y-2.5 border border-stone-150/40 text-left">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1">
                            <Clock size={10} /> Live Logistics Nodes Log
                          </p>
                          <div className="space-y-2">
                            {o.trackingUpdates?.map((u, ui) => (
                              <div key={ui} className="text-[11px] flex gap-2">
                                <span className="font-mono font-black text-stone-400 text-[10px] shrink-0">{u.time}</span>
                                <span className="text-[#2481CC] font-black shrink-0">::</span>
                                <span className="text-stone-800 font-semibold leading-normal">{u.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* LIVE GOOGLE MAP ROUTING COMPONENT */}
                        <LogisticsDeliveryMap 
                          orderId={o.id}
                          sellerName={o.items[0]?.name || 'Exona Verified Seller'}
                          sellerCountry={o.items[0]?.originCountry || 'Japan'}
                          buyerAddress={o.address}
                          buyerCountry={o.country}
                          orderStatus={o.status}
                          onUpdateStatus={(newStatus, desc) => {
                            // Update local status of order in real-time as well for smooth reactive state changes
                            o.status = newStatus as any;
                            if (!o.trackingUpdates) o.trackingUpdates = [];
                            o.trackingUpdates.push({ status: newStatus, time: new Date().toLocaleTimeString(), desc });
                          }}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
          /* ==================== SCREEN 1: THE THREADS MARKET FEED ==================== */
          <div className="space-y-6 pb-12">
            
            {/* SOCIAL MEDIA CREATE ADVERT POST BOX */}
            <div className="bg-white border border-stone-150 rounded-[2rem] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] text-left transition-all hover:border-stone-200">
              <div className="flex gap-4">
                {/* User Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2481CC] to-indigo-600 text-white flex items-center justify-center font-bold text-sm select-none shadow-xs shrink-0 uppercase border-2 border-white ring-1 ring-stone-200/50">
                  {userDoc?.displayName?.slice(0, 2).toUpperCase() || user?.displayName?.slice(0, 2).toUpperCase() || "ME"}
                </div>
                
                {/* Input Area */}
                <div className="flex-1">
                  <p className="text-[12px] font-black text-stone-850 uppercase tracking-wider mb-2">Create Advert / Social Post</p>
                  
                  {/* Inline Form / Clicking triggers the listing modal */}
                  <div 
                    onClick={() => setIsListModalOpen(true)}
                    className="bg-stone-50 hover:bg-stone-100/70 border border-stone-200/60 rounded-2xl px-4 py-3 text-xs text-stone-400 font-semibold cursor-pointer transition-all flex items-center justify-between"
                  >
                    <span>What unique craft or product are you advertising today? Set price and post...</span>
                    <Plus size={14} className="text-stone-450 stroke-[3px]" />
                  </div>
                </div>
              </div>

              {/* Quick interactive shortcut buttons */}
              <div className="flex items-center justify-between border-t border-stone-100 mt-4 pt-3.5 px-1">
                <button 
                  onClick={() => setIsListModalOpen(true)}
                  className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-[11px] font-bold cursor-pointer"
                >
                  <span className="text-base">📸</span>
                  <span>Add Product Photo</span>
                </button>
                
                <button 
                  onClick={() => setIsListModalOpen(true)}
                  className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-[11px] font-bold cursor-pointer"
                >
                  <span className="text-base">🏷️</span>
                  <span>Set Smart Price</span>
                </button>

                <button 
                  onClick={() => setIsListModalOpen(true)}
                  className="flex items-center gap-2 text-[#2481CC] hover:text-[#1E71B3] transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer hover:scale-103"
                >
                  <span>Publish Advert</span>
                  <span>🚀</span>
                </button>
              </div>
            </div>

            {/* STREAM SELECTION TABS */}
            <div className="flex border-b border-stone-100 pb-1 justify-center gap-6 text-xs font-black uppercase tracking-widest text-[#2481CC] select-none">
              <button 
                onClick={() => setOnlyShowFollowing(false)}
                className={`pb-2.5 transition-all relative cursor-pointer font-extrabold ${!onlyShowFollowing ? 'text-[#2481CC]' : 'text-stone-400 hover:text-stone-700'}`}
              >
                <span>🌍 Explore Market</span>
                {!onlyShowFollowing && (
                  <motion.div layoutId="activeStreamLine" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2481CC] rounded-full" />
                )}
              </button>
              
              <button 
                onClick={() => setOnlyShowFollowing(true)}
                className={`pb-2.5 transition-all relative cursor-pointer flex items-center gap-1.5 font-extrabold ${onlyShowFollowing ? 'text-[#2481CC]' : 'text-stone-400 hover:text-stone-700'}`}
              >
                <span>👥 Following</span>
                {followedSellers.length > 0 && (
                  <span className="h-4 min-w-[16px] px-1 bg-stone-100 border border-stone-200 text-stone-600 text-[9px] flex items-center justify-center rounded-full">
                    {followedSellers.length}
                  </span>
                )}
                {onlyShowFollowing && (
                  <motion.div layoutId="activeStreamLine" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2481CC] rounded-full" />
                )}
              </button>
            </div>

            {/* BROWSE FEED: COLLABORATIVE THREADS LIST */}
            {isLoadingProducts ? (
              <div className="py-24 text-center">
                <div className="h-8 w-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-[#2481CC] animate-pulse">Syncing International Inventories...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              onlyShowFollowing ? (
                <div className="py-20 text-center bg-white border border-stone-100 rounded-[2rem] px-8 max-w-sm mx-auto shadow-sm flex flex-col items-center">
                  <div className="h-12 w-12 bg-blue-50 text-[#2481CC] rounded-full flex items-center justify-center mb-4 border border-blue-100 shrink-0">
                    <Users size={22} className="stroke-[2.5px]" />
                  </div>
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-tight">Following Feed is empty</h4>
                  <p className="text-[11px] text-stone-400 mt-2.5 leading-relaxed font-semibold uppercase tracking-wider">
                    You aren't following any sellers with active items. Tap "+ Follow" next to vendor names in the Explore tab!
                  </p>
                  <button 
                    onClick={() => setOnlyShowFollowing(false)}
                    className="mt-6 px-4 py-2 bg-[#2481CC] hover:bg-[#1E71B3] text-white text-[9px] uppercase font-black tracking-widest rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Browse Explore Feed
                  </button>
                </div>
              ) : (
                <div className="py-20 text-center bg-white border border-stone-100 rounded-[2rem] px-6 max-w-sm mx-auto shadow-sm">
                  <AlertCircle size={24} className="mx-auto text-stone-300 mb-3" />
                  <h4 className="text-sm font-bold text-stone-900 uppercase tracking-tight">No active listings</h4>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed">No products match your search/filter parameters. Reset your category tabs or publish an ad-hoc listing.</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {filteredProducts.map((p) => {
                  const comments = getProductComments(p.id);
                  const isExpanded = !!expandedReviews[p.id];
                  const hasHeart = likesDocuments.some(l => l.productId === p.id && l.userId === (user?.uid || 'guest'));
                  const likesCount = getThreadLikesCount(p.id);

                  // Calculate simulated dynamic discount original price
                  const discountPct = 30 + (Math.floor(p.price) % 35);
                  const originalPrice = p.price * (1 + (discountPct / 100));

                  return (
                    <div 
                      key={p.id}
                      className="bg-white border border-stone-100 p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.03)] transition-all duration-300 text-left relative"
                    >
                      <div className="flex gap-4">
                        {/* Left Column: Creator Avatar & Connecting Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <button 
                            onClick={() => {
                              showNotification(`Direct Message channel with vendor ${p.sellerName} is secured.`, "info");
                            }}
                            className="h-10 w-10 rounded-full bg-stone-950 font-black text-xs text-white flex items-center justify-center border-2 border-white shadow-md uppercase select-none transition-transform active:scale-95 cursor-pointer relative"
                          >
                            {p.sellerPhoto ? (
                              <img src={p.sellerPhoto} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              p.sellerName.slice(0, 2)
                            )}
                            {/* Little badge count */}
                            <span className="absolute -bottom-1 -right-1 bg-stone-100 text-stone-800 text-[8px] font-black h-4 w-4 rounded-full border border-white flex items-center justify-center">
                              {p.countryFlag}
                            </span>
                          </button>
                          
                          {/* Thread connective line */}
                          <div className="w-[1.5px] flex-1 bg-gradient-to-b from-stone-200/80 to-stone-50/10 my-3" />
                          
                          {/* Comments counter bubble styled after true threads replies teaser */}
                          {comments.length > 0 && (
                            <button 
                              onClick={() => setExpandedReviews(prev => ({ ...prev, [p.id]: !isExpanded }))}
                              className="h-6 w-6 rounded-full bg-stone-50 border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-[9px] font-bold text-stone-500 shrink-0 select-none transition-all active:scale-90 cursor-pointer"
                              title="Toggle thread discussion"
                            >
                              {comments.length}
                            </button>
                          )}
                        </div>

                        {/* Right Column: Original Thread Structure */}
                        <div className="flex-1 min-w-0">
                          
                          {/* Seller Row */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span 
                                onClick={() => {
                                  showNotification(`Private messaging with ${p.sellerName} is encrypted.`, "info");
                                }}
                                className="text-xs font-black text-stone-950 hover:underline cursor-pointer tracking-tight"
                              >
                                {p.sellerName}
                              </span>
                              <BadgeCheck size={14} className="text-blue-500 fill-blue-500 shrink-0" />
                              <span className="text-[9px] text-[#2481CC] font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 select-none">
                                <span>{p.countryFlag}</span> {p.originCountry}
                              </span>

                              {/* Follow Button */}
                              {p.sellerId && p.sellerId !== (user?.uid || 'guest') && (
                                <button
                                  onClick={(e) => handleToggleFollow(p.sellerId!, p.sellerName || 'Vendor', e)}
                                  className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
                                    followedSellers.includes(p.sellerId)
                                      ? 'bg-stone-50 text-stone-450 border-stone-200 hover:bg-stone-100'
                                      : 'bg-[#2481CC] text-white border-transparent hover:bg-[#1E71B3]'
                                  }`}
                                >
                                  {followedSellers.includes(p.sellerId) ? '✓ Following' : '+ Follow'}
                                </button>
                              )}
                            </div>

                            <span className="text-[10px] text-stone-400 font-medium select-none">
                              2h
                            </span>
                          </div>

                          {/* Category Tag Header */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md text-[7.5px]">
                              #{p.category.replace('&', '').replace(' ', '').toLowerCase()}
                            </span>
                            {p.featured && (
                              <span className="text-[8px] font-extrabold uppercase tracking-widest bg-rose-50 text-red-500 px-2 py-0.5 rounded-md border border-rose-100 text-[7.5px]">
                                Verified Deal
                              </span>
                            )}
                          </div>

                          {/* Thread Title & Content */}
                          <h4 className="text-[14.5px] font-black text-stone-950 mt-3 leading-snug tracking-tight">
                            {p.name}
                          </h4>
                          <p className="text-xs font-medium text-stone-600 mt-2 leading-relaxed tracking-wide pr-1">
                            {p.description}
                          </p>

                          {/* Immersive Instagram & Threads-styled Hero Media Card */}
                          <div 
                            onClick={() => setSelectedDetailedProduct(p)}
                            className="mt-4 relative rounded-2xl overflow-hidden aspect-[4/3] bg-stone-50 border border-stone-200/50 group select-none cursor-pointer shadow-xs"
                          >
                            <img 
                              src={p.imageUrl} 
                              alt={p.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                              referrerPolicy="no-referrer"
                            />

                            {/* Minimal Glassmorphic Price Sticker */}
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-stone-150 font-sans text-xs font-extrabold px-3 py-2 rounded-xl flex flex-col items-center shadow-md select-none">
                              <span className="text-[8.5px] uppercase tracking-widest text-emerald-600 font-black mb-1.5 block">🏷️ FOR SALE</span>
                              <span className="text-stone-950 text-xs font-black leading-none">{formatPrice(p.price)}</span>
                              <span className="line-through text-stone-400 text-[9.5px] mt-1 scale-90 block leading-none">{formatPrice(originalPrice)}</span>
                            </div>

                            {/* Inventory Alert inside Image Bottom */}
                            {p.stock <= 3 && p.stock > 0 && (
                              <div className="absolute bottom-4 left-4 bg-stone-955/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider py-1 px-3 rounded-lg border border-white/10 shadow-sm animate-pulse">
                                Only {p.stock} item(s) left in transit pipeline!
                              </div>
                            )}

                            {p.stock === 0 && (
                              <div className="absolute inset-0 bg-stone-955/65 backdrop-blur-xs flex items-center justify-center">
                                <span className="bg-white text-stone-900 border border-stone-200 text-xs font-black uppercase tracking-widest py-2 px-5 rounded-2xl shadow-lg">
                                  SOLD OUT / OUT OF STOCK
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Star rating alignment */}
                          <div className="flex items-center gap-1 mt-3.5">
                            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                            <span className="text-[10.5px] font-extrabold text-stone-800">{p.rating.toFixed(1)}</span>
                            <span className="text-[9.5px] text-stone-400 font-semibold uppercase tracking-wider ml-1">
                              • {p.reviewsCount} collaborative transits verified
                            </span>
                          </div>

                          {/* Dynamic Threads Action Row & Shopping Integration */}
                          <div className="mt-4.5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-4">
                            
                            {/* Standard Threads Social Action Icons */}
                            <div className="flex items-center gap-4 select-none text-stone-400">
                              
                              {/* Love/Wishlist standard toggle */}
                              <button 
                                onClick={() => toggleHeartPost(p.id)}
                                className="group flex items-center gap-1.5 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                title="Like / Save to wishlist"
                              >
                                <Heart size={18} className={hasHeart ? 'fill-rose-500 text-rose-500' : 'text-stone-400'} />
                                <span className="text-[10px] font-extrabold text-stone-600">{likesCount}</span>
                              </button>

                              {/* Discussion Toggle */}
                              <button 
                                onClick={() => setExpandedReviews(prev => ({ ...prev, [p.id]: !isExpanded }))}
                                className="group flex items-center gap-1.5 hover:text-stone-900 transition-colors p-1 cursor-pointer"
                                title="Inquire / Discuss"
                              >
                                <MessageCircle size={18} className={isExpanded ? 'text-stone-950' : 'text-stone-400'} />
                                <span className="text-[10px] font-extrabold text-stone-600">{comments.length}</span>
                              </button>

                              {/* Dispatch / Forward Share */}
                              <button 
                                onClick={() => handleResharePost(p.id, p.name)}
                                className="group flex items-center gap-1.5 hover:text-blue-500 transition-colors p-1 cursor-pointer"
                                title="Forward catalog post"
                              >
                                <Repeat size={17} className={getProductResharesCount(p.id) > 0 ? 'text-blue-500' : 'text-stone-400'} />
                                <span className="text-[10px] font-extrabold text-stone-600">{getProductResharesCount(p.id)}</span>
                              </button>

                              {/* Delete button (Admins only) */}
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="text-stone-350 hover:text-red-500 p-1 cursor-pointer"
                                  title="Delete post"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>

                            {/* Ultra-premium, clean shopping pills */}
                            <div className="flex items-center gap-2">
                              <button
                                disabled={p.stock === 0}
                                onClick={(e) => addToCart(p, e)}
                                className="px-4 py-2 bg-stone-50 border border-stone-200/80 hover:bg-stone-100 hover:border-stone-350 disabled:opacity-40 text-stone-700/90 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all select-none cursor-pointer"
                              >
                                Add to Bag
                              </button>

                              <button
                                disabled={p.stock === 0}
                                onClick={() => {
                                  setCart([{ product: p, quantity: 1 }]);
                                  setCheckoutPaymentMethod('standard');
                                  setIsCheckoutOpen(true);
                                  setCheckoutStep(1);
                                }}
                                className="px-5 py-2 bg-[#2481CC] hover:bg-[#1E71B3] hover:scale-102 active:scale-98 disabled:opacity-40 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all select-none shadow-sm cursor-pointer"
                              >
                                Buy now • {formatPrice(p.price)}
                              </button>
                            </div>

                          </div>

                          {/* NESTED PEER DISCUSSION BOARD (Threads specific) */}
                          {isExpanded && (
                            <div className="mt-5 pt-4.5 border-t border-stone-100/80 space-y-3.5">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#2481CC] font-mono">
                                # Peer Conversation Nodes:
                              </p>

                              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                                {comments.map((c) => (
                                  <div key={c.id} className="bg-stone-50/50 p-3.5 rounded-2xl text-xs leading-relaxed border border-stone-100 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-mono font-black text-stone-850 text-[10.5px] uppercase">{c.userName}</span>
                                      <span className="text-[8.5px] text-stone-400 font-bold uppercase tracking-wider">COLLABORATOR</span>
                                    </div>
                                    <p className="text-stone-700 font-medium">{c.text}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Live response block */}
                              <div className="flex gap-2.5 pt-2">
                                <input 
                                  type="text"
                                  placeholder="Post inquiry or sizing query directly in stream..."
                                  value={newReplyTexts[p.id] || ''}
                                  onChange={(e) => setNewReplyTexts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  className="flex-1 bg-stone-50 border border-stone-150 rounded-2xl px-4 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-stone-900/35 font-medium text-stone-850"
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddReviewReply(p.id)}
                                />
                                <button
                                  onClick={() => handleAddReviewReply(p.id)}
                                  className="h-8.5 px-4 bg-stone-950 text-white rounded-xl text-[9.5px] font-black uppercase tracking-widest hover:bg-[#2481CC] transition-all select-none cursor-pointer"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ==================== SCREEN DETAILED MODAL (INSTAGRAM INSPIRED) ==================== */}
      <AnimatePresence>
        {selectedDetailedProduct && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedDetailedProduct(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-stone-150 relative z-10 max-h-[85vh]"
            >
              <button 
                onClick={() => setSelectedDetailedProduct(null)}
                className="absolute top-4 right-4 h-8 w-8 bg-black/40 hover:bg-black/60 rounded-full text-white flex items-center justify-center transition-colors cursor-pointer z-20"
              >
                <X size={16} />
              </button>

              {/* Left Side: Stunning Media */}
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-stone-50 border-r border-stone-100 flex items-center justify-center relative overflow-hidden">
                <img 
                  src={selectedDetailedProduct.imageUrl} 
                  alt={selectedDetailedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Immersive Tag overlay */}
                <div className="absolute bottom-4 left-4 bg-stone-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-[10px] font-bold text-stone-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>{selectedDetailedProduct.countryFlag}</span>
                  <span>Origin: {selectedDetailedProduct.originCountry}</span>
                </div>
              </div>

              {/* Right Side: Threads & Custom Metadata details */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between text-left h-full overflow-y-auto">
                <div className="space-y-4">
                  {/* Vendor Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-stone-950 font-black text-[10px] text-white flex items-center justify-center overflow-hidden">
                        {selectedDetailedProduct.sellerPhoto ? (
                          <img src={selectedDetailedProduct.sellerPhoto} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          selectedDetailedProduct.sellerName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900 leading-none uppercase flex items-center gap-1">
                          <span>{selectedDetailedProduct.sellerName}</span>
                          <BadgeCheck size={12} className="text-blue-500 fill-blue-500 shrink-0" />
                        </p>
                        <p className="text-[10px] text-stone-450 font-bold uppercase tracking-wider mt-1">Verified Merchant</p>
                      </div>
                    </div>

                    {/* Follow button in details modal */}
                    {selectedDetailedProduct.sellerId && selectedDetailedProduct.sellerId !== (user?.uid || 'guest') && (
                      <button
                        onClick={(e) => handleToggleFollow(selectedDetailedProduct.sellerId!, selectedDetailedProduct.sellerName || 'Vendor', e)}
                        className={`text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
                          followedSellers.includes(selectedDetailedProduct.sellerId)
                            ? 'bg-stone-50 text-stone-450 border-stone-200 hover:bg-stone-100'
                            : 'bg-[#2481CC] text-white border-transparent hover:bg-[#1E71B3]'
                        }`}
                      >
                        {followedSellers.includes(selectedDetailedProduct.sellerId) ? '✓ Following' : '+ Follow'}
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5 border-t border-stone-50 pt-3">
                    <span className="text-[8px] font-black tracking-widest bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md uppercase">
                      #{selectedDetailedProduct.category.replace('&', '').replace(' ', '').toLowerCase()}
                    </span>
                    <h3 className="text-base font-black text-stone-900 leading-snug">
                      {selectedDetailedProduct.name}
                    </h3>
                    <p className="text-xs font-medium text-stone-600 leading-relaxed pt-1">
                      {selectedDetailedProduct.description}
                    </p>
                  </div>

                  {/* Star rating & Stock info */}
                  <div className="border-t border-stone-50 pt-3 text-[11.5px] font-semibold text-stone-500 space-y-2">
                    <div className="flex justify-between">
                      <span>Trust Rating:</span>
                      <span className="text-stone-900 font-black flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {selectedDetailedProduct.rating.toFixed(1)} ({selectedDetailedProduct.reviewsCount} transits)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Logistics Pipeline:</span>
                      {selectedDetailedProduct.stock > 0 ? (
                        <span className="text-emerald-600 font-black uppercase text-[10px] tracking-wider">Active Inventory ({selectedDetailedProduct.stock} Stock)</span>
                      ) : (
                        <span className="text-red-500 font-black uppercase text-[10px] tracking-wider">Transit depleted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkout pricing and checkout CTA buttons */}
                <div className="border-t border-stone-100 pt-5 mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Pre-clearance Price Check</p>
                      <p className="text-xl font-black text-stone-950 font-sans mt-0.5">{formatPrice(selectedDetailedProduct.price)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest text-right">DUTIES & TAXES</p>
                      <p className="text-[10px] text-stone-550 font-bold uppercase tracking-wider text-right mt-1">100% EXEMPTED / FREE</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        disabled={selectedDetailedProduct.stock === 0}
                        onClick={() => {
                          addToCart(selectedDetailedProduct);
                          setSelectedDetailedProduct(null);
                        }}
                        className="flex-1 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-black uppercase tracking-wider border border-stone-200 transition-all select-none disabled:opacity-40 cursor-pointer"
                      >
                        Add Bag
                      </button>
                      <button
                        disabled={selectedDetailedProduct.stock === 0}
                        onClick={() => {
                          setCart([{ product: selectedDetailedProduct, quantity: 1 }]);
                          setSelectedDetailedProduct(null);
                          setCheckoutPaymentMethod('standard');
                          setIsCheckoutOpen(true);
                          setCheckoutStep(1);
                        }}
                        className="flex-1 py-2.5 bg-[#2481CC] hover:bg-[#1E71B3] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none shadow-md disabled:opacity-40 cursor-pointer"
                      >
                        Buy now • {formatPrice(selectedDetailedProduct.price)}
                      </button>
                    </div>

                    <button
                      disabled={selectedDetailedProduct.stock === 0}
                      onClick={() => {
                        setCart([{ product: selectedDetailedProduct, quantity: 1 }]);
                        setSelectedDetailedProduct(null);
                        setP2pReceiptImg('');
                        setP2pSenderName('');
                        setP2pReference('');
                        setCheckoutPaymentMethod('p2p');
                        setIsCheckoutOpen(true);
                        setCheckoutStep(1);
                      }}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none shadow-xs border border-amber-500/80 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🤝</span>
                      <span>Buy via P2P Direct • {formatPrice(selectedDetailedProduct.price)}</span>
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 1. FLOATING AI HELP OVERLAY ==================== */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
        <AnimatePresence>
          {isAiAssistantOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-[2rem] w-80 sm:w-96 shadow-2xl overflow-hidden mb-3.5 flex flex-col h-[400px]"
            >
              <div className="bg-stone-950 px-5 py-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest leading-none">AI Logistics Expert</h4>
                    <span className="text-[8.5px] text-stone-400 font-bold uppercase tracking-widest mt-1 block">Duty Rate Simulator</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiAssistantOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/40">
                {aiChatHistory.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[1.25rem] px-3.5 py-2.5 text-xs font-semibold leading-relaxed font-sans ${
                      m.role === 'user' 
                        ? 'bg-stone-900 text-white rounded-tr-none' 
                        : 'bg-white text-stone-850 border border-stone-150 rounded-tl-none shadow-xs'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isGeneratingAiResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-stone-150 rounded-[1.25rem] rounded-tl-none px-3.5 py-2.5 text-xs text-stone-400 font-bold animate-pulse">
                      Analyzing regional pipelines...
                    </div>
                  </div>
                )}
              </div>

              {/* Input for floating chat */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                className="p-3 border-t border-stone-150 bg-white flex items-center gap-2 shrink-0"
              >
                <input 
                  type="text" 
                  placeholder="Ask and compare international items..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  disabled={isGeneratingAiResponse}
                  className="flex-1 bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-stone-900/35 text-stone-800"
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isGeneratingAiResponse}
                  className="bg-stone-900 hover:bg-[#2481CC] disabled:bg-stone-200 text-white h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsAiAssistantOpen(prev => !prev)}
          className="h-12 w-12 rounded-full bg-stone-950 text-white hover:bg-[#2481CC] flex items-center justify-center transition-all duration-350 shadow-xl border-2 border-white cursor-pointer active:scale-95 group relative"
        >
          {isAiAssistantOpen ? (
            <X size={18} />
          ) : (
            <Sparkles size={18} className="text-emerald-400" />
          )}
        </button>
      </div>

      {/* ==================== 2. INTEGRATED RIGHT CART BAR ==================== */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-stone-950/45 backdrop-blur-sm z-[250] flex justify-end">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCartOpen(false)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-white w-full max-w-md h-full relative z-10 flex flex-col shadow-2xl border-l border-stone-150"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-stone-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16.5} className="text-[#2481CC]" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-stone-900">Customs Delivery Cart</h4>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items Panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
                {cart.length === 0 ? (
                  <div className="py-24 text-center text-stone-400 text-xs space-y-3">
                    <div className="h-12 w-12 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-400 mx-auto">
                      <ShoppingBag size={18} />
                    </div>
                    <p className="font-extrabold uppercase tracking-widest text-[#2481CC]">Shopping cart is empty</p>
                    <p className="text-[10px] font-semibold max-w-xs mx-auto text-stone-400 uppercase tracking-wide leading-relaxed">Select items and click Fast Checkout across our global threads.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="bg-white border border-stone-150 p-3 rounded-2xl flex gap-3 shadow-xs text-left">
                      <img src={item.product.imageUrl} className="h-11 w-11 rounded-xl object-cover shrink-0 bg-stone-50" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-[11.5px] font-bold text-stone-900 leading-tight truncate">{item.product.name}</h5>
                            <button 
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-stone-300 hover:text-red-500 p-0.5 shrink-0 transition-colors"
                            >
                              <Trash2 size={12.5} />
                            </button>
                          </div>
                          <span className="text-[9.5px] text-[#2481CC] font-black uppercase tracking-wider">{item.product.countryFlag} {item.product.originCountry}</span>
                        </div>

                        {/* Qty and Prices select */}
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-stone-50">
                          <span className="text-xs font-black text-emerald-600 font-sans">{formatPrice(item.product.price * item.quantity)}</span>
                          <div className="flex items-center gap-2 bg-stone-50 border border-stone-150 rounded-lg px-2 py-0.5 select-none">
                            <button onClick={() => updateCartQty(item.product.id, -1)} className="text-stone-500 font-black">-</button>
                            <span className="text-[10.5px] font-black text-stone-900 px-1">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, 1)} className="text-stone-500 font-black">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal area */}
              {cart.length > 0 && (
                <div className="p-5.5 border-t border-stone-150 shrink-0 space-y-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.01)] text-left">
                  <div className="space-y-1.5 text-xs text-stone-500 font-bold">
                    <div className="flex justify-between">
                      <span>Products Subtotal:</span>
                      <span className="font-bold text-stone-900">{formatPrice(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maritime Custom Duties:</span>
                      <span className="text-emerald-600 font-black uppercase text-[9px] tracking-wider">FREE OF CHARGE / ESCROW</span>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-stone-100 pt-3 text-sm">
                    <span className="font-black uppercase tracking-wider text-stone-800">Clearing Total</span>
                    <span className="text-base font-black text-emerald-600">{formatPrice(cartSubtotal)}</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCheckoutPaymentMethod('standard');
                      setIsCheckoutOpen(true);
                      setCheckoutStep(1);
                    }}
                    className="w-full py-3 bg-stone-900 hover:bg-[#2481CC] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Cargo Clearance</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 3. CHECKOUT CUSTOMS ROUTING STEPPER MODAL ==================== */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-stone-150"
            >
              {/* Stepper Status Head */}
              <div className="bg-stone-50 py-4 px-6 border-b border-stone-100 flex items-center justify-between text-[10.5px] font-black uppercase tracking-widest text-[#2481CC]">
                <span>Logistics Routing Portal</span>
                <span className="text-stone-400">Step {checkoutStep} of 3</span>
              </div>

              {/* Graphical Steps */}
              <div className="px-6 py-4.5 border-b border-stone-50 flex items-center justify-around bg-stone-50/20">
                {[
                  { step: 1, label: 'Customs Node' },
                  { step: 2, label: 'Escrow Bill' },
                  { step: 3, label: 'Delivery Receipt' }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-1.5 text-[9.5px]">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center font-black ${
                      checkoutStep >= s.step ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-300'
                    }`}>
                      {s.step}
                    </div>
                    <span className={`uppercase font-black tracking-wider ${checkoutStep >= s.step ? 'text-stone-900' : 'text-stone-300'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stepper Content forms */}
              <div className="p-6.5 overflow-y-auto max-h-[400px]">
                {checkoutStep === 1 && (
                  /* STEP 1: DELIVERIES RETAIN COURIER */
                  <div className="space-y-4">
                    <p className="text-[10.5px] text-stone-500 font-bold uppercase tracking-wider text-center">Calibrate custom destination coordinate nodes for regional drone clearance.</p>
                    
                    <div className="space-y-1 text-left">
                      <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Shipping Destination Address</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Science Block Suite 44, Cambridge Campus"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none transition-all text-xs font-bold text-stone-800"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Clearance Country node</label>
                      <select 
                        value={shippingCountry} 
                        onChange={(e) => setShippingCountry(e.target.value)}
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900/35 text-xs font-bold font-sans rounded-xl text-stone-800"
                      >
                        {countriesList.filter(c => c !== 'Global').map(c => (
                          <option key={c} value={c}>{countriesFlags[c]} {c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Assigned Delivery Velocity</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { speed: 'standard', title: 'Standard Air', desc: 'Ships 3-5d', cost: 4.99 },
                          { speed: 'express', title: 'Supra Express', desc: 'Ships 1-2d', cost: 14.99 },
                          { speed: 'supersonic', title: 'Drone Direct', desc: 'Ships 1hr', cost: 49.99 }
                        ].map((v) => (
                          <div 
                            key={v.speed}
                            onClick={() => setShippingSpeed(v.speed as any)}
                            className={`p-2.5 border rounded-xl cursor-pointer flex flex-col justify-between transition-all text-left ${
                              shippingSpeed === v.speed 
                                ? 'border-stone-900 bg-stone-50 scale-102 font-black shadow-xs' 
                                : 'border-stone-150 hover:bg-stone-50'
                            }`}
                          >
                            <span className="text-[10px] font-black text-stone-900">{v.title}</span>
                            <span className="text-[9px] text-[#2481CC] font-bold mt-1 uppercase leading-none">{v.desc}</span>
                            <span className="text-[9.5px] font-black text-emerald-600 mt-1">${v.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-stone-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(false)}
                        className="flex-1 py-3 border border-stone-200 rounded-xl text-stone-500 hover:text-stone-800 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!shippingAddress.trim()}
                        onClick={() => setCheckoutStep(2)}
                        className="flex-1 py-3 bg-stone-900 hover:bg-[#2481CC] hover:scale-101 active:scale-99 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 select-none transition-all"
                      >
                        Proceed Bill
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 2 && (
                  /* STEP 2: ESCROW PAYMENT DETAILS */
                  <div className="space-y-4 text-left">
                    <p className="text-[10px] text-stone-400 font-black uppercase tracking-wider text-center block">Review global escrow clearance & select settlement channels.</p>
                    
                    <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl text-[11px] text-stone-500 font-bold space-y-2">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="text-stone-900">{formatPrice(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Regional Custom Duties:</span>
                        <span className="text-emerald-600 font-black">FREE ($0.00)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aviation Freight Charges:</span>
                        <span className="text-stone-900">${shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-stone-200 pt-3 flex justify-between text-stone-900 text-xs">
                        <span className="font-black uppercase tracking-widest">Global Total:</span>
                        <span className="font-extrabold text-[#2481CC]">{formatPrice(cartTotal)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Settlement Channel</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div 
                          onClick={() => setCheckoutPaymentMethod('standard')}
                          className={`p-2.5 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none text-left ${
                            checkoutPaymentMethod === 'standard' 
                              ? 'border-stone-900 bg-stone-50/50 font-bold scale-102 shadow-xs' 
                              : 'border-stone-150 bg-stone-50/30 hover:bg-stone-50'
                          }`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-black text-stone-900">Escrow</p>
                            <p className="text-[7.5px] text-stone-400 mt-0.5 font-semibold uppercase leading-none">Credit Card</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => setCheckoutPaymentMethod('excoin')}
                          className={`p-2.5 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none text-left ${
                            checkoutPaymentMethod === 'excoin' 
                              ? 'border-stone-900 bg-[#2481CC]/5 font-bold scale-102 shadow-xs' 
                              : 'border-stone-150 bg-stone-50/30 hover:bg-stone-50'
                          }`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-black text-stone-900 flex items-center gap-1">
                              🪙 EXC
                            </p>
                            <p className="text-[7.5px] text-[#2481CC] mt-0.5 font-semibold uppercase leading-none">2.5 EXC = $1</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => setCheckoutPaymentMethod('p2p')}
                          className={`p-2.5 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none text-left ${
                            checkoutPaymentMethod === 'p2p' 
                              ? 'border-amber-600 bg-amber-500/[0.04] font-bold scale-102 shadow-xs' 
                              : 'border-stone-150 bg-stone-50/30 hover:bg-stone-50'
                          }`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-black text-amber-800 flex items-center gap-1">
                              🤝 P2P Direct
                            </p>
                            <p className="text-[7.5px] text-amber-700 mt-0.5 font-semibold uppercase leading-none">Bank Transfer</p>
                          </div>
                        </div>
                      </div>

                      {checkoutPaymentMethod === 'excoin' && (
                        <div className="bg-stone-100/50 border border-stone-200/50 p-3 rounded-xl flex items-center justify-between text-[10px] mt-2 font-bold text-stone-600">
                          <div>
                            <p className="font-black">Escrow Total: <span className="text-[#2481CC]">{Math.ceil(cartTotal * 2.5)} EXC</span></p>
                            <p className="text-[8.5px] mt-0.5 font-semibold text-stone-400 uppercase tracking-wide">Wallet Balance: {excoinBalance} EXC</p>
                          </div>
                          {excoinBalance >= Math.ceil(cartTotal * 2.5) ? (
                            <span className="bg-emerald-50 text-emerald-800 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md">Settled</span>
                          ) : (
                            <span className="bg-rose-50 text-red-700 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md">Shortage</span>
                          )}
                        </div>
                      )}

                      {checkoutPaymentMethod === 'p2p' && (
                        <div className="mt-3 bg-amber-500/[0.02] border border-amber-250/50 rounded-2xl p-4 space-y-3.5 text-xs text-stone-850">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <span>📋</span> Creator P2P Account Info
                          </p>
                          
                          <div className="space-y-2 border-b border-amber-150 pb-3">
                            {cart.map((item, idx) => {
                              const seller = String(item.product.sellerName || 'Exona Partner');
                              const charSum = seller.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                              const accountNo = `90${(charSum * 33) % 90000000 + 10000000}`;
                              const bankCode = (charSum % 3 === 0) ? 'Carbon Microfinance Bank' : (charSum % 3 === 1) ? 'VFD Microfinance Bank' : 'OPay Digital Ltd';
                              
                              return (
                                <div key={idx} className="bg-white p-2.5 rounded-xl border border-stone-200 text-[11px] font-semibold space-y-1">
                                  <div className="flex justify-between text-stone-400 text-[9px] uppercase tracking-wider">
                                    <span>Vendor direct info</span>
                                    <span className="text-amber-800 font-bold">Transfer Exactly</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-900 font-extrabold">{seller}</span>
                                    <span className="text-[#2481CC] font-extrabold">{formatPrice(item.product.price * item.quantity)}</span>
                                  </div>
                                  <div className="text-[10px] text-stone-650 bg-stone-50 p-2 rounded-lg border border-stone-100 font-mono flex flex-col mt-1">
                                    <span>🏛️ Bank: <strong>{bankCode}</strong></span>
                                    <span>💳 No: <strong className="text-stone-900 select-all font-bold">{accountNo}</strong></span>
                                    <span>👤 Name: <strong>{seller}</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-3 pt-1">
                            <p className="text-[9px] uppercase font-black text-amber-800 tracking-wider">Upload Transfer Confirmation Photo</p>
                            
                            {p2pReceiptImg ? (
                              <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-stone-50 h-28 flex items-center justify-center">
                                <img src={p2pReceiptImg} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                <button 
                                  type="button"
                                  onClick={() => setP2pReceiptImg('')}
                                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center cursor-pointer text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label 
                                htmlFor="p2p-receipt-file"
                                className="border border-dashed border-amber-300 hover:border-amber-405 hover:bg-amber-500/[0.04] bg-white transition-all rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer min-h-[75px] relative"
                              >
                                <span className="text-sm">📤</span>
                                <span className="text-[10px] font-bold text-stone-700 mt-1">
                                  {isUploadingReceipt ? "Importing screengrab..." : "Upload Payment Receipt screenshot"}
                                </span>
                              </label>
                            )}

                            <input 
                              type="file"
                              id="p2p-receipt-file"
                              accept="image/*"
                              onChange={handleReceiptUploadChange}
                              className="hidden"
                            />

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <label className="text-stone-400 font-black uppercase tracking-wider text-[8px]">Sender's Name</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. John Doe"
                                  value={p2pSenderName}
                                  onChange={(e) => setP2pSenderName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg outline-none text-[11px] font-bold text-stone-800 focus:border-amber-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-stone-400 font-black uppercase tracking-wider text-[8px]">Remittance Ref (Optional)</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. TR-240183"
                                  value={p2pReference}
                                  onChange={(e) => setP2pReference(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg outline-none text-[11px] font-bold text-stone-800 focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 mt-2.5">
                      <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Delivery instructions</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Leave package by science block foyer corridor storage."
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-bold text-stone-850 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-stone-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(1)}
                        className="flex-1 py-3 border border-stone-200 rounded-xl text-stone-500 hover:text-stone-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={13} /> Return
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingOrder}
                        onClick={handlePlaceOrder}
                        className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 hover:scale-101 active:scale-99 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CreditCard size={13} />
                        <span>{isProcessingOrder ? 'Escrowing...' : 'Confirm Escrow'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 3 && (
                  /* STEP 3: CELEBRATE CUSTOM TRANSACTION SUCCESS */
                  <div className="space-y-4 text-center py-6">
                    <div className="h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border-2 border-emerald-100 shadow-sm">
                      <Check size={28} className="stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-stone-900">Customs Clearance established!</h4>
                      <p className="text-[10px] text-stone-400 leading-relaxed mt-1.5 max-w-xs mx-auto uppercase font-semibold tracking-wider">Your international transaction bill escrow node has been settled completely. Cargo tags is preparing!</p>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left space-y-1 max-w-sm mx-auto text-xs font-bold text-stone-600">
                      <p className="text-[9px] uppercase font-black tracking-widest text-[#2481CC]">Recipient route node:</p>
                      <p className="text-stone-900 font-extrabold uppercase mt-0.5">{shippingAddress}, {shippingCountry}</p>
                      <p className="text-[8.5px] text-stone-400 font-semibold tracking-wider mt-1 uppercase font-mono">Assigned courier: free autonomous cargo drone system.</p>
                    </div>

                    <div className="pt-4 border-t border-stone-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCheckoutOpen(false);
                          setActiveMarketView('orders');
                        }}
                        className="w-full py-3 bg-stone-900 hover:bg-[#2481CC] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md focus:outline-none cursor-pointer"
                      >
                        Logistics Delivery Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 4. SYSTEM UPLOAD/SELL PRODUCT LIST MODAL ==================== */}
      <AnimatePresence>
        {isListModalOpen && (
          <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-stone-150"
            >
              <div className="bg-stone-50 py-4 px-6 border-b border-stone-100 flex items-center justify-between text-xs font-black uppercase tracking-widest text-stone-900">
                <span>Publish Item Listing</span>
                <button onClick={() => setIsListModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                  <X size={15} />
                </button>
              </div>

              {/* Sell form */}
              <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-left overflow-y-auto max-h-[420px]">
                <div className="space-y-1">
                  <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Product Headline Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Handmade Kyoto Bonsai"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none text-xs font-bold text-stone-850 transition-all font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Product Narrative Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide a story about the craftsmanship, country of origin, and custom properties..."
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none text-xs font-bold text-stone-850 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Price USD ($)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="35.00"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="w-full px-3.5 py-2 bg-stone-50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none text-xs font-bold text-stone-850 transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Initial stock count</label>
                    <input 
                      type="number" 
                      placeholder="10"
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      className="w-full px-3.5 py-2 bg-stone-50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none text-xs font-bold text-stone-850 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Item Category</label>
                    <select 
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full px-2 py-2 bg-stone-50 border border-stone-200 focus:border-stone-900/40 text-xs font-black font-sans rounded-xl text-stone-800"
                    >
                      {categoriesList.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px]">Origin Country</label>
                    <select 
                      value={newProductCountry}
                      onChange={(e) => setNewProductCountry(e.target.value)}
                      className="w-full px-2 py-2 bg-stone-50 border border-stone-200 focus:border-stone-900/40 text-xs font-black font-sans rounded-xl text-stone-800"
                    >
                      {countriesList.filter(c => c !== 'Global').map(c => (
                        <option key={c} value={c}>{countriesFlags[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-stone-400 font-black uppercase tracking-wider text-[8.5px] block">Product / Advert Layout Image</label>
                  
                  {newProductImg ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 h-44 flex items-center justify-center">
                      <img 
                        src={newProductImg} 
                        alt="Product upload preview" 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label 
                          htmlFor="product-image-upload"
                          className="bg-white/95 text-stone-900 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer hover:bg-white shadow transition-all"
                        >
                          Change Photo
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewProductImg('')}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer shadow transition-all"
                        >
                          Delete
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProductImg('')}
                        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="product-image-upload"
                      className="border-2 border-dashed border-stone-200 hover:border-stone-400/80 bg-stone-50/50 hover:bg-stone-50 transition-all rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] group relative focus-within:ring-2 focus-within:ring-[#2481CC]/40"
                    >
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-lg mb-2 group-hover:scale-105 transition-transform">
                        📸
                      </div>
                      <span className="text-xs font-bold text-stone-700">
                        {isUploadingImage ? "Compressing & caching..." : "Tap to upload advert photo"}
                      </span>
                      <span className="text-[9px] text-stone-400 font-medium uppercase tracking-wider mt-1.5 leading-normal">
                        Supports JPEG, PNG. Live compressed for speed.
                      </span>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-[10px] font-black text-[#2481CC] animate-pulse tracking-widest uppercase">processing live file...</span>
                        </div>
                      )}
                    </label>
                  )}
                  
                  <input 
                    type="file" 
                    id="product-image-upload"
                    accept="image/*"
                    onChange={handleImageUploadChange}
                    className="hidden" 
                  />

                  {/* Manual fallback input for expert users */}
                  <div className="pt-2">
                    <details className="cursor-pointer select-none group">
                      <summary className="text-[9.5px] text-stone-400 font-extrabold uppercase tracking-widest hover:text-stone-600 transition-colors list-none flex items-center gap-1.5">
                        <span className="transition-transform group-open:rotate-90">▶</span>
                        Or paste direct web image URL
                      </summary>
                      <div className="mt-2 pl-3 border-l-2 border-stone-100 space-y-1">
                        <input 
                          type="url" 
                          placeholder="https://images.unsplash.com/photo-..."
                          value={newProductImg.startsWith('data:') ? '' : newProductImg}
                          onChange={(e) => setNewProductImg(e.target.value)}
                          className="w-full px-3 py-1.5 bg-stone-50 focus:bg-white border focus:border-stone-900/35 border-stone-200 rounded-xl outline-none text-[11px] font-bold text-stone-800 transition-all font-sans"
                        />
                        <span className="text-[8px] text-stone-400 font-semibold block leading-relaxed uppercase tracking-wider">Leave empty to auto-select a curated category scene.</span>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    className="flex-1 py-2.5 border border-stone-200 text-stone-500 hover:text-stone-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProduct}
                    className="flex-1 py-2.5 bg-stone-900 hover:bg-[#2481CC] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md select-none disabled:opacity-40"
                  >
                    {isCreatingProduct ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

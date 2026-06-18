import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  Filter, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  ArrowLeft, 
  Check, 
  X, 
  RotateCcw, 
  HelpCircle, 
  Send, 
  Star, 
  Package, 
  Truck, 
  CreditCard, 
  Tag, 
  BadgeCheck,
  MapPin,
  Calendar,
  AlertCircle,
  Clock,
  Camera
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'standard' | 'excoin'>('standard');

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

  // Orders Tab
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeMarketView, setActiveMarketView] = useState<'browse' | 'orders'>('browse');

  // AI Shopping Assistant chat
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: "Welcome to Exona Global Assistant! Ask me about global shipping, custom fees, product specs, or sizing guides for international products." }
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
  const categoriesList = ['All', 'Electronics', 'Fashion & Apparel', 'Beauty & Makeup', 'Books & Novels', 'Snacks & Treats', 'Crafts & Art', 'AI Models'];

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
            // Seed Firestore database with default premium catalog products
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
        return matchesCategory && matchesCountry && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;
        if (sortBy === 'reviews') return b.reviewsCount - a.reviewsCount;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedCountry, sortBy]);

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
    // Add nice commas
    const formatted = converted.toLocaleString(undefined, { 
      minimumFractionDigits: usdAmount % 1 === 0 ? 0 : 2, 
      maximumFractionDigits: 2 
    });
    return `${activeCurrency.symbol}${formatted}`;
  };

  // List dynamic new custom product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification("Security Error: Only network administrators can list new products.", "error");
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
      // Choose smart category visual photo based on keyword match
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
        rating: 5.0, // Brand new items start at pristine star count
        reviewsCount: 1,
        sellerName: userDoc?.displayName || user?.displayName || "Global Merchant",
        sellerId: user?.uid || "custom-seller",
        sellerPhoto: user?.photoURL || "",
        timestamp: new Date(),
        isCustom: true
      };

      await addDoc(collection(db, 'marketplace_products'), customProd);
      
      showNotification(`Item "${newProductName}" has been uploaded to the international marketplace!`, 'success');
      
      // Reset State
      setNewProductName('');
      setNewProductDesc('');
      setNewProductPrice('');
      setNewProductImg('');
      setIsListModalOpen(false);
    } catch (e) {
      console.error(e);
      showNotification("Error listing product in database.", "error");
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
      
      // Update inventory stock counts in background
      for (const item of cart) {
        if (!item.product.isCustom) {
          try {
            const docRef = doc(db, 'marketplace_products', item.product.id);
            await updateDoc(docRef, {
              stock: Math.max(0, item.product.stock - item.quantity)
            });
          } catch (e) {
            console.warn("Could not reduce stock count.", e);
          }
        }
      }

      setCart([]);
      setCheckoutStep(3); // Go to order success celebration
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
      // Perform dynamic prompt modeling
      const prompt = `You are the Exona World Marketplace AI Expert assistant. A user is asking about our products, global logistic pathways, shipping speeds, tax rules, or customs options. Here are our active items:\n${products.map(p => `- ${p.name} from ${p.originCountry} at $${p.price}`).join('\n')}\n\nUser Question: "${userMsg}"\nProvide a warm, premium, highly customized response addressing their specific prompt. Suggest 1 or 2 matching items from our actual active list above using bold text! Keep your response under 100 words.`;
      
      const serverRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, stream: false })
      });

      if (serverRes.ok) {
        const resJson = await serverRes.json();
        const responseText = resJson.response || resJson.text || "I found amazing international choices! We ship to multiple countries with zero duty barriers. Try adding the " + products[0]?.name + " to your cart.";
        setAiChatHistory(prev => [...prev, { role: 'ai', text: responseText }]);
      } else {
        // High fidelity simulated merchant responses
        setTimeout(() => {
          let reply = "That's an excellent query! For shipping from " + (selectedCountry !== "Global" ? selectedCountry : "our global warehouses") + ", standard delivery takes 3 to 5 business days, while supersonic drone delivery clearing customs instantly takes only 12 hours. I highly recommend looking at " + (products[1]?.name || "Exona Neural Quantum Core") + " for deep productivity!";
          if (userMsg.toLowerCase().includes('japan') || userMsg.toLowerCase().includes('bonsai')) {
            reply = "Ah, Japanese craftsmanship! The Zen Kyoto Bonsai and mini ceramic pot is hand-packed direct from Kyoto with certified organic soils. It ships under specialized botanic transport seals with zero customs delays.";
          } else if (userMsg.toLowerCase().includes('nigeria') || userMsg.toLowerCase().includes('kimono') || userMsg.toLowerCase().includes('fashion')) {
            reply = "Incredible choice! Lagos Threads handweaves the wax-print Ankaran patterns using authentic Nigerian materials. Shipping is fully insured and delivers directly via local dispatch agents.";
          }
          setAiChatHistory(prev => [...prev, { role: 'ai', text: reply }]);
        }, 1100);
      }
    } catch (err) {
      console.error("AI assistant error: ", err);
      // Fallback response
      setAiChatHistory(prev => [...prev, { role: 'ai', text: "Apologies! My neural connection is a bit slow. We offer worldwide express delivery from Osaka, Munich, London, San Francisco, and Lagos. Is there a specific regional product I can check stock counts for?" }]);
    } finally {
      setIsGeneratingAiResponse(false);
    }
  };

  return (
    <div className="w-full flex flex-col antialiased bg-slate-50 min-h-screen font-sans">
      
      {/* TEMU-STYLE PREMIUM SEARCH & NAVIGATION HEADER */}
      <div className="bg-white border-b border-gray-150 sticky top-0 z-40 shadow-xs">
        {/* Top Segment: Brand Name, Search & Navigation/Currency/Cart Actions */}
        <div className="w-full px-4 sm:px-8 max-w-none pt-3.5 pb-2.5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveMarketView('browse')}>
            <span className="text-2xl font-black tracking-tight text-[#2481CC] font-sans hover:opacity-90">Exona</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2481CC] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded select-none font-sans">MALL</span>
          </div>

          {/* Search Box: Prominently placed in between Exona Mall and navigation controls */}
          <div className="w-full md:flex-1 md:max-w-xl mx-0 md:mx-6 shrink-0 md:shrink">
            <div className="relative flex items-center bg-white border-2 border-[#2481CC] rounded-full overflow-hidden shadow-xs hover:border-[#2481CC]/80 focus-within:border-[#2481CC] group transition-all">
              <input 
                type="text" 
                placeholder="Search global items, flash deals, imported crafts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-5 pr-22 py-2 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 font-sans"
              />
              
              {/* Camera Visual Search Icon (Interactive Demo simulation) */}
              <button 
                onClick={() => {
                  showNotification("Visual image-search simulation active! Enter keywords to filter regional products.", "info");
                }}
                className="absolute right-13 text-slate-400 hover:text-[#2481CC] transition-colors p-1 flex items-center justify-center cursor-pointer"
                title="Visual Search"
              >
                <Camera size={16.5} />
              </button>

              {/* Mag Glass Search Button */}
              <button 
                className="absolute right-0 top-0 bottom-0 px-5.5 bg-[#2481CC] hover:bg-[#2481CC]/95 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <Search size={15.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0">
            {/* Store & Orders Navigation Toggle */}
            <div className="flex items-center bg-slate-100 border border-slate-200/60 p-0.5 rounded-lg font-sans">
              <button 
                onClick={() => setActiveMarketView('browse')}
                className={`px-3 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  activeMarketView === 'browse' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShoppingBag size={11.5} />
                <span>Shop</span>
              </button>
              <button 
                onClick={() => setActiveMarketView('orders')}
                className={`px-3 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 relative ${
                  activeMarketView === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Package size={11.5} />
                <span>Orders</span>
                {orders.some(o => o.status !== 'delivered') && (
                  <span className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                )}
              </button>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 transition-all text-[11px] font-semibold cursor-pointer font-sans">
              <Globe size={11} className="text-[#2481CC]" />
              <select 
                value={currencyCode} 
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="bg-transparent outline-none border-none py-0.5 text-ink cursor-pointer font-bold tracking-tight uppercase text-[10px]"
              >
                {currencyModes.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>

            {/* Sell Button */}
            {isAdmin && (
              <button
                onClick={() => setIsListModalOpen(true)}
                className="px-3 py-1.5 bg-[#2481CC] hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer font-sans"
                title="Sell on Exona"
              >
                <Plus size={12} />
                <span>Sell</span>
              </button>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-950 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm relative shrink-0 cursor-pointer font-sans"
            >
              <ShoppingCart size={13} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#2481CC] text-white text-[8px] font-bold h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Lower Segment: Navigation Category Tabs (All, Women, Men, Home, Sports...) */}
        <div className="w-full px-4 sm:px-8 max-w-none flex items-center gap-6 overflow-x-auto scrollbar-none pb-2 bg-white select-none">
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setActiveMarketView('browse');
                }}
                className="relative py-1 border-b-2 border-transparent text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 text-slate-500 hover:text-[#2481CC]"
              >
                <span className={isSelected ? 'text-[#2481CC] font-extrabold' : 'text-slate-500 hover:text-slate-900'}>{cat}</span>
                {isSelected && (
                  <motion.div layoutId="temu-nav-indicator" className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#2481CC]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* GREEN MICRO-PROMOTION BANNERS */}
      <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-100/60 py-2.5 px-4 text-[10.5px] font-bold select-none shadow-xs">
        <div className="w-full px-4 sm:px-8 max-w-none flex items-center justify-center sm:justify-start gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 hover:text-emerald-950 transition-colors">
            <Check size={12.5} className="text-emerald-600 stroke-[3]" />
            <span>Free shipping on all items</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-emerald-950 transition-colors">
            <Check size={12.5} className="text-emerald-600 stroke-[3]" />
            <span>Price adjustment within 30 days</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 hover:text-emerald-950 transition-colors">
            <Check size={12.5} className="text-emerald-600 stroke-[3]" />
            <span>100% Direct regional artisan guarantee</span>
          </div>
        </div>
      </div>

      {/* QUICK DEALS, SORTING AND SHIPPING FILTERS */}
      {activeMarketView === 'browse' && (
        <div className="w-full px-4 sm:px-8 max-w-none pt-4.5 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 overflow-x-auto scrollbar-none select-none">
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => {
                setSortBy('rating');
                setSelectedCategory('All');
                setSelectedCountry('Global');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                sortBy === 'rating' && selectedCountry === 'Global' && selectedCategory === 'All'
                  ? 'bg-red-50 text-red-600 border-red-200 shadow-xs'
                  : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              🔥 Best-Selling
            </button>
            <button
              onClick={() => {
                setSortBy('priceAsc');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                sortBy === 'priceAsc'
                  ? 'bg-red-50 text-red-600 border-red-200 shadow-xs'
                  : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              ⚡ Flash Deals
            </button>
            <button
              onClick={() => {
                setSortBy('reviews');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                sortBy === 'reviews'
                  ? 'bg-red-50 text-red-600 border-red-200 shadow-xs'
                  : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              ⭐ Top-Rated 5★
            </button>
          </div>

          {/* Regional Shipping filter pill */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3.5 py-1.5 rounded-full text-[10px] font-bold self-end sm:self-auto shrink-0 shadow-xs">
            <Globe size={11.5} className="text-red-500" />
            <span className="text-slate-400 uppercase font-black text-[9px]">Ships From:</span>
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-slate-800 font-extrabold border-none py-0 uppercase text-[10px]"
            >
              {countriesList.map(c => (
                <option key={c} value={c}>{countriesFlags[c]} {c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeMarketView === 'orders' ? (
        /* ==================== MY ORDERS HUB ==================== */
        <div className="w-full px-4 sm:px-8 max-w-none pb-24 pt-6">
          <div className="mb-6">
            <h3 className="text-xl font-black text-ink font-display uppercase tracking-tight">Active Delivery Tracking</h3>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Monitor real-time status and customs checkpoints</p>
          </div>

          {orders.length === 0 ? (
            <div className="py-20 text-center bg-white border border-gray-150 rounded-3xl flex flex-col items-center gap-4 justify-center">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                <Package size={28} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">No global orders recorded yet</h4>
                <p className="text-xs text-muted mt-1 max-w-xs mx-auto">Explore our international catalog and pick authentic creations direct to your door.</p>
              </div>
              <button 
                onClick={() => setActiveMarketView('browse')}
                className="px-5 py-2.5 bg-ink text-white text-[10px] uppercase font-black tracking-widest rounded-xl"
              >
                Go Shopping
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
                  <div key={o.id} className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm">
                    {/* Order header information */}
                    <div className="bg-slate-50 p-4.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="text-muted uppercase font-black tracking-widest text-[9.5px]">Global Tracking ID</p>
                        <p className="font-mono font-bold text-ink text-sm mt-0.5">{o.id.toUpperCase()}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-left">
                        <div>
                          <p className="text-muted uppercase font-black tracking-widest text-[9.5px]">Total Paid</p>
                          <p className="font-bold text-emerald-600 mt-0.5">{formatPrice(o.total)}</p>
                        </div>
                        <div>
                          <p className="text-muted uppercase font-black tracking-widest text-[9.5px]">Destination</p>
                          <p className="font-bold text-ink mt-0.5 truncate max-w-[150px]">{o.address}, {o.country}</p>
                        </div>
                        <div>
                          <p className="text-muted uppercase font-black tracking-widest text-[9.5px]">Status</p>
                          <span className={`inline-block px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-full mt-1 ${
                            o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {statusLabels[o.status]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress slider steps */}
                    <div className="p-6">
                      <div className="relative flex items-center justify-between w-full mb-8">
                        {/* Underline connect bar */}
                        <div className="absolute left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 top-1/2 z-0" />
                        <div 
                          className="absolute left-0 h-1 bg-[#2481CC] -translate-y-1/2 top-1/2 transition-all duration-1000 z-0"
                          style={{ width: `${((stepIdx - 1) / 4) * 100}%` }}
                        />

                        {/* Step items */}
                        {[
                          { label: 'Verified', key: 'pending', icon: CheckCircle2 },
                          { label: 'Dispatched', key: 'dispatched', icon: Truck },
                          { label: 'Customs', key: 'customs', icon: Globe },
                          { label: 'Transit', key: 'out_for_delivery', icon: MapPin },
                          { label: 'Arrived', key: 'delivered', icon: Package }
                        ].map((st, sI) => {
                          const IconS = st.icon;
                          const activeStep = sI + 1 <= stepIdx;
                          return (
                            <div key={st.label} className="relative z-10 flex flex-col items-center">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                                sI + 1 === stepIdx 
                                  ? 'bg-[#2481CC] text-white ring-4 ring-[#2481CC]/20' 
                                  : activeStep 
                                    ? 'bg-ink text-white' 
                                    : 'bg-white text-gray-300 border-2 border-slate-200'
                              }`}>
                                <IconS size={15} />
                              </div>
                              <span className={`text-[9px] uppercase font-black tracking-wider mt-2 bg-white px-1 ${
                                sI + 1 === stepIdx ? 'text-[#2481CC]' : activeStep ? 'text-ink' : 'text-slate-400'
                              }`}>
                                {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Items details nested in order */}
                      <div className="border-t border-slate-100 pt-5 mt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#2481CC] mb-3">Cart Contents</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="flex gap-3 items-center border border-slate-50 p-2.5 rounded-2xl bg-slate-50/40">
                              <img src={it.imageUrl} className="h-10 w-10 rounded-xl object-cover border border-slate-100 bg-white" />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[11px] font-bold text-ink truncate leading-snug">{it.name}</h5>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9.5px] text-emerald-600 font-bold">{formatPrice(it.price)}</span>
                                  <span className="text-[9px] text-[#2481CC] font-bold">Qty {it.quantity}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">({it.originCountry})</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Updates history log */}
                      <div className="border-t border-slate-100 pt-4.5 mt-4.5 bg-indigo-50/10 p-3.5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> Dynamic Delivery Timeline Logs
                        </p>
                        <div className="mt-2 space-y-2">
                          {o.trackingUpdates?.map((u, ui) => (
                            <div key={ui} className="text-xs text-left">
                              <span className="font-mono font-bold text-slate-400 text-[10px]">{u.time}</span>
                              <span className="mx-2 text-[#2481CC]">•</span>
                              <span className="text-ink font-semibold">{u.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== BROWSE/EXPLORE CATALOG ==================== */
        <div className="w-full px-4 sm:px-8 max-w-none pb-24 pt-4">
          
          {isLoadingProducts ? (
            <div className="py-24 text-center">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-red-600 animate-pulse">Syncing International Inventories...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center bg-white border border-gray-150 rounded-3xl px-6 max-w-lg mx-auto shadow-sm">
              <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                <AlertCircle size={22} />
              </div>
              <h4 className="text-xs font-black text-ink uppercase tracking-wide">No local or custom matches found</h4>
              <p className="text-[11px] text-muted max-w-sm mx-auto leading-relaxed mt-1 font-semibold uppercase tracking-wider">Try resetting filters, or listing your own product item above.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCountry('Global');
                }}
                className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* ULTRA PREMIUM 2-COLUMN GRID (ADAPTIVE TO 3/4/5 COLUMNS ON DESKTOP) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4.5">
              {filteredProducts.map((p) => {
                const isBestRanking = p.rating >= 4.7;
                // Formulate simulated dynamic high conversion values
                const salesAmt = Math.floor(((p.reviewsCount * 7.7) + 3)) + "K+";
                const discountPct = 30 + (Math.floor(p.price) % 40);
                const originalPrice = p.price * (1 + (discountPct / 100));

                return (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedDetailedProduct(p)}
                    className="border border-gray-150/60 cursor-pointer hover:shadow-md transition-all flex flex-col group relative"
                    style={{ backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}
                  >
                    {/* Image Area with glassmorphic origin country tag */}
                    <div className="relative aspect-square w-full bg-slate-100 overflow-hidden shrink-0">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-104 select-none"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Flag Origin Glass Badge */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center bg-black/45 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full shadow-sm gap-1">
                        <span>{p.countryFlag}</span>
                        <span>{p.originCountry}</span>
                      </div>

                      {p.stock <= 3 && p.stock > 0 && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded-md">
                          Only {p.stock} left!
                        </div>
                      )}
                    </div>

                    {/* Details content matching structure of Temu/Amazon screenshot */}
                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between min-h-0 space-y-2">
                      <div className="space-y-1.5">
                        
                        {/* Deals and Sales Badges */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="bg-orange-50 text-orange-600 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border border-orange-100/50">
                            🏷️ Sale
                          </span>
                          {isBestRanking && (
                            <span className="bg-red-50 text-red-600 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border border-red-100/50">
                              ⚡ Deal
                            </span>
                          )}
                        </div>

                        {/* Best Selling dynamic placement */}
                        {p.featured ? (
                          <div className="text-[9.5px] font-black text-red-600 uppercase tracking-tight truncate">
                            🔥 #1 BEST-SELLING ITEM | Last 6 months
                          </div>
                        ) : (
                          <div className="text-[9.5px] font-black text-amber-600 uppercase tracking-tight truncate">
                            🔥 #4 BEST-SELLING ITEM | Last 6 months
                          </div>
                        )}

                        {/* Product Name */}
                        <h4 className="text-[11.5px] font-bold text-slate-800 leading-snug line-clamp-2 pr-1 font-sans group-hover:text-red-600 transition-colors">
                          {p.name}
                        </h4>

                        {/* Brief Specs Description preview */}
                        <p className="text-[10px] text-slate-400 line-clamp-1 leading-normal font-medium select-none">
                          {p.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-50">
                        {/* Rating, Star Seller Badge, and Quantity Sold count */}
                        <div className="flex items-center flex-wrap justify-between gap-1">
                          <div className="flex items-center gap-0.5 text-[10.5px]">
                            <Star size={11} className="fill-amber-400 text-amber-500 shrink-0" />
                            <span className="font-extrabold text-slate-800 text-[11px] ml-0.5">{p.rating.toFixed(1)}</span>
                            <span className="ml-1 bg-purple-50 text-purple-700 text-[8.5px] font-black tracking-wider px-1.5 py-0.5 rounded border border-purple-100 uppercase">
                              ★ Star seller
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-extrabold flex items-center gap-0.5">
                            🔥 {salesAmt} sold
                          </div>
                        </div>

                        {/* Price strip and Checkout shopping cart icon */}
                        <div 
                          className="flex pt-1" 
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}
                        >
                          <div className="flex items-baseline flex-wrap">
                            <span style={{ color: '#fa6400', fontWeight: 'bold', fontSize: 15 }}>
                              {formatPrice(p.price)}
                            </span>
                            <span style={{ color: '#999', textDecorationLine: 'line-through', fontSize: 11, marginLeft: 4 }}>
                              {formatPrice(originalPrice)}
                            </span>
                          </div>

                          {/* Round outline dark shopping cart button */}
                          <button
                            disabled={p.stock === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            className="hover:border-red-600 hover:bg-rose-50 hover:text-red-600 active:scale-95 disabled:bg-slate-50 disabled:border-slate-150 disabled:text-slate-400 flex items-center justify-center transition-all bg-white shadow-xs shrink-0 cursor-pointer"
                            style={{ borderWidth: 1, borderColor: '#333', borderRadius: 50, padding: 6 }}
                            title="Add item to checkout"
                          >
                            <ShoppingCart size={13.5} className="shrink-0 text-[#333] hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==================== 1. AI FLOATING ASSISTANT OVERLAY ==================== */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
        
        <AnimatePresence>
          {isAiAssistantOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white border border-gray-200/90 rounded-[2rem] w-80 sm:w-96 shadow-2xl overflow-hidden mb-3.5 flex flex-col h-[420px] no-print"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#2481CC] to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-300 animate-spin" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider leading-none">Exona Mall Smart-Bot</h4>
                    <span className="text-[8px] text-white/80 font-bold uppercase tracking-widest mt-0.5 block">Dynamic Global Customs Expert</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiAssistantOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat timeline message stack */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {aiChatHistory.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[1.25rem] px-3.5 py-2.5 text-xs font-sans ${
                      m.role === 'user' 
                        ? 'bg-[#2481CC] text-white rounded-tr-none' 
                        : 'bg-white text-ink border border-gray-150 rounded-tl-none leading-relaxed'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isGeneratingAiResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-150 rounded-[1.25rem] rounded-tl-none px-3.5 py-2.5 text-xs text-muted font-bold animate-pulse">
                      Analyzing shipping maps...
                    </div>
                  </div>
                )}
              </div>

              {/* Footer input bars */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                className="p-3 border-t border-gray-150 bg-white flex items-center gap-2"
              >
                <input 
                  type="text" 
                  placeholder="Ask and compare international items..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  disabled={isGeneratingAiResponse}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-[#2481CC]"
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isGeneratingAiResponse}
                  className="bg-ink hover:bg-[#2481CC] disabled:bg-slate-200 text-white h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsAiAssistantOpen(prev => !prev)}
          className="h-12 w-12 rounded-full bg-ink text-white hover:bg-[#2481CC] flex items-center justify-center transition-all duration-300 shadow-xl border-2 border-white scale-100 active:scale-95 group relative"
        >
          {isAiAssistantOpen ? (
            <X size={18} />
          ) : (
            <>
              <HelpCircle size={18} />
              <span className="absolute -top-1 -right-1 bg-red-500 h-2 w-2 rounded-full animate-ping" />
            </>
          )}
        </button>
      </div>

      {/* ==================== 2. SELLER LISTING FORM MODAL (SELL ON EXONA) ==================== */}
      <AnimatePresence>
        {isListModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 p-6 border-b border-gray-150 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-ink font-display uppercase tracking-tight">List International Product</h3>
                  <p className="text-[10px] text-muted font-bold mt-1 uppercase tracking-widest leading-none">Create a verified listing on the Exona world marketplace</p>
                </div>
                <button 
                  onClick={() => setIsListModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-ink transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Product Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kyoto Zen Bonsai Care Kit"
                      value={newProductName}
                      required
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Base Price (USD $)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      placeholder="35.00"
                      required
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                    />
                  </div>

                  {/* Stock */}
                  <div className="space-y-1.5">
                    <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Stock Inventory Units</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="10"
                      value={newProductStock}
                      required
                      onChange={(e) => setNewProductStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                    />
                  </div>

                  {/* Category select */}
                  <div className="space-y-1.5">
                    <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Category Category</label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-ink cursor-pointer"
                    >
                      {categoriesList.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Country Origin Select */}
                  <div className="space-y-1.5">
                    <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Export Country Origin</label>
                    <select
                      value={newProductCountry}
                      onChange={(e) => setNewProductCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-ink cursor-pointer"
                    >
                      {countriesList.filter(c => c !== 'Global').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Image URL link */}
                <div className="space-y-1.5">
                  <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Photo Visual URL (Optional)</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/... or leave blank for category visual"
                    value={newProductImg}
                    onChange={(e) => setNewProductImg(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                  />
                </div>

                {/* Short description */}
                <div className="space-y-1.5">
                  <label className="text-muted font-black uppercase tracking-wider text-[9.5px]">Detailed Specifications & Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide specific details, materials, and dispatch weights to attract premium customers..."
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                  />
                </div>

                {/* Buttons controls */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:text-ink hover:bg-slate-50 text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProduct}
                    className="flex-1 py-3 bg-ink hover:bg-[#2481CC] hover:scale-102 active:scale-98 disabled:bg-slate-250 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isCreatingProduct ? 'Registering...' : 'Publish Listing'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 3. PRODUCT DETAIL INTERMEDIARY MODAL ==================== */}
      <AnimatePresence>
        {selectedDetailedProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Image Left Col (Desktop) */}
              <div className="relative h-56 md:h-auto md:w-5/12 shrink-0 bg-slate-100">
                <img 
                  src={selectedDetailedProduct.imageUrl} 
                  alt={selectedDetailedProduct.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide flex items-center gap-1">
                  <span>{selectedDetailedProduct.countryFlag}</span>
                  <span>{selectedDetailedProduct.originCountry}</span>
                </div>
              </div>

              {/* Specs detailed right area */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between overflow-y-auto min-h-0">
                
                <div className="space-y-4">
                  {/* Category and close */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2481CC]">{selectedDetailedProduct.category}</span>
                    <button 
                      onClick={() => setSelectedDetailedProduct(null)}
                      className="p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-ink transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <h3 className="text-lg font-black text-ink leading-snug font-sans">{selectedDetailedProduct.name}</h3>
                  
                  {/* Merchant badge */}
                  <div className="flex items-center gap-2 bg-indigo-50/20 p-2 rounded-xl border border-indigo-100/50">
                    <BadgeCheck size={14} className="text-[#2481CC]" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      Seller: <span className="text-ink font-bold">{selectedDetailedProduct.sellerName}</span>
                    </span>
                  </div>

                  {/* Main specs text */}
                  <div className="space-y-2 text-xs leading-relaxed text-slate-600">
                    <p>{selectedDetailedProduct.description}</p>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide gap-y-1 grid grid-cols-2">
                      <div>Stock Units: <span className="text-ink font-bold">{selectedDetailedProduct.stock}</span></div>
                      <div>Reviews Count: <span className="text-ink font-bold">{selectedDetailedProduct.reviewsCount}</span></div>
                      <div>Rating average: <span className="text-ink font-bold">⭐ {selectedDetailedProduct.rating.toFixed(1)} / 5</span></div>
                      <div>Port Security: <span className="text-emerald-600 font-bold">Customs Bonded</span></div>
                    </div>
                  </div>
                </div>

                {/* Confirm buy strip */}
                <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider leading-none">Net Total</span>
                      <span className="text-lg font-black text-ink mt-1 leading-none">{formatPrice(selectedDetailedProduct.price)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteProduct(selectedDetailedProduct.id, selectedDetailedProduct.name)}
                          className="h-11 px-4 border-2 border-red-500 text-red-500 hover:bg-red-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer font-sans"
                          title="Delete Product"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                      
                      <button
                        disabled={selectedDetailedProduct.stock === 0}
                        onClick={() => {
                          addToCart(selectedDetailedProduct);
                          setSelectedDetailedProduct(null);
                        }}
                        className="h-11 px-6 bg-ink hover:bg-[#2481CC] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 cursor-pointer font-sans"
                      >
                        <ShoppingCart size={14} /> Add inside Cart
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 4. INTEGRATED RIGHT CART BAR ==================== */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex justify-end no-print">
            
            {/* Overlay click shield tracker */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCartOpen(false)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-white w-full max-w-md h-full relative z-10 flex flex-col shadow-2xl"
            >
              
              {/* Header */}
              <div className="bg-slate-50 p-5 border-b border-gray-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[#2481CC]" />
                  <h4 className="text-base font-black uppercase tracking-tight text-ink font-display">International Shopping Cart</h4>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-ink transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {cart.length === 0 ? (
                  <div className="py-24 text-center text-muted text-xs space-y-3">
                    <div className="h-12 w-12 rounded-full border border-slate-250 bg-white flex items-center justify-center text-slate-350 mx-auto">
                      <ShoppingBag size={20} />
                    </div>
                    <p className="font-bold uppercase tracking-wider text-slate-400">Your shopping cart is empty</p>
                    <p className="text-[10px] font-medium max-w-xs mx-auto">Click Buy on any product listed across our global regions to start filling your order.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="bg-white border border-gray-150 p-3 rounded-2xl flex gap-3 shadow-xs">
                      <img src={item.product.imageUrl} className="h-12 w-12 rounded-xl object-cover shrink-0 select-none bg-slate-100" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-[11.5px] font-bold text-ink leading-tight truncate">{item.product.name}</h5>
                            <button 
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-350 hover:text-red-500 p-0.5 shrink-0 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <span className="text-[9px] text-[#2481CC] font-bold uppercase tracking-wider">{item.product.countryFlag} {item.product.originCountry}</span>
                        </div>

                        {/* Qty selectors */}
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-50">
                          <span className="text-xs font-black text-emerald-600 font-sans">{formatPrice(item.product.price * item.quantity)}</span>
                          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                            <button onClick={() => updateCartQty(item.product.id, -1)} className="text-slate-500 font-black">-</button>
                            <span className="text-[11px] font-black text-ink">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, 1)} className="text-slate-500 font-black">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal strip */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-gray-150 shrink-0 space-y-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="font-bold text-ink">{formatPrice(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supra Port Duties:</span>
                      <span className="text-emerald-600 font-black">FREE ($0.00)</span>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                    <span className="font-black uppercase tracking-wider text-slate-800">Est. Subtotal</span>
                    <span className="text-base font-black text-emerald-600">{formatPrice(cartSubtotal)}</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                      setCheckoutStep(1);
                    }}
                    className="w-full py-3 bg-ink hover:bg-[#2481CC] text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Order Wizard</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 5. CHECKOUT STEPPER/WIZARD MODAL ==================== */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Steps Progress top status strip */}
              <div className="bg-slate-50 py-4.5 px-6 border-b border-slate-100 flex items-center justify-between text-xs font-black uppercase tracking-widest text-[#2481CC]">
                <span>Secured Customs Routing</span>
                <span className="text-[10px] text-muted font-bold">Step {checkoutStep} of 3</span>
              </div>

              {/* Steps visualization dots/lines */}
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-around">
                {[
                  { n: 1, label: 'Customs Node' },
                  { n: 2, label: 'Escrow Bill' },
                  { n: 3, label: 'Success Receipt' }
                ].map((st) => (
                  <div key={st.n} className="flex items-center gap-1.5">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      checkoutStep === st.n 
                        ? 'bg-[#2481CC] text-white scale-110 shadow-sm' 
                        : checkoutStep > st.n 
                          ? 'bg-ink text-white' 
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {checkoutStep > st.n ? '✓' : st.n}
                    </div>
                    <span className={`text-[9.5px] uppercase font-black tracking-wider ${
                      checkoutStep === st.n ? 'text-ink' : 'text-slate-450'
                    }`}>{st.label}</span>
                  </div>
                ))}
              </div>

              {/* Wizard Content Pages */}
              <div className="p-6 font-sans text-xs">
                {checkoutStep === 1 && (
                  /* STEP 1: SHIPPING ADDRESS */
                  <div className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-muted font-black uppercase tracking-wider text-[9px]">Select Delivery Country</label>
                      <select
                        value={shippingCountry}
                        onChange={(e) => setShippingCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-ink cursor-pointer"
                      >
                        {countriesList.filter(c => c !== 'Global').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-muted font-black uppercase tracking-wider text-[9px]">Full Shipping Coordinates / Street Address</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 54 Science Park, Oxford, OX4 4GA"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-muted font-black uppercase tracking-wider text-[9px]">Postal Logistic Pathways</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { key: 'standard', title: 'Standard', desc: 'Ships 3-5 days', cost: 4.99 },
                          { key: 'express', title: 'Express Express', desc: 'Secure air inside 2 days', cost: 14.99 },
                          { key: 'supersonic', title: 'Supersonic Jet', desc: 'Clears customs in 12h', cost: 49.99 }
                        ].map((sh) => (
                          <div
                            key={sh.key}
                            onClick={() => setShippingSpeed(sh.key as any)}
                            className={`p-3 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none ${
                              shippingSpeed === sh.key 
                                ? 'border-[#2481CC] bg-[#2481CC]/5 shadow-sm scale-102 font-bold' 
                                : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="text-[10px] uppercase font-black text-ink">{sh.title}</p>
                              <p className="text-[8.5px] text-muted mt-0.5 font-bold leading-normal">{sh.desc}</p>
                            </div>
                            <p className="text-[10px] text-[#2481CC] font-black mt-2 bg-white border border-slate-100 py-0.5 px-2 rounded-md self-start text-center">{sh.cost === 0 ? 'FREE' : `$${sh.cost}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(false)}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:text-ink text-[10.5px] font-black uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!shippingAddress.trim()) {
                            showNotification("Please provide a valid delivery address.", "error");
                            return;
                          }
                          setCheckoutStep(2);
                        }}
                        className="flex-1 py-3 bg-ink hover:bg-[#2481CC] text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                      >
                        <span>Payment Node</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 2 && (
                  /* STEP 2: PAYMENT INFO */
                  <div className="space-y-4">
                    <p className="text-slate-500 leading-relaxed font-semibold uppercase tracking-wide text-center">Confirm transaction escrow distribution details of Exona exchange.</p>
                    
                    {/* Invoice detail */}
                    <div className="bg-slate-50 p-4 border border-slate-150 rounded-2.5rem space-y-2 text-slate-500 font-bold">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="text-ink">{formatPrice(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customs Escrow Charge:</span>
                        <span className="text-emerald-600">FREE ($0.00)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Courier Transport:</span>
                        <span className="text-ink">${shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 flex justify-between text-[#2481CC] text-sm">
                        <span className="font-black uppercase tracking-wider">Estimated Total</span>
                        <span className="font-black text-sm">{formatPrice(cartTotal)}</span>
                      </div>
                    </div>

                    {/* Payment Mechanism Selection */}
                    <div className="space-y-2 text-left">
                      <label className="text-muted font-black uppercase tracking-wider text-[9px]">Select Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          onClick={() => setCheckoutPaymentMethod('standard')}
                          className={`p-3 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none ${
                            checkoutPaymentMethod === 'standard' 
                              ? 'border-[#2481CC] bg-[#2481CC]/5 font-bold shadow-xs scale-102' 
                              : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-black text-ink">Global Escrow</p>
                            <p className="text-[8px] text-muted mt-0.5 leading-normal">Card / Multi-currency</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => setCheckoutPaymentMethod('excoin')}
                          className={`p-3 border rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none ${
                            checkoutPaymentMethod === 'excoin' 
                              ? 'border-[#2481CC] bg-[#2481CC]/5 font-bold shadow-xs scale-102' 
                              : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-black text-ink flex items-center gap-1">
                              <span className="text-[#2481CC]">🪙</span> Exona Coin (EXC)
                            </p>
                            <p className="text-[8px] text-muted mt-0.5 leading-normal">Rate: 2.5 EXC = $1 USD</p>
                          </div>
                        </div>
                      </div>

                      {checkoutPaymentMethod === 'excoin' && (
                        <div className="bg-indigo-50/45 border border-indigo-150/40 p-3 rounded-xl flex items-center justify-between font-sans text-[10px] mt-1.5 text-slate-650">
                          <div>
                            <p className="font-bold">Total in Excoins: <span className="text-[#2481CC] font-black">{Math.ceil(cartTotal * 2.5)} EXC</span></p>
                            <p className="text-[8.5px] text-muted mt-0.5 font-semibold">Your Wallet Balance: <span className="font-bold text-ink">{excoinBalance} EXC</span></p>
                          </div>
                          {excoinBalance >= Math.ceil(cartTotal * 2.5) ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md">Funds Available</span>
                          ) : (
                            <span className="bg-red-100 text-red-850 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md font-sans">Insufficient EXC</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-muted font-black uppercase tracking-wider text-[9px]">Custom notes or invoice requirements</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Leave package by the botanical greenhouse door."
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/40 border border-slate-200 focus:bg-white focus:border-[#2481CC]/40 rounded-xl outline-none transition-all font-bold text-ink"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(1)}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:text-ink text-[10.5px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
                      >
                        <ArrowLeft size={13} /> Back
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingOrder}
                        onClick={handlePlaceOrder}
                        className="flex-1 py-3 bg-ink hover:bg-[#2481CC] hover:scale-102 active:scale-98 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest disabled:bg-slate-200 flex items-center justify-center gap-1.5"
                      >
                        <CreditCard size={13} />
                        <span>{isProcessingOrder ? 'Escrowing...' : 'Escrow Payment'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 3 && (
                  /* STEP 3: SUCCESS CELEBRATION */
                  <div className="space-y-4 text-center py-6">
                    <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border-2 border-emerald-100 shadow-md">
                      <Check size={32} />
                    </div>
                    <div>
                      <h4 className="text-base font-black uppercase tracking-tight text-ink font-sans">Clearing customs in regional node!</h4>
                      <p className="text-xs text-muted leading-relaxed mt-2 max-w-xs mx-auto font-medium">Your international payment escrow has been established successfully. We are preparing cargo tags!</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left space-y-1 max-w-sm mx-auto">
                      <p className="text-[9.5px] uppercase font-black tracking-wider text-[#2481CC]">Recipient Route:</p>
                      <p className="text-[10px] text-ink font-bold">{shippingAddress}, {shippingCountry}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Free Delivery Cargo System Assigned.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCheckoutOpen(false);
                          setActiveMarketView('orders');
                        }}
                        className="w-full py-3 bg-ink hover:bg-[#2481CC] text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest transition-all shadow-md focus:outline-none"
                      >
                        Configure Delivery Tracking
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

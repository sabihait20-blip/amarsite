import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "./services/firebase";
import { collection, onSnapshot, addDoc, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "firebase/firestore";
import { 
  Home, 
  Users, 
  Store, 
  Tv, 
  Bell, 
  MessageCircle, 
  Search, 
  Menu, 
  MoreHorizontal, 
  ThumbsUp, 
  Share2, 
  Image as ImageIcon, 
  Video, 
  Smile,
  Globe,
  Plus,
  Compass,
  Gamepad2,
  Flag,
  Calendar,
  Clock,
  ChevronDown,
  Loader2,
  Send,
  Camera,
  Edit2,
  Trash2,
  Lock,
  LogOut,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  User,
  X,
  ShieldCheck,
  LayoutGrid,
  Bookmark,
  Info,
  Github,
  Twitter,
  Linkedin,
  Cake,
  Phone,
  User2,
  Wallet
} from "lucide-react";
import Markdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAi, Message } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: number;
}

interface Post extends Message {
  id: string;
  author: {
    name: string;
    avatar: string;
    isAI: boolean;
  };
  likes: number;
  isLiked: boolean;
  likedBy: string[];
  comments: Comment[];
  image?: string;
  link?: string;
}

interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  cover: string;
  bio: string;
  location: string;
  work: string;
  education: string;
  contact: string;
  gender: string;
  birthday: string;
  relationship: string;
  pin: string;
  walletBalance: number;
}

import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [view, setView] = useState<'feed' | 'profile'>('feed');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    name: "",
    bio: "",
    avatar: ""
  });

  const initialProfile: UserProfile = {
    name: "জন ডো",
    username: "johndoe",
    avatar: "https://picsum.photos/seed/user/200/200",
    cover: "https://picsum.photos/seed/cover/1200/400",
    bio: "এআই উৎসাহী এবং ওয়েব ডেভেলপার। কোডিংয়ের মাধ্যমেই জীবনকে উপভোগ করছি।",
    location: "ঢাকা, বাংলাদেশ",
    work: "সফটওয়্যার ইঞ্জিনিয়ার, Amarsite",
    education: "কম্পিউটার সায়েন্সে পড়াশোনা করেছেন",
    contact: "01700000000",
    gender: "পুরুষ",
    birthday: "১৯৯৫-০১-০১",
    relationship: "সিঙ্গেল",
    pin: "1234",
    walletBalance: 0
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : initialProfile;
  });

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState(false);
  const [cashOutMethod, setCashOutMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [cashOutPhone, setCashOutPhone] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);
  const [input, setInput] = useState("");
  const [postImage, setPostImage] = useState("");
  const [postLink, setPostLink] = useState("");
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signupAvatarInputRef = useRef<HTMLInputElement>(null);

  const uploadToImgBB = (file: File, onProgress?: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const apiKey = (import.meta as any).env.VITE_IMGBB_API_KEY || (process as any).env.VITE_IMGBB_API_KEY || "37989c1c8e6e427f184e6ef0775fbead";
      if (!apiKey) {
        reject(new Error("ImgBB API Key পাওয়া যায়নি। দয়া করে .env ফাইলে VITE_IMGBB_API_KEY সেট করুন।"));
        return;
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("image", file);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.data.url);
          } else {
            reject(new Error(data.error.message || "আপলোড ব্যর্থ হয়েছে"));
          }
        } catch (err) {
          reject(new Error("সার্ভার থেকে ভুল রেসপন্স এসেছে"));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("নেটওয়ার্ক এরর হয়েছে")));
      xhr.open("POST", `https://api.imgbb.com/1/upload?key=${apiKey}`);
      xhr.send(formData);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSignup: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAvatarUploading(true);
    setUploadProgress(0);
    try {
      const imageUrl = await uploadToImgBB(file, (percent) => setUploadProgress(percent));
      if (isSignup) {
        setAuthForm(prev => ({ ...prev, avatar: imageUrl }));
      } else {
        setUserProfile(prev => ({ ...prev, avatar: imageUrl }));
      }
      alert("ছবি সফলভাবে আপলোড করা হয়েছে!");
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "ছবি আপলোড করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsAvatarUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPostImage(true);
    setUploadProgress(0);
    try {
      const imageUrl = await uploadToImgBB(file, (percent) => setUploadProgress(percent));
      setPostImage(imageUrl);
    } catch (error: any) {
      console.error("Post image upload error:", error);
      alert(error.message || "ছবি আপলোড করতে সমস্যা হয়েছে।");
    } finally {
      setIsUploadingPostImage(false);
      setUploadProgress(0);
    }
  };

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");

  const handlePost = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userPost = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
      author: {
        name: userProfile.name,
        avatar: userProfile.avatar,
        isAI: false,
      },
      likes: 0,
      isLiked: false,
      likedBy: [],
      comments: [],
      image: postImage || null,
      link: postLink || null,
    };

    try {
      if (db) {
        await addDoc(collection(db, "posts"), userPost);
      } else {
        const localPost = { ...userPost, id: Math.random().toString(36).substr(2, 9) } as Post;
        setPosts(prev => [localPost, ...prev]);
      }
      
      setUserProfile((prev) => ({ ...prev, walletBalance: prev.walletBalance + 0.10 }));
      setInput("");
      setPostImage("");
      setPostLink("");
      setShowLinkInput(false);
      
      // Don't await the AI part to keep UI responsive
      (async () => {
        try {
          const chat = getAi().chats.create({
            model: "gemini-3.1-pro-preview",
            config: {
              systemInstruction: "আপনি Amarsite AI। আপনি ব্যবহারকারীদের সাথে বন্ধুত্বপূর্ণ এবং কমিউনিটি-ভিত্তিক উপায়ে কথা বলেন। আপনার উত্তরগুলো সোশ্যাল মিডিয়া পোস্টের মতো হওয়া উচিত। ফরম্যাটিংয়ের জন্য মার্কডাউন ব্যবহার করুন। অবশ্যই বাংলা ভাষায় উত্তর দেবেন। আপনি ব্যবহারকারীর পোস্টের সাথে সম্পর্কিত বাংলাদেশের জাতীয় পত্রিকার নিউজ এবং অরিজিনাল নিউজের লিঙ্ক প্রদান করবেন।",
            },
          });

          const response = await chat.sendMessage({ message: userPost.content });
          
          const aiPost = {
            role: "model",
            content: response.text || "দুঃখিত, আমি কোনো উত্তর তৈরি করতে পারিনি।",
            timestamp: Date.now() + 1000,
            author: {
              name: "Amarsite AI",
              avatar: "https://picsum.photos/seed/gemini/100/100",
              isAI: true,
            },
            likes: Math.floor(Math.random() * 100),
            isLiked: false,
            likedBy: [],
            comments: [],
          };
          
          if (db) {
            await addDoc(collection(db, "posts"), aiPost);
          } else {
            const localAiPost = { ...aiPost, id: Math.random().toString(36).substr(2, 9) } as Post;
            setPosts(prev => [localAiPost, ...prev].sort((a, b) => b.timestamp - a.timestamp));
          }
        } catch (error) {
          console.error("Chat error:", error);
        }
      })();
    } catch (error) {
      console.error("Post error:", error);
      alert("পোস্ট করতে সমস্যা হয়েছে। দয়া করে ফায়ারবেস কনফিগারেশন চেক করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!isLoggedIn) return;
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(userProfile.name);
    
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    const newLikedBy = isLiked 
      ? likedBy.filter(name => name !== userProfile.name)
      : [...likedBy, userProfile.name];

    if (db) {
      try {
        const postRef = doc(db, "posts", post.id);
        await updateDoc(postRef, {
          likes: newLikes,
          likedBy: newLikedBy
        });
      } catch (error) {
        console.error("Like error:", error);
      }
    } else {
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, likes: newLikes, likedBy: newLikedBy }
          : p
      ));
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!content.trim()) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      author: userProfile.name,
      avatar: userProfile.avatar,
      content: content.trim(),
      timestamp: Date.now()
    };
    
    if (db) {
      try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
          comments: arrayUnion(newComment)
        });
      } catch (error) {
        console.error("Comment error:", error);
      }
    } else {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, comments: [...(p.comments || []), newComment] }
          : p
      ));
    }

    // AI Reply System
    const post = posts.find(p => p.id === postId);
    if (post && post.author.isAI) {
      // Generate AI reply
      (async () => {
        try {
          const chat = getAi().chats.create({
            model: "gemini-3.1-pro-preview",
            config: {
              systemInstruction: "আপনি Amarsite AI। আপনি ব্যবহারকারীর কমেন্টের প্রেক্ষিতে একটি বন্ধুত্বপূর্ণ এবং প্রাসঙ্গিক রিপ্লাই দেবেন। আপনার রিপ্লাইটি ছোট এবং সোশ্যাল মিডিয়া কমেন্টের মতো হওয়া উচিত। অবশ্যই বাংলা ভাষায় উত্তর দেবেন।",
            },
          });
          const response = await chat.sendMessage({ message: `ব্যবহারকারী কমেন্ট করেছেন: "${content}"। আপনার আগের পোস্টটি ছিল: "${post.content}"। দয়া করে এই কমেন্টের একটি রিপ্লাই দিন।` });
          
          const aiReply: Comment = {
            id: Math.random().toString(36).substr(2, 9),
            author: "Amarsite AI",
            avatar: "https://picsum.photos/seed/gemini/100/100",
            content: response.text || "ধন্যবাদ আপনার মন্তব্যের জন্য!",
            timestamp: Date.now()
          };
          
          if (db) {
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, {
              comments: arrayUnion(aiReply)
            });
          } else {
            setPosts(prev => prev.map(p => 
              p.id === postId 
                ? { ...p, comments: [...(p.comments || []), aiReply] }
                : p
            ));
          }
        } catch (error) {
          console.error("AI Reply error:", error);
        }
      })();
    }
  };

  const handleShare = (post: Post) => {
    const shareText = `Amarsite-এ এই পোস্টটি দেখুন: ${post.content.substring(0, 50)}...`;
    if (navigator.share) {
      navigator.share({
        title: 'Amarsite পোস্ট',
        text: shareText,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`অন্যান্য সোশ্যাল মিডিয়ায় শেয়ার করা হয়েছে: ${shareText}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("আপনি কি নিশ্চিত যে আপনি এই পোস্টটি মুছে ফেলতে চান?")) {
      if (db) {
        try {
          await deleteDoc(doc(db, "posts", postId));
        } catch (error) {
          console.error("Delete error:", error);
        }
      } else {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editContent.trim()) return;
    
    if (db) {
      try {
        const postRef = doc(db, "posts", editingPost.id);
        await updateDoc(postRef, { content: editContent });
      } catch (error) {
        console.error("Update error:", error);
      }
    } else {
      setPosts(prev => prev.map(p => 
        p.id === editingPost.id 
          ? { ...p, content: editContent }
          : p
      ));
    }
    setEditingPost(null);
    setEditContent("");
  };

  const handleResetPin = () => {
    if (pinInput === userProfile.pin) {
      setUserProfile(prev => ({ ...prev, pin: newPin }));
      setIsPinModalOpen(false);
      setPinInput("");
      setNewPin("");
      setPinError("");
      alert("পিন সফলভাবে রিসেট করা হয়েছে!");
    } else {
      setPinError("বর্তমান পিনটি ভুল।");
    }
  };

  const handleProfileClick = (author: any) => {
    if (!isLoggedIn) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    if (author.name === userProfile.name) {
      setSelectedUser(null);
      setView('profile');
    } else {
      setSelectedUser({
        name: author.name,
        username: author.name.toLowerCase().replace(/\s/g, ''),
        avatar: author.avatar,
        cover: "https://picsum.photos/seed/cover/1200/400",
        bio: "আমি এই প্ল্যাটফর্মে নতুন।",
        location: "অজানা",
        work: "অজানা",
        education: "অজানা",
        contact: "অজানা",
        gender: "অজানা",
        birthday: "অজানা",
        relationship: "অজানা",
        pin: "0000",
        walletBalance: 0
      });
      setView('profile');
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { day: 'numeric', month: 'long' });

  const displayProfile = selectedUser || userProfile;
  const isOwnProfile = !selectedUser || selectedUser.name === userProfile.name;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--color-navy-deep)] font-sans text-[var(--color-text-main)]">
        {/* Unique Header */}
      <header className="h-20 bg-[var(--color-navy-light)] border-b border-white/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md">
        {/* 1. Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div 
            onClick={() => setView('feed')}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [0.5, 1.2, 1],
              opacity: 1,
              boxShadow: [
                "0 0 0px rgba(100,255,218,0)",
                "0 0 30px rgba(100,255,218,0.6)",
                "0 0 20px rgba(100,255,218,0.3)"
              ]
            }}
            transition={{ 
              duration: 1.5,
              times: [0, 0.7, 1],
              ease: "easeOut"
            }}
            whileHover={{ 
              scale: 1.1,
              filter: "brightness(1.2)",
              transition: { duration: 0.3 }
            }}
            className="w-10 h-10 md:w-12 md:h-12 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-[var(--color-navy-deep)] font-black text-xl md:text-2xl cursor-pointer relative overflow-hidden group"
          >
            {/* Netflix-style streak effect */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ 
                repeat: Infinity, 
                duration: 2, 
                ease: "linear",
                repeatDelay: 3
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
            />
            <span className="relative z-10">A</span>
          </motion.div>
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-lg md:text-xl font-black tracking-[0.2em] text-white hidden sm:block"
          >
            AMARSITE
          </motion.span>
        </div>

        {/* 2. Time, Date, Month Name (Middle) */}
        <div className="flex flex-col items-center">
          <div className="text-[var(--color-accent)] font-mono text-sm md:text-xl font-medium tracking-widest">
            {formattedTime}
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] font-semibold">
            {formattedDate}
          </div>
        </div>

        {/* 3. Auth Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {!isLoggedIn ? (
            <button 
              onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
              className="bg-[var(--color-accent)] text-[var(--color-navy-deep)] px-5 py-2 rounded-lg font-bold text-xs md:text-sm hover:opacity-90 transition-all shadow-lg"
            >
              লগইন
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setView('profile')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <img src={userProfile.avatar} className="w-8 h-8 rounded-lg object-cover border border-white/10 group-hover:border-[var(--color-accent)]/50 transition-all" />
                <span className="text-white font-medium text-sm hidden md:block">{userProfile.name}</span>
              </div>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="p-2 text-[var(--color-text-dim)] hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {view === 'feed' ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 md:gap-8 p-4 md:p-8">
          {/* Main Content Area */}
          <main className="space-y-6 md:space-y-8">
            {/* Insight Input */}
            {isLoggedIn ? (
              <div className="glass-card rounded-3xl p-4 md:p-6 space-y-4 border-l-4 border-l-[var(--color-accent)]">
                <div className="flex items-center gap-3 mb-2">
                  <img src={userProfile.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-white/10" />
                  <span className="font-semibold text-white text-sm md:text-base">নতুন পোস্ট</span>
                </div>
                <textarea
                  id="post-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="আপনার চিন্তাগুলো নেটওয়ার্কের সাথে শেয়ার করুন..."
                  className="w-full bg-black/20 rounded-2xl p-4 md:p-5 focus:outline-none min-h-[100px] md:min-h-[120px] resize-none border border-white/5 focus:border-[var(--color-accent)]/30 transition-all text-base md:text-lg"
                />

                {postImage && (
                  <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border border-white/10 group">
                    <img src={postImage} className="w-full h-auto object-cover" />
                    <button 
                      onClick={() => setPostImage("")}
                      className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isUploadingPostImage && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest">
                      <span>আপলোড হচ্ছে...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]"
                      />
                    </div>
                  </div>
                )}

                {showLinkInput && (
                  <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/5">
                    <Globe className="w-4 h-4 text-[var(--color-accent)]" />
                    <input 
                      type="url"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                      placeholder="লিঙ্ক যোগ করুন (https://...)"
                      className="bg-transparent flex-1 focus:outline-none text-sm text-white"
                    />
                    <button onClick={() => { setShowLinkInput(false); setPostLink(""); }}>
                      <X className="w-4 h-4 text-[var(--color-text-dim)]" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-3 md:gap-4">
                    <input 
                      type="file" 
                      ref={postImageInputRef}
                      onChange={handlePostImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button 
                      onClick={() => postImageInputRef.current?.click()}
                      disabled={isUploadingPostImage}
                      className={cn(
                        "text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors relative",
                        postImage && "text-[var(--color-accent)]"
                      )}
                    >
                      {isUploadingPostImage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button 
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className={cn(
                        "text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors",
                        (showLinkInput || postLink) && "text-[var(--color-accent)]"
                      )}
                    >
                      <Globe className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "px-6 md:px-10 py-2 md:py-3 rounded-xl font-bold transition-all shadow-xl text-sm md:text-base",
                      input.trim() && !isLoading 
                        ? "bg-[var(--color-accent)] text-[var(--color-navy-deep)] hover:scale-105" 
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "পোস্ট করুন"}
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                className="glass-card rounded-3xl p-8 text-center border-2 border-dashed border-white/10 hover:border-[var(--color-accent)]/30 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Amarsite নেটওয়ার্কে যোগ দিন</h3>
                <p className="text-[var(--color-text-dim)]">আপনার চিন্তাগুলো সবার সাথে শেয়ার করতে এবং কমিউনিটির সাথে যুক্ত হতে লগইন করুন।</p>
              </div>
            )}

            {/* Feed Nodes */}
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onLike={() => {
                    if (!isLoggedIn) {
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                      return;
                    }
                    handleLike(post);
                  }} 
                  onComment={(content) => {
                    if (!isLoggedIn) {
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                      return;
                    }
                    handleComment(post.id, content);
                  }}
                  onShare={() => handleShare(post)}
                  onDelete={() => handleDeletePost(post.id)}
                  onEdit={() => {
                    setEditingPost(post);
                    setEditContent(post.content);
                  }}
                  onProfileClick={() => handleProfileClick(post.author)}
                  userAvatar={userProfile.avatar}
                  isAuthor={isLoggedIn && post.author.name === userProfile.name}
                  currentUserName={userProfile.name}
                />
              ))}
            </div>
          </main>

          {/* Right Sidebar - Network Stats & Trends */}
          <aside className="hidden lg:block space-y-6 sticky top-28 h-fit">
            <div className="glass-card p-6 rounded-3xl">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--color-accent)]" />
                নেটওয়ার্ক ট্রেন্ডস
              </h3>
              <div className="space-y-4">
                {['#কোয়ান্টামকম্পিউটিং', '#এথারনোডস', '#ভবিষ্যতেরওয়েব', '#নিউরোলজিক্যালসিঙ্ক'].map((tag, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="text-[var(--color-accent)] font-mono text-sm">{tag}</div>
                    <div className="text-[var(--color-text-dim)] text-xs">{(Math.random() * 10).toFixed(1)}k পোস্ট</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl">
              <h3 className="text-white font-bold text-lg mb-4">সক্রিয় মেম্বার</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative">
                      <img src={`https://picsum.photos/seed/node${i}/100/100`} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-navy-light)]"></div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">গবেষক_{i}01</div>
                      <div className="text-[var(--color-text-dim)] text-xs">সিঙ্ক হচ্ছে...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* Profile View - Professional & Unique Layout */
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          {/* Header Section */}
          <div className="glass-card rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/10">
            <div className="h-56 md:h-80 bg-[var(--color-navy-deep)] relative overflow-hidden">
              <img src={displayProfile.cover} className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy-light)] via-[var(--color-navy-light)]/40 to-transparent"></div>
              
              {/* Decorative Elements */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>
            
            <div className="px-6 md:px-16 pb-10 md:pb-16 relative -mt-20 md:-mt-32">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">
                <div className="relative group">
                  <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] md:rounded-[3rem] border-8 border-[var(--color-navy-light)] overflow-hidden bg-[var(--color-navy-deep)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                    <img src={displayProfile.avatar} className={cn("w-full h-full object-cover", isAvatarUploading && "opacity-50 grayscale")} />
                    {isAvatarUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20">
                        <Loader2 className="w-10 h-10 text-[var(--color-accent)] animate-spin mb-3" />
                        <span className="text-sm font-black text-white tracking-widest">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isAvatarUploading}
                    className="absolute -bottom-3 -right-3 bg-[var(--color-accent)] p-3 md:p-4 rounded-2xl md:rounded-3xl text-[var(--color-navy-deep)] shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 disabled:opacity-50"
                  >
                    <Camera className="w-6 h-6 md:w-7 md:h-7" />
                  </button>
                </div>
                
                <div className="flex-1 text-center md:text-left pb-2">
                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 mb-2">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{displayProfile.name}</h1>
                    <div className="flex items-center gap-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(0,255,242,0.1)]">
                      <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
                      ভেরিফাইড মেম্বার
                    </div>
                  </div>
                  <div className="text-[var(--color-accent)] font-bold mb-4 tracking-widest uppercase text-xs opacity-70">@{displayProfile.username}</div>
                  <p className="text-[var(--color-text-dim)] text-lg md:text-xl font-medium italic serif max-w-2xl leading-relaxed opacity-80">
                    "{displayProfile.bio}"
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-0">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("প্রোফাইল লিঙ্ক কপি করা হয়েছে!");
                    }}
                    className="bg-white/5 hover:bg-white/10 text-white p-3 md:p-4 rounded-2xl md:rounded-3xl font-black transition-all border border-white/10 shadow-xl"
                    title="প্রোফাইল শেয়ার করুন"
                  >
                    <Share2 className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  {isOwnProfile && (
                    <>
                      <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="bg-white/5 hover:bg-[var(--color-accent)] hover:text-[var(--color-navy-deep)] text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black flex items-center gap-3 transition-all border border-white/10 hover:border-transparent group shadow-xl"
                      >
                        <Edit2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                        <span>এডিট প্রোফাইল</span>
                      </button>
                      <button 
                        onClick={() => setIsPinModalOpen(true)}
                        className="bg-white/5 hover:bg-white/10 text-white p-3 md:p-4 rounded-2xl md:rounded-3xl font-black transition-all border border-white/10 shadow-xl"
                        title="সিকিউরিটি সেটিংস"
                      >
                        <Lock className="w-5 h-5 text-[var(--color-accent)]" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Left Column - Stats & Info */}
            <div className="lg:col-span-4 space-y-6 md:space-y-8">
              {/* Stats Bento Box */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors border border-white/5">
                  <div className="text-3xl md:text-4xl font-black text-white mb-1 group-hover:scale-110 transition-transform">{posts.filter(p => p.author.name === displayProfile.name).length}</div>
                  <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest opacity-60">পোস্টসমূহ</div>
                </div>
                <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors border border-white/5">
                  <div className="text-3xl md:text-4xl font-black text-white mb-1 group-hover:scale-110 transition-transform">1.2k</div>
                  <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest opacity-60">ফলোয়ার্স</div>
                </div>
                <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors border border-white/5 col-span-2">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl md:text-4xl font-black text-white group-hover:scale-110 transition-transform">842</div>
                    <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest opacity-60 text-left">ফলোয়িং<br/>নেটওয়ার্ক</div>
                  </div>
                </div>
              </div>

              {/* Info Bento Box */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-white tracking-tight">ব্যক্তিগত তথ্য</h2>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Info className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">কর্মক্ষেত্র</div>
                      <div className="text-white font-bold">{displayProfile.work}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">শিক্ষা</div>
                      <div className="text-white font-bold">{displayProfile.education}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">অবস্থান</div>
                      <div className="text-white font-bold">{displayProfile.location}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <User2 className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">জেন্ডার</div>
                      <div className="text-white font-bold">{displayProfile.gender}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Cake className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">বার্থডে</div>
                      <div className="text-white font-bold">{displayProfile.birthday}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Heart className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">সম্পর্ক</div>
                      <div className="text-white font-bold">{displayProfile.relationship}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Phone className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-1 opacity-50">যোগাযোগ</div>
                      <div className="text-white font-bold">{displayProfile.contact}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex justify-center gap-4">
                    {[Globe, Github, Twitter, Linkedin].map((Icon, i) => (
                      <button key={i} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-[var(--color-accent)]/20 text-white hover:text-[var(--color-accent)] transition-all flex items-center justify-center border border-white/5">
                        <Icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wallet Dashboard */}
              {isOwnProfile && (
                <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white tracking-tight">ওয়ালেট ড্যাশবোর্ড</h2>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                  </div>
                  <div className="bg-[var(--color-navy-deep)] p-6 rounded-[2rem] border border-white/5 text-center">
                    <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-2 opacity-50">বর্তমান ব্যালেন্স</div>
                    <div className="text-4xl md:text-5xl font-black text-white mb-4">৳{userProfile.walletBalance.toFixed(2)}</div>
                    <p className="text-xs text-[var(--color-text-dim)] mb-6">প্রতিটি পোস্টের জন্য ৳০.১০ যোগ হচ্ছে</p>
                    
                    <button 
                      onClick={() => setIsCashOutModalOpen(true)}
                      disabled={userProfile.walletBalance < 100}
                      className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-navy-deep)] py-3 rounded-2xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ক্যাশ আউট করুন
                    </button>
                    {userProfile.walletBalance < 100 && (
                      <p className="text-[10px] text-red-400 mt-3 font-bold">ক্যাশ আউট করতে ন্যূনতম ৳১০০ প্রয়োজন</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Feed */}
            <div className="lg:col-span-8 space-y-8">
              {/* Tab Navigation */}
              <div className="glass-card p-2 rounded-[2rem] border border-white/5 flex gap-2">
                {[
                  { label: 'পোস্টসমূহ', key: 'posts', icon: <LayoutGrid className="w-4 h-4" /> },
                  { label: 'মিডিয়া', key: 'media', icon: <ImageIcon className="w-4 h-4" /> },
                  { label: 'সংরক্ষিত', key: 'saved', icon: <Bookmark className="w-4 h-4" /> }
                ].map((tab, i) => (
                  <button 
                    key={i} 
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black transition-all text-sm uppercase tracking-widest",
                      i === 0 
                        ? "bg-[var(--color-accent)] text-[var(--color-navy-deep)] shadow-[0_10px_20px_rgba(0,255,242,0.2)]" 
                        : "text-[var(--color-text-dim)] hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Post Feed */}
              <div className="space-y-6">
                {posts.filter(p => p.author.name === displayProfile.name).length > 0 ? (
                  posts.filter(p => p.author.name === displayProfile.name).map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onLike={() => handleLike(post)} 
                      onComment={(content) => handleComment(post.id, content)}
                      onShare={() => handleShare(post)}
                      onDelete={() => handleDeletePost(post.id)}
                      onEdit={() => {
                        setEditingPost(post);
                        setEditContent(post.content);
                      }}
                      onProfileClick={() => handleProfileClick(post.author)}
                      userAvatar={userProfile.avatar}
                      isAuthor={isOwnProfile}
                      currentUserName={userProfile.name}
                    />
                  ))
                ) : (
                  <div className="glass-card p-16 rounded-[3rem] text-center border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <LayoutGrid className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">কোনো পোস্ট পাওয়া যায়নি</h3>
                    <p className="text-[var(--color-text-dim)]">আপনার প্রথম ট্রান্সমিশন শেয়ার করুন!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-md p-8 rounded-[2.5rem] border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent"></div>
              
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-6 right-6 text-[var(--color-text-dim)] hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {authMode === 'login' ? <Lock className="w-8 h-8 text-[var(--color-accent)]" /> : 
                   authMode === 'signup' ? <Users className="w-8 h-8 text-[var(--color-accent)]" /> : 
                   <Clock className="w-8 h-8 text-[var(--color-accent)]" />}
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {authMode === 'login' ? 'আবার স্বাগতম' : 
                   authMode === 'signup' ? 'নতুন অ্যাকাউন্ট' : 
                   'অ্যাক্সেস রিসেট'}
                </h2>
                <p className="text-[var(--color-text-dim)] text-sm mt-2">
                  {authMode === 'login' ? 'Amarsite নেটওয়ার্কের সাথে যুক্ত হন' : 
                   authMode === 'signup' ? 'আমাদের কমিউনিটিতে যোগ দিন' : 
                   'আপনার অ্যাকাউন্টের তথ্য পুনরুদ্ধার করুন'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (authMode === 'signup') {
                  setUserProfile(prev => ({
                    ...prev,
                    name: authForm.name || prev.name,
                    bio: authForm.bio || prev.bio,
                    avatar: authForm.avatar || prev.avatar
                  }));
                }
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
              }}>
                {authMode === 'signup' && (
                  <>
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 overflow-hidden bg-white/5 flex items-center justify-center relative">
                          {authForm.avatar ? (
                            <img src={authForm.avatar} className={cn("w-full h-full object-cover", isAvatarUploading && "opacity-50 grayscale")} />
                          ) : (
                            <User className="w-10 h-10 text-white/20" />
                          )}
                          {isAvatarUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                              <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin mb-2" />
                              <span className="text-[10px] font-bold text-white">{uploadProgress}%</span>
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={signupAvatarInputRef}
                          onChange={(e) => handleAvatarUpload(e, true)}
                          accept="image/*"
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => signupAvatarInputRef.current?.click()}
                          disabled={isAvatarUploading}
                          className="absolute -bottom-2 -right-2 bg-[var(--color-accent)] p-2 rounded-lg text-[var(--color-navy-deep)] shadow-xl hover:scale-110 transition-transform disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[var(--color-text-dim)] text-[10px] mt-2 uppercase tracking-widest font-bold">প্রোফাইল ছবি আপলোড করুন</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest ml-1">পুরো নাম</label>
                      <input 
                        type="text" 
                        required
                        value={authForm.name}
                        onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                        placeholder="উদাঃ জন ডো"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest ml-1">সংক্ষিপ্ত পরিচিতি</label>
                      <input 
                        type="text" 
                        value={authForm.bio}
                        onChange={(e) => setAuthForm({...authForm, bio: e.target.value})}
                        placeholder="আপনার সম্পর্কে কিছু বলুন"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest ml-1">ইমেইল ঠিকানা</label>
                  <input 
                    type="email" 
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    placeholder="example@amarsite.net"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                  />
                </div>

                {authMode !== 'forgot' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                    <input 
                      type="password" 
                      required
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                    />
                  </div>
                )}

                {authMode === 'login' && (
                  <div className="text-right">
                    <button 
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      অ্যাক্সেস কি ভুলে গেছেন?
                    </button>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-[var(--color-accent)] text-[var(--color-navy-deep)] py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(100,255,218,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  {authMode === 'login' ? 'লগইন করুন' : 
                   authMode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 
                   'রিসেট লিংক পাঠান'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-[var(--color-text-dim)] text-sm">
                  {authMode === 'login' ? "আপনি কি নতুন?" : 
                   authMode === 'signup' ? "আগে থেকেই অ্যাকাউন্ট আছে?" : 
                   "পাসওয়ার্ড মনে পড়েছে?"}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="ml-2 text-[var(--color-accent)] font-bold hover:underline"
                  >
                    {authMode === 'login' ? 'সাইন আপ' : 'লগইন'}
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-2xl rounded-[2.5rem] border-white/10 overflow-hidden relative"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h2 className="text-2xl font-black text-white tracking-tight">প্রোফাইল এডিট করুন</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Profile Photo Section */}
                <div className="space-y-4">
                  <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">প্রোফাইল ছবি</label>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[var(--color-accent)]/30 bg-white/5">
                        <img src={userProfile.avatar} className={cn("w-full h-full object-cover", isAvatarUploading && "opacity-50")} />
                        {isAvatarUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 bg-[var(--color-accent)] p-2 rounded-lg text-[var(--color-navy-deep)] shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <input 
                        type="text" 
                        value={userProfile.avatar} 
                        onChange={(e) => setUserProfile(prev => ({ ...prev, avatar: e.target.value }))}
                        className="w-full bg-white/5 p-3 rounded-xl text-sm border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                        placeholder="ছবির URL দিন"
                      />
                      <p className="text-[10px] text-[var(--color-text-dim)] italic">ডিভাইস থেকে আপলোড করতে ক্যামের আইকনে ক্লিক করুন অথবা সরাসরি URL দিন।</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">পুরো নাম</label>
                    <input 
                      type="text" 
                      value={userProfile.name} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                      placeholder="আপনার নাম লিখুন"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">ইউজার নাম</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)] font-bold">@</span>
                      <input 
                        type="text" 
                        value={userProfile.username} 
                        onChange={(e) => setUserProfile(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full bg-white/5 p-4 pl-8 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">কন্টাক্ট ইনফো</label>
                    <input 
                      type="text" 
                      value={userProfile.contact} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, contact: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                      placeholder="ফোন বা ইমেইল"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">জেন্ডার</label>
                    <select 
                      value={userProfile.gender} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all appearance-none"
                    >
                      <option value="পুরুষ" className="bg-[var(--color-navy-deep)]">পুরুষ</option>
                      <option value="মহিলা" className="bg-[var(--color-navy-deep)]">মহিলা</option>
                      <option value="অন্যান্য" className="bg-[var(--color-navy-deep)]">অন্যান্য</option>
                    </select>
                  </div>

                  {/* Birthday */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">বার্থডে</label>
                    <input 
                      type="date" 
                      value={userProfile.birthday} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, birthday: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                    />
                  </div>

                  {/* Relationship Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">রিলেশনশীপ স্ট্যাটাস</label>
                    <select 
                      value={userProfile.relationship} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, relationship: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all appearance-none"
                    >
                      <option value="সিঙ্গেল" className="bg-[var(--color-navy-deep)]">সিঙ্গেল</option>
                      <option value="রিলেশনশীপ" className="bg-[var(--color-navy-deep)]">রিলেশনশীপ</option>
                      <option value="বিবাহিত" className="bg-[var(--color-navy-deep)]">বিবাহিত</option>
                      <option value="জটিল" className="bg-[var(--color-navy-deep)]">জটিল</option>
                    </select>
                  </div>

                  {/* Work */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">ওয়ার্ক</label>
                    <input 
                      type="text" 
                      value={userProfile.work} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, work: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                      placeholder="কোথায় কাজ করেন?"
                    />
                  </div>

                  {/* Education */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">এডুকেশন</label>
                    <input 
                      type="text" 
                      value={userProfile.education} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, education: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                      placeholder="কোথায় পড়াশোনা করেছেন?"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">প্লেস ইন লিভ (ঠিকানা)</label>
                    <input 
                      type="text" 
                      value={userProfile.location} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all"
                      placeholder="আপনার বর্তমান শহর"
                    />
                  </div>

                  {/* Bio / About You */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-black text-[var(--color-accent)] uppercase tracking-widest">এবাউট ইউ (বায়ো)</label>
                    <textarea 
                      value={userProfile.bio} 
                      onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-[var(--color-accent)]/50 outline-none transition-all min-h-[120px] resize-none"
                      placeholder="নিজের সম্পর্কে কিছু লিখুন..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 flex justify-end bg-white/5">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-[var(--color-accent)] text-[var(--color-navy-deep)] px-10 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,255,242,0.2)]"
                >
                  পরিবর্তনগুলো সেভ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Reset Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-xl fb-shadow overflow-hidden border border-zinc-200"
            >
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">সিকিউরিটি পিন রিসেট করুন</h2>
                <button onClick={() => setIsPinModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block font-semibold text-sm">বর্তমান পিন</label>
                  <input 
                    type="password" 
                    value={pinInput} 
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full bg-zinc-100 p-3 rounded-lg border border-zinc-200"
                    placeholder="বর্তমান পিন দিন"
                  />
                  {pinError && <p className="text-red-500 text-xs">{pinError}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block font-semibold text-sm">নতুন পিন</label>
                  <input 
                    type="password" 
                    value={newPin} 
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-zinc-100 p-3 rounded-lg border border-zinc-200"
                    placeholder="নতুন পিন দিন"
                  />
                </div>
                <p className="text-xs text-zinc-500 italic">
                  টিপ: ডিফল্ট পিন হলো "1234"
                </p>
              </div>
              <div className="p-4 border-t border-zinc-200 flex gap-2">
                <button 
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 bg-zinc-100 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleResetPin}
                  className="flex-1 bg-[#1877F2] text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  পিন আপডেট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cash Out Modal */}
      <AnimatePresence>
        {isCashOutModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-8 rounded-[2.5rem] border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">ক্যাশ আউট রিকোয়েস্ট</h2>
                <button onClick={() => setIsCashOutModalOpen(false)} className="text-[var(--color-text-dim)] hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-sm text-[var(--color-text-dim)] mb-1">উত্তোলনযোগ্য ব্যালেন্স</div>
                  <div className="text-3xl font-black text-[var(--color-accent)]">৳{userProfile.walletBalance.toFixed(2)}</div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white">পেমেন্ট মেথড নির্বাচন করুন</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['bkash', 'nagad', 'rocket'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setCashOutMethod(method as any)}
                        className={cn(
                          "py-3 rounded-xl font-bold text-sm transition-all border",
                          cashOutMethod === method 
                            ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-[var(--color-accent)]" 
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        )}
                      >
                        {method === 'bkash' ? 'বিকাশ' : method === 'nagad' ? 'নগদ' : 'রকেট'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white">অ্যাকাউন্ট নাম্বার</label>
                  <input 
                    type="tel" 
                    value={cashOutPhone}
                    onChange={(e) => setCashOutPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <button 
                  onClick={() => {
                    if (!cashOutPhone || cashOutPhone.length < 11) {
                      alert("সঠিক মোবাইল নাম্বার দিন।");
                      return;
                    }
                    alert(`আপনার ৳${userProfile.walletBalance.toFixed(2)} ক্যাশ আউট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে। 24 ঘন্টার মধ্যে আপনার ${cashOutMethod === 'bkash' ? 'বিকাশ' : cashOutMethod === 'nagad' ? 'নগদ' : 'রকেট'} নাম্বারে টাকা পৌঁছে যাবে।`);
                    setUserProfile(prev => ({ ...prev, walletBalance: 0 }));
                    setIsCashOutModalOpen(false);
                    setCashOutPhone("");
                  }}
                  disabled={!cashOutPhone || userProfile.walletBalance < 100}
                  className="w-full bg-[var(--color-accent)] text-[var(--color-navy-deep)] py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  রিকোয়েস্ট সাবমিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-2xl p-8 rounded-[2.5rem] border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">পোস্ট এডিট করুন</h2>
                <button onClick={() => setEditingPost(null)} className="text-[var(--color-text-dim)] hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all resize-none"
                  placeholder="আপনার পোস্টটি এডিট করুন..."
                />
                <div className="flex gap-4">
                  <button 
                    onClick={() => setEditingPost(null)}
                    className="flex-1 bg-white/5 text-white py-4 rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={handleUpdatePost}
                    className="flex-1 bg-[var(--color-accent)] text-[var(--color-navy-deep)] py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
                  >
                    আপডেট করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </ErrorBoundary>
  );
}

function PostCard({ post, onLike, onComment, onShare, onDelete, onEdit, onProfileClick, userAvatar, isAuthor, currentUserName }: { 
  post: Post, 
  onLike: () => void, 
  onComment: (content: string) => void,
  onShare: () => void,
  onDelete: () => void,
  onEdit: () => void,
  onProfileClick: () => void,
  userAvatar: string,
  isAuthor: boolean,
  currentUserName: string
}) {
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const isLiked = post.likedBy && post.likedBy.includes(currentUserName);

  return (
    <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden border-white/5 hover:border-[var(--color-accent)]/20 transition-all group">
      <div className="p-4 md:p-6 flex items-center justify-between">
        <div className="flex gap-3 md:gap-4">
          <img src={post.author.avatar} onClick={onProfileClick} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover border border-white/10 cursor-pointer" />
          <div>
            <div className="flex items-center gap-2">
              <span onClick={onProfileClick} className="font-bold text-white hover:text-[var(--color-accent)] cursor-pointer transition-colors text-sm md:text-base">{post.author.name}</span>
              {post.author.isAI && (
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">এআই</div>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-[var(--color-text-dim)] font-mono">
              <span>{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[var(--color-accent)] opacity-30">•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        
        {isAuthor && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/5 rounded-xl text-[var(--color-text-dim)] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-40 glass-card rounded-xl border-white/10 shadow-2xl z-20 overflow-hidden"
                  >
                    <button 
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-[var(--color-accent)]" />
                      এডিট করুন
                    </button>
                    <button 
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      মুছে ফেলুন
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6">
        <div className="markdown-body text-base md:text-lg leading-relaxed">
          <Markdown>{post.content}</Markdown>
        </div>
        
        {post.link && (
          <a 
            href={post.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all text-sm font-bold w-fit"
          >
            <Globe className="w-4 h-4" />
            লিঙ্ক দেখুন
          </a>
        )}
      </div>

      {post.image && (
        <div className="bg-black/40 flex items-center justify-center overflow-hidden border-y border-white/5">
          <img 
            src={post.image} 
            className="w-full h-auto max-h-[600px] object-contain opacity-90 group-hover:scale-105 transition-transform duration-700" 
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {post.author.isAI && !post.image && (
        <div className="h-[250px] md:h-[400px] bg-black/40 flex items-center justify-center overflow-hidden border-y border-white/5">
          <img src={`https://picsum.photos/seed/${post.id}/800/600`} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
        </div>
      )}

      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between text-[var(--color-text-dim)] text-xs md:text-sm border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex -space-x-1.5 md:-space-x-2">
            <div className="w-5 h-5 md:w-6 md:h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center border-2 border-[var(--color-navy-light)]">
              <ThumbsUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-[var(--color-navy-deep)] fill-[var(--color-navy-deep)]" />
            </div>
            <div className="w-5 h-5 md:w-6 md:h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-[var(--color-navy-light)]">
              <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-white fill-white" />
            </div>
          </div>
          <span className="font-mono">{post.likes} লাইক</span>
        </div>
        <div className="flex gap-3 md:gap-4 font-mono text-[10px] md:text-xs">
          <button onClick={() => setShowComments(!showComments)} className="hover:text-[var(--color-accent)] transition-colors">
            {post.comments.length} কমেন্ট
          </button>
          <span className="hidden xs:inline">{Math.floor(post.likes / 5)} শেয়ার</span>
        </div>
      </div>

      <div className="px-2 md:px-4 py-1.5 md:py-2 flex items-center justify-around bg-black/20">
        <FeedAction 
          active={isLiked}
          onClick={onLike}
          icon={<ThumbsUp className={cn("w-4 h-4 md:w-5 md:h-5", isLiked && "text-[var(--color-accent)] fill-[var(--color-accent)]")} />} 
          label="লাইক" 
        />
        <FeedAction 
          onClick={() => setShowComments(!showComments)}
          icon={<MessageCircle className="w-4 h-4 md:w-5 md:h-5" />} 
          label="কমেন্ট" 
        />
        <FeedAction onClick={onShare} icon={<Share2 className="w-4 h-4 md:w-5 md:h-5" />} label="শেয়ার" />
      </div>

      {showComments && (
        <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-6 bg-black/10">
          <div className="space-y-4">
            {post.comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <img src={comment.avatar} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                <div className="bg-white/5 p-3 px-4 rounded-2xl max-w-[90%] border border-white/5">
                  <div className="font-bold text-xs text-[var(--color-accent)] mb-1">{comment.author}</div>
                  <div className="text-sm text-[var(--color-text-main)]">{comment.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <img src={userAvatar} className="w-8 h-8 rounded-lg object-cover" />
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onComment(commentInput);
                    setCommentInput("");
                  }
                }}
                placeholder="আলোচনায় যোগ দিন..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
              />
              <button 
                onClick={() => {
                  onComment(commentInput);
                  setCommentInput("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-accent)] hover:scale-110 transition-transform"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
);
}
function FeedAction({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all font-bold text-sm",
        active ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10" : "text-[var(--color-text-dim)] hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span className="hidden xs:inline">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group text-left"
    >
      <div className="group-hover:scale-110 transition-transform">{icon}</div>
      <span className="font-bold text-[var(--color-text-main)] group-hover:text-white">{label}</span>
    </button>
  );
}

function PostAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition-all text-sm font-bold text-[var(--color-text-dim)]">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function IntroItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--color-text-main)]">
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { 
  Home, 
  Wallet, 
  MessageSquare, 
  User, 
  PlusCircle, 
  LogOut, 
  LogIn, 
  TrendingUp, 
  Search, 
  Bell, 
  Image as ImageIcon, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  X,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Bot
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateAIPost } from "./services/gemini";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Comment {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  text: string;
  timestamp: number;
  replies: Comment[];
}

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    isAI?: boolean;
  };
  content: string;
  image?: string;
  likes: number;
  isLiked?: boolean;
  comments: Comment[];
  timestamp: number;
}

interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  walletBalance: number;
  isLoggedIn: boolean;
  isVerified?: boolean;
  followersCount: number;
  followingCount: number;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  participant: {
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  lastMessage: string;
  timestamp: number;
  messages: Message[];
}

// --- Mock Data (Fallback) ---
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    author: {
      name: "AI Assistant",
      username: "ai_bot",
      avatar: "https://picsum.photos/seed/bot/100/100",
      isAI: true
    },
    content: "স্বাগতম Amarsite-এ! এখানে আপনি আপনার চিন্তা শেয়ার করে আয় করতে পারেন। প্রতি পোস্টে পাবেন ০.১০ টাকা। 🚀",
    likes: 42,
    isLiked: false,
    comments: [
      {
        id: "c1",
        author: {
          name: "Admin",
          username: "admin",
          avatar: "https://picsum.photos/seed/admin/100/100"
        },
        text: "চমৎকার উদ্যোগ! অনেক ধন্যবাদ।",
        timestamp: Date.now() - 1800000,
        replies: []
      }
    ],
    timestamp: Date.now() - 3600000
  }
];

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<"feed" | "wallet" | "messages" | "profile">("feed");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("amarsite_user");
    return saved ? JSON.parse(saved) : {
      name: "Guest User",
      username: "guest",
      avatar: "https://picsum.photos/seed/guest/100/100",
      walletBalance: 0,
      isLoggedIn: false,
      followersCount: 0,
      followingCount: 0
    };
  });
  const [authInputs, setAuthInputs] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set(["ai_bot"]));
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: "s1",
      participant: {
        name: "AI Assistant",
        username: "ai_bot",
        avatar: "https://picsum.photos/seed/bot/100/100",
        isVerified: true
      },
      lastMessage: "আপনার আয়ের খবর কি?",
      timestamp: Date.now() - 3600000,
      messages: [
        { id: "m1", sender: "ai_bot", text: "হ্যালো! কেমন আছেন?", timestamp: Date.now() - 7200000 },
        { id: "m2", sender: "rahat", text: "ভালো আছি, আপনি?", timestamp: Date.now() - 5400000 },
        { id: "m3", sender: "ai_bot", text: "আপনার আয়ের খবর কি?", timestamp: Date.now() - 3600000 }
      ]
    }
  ]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState({ name: "", avatar: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; type: "post"; author: string; postId: string; timestamp: number; read: boolean }[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem("amarsite_user", JSON.stringify(user));
  }, [user]);

  // --- Fetch Posts ---
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuth = async () => {
    if (authMode === "register" && (!authInputs.name || !authInputs.username)) {
      alert("দয়া করে সব তথ্য পূরণ করুন।");
      return;
    }
    if (!authInputs.email || !authInputs.password) {
      alert("ইমেইল এবং পাসওয়ার্ড প্রয়োজন।");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authInputs)
      });
      const data = await res.json();
      
      if (data.success) {
        const userData = {
          name: data.user.name,
          username: data.user.username,
          avatar: data.user.avatar,
          walletBalance: data.user.wallet_balance,
          isLoggedIn: true,
          followersCount: data.user.followers_count,
          followingCount: data.user.following_count,
          isVerified: !!data.user.is_verified
        };
        setUser(userData);
        setIsAuthModalOpen(false);
        setAuthInputs({ name: "", username: "", email: "", password: "" });
        if (authMode === "register") {
          alert("নিবন্ধন সফল হয়েছে! স্বাগতম Amarsite-এ।");
        }
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে আপনি লগ আউট করতে চান?")) {
      const guestUser = {
        name: "Guest User",
        username: "guest",
        avatar: "https://picsum.photos/seed/guest/100/100",
        walletBalance: 0,
        isLoggedIn: false,
        followersCount: 0,
        followingCount: 0
      };
      setUser(guestUser);
      localStorage.removeItem("amarsite_user");
      setActiveTab("feed");
    }
  };

  const handleWithdraw = () => {
    if (user.walletBalance < 100) return;
    
    setIsLoading(true);
    setTimeout(() => {
      alert(`আপনার ৳${user.walletBalance.toFixed(2)} উইথড্র রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে। ২৪ ঘণ্টার মধ্যে পেমেন্ট পাবেন।`);
      setUser(prev => ({ ...prev, walletBalance: 0 }));
      setIsLoading(false);
    }, 15000);
  };

  const handlePost = async () => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }
    if (!postContent.trim() && !postImage) return;
    
    setIsLoading(true);
    try {
      if (editingPost) {
        // Edit logic could be added here
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: postContent, image: postImage || p.image } : p));
        setEditingPost(null);
      } else {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            author_username: user.username,
            content: postContent,
            image: postImage
          })
        });
        const data = await res.json();
        if (data.success) {
          await fetchPosts();
          setUser(prev => ({ ...prev, walletBalance: prev.walletBalance + 0.10 }));
        }
      }
      setPostContent("");
      setPostImage(null);
      setIsPostModalOpen(false);
    } catch (err) {
      alert("Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm("আপনি কি নিশ্চিত যে আপনি এই পোস্টটি ডিলিট করতে চান?")) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  const openEditPost = (post: Post) => {
    setEditingPost(post);
    setPostContent(post.content);
    setPostImage(post.image || null);
    setIsPostModalOpen(true);
  };

  const handleUpdateProfile = () => {
    setUser(prev => ({ ...prev, name: editProfileData.name, avatar: editProfileData.avatar }));
    setIsProfileModalOpen(false);
  };

  const openEditProfile = () => {
    setEditProfileData({ name: user.name, avatar: user.avatar });
    setIsProfileModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerAIPost = async () => {
    setIsLoading(true);
    const content = await generateAIPost();
    if (content) {
      const aiPost: Post = {
        id: Date.now().toString(),
        author: {
          name: "AI Assistant",
          username: "ai_bot",
          avatar: "https://picsum.photos/seed/bot/100/100",
          isAI: true
        },
        content,
        likes: 0,
        isLiked: false,
        comments: [],
        timestamp: Date.now()
      };
      setPosts([aiPost, ...posts]);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: "post",
        author: "AI Assistant",
        postId: aiPost.id,
        timestamp: Date.now(),
        read: false
      }, ...prev]);
    }
    setIsLoading(false);
  };

  const handleLike = (postId: string) => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = !post.isLiked;
        
        // Reward author if liked
        if (isLiked && post.author.username !== user.username) {
          // In a real app, this would be a server-side update for the author
          // Here we just simulate it if it's the current user's post
          if (post.author.username === user.username) {
             setUser(u => ({ ...u, walletBalance: u.walletBalance + 0.01 }));
          }
        }

        return {
          ...post,
          isLiked,
          likes: isLiked ? post.likes + 1 : post.likes - 1
        };
      }
      return post;
    }));
  };

  const handleFollow = (username: string) => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }
    setFollowingUsers(prev => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const handleSendMessage = () => {
    if (!activeChatId || !messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: user.username,
      text: messageInput,
      timestamp: Date.now()
    };

    setChatSessions(prev => prev.map(session => {
      if (session.id === activeChatId) {
        return {
          ...session,
          lastMessage: messageInput,
          timestamp: Date.now(),
          messages: [...session.messages, newMessage]
        };
      }
      return session;
    }));
    setMessageInput("");

    // Simulate AI reply if chatting with bot
    const session = chatSessions.find(s => s.id === activeChatId);
    if (session?.participant.username === "ai_bot") {
      setTimeout(async () => {
        const aiReply = await generateAIPost(`Reply to this message: "${messageInput}"`);
        if (aiReply) {
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: "ai_bot",
            text: aiReply,
            timestamp: Date.now()
          };
          setChatSessions(p => p.map(s => s.id === activeChatId ? { ...s, lastMessage: aiReply, messages: [...s.messages, botMsg] } : s));
        }
      }, 1500);
    }
  };

  const handleStartChat = (participant: { name: string; username: string; avatar: string; isVerified?: boolean }) => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }
    if (participant.username === user.username) return;

    const existingSession = chatSessions.find(s => s.participant.username === participant.username);
    if (existingSession) {
      setActiveChatId(existingSession.id);
    } else {
      const newSession: ChatSession = {
        id: `s-${Date.now()}`,
        participant,
        lastMessage: "কথোপকথন শুরু করুন...",
        timestamp: Date.now(),
        messages: []
      };
      setChatSessions(prev => [newSession, ...prev]);
      setActiveChatId(newSession.id);
    }
    setActiveTab("messages");
  };

  const handleAddComment = async (postId: string) => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }

    const text = commentInputs[postId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_username: user.username,
          text
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPosts();
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      alert("Failed to add comment");
    }
  };

  const handleAddReply = (postId: string, commentId: string) => {
    if (!user.isLoggedIn) {
      openAuthModal("login");
      return;
    }

    const text = replyInputs[commentId];
    if (!text?.trim()) return;

    const newReply: Comment = {
      id: Date.now().toString(),
      author: {
        name: user.name,
        username: user.username,
        avatar: user.avatar
      },
      text,
      timestamp: Date.now(),
      replies: []
    };

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const updateComments = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === commentId) {
              return { ...c, replies: [...c.replies, newReply] };
            }
            if (c.replies.length > 0) {
              return { ...c, replies: updateComments(c.replies) };
            }
            return c;
          });
        };
        return { ...post, comments: updateComments(post.comments) };
      }
      return post;
    }));

    setReplyInputs(prev => ({ ...prev, [commentId]: "" }));
    setActiveReplyId(null);
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleNotificationClick = (postId: string) => {
    setActiveTab("feed");
    setIsNotificationsOpen(false);
    setNotifications(prev => prev.map(n => n.postId === postId ? { ...n, read: true } : n));
    
    // Small delay to ensure feed is rendered if we were on another tab
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-[var(--color-accent)]", "ring-offset-4", "ring-offset-slate-950");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-[var(--color-accent)]", "ring-offset-4", "ring-offset-slate-950");
        }, 3000);
      }
    }, 100);
  };

  // --- Render Helpers ---
  const renderComment = (postId: string, comment: Comment, depth = 0) => (
    <div key={comment.id} className={cn("space-y-3", depth > 0 && "ml-8 border-l border-white/5 pl-4 mt-4")}>
      <div className="flex items-start gap-2">
        <img src={comment.author.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="avatar" />
        <div className="flex-1 min-w-0">
          <div className="bg-white/5 p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white text-sm">{comment.author.name}</span>
              <span className="text-slate-500 text-xs">@{comment.author.username}</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{comment.text}</p>
          </div>
          <div className="flex items-center gap-4 mt-1 ml-2">
            <button 
              onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
              className="text-xs font-bold text-slate-500 hover:text-[var(--color-accent)] transition-colors"
            >
              রিপ্লাই
            </button>
            <span className="text-[10px] text-slate-600">
              {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {activeReplyId === comment.id && (
            <div className="mt-3 flex gap-2">
              <input 
                autoFocus
                type="text" 
                value={replyInputs[comment.id] || ""}
                onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddReply(postId, comment.id)}
                placeholder="আপনার রিপ্লাই লিখুন..."
                className="flex-1 glass-input py-2 px-4 rounded-xl text-sm text-white"
              />
              <button 
                onClick={() => handleAddReply(postId, comment.id)}
                className="p-2 bg-[var(--color-accent)] rounded-xl text-slate-950"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {comment.replies.map(reply => renderComment(postId, reply, depth + 1))}
    </div>
  );
  const renderFeed = () => {
    const filteredPosts = posts.filter(post => 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-24 lg:pb-8" ref={feedRef}>
        {/* Create Post Trigger */}
        <div 
          onClick={() => {
            if (user.isLoggedIn) {
              setIsPostModalOpen(true);
            } else {
              openAuthModal("login");
            }
          }}
          className="glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer group"
        >
          <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="avatar" />
          <div className="flex-1 bg-white/5 rounded-full px-6 py-2.5 text-slate-400 group-hover:bg-white/10 transition-all">
            আপনার চিন্তা শেয়ার করুন...
          </div>
          <PlusCircle className="text-[var(--color-accent)] w-6 h-6" />
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:block relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[var(--color-accent)] transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পোস্ট বা ইউজার খুঁজুন..."
            className="w-full glass-input pl-12 pr-4 py-3 rounded-2xl text-white focus:ring-1 ring-[var(--color-accent)]/30 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Posts List */}
        <AnimatePresence mode="popLayout">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-3xl">
              <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">কোনো পোস্ট পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <motion.div 
                key={post.id}
                id={`post-${post.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-2xl overflow-hidden transition-all duration-500"
              >
            <div className="p-4 flex items-start gap-3">
              <img src={post.author.avatar} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="avatar" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white truncate">{post.author.name}</h3>
                  {(post.author.isAI || post.author.username === "rahat") && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                  <span className="text-slate-500 text-sm">@{post.author.username}</span>
                  {post.author.username !== user.username && (
                    <div className="flex items-center gap-2 ml-2">
                      <button 
                        onClick={() => handleFollow(post.author.username)}
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all",
                          followingUsers.has(post.author.username)
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                        )}
                      >
                        {followingUsers.has(post.author.username) ? "ফলোয়িং" : "ফলো"}
                      </button>
                      <button 
                        onClick={() => handleStartChat({
                          name: post.author.name,
                          username: post.author.username,
                          avatar: post.author.avatar,
                          isVerified: post.author.username === "rahat" || post.author.isAI
                        })}
                        className="p-1 text-slate-500 hover:text-[var(--color-accent)] transition-colors"
                        title="মেসেজ পাঠান"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-slate-600 text-xs ml-auto">
                    {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-2 text-slate-200 prose prose-invert max-w-none">
                  <Markdown>{post.content}</Markdown>
                </div>
              </div>
              {post.author.username === user.username && (
                <div className="relative group/menu">
                  <button className="text-slate-500 hover:text-white transition-colors p-1">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-32 glass-panel rounded-xl overflow-hidden opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                    <button 
                      onClick={() => openEditPost(post)}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      এডিট করুন
                    </button>
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      ডিলিট করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {post.image && (
              <div className="px-4 pb-4">
                <img 
                  src={post.image} 
                  className="w-full h-auto rounded-xl border border-white/10 object-cover max-h-[400px]" 
                  alt="post content" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="px-4 py-3 border-t border-white/5 flex items-center gap-6">
              <button 
                onClick={() => handleLike(post.id)}
                className={cn(
                  "flex items-center gap-2 transition-colors group",
                  post.isLiked ? "text-pink-500" : "text-slate-400 hover:text-pink-500"
                )}
              >
                <Heart className={cn("w-5 h-5 group-active:scale-125 transition-transform", post.isLiked && "fill-current")} />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              <button 
                onClick={() => toggleComments(post.id)}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  expandedComments[post.id] ? "text-[var(--color-accent)]" : "text-slate-400 hover:text-[var(--color-accent)]"
                )}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{post.comments.length}</span>
              </button>
              <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
              {expandedComments[post.id] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-white/5 bg-black/10"
                >
                  <div className="p-4 space-y-6">
                    {/* Comment Input */}
                    <div className="flex gap-3">
                      <img src={user.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="me" />
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="কমেন্ট করুন..."
                          className="flex-1 glass-input py-2 px-4 rounded-xl text-sm text-white"
                        />
                        <button 
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 bg-[var(--color-accent)] rounded-xl text-slate-950"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {post.comments.length === 0 ? (
                        <p className="text-center text-slate-600 text-sm py-4">কোন কমেন্ট নেই। প্রথম কমেন্টটি আপনিই করুন!</p>
                      ) : (
                        post.comments.map(comment => renderComment(post.id, comment))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderWallet = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <h2 className="text-slate-400 font-medium">মোট ব্যালেন্স</h2>
        <div className="text-5xl font-black text-white flex items-center justify-center gap-2">
          <span className="text-[var(--color-accent)]">৳</span>
          {user.walletBalance.toFixed(2)}
        </div>
        <div className="flex justify-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +৳০.১০ প্রতি পোস্ট
          </span>
        </div>
        
        <button 
          onClick={handleWithdraw}
          disabled={user.walletBalance < 100 || isLoading}
          className={cn(
            "w-full mt-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
            user.walletBalance >= 100 
              ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90" 
              : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/10"
          )}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (user.walletBalance >= 100 ? "উইথড্র করুন" : "৳১০০ হলে উইথড্র করা যাবে")}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {['bKash', 'Nagad', 'Rocket'].map((method) => (
          <div key={method} className="glass-card p-4 rounded-2xl text-center border-white/5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{method}</div>
            <div className="text-white font-medium">সক্রিয়</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          টপ আর্নার লিডারবোর্ড
        </h3>
        <div className="space-y-4">
          {[
            { name: "Rahat Khan", username: "rahat", amount: 15.50, avatar: "https://picsum.photos/seed/user1/100/100" },
            { name: "AI Assistant", username: "ai_bot", amount: 12.80, avatar: "https://picsum.photos/seed/bot/100/100" },
            { name: "Sabbir Ahmed", username: "sabbir", amount: 8.40, avatar: "https://picsum.photos/seed/user3/100/100" }
          ].map((earner, i) => (
            <div key={earner.username} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-6 text-slate-500 font-bold text-sm">#{i+1}</div>
              <img src={earner.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="avatar" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate flex items-center gap-1">
                  {earner.name}
                  {(earner.username === "rahat" || earner.username === "ai_bot") && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                </div>
                <div className="text-slate-500 text-[10px]">@{earner.username}</div>
              </div>
              <div className="text-[var(--color-accent)] font-bold">৳{earner.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
          সাম্প্রতিক লেনদেন
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <div className="text-white font-medium">পোস্ট রিওয়ার্ড</div>
                <div className="text-slate-500 text-xs">আজ, ১০:৪৫ AM</div>
              </div>
              <div className="text-emerald-400 font-bold">+৳০.১০</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-white/10 bg-[var(--color-navy-light)] p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_15px_var(--color-accent-glow)]">
            A
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white">AMARSITE</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            icon={<Home />} 
            label="হোম ফিড" 
            active={activeTab === "feed"} 
            onClick={() => setActiveTab("feed")} 
          />
          <NavItem 
            icon={<Wallet />} 
            label="ওয়ালেট" 
            active={activeTab === "wallet"} 
            onClick={() => user.isLoggedIn ? setActiveTab("wallet") : openAuthModal("login")} 
          />
          <NavItem 
            icon={<MessageSquare />} 
            label="মেসেজ" 
            active={activeTab === "messages"} 
            onClick={() => user.isLoggedIn ? setActiveTab("messages") : openAuthModal("login")} 
          />
          <NavItem 
            icon={<User />} 
            label="প্রোফাইল" 
            active={activeTab === "profile"} 
            onClick={() => user.isLoggedIn ? setActiveTab("profile") : openAuthModal("login")} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          {user.isLoggedIn ? (
            <div className="flex items-center gap-3">
              <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="me" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold truncate">{user.name}</div>
                <div className="text-slate-500 text-xs truncate">৳{user.walletBalance.toFixed(2)}</div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={() => openAuthModal("login")} className="btn-primary w-full flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              লগইন করুন
            </button>
          )}
        </div>
      </aside>

      {/* --- Mobile Header --- */}
      <header className="lg:hidden h-16 glass-panel sticky top-0 z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center text-slate-950 font-black text-lg">
            A
          </div>
          <span className="font-black tracking-tighter text-white">AMARSITE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={cn("p-2 rounded-xl transition-colors", isSearchOpen ? "bg-[var(--color-accent)] text-slate-950" : "text-slate-400 hover:text-white")}
            >
              <Search className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-3rem)] glass-panel p-2 rounded-2xl z-50 shadow-2xl"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      autoFocus
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="খুঁজুন..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-[var(--color-accent)]/50 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn("p-2 rounded-xl transition-colors relative", isNotificationsOpen ? "bg-[var(--color-accent)] text-slate-950" : "text-slate-400 hover:text-white")}
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-950" />
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-2xl z-50 shadow-2xl overflow-hidden"
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white">নোটিফিকেশন</h3>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-accent)]"
                    >
                      সবগুলো পড়া হয়েছে
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">কোনো নোটিফিকেশন নেই</div>
                    ) : (
                      notifications.map(n => (
                        <button 
                          key={n.id}
                          onClick={() => handleNotificationClick(n.postId)}
                          className={cn(
                            "w-full p-4 text-left flex gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
                            !n.read && "bg-white/[0.02]"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-[var(--color-accent)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200">
                              <span className="font-bold text-white">{n.author}</span> একটি নতুন পোস্ট শেয়ার করেছেন।
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full self-center" />}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {user.isLoggedIn ? (
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
              title="লগ আউট"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => openAuthModal("login")} className="text-[var(--color-accent)] font-bold text-sm">লগইন</button>
          )}
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {activeTab === "feed" && renderFeed()}
          {activeTab === "wallet" && renderWallet()}
          {activeTab === "messages" && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] flex flex-col lg:flex-row glass-panel rounded-3xl overflow-hidden">
              {/* Sessions List */}
              <div className={cn(
                "w-full lg:w-80 border-r border-white/10 flex flex-col",
                activeChatId && "hidden lg:flex"
              )}>
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">মেসেজ</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chatSessions.map(session => (
                    <button 
                      key={session.id}
                      onClick={() => setActiveChatId(session.id)}
                      className={cn(
                        "w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5",
                        activeChatId === session.id && "bg-white/10"
                      )}
                    >
                      <img src={session.participant.avatar} className="w-12 h-12 rounded-full border border-white/10" alt="avatar" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-white font-bold truncate flex items-center gap-1">
                          {session.participant.name}
                          {session.participant.isVerified && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                        </div>
                        <div className="text-slate-500 text-xs truncate">{session.lastMessage}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className={cn(
                "flex-1 flex flex-col bg-black/20",
                !activeChatId && "hidden lg:flex items-center justify-center text-slate-500"
              )}>
                {activeChatId ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[var(--color-navy-deep)]">
                      <button onClick={() => setActiveChatId(null)} className="lg:hidden p-2 text-slate-400">
                        <X className="w-5 h-5" />
                      </button>
                      <img 
                        src={chatSessions.find(s => s.id === activeChatId)?.participant.avatar} 
                        className="w-10 h-10 rounded-full border border-white/10" 
                        alt="avatar" 
                      />
                      <div className="flex-1">
                        <div className="text-white font-bold flex items-center gap-1">
                          {chatSessions.find(s => s.id === activeChatId)?.participant.name}
                          {chatSessions.find(s => s.id === activeChatId)?.participant.isVerified && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                        </div>
                        <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">অনলাইন</div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatSessions.find(s => s.id === activeChatId)?.messages.map(msg => (
                        <div 
                          key={msg.id} 
                          className={cn(
                            "flex flex-col max-w-[80%]",
                            msg.sender === user.username ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div className={cn(
                            "p-3 rounded-2xl text-sm",
                            msg.sender === user.username 
                              ? "bg-[var(--color-accent)] text-slate-950 rounded-tr-none" 
                              : "bg-white/10 text-white rounded-tl-none"
                          )}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-600 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/10 bg-[var(--color-navy-deep)]">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="আপনার মেসেজ লিখুন..."
                          className="flex-1 glass-input py-3 px-4 rounded-xl text-white outline-none"
                        />
                        <button 
                          onClick={handleSendMessage}
                          className="p-3 bg-[var(--color-accent)] rounded-xl text-slate-950 hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <MessageSquare className="w-16 h-16 text-slate-800 mx-auto" />
                    <p>কথা শুরু করতে কোনো চ্যাট সিলেক্ট করুন</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "profile" && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-[var(--color-accent)] to-indigo-600 opacity-20" />
                <div className="px-8 pb-8 -mt-12 text-center relative">
                  <div className="relative inline-block">
                    <img src={user.avatar} className="w-24 h-24 rounded-3xl border-4 border-[var(--color-navy-deep)] mx-auto mb-4 object-cover" alt="profile" />
                    {user.isVerified && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-full border-2 border-[var(--color-navy-deep)] text-white">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}
                    <button 
                      onClick={openEditProfile}
                      className="absolute bottom-2 right-0 p-2 bg-[var(--color-accent)] rounded-xl text-slate-950 shadow-lg"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                    {user.name}
                    {user.isVerified && <ShieldCheck className="w-5 h-5 text-blue-400" />}
                  </h2>
                  <p className="text-slate-500">@{user.username}</p>
                  
                  <button 
                    onClick={openEditProfile}
                    className="mt-4 px-6 py-2 glass-panel rounded-xl text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    প্রোফাইল এডিট করুন
                  </button>

                  <div className="flex justify-center gap-8 mt-8">
                    <div className="text-center">
                      <div className="text-white font-bold text-xl">{posts.filter(p => p.author.username === user.username).length}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">পোস্ট</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-xl">{user.followersCount}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">ফলোয়ার</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-xl">{user.followingCount}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">ফলোয়িং</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-white">আপনার পোস্টসমূহ</h3>
                  <span className="text-slate-500 text-xs">{posts.filter(p => p.author.username === user.username).length} টি পোস্ট</span>
                </div>
                
                <div className="grid gap-4">
                  {posts.filter(p => p.author.username === user.username).length === 0 ? (
                    <div className="text-center py-12 glass-panel rounded-3xl">
                      <p className="text-slate-500">আপনি এখনো কোনো পোস্ট করেননি।</p>
                    </div>
                  ) : (
                    posts.filter(p => p.author.username === user.username).map(post => (
                      <motion.div 
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-4 rounded-2xl flex gap-4 items-start"
                      >
                        {post.image && (
                          <img src={post.image} className="w-20 h-20 rounded-xl object-cover border border-white/5" alt="post" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 line-clamp-2 text-sm">{post.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>{post.likes} লাইক</span>
                            <span>{post.comments.length} কমেন্ট</span>
                            <span className="ml-auto">{new Date(post.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => openEditPost(post)} className="p-2 hover:text-[var(--color-accent)] transition-colors">
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeletePost(post.id)} className="p-2 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- Mobile Navigation --- */}
      <nav className="lg:hidden h-20 glass-panel fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 border-t border-white/10">
        <MobileNavItem icon={<Home />} active={activeTab === "feed"} onClick={() => setActiveTab("feed")} />
        <MobileNavItem icon={<Wallet />} active={activeTab === "wallet"} onClick={() => user.isLoggedIn ? setActiveTab("wallet") : openAuthModal("login")} />
        <div className="relative -top-8">
          <button 
            onClick={() => user.isLoggedIn ? setIsPostModalOpen(true) : openAuthModal("login")}
            className="w-14 h-14 bg-[var(--color-accent)] rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_var(--color-accent-glow)] active:scale-90 transition-all"
          >
            <PlusCircle className="w-8 h-8" />
          </button>
        </div>
        <MobileNavItem icon={<MessageSquare />} active={activeTab === "messages"} onClick={() => user.isLoggedIn ? setActiveTab("messages") : openAuthModal("login")} />
        <MobileNavItem icon={<User />} active={activeTab === "profile"} onClick={() => user.isLoggedIn ? setActiveTab("profile") : openAuthModal("login")} />
      </nav>

      {/* --- Modals --- */}
      <AnimatePresence>
        {/* Auth Modal */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-2xl flex items-center justify-center mx-auto text-[var(--color-accent)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-white">
                  {authMode === "login" ? "Amarsite-এ স্বাগতম" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
                </h2>
                <p className="text-slate-400">
                  {authMode === "login" 
                    ? "আপনার অ্যাকাউন্ট ব্যবহার করে লগইন করুন।" 
                    : "Amarsite-এ যোগ দিতে নিচের তথ্যগুলো পূরণ করুন।"}
                </p>
                
                <div className="space-y-3 pt-4">
                  {authMode === "register" && (
                    <>
                      <input 
                        type="text" 
                        placeholder="পুরো নাম" 
                        value={authInputs.name}
                        onChange={(e) => setAuthInputs(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full glass-input p-4 rounded-xl text-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="ইউজারনেম" 
                        value={authInputs.username}
                        onChange={(e) => setAuthInputs(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full glass-input p-4 rounded-xl text-white" 
                      />
                    </>
                  )}
                  <input 
                    type="email" 
                    placeholder="ইমেইল" 
                    value={authInputs.email}
                    onChange={(e) => setAuthInputs(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full glass-input p-4 rounded-xl text-white" 
                  />
                  <input 
                    type="password" 
                    placeholder="পাসওয়ার্ড" 
                    value={authInputs.password}
                    onChange={(e) => setAuthInputs(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full glass-input p-4 rounded-xl text-white" 
                  />
                  
                  <button onClick={handleAuth} className="btn-primary w-full py-4 mt-2">
                    {authMode === "login" ? "লগইন করুন" : "নিবন্ধন করুন"}
                  </button>
                  
                  <div className="text-slate-500 text-sm">
                    {authMode === "login" ? (
                      <>অ্যাকাউন্ট নেই? <button onClick={() => setAuthMode("register")} className="text-[var(--color-accent)] font-bold">নিবন্ধন করুন</button></>
                    ) : (
                      <>ইতিমধ্যে অ্যাকাউন্ট আছে? <button onClick={() => setAuthMode("login")} className="text-[var(--color-accent)] font-bold">লগইন করুন</button></>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}

        {/* Post Modal */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-lg rounded-3xl p-6 relative z-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <img src={user.avatar} className="w-10 h-10 rounded-full" alt="me" />
                <span className="font-bold text-white">
                  {editingPost ? "পোস্ট এডিট করুন" : "নতুন পোস্ট তৈরি করুন"}
                </span>
              </div>
              
              <textarea 
                autoFocus
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="আপনার চিন্তাগুলো লিখুন..."
                className="w-full bg-transparent text-xl text-white placeholder-slate-600 outline-none min-h-[150px] resize-none"
              />

              {postImage && (
                <div className="relative mt-4 rounded-xl overflow-hidden border border-white/10">
                  <img src={postImage} className="w-full h-auto max-h-[300px] object-cover" alt="preview" />
                  <button 
                    onClick={() => setPostImage(null)}
                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                <div className="flex gap-4">
                  <label className="cursor-pointer text-slate-400 hover:text-[var(--color-accent)] transition-colors">
                    <ImageIcon className="w-6 h-6" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setPostImage)} />
                  </label>
                  <button 
                    onClick={triggerAIPost}
                    className="text-slate-400 hover:text-indigo-400 transition-colors"
                    title="AI Generate"
                  >
                    <Bot className="w-6 h-6" />
                  </button>
                </div>
                <button 
                  onClick={handlePost}
                  disabled={isLoading || (!postContent.trim() && !postImage)}
                  className="btn-primary flex items-center gap-2 px-8"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {editingPost ? "আপডেট করুন" : "পোস্ট করুন"}
                </button>
              </div>
              
              <button 
                onClick={() => {
                  setIsPostModalOpen(false);
                  setEditingPost(null);
                  setPostContent("");
                  setPostImage(null);
                }} 
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
        {/* Profile Edit Modal */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <div className="text-center space-y-6">
                <h2 className="text-2xl font-black text-white">প্রোফাইল এডিট করুন</h2>
                
                <div className="relative inline-block group">
                  <img src={editProfileData.avatar} className="w-24 h-24 rounded-3xl border-4 border-white/10 mx-auto object-cover" alt="avatar preview" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <ImageIcon className="text-white w-8 h-8" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setEditProfileData(prev => ({ ...prev, avatar: url })))} />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">আপনার নাম</label>
                    <input 
                      type="text" 
                      value={editProfileData.name}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full glass-input p-4 rounded-xl text-white" 
                      placeholder="আপনার নাম লিখুন"
                    />
                  </div>
                  
                  <button onClick={handleUpdateProfile} className="btn-primary w-full py-4 mt-2">
                    তথ্য আপডেট করুন
                  </button>
                </div>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
            <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all group",
        active 
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active && "scale-110")}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
      </span>
      {label}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all",
        active ? "text-[var(--color-accent)]" : "text-slate-500"
      )}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </button>
  );
}

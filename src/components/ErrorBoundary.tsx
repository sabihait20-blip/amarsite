import React, { Component, ErrorInfo, ReactNode } from "react";
import { ai } from "../services/gemini";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  aiFixSuggestion: string | null;
  isAnalyzing: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    aiFixSuggestion: null,
    isAnalyzing: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, aiFixSuggestion: null, isAnalyzing: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.analyzeError(error, errorInfo);
  }

  private async analyzeError(error: Error, errorInfo: ErrorInfo) {
    this.setState({ isAnalyzing: true });
    try {
      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: "আপনি Amarsite AI। আপনি একজন বিশেষজ্ঞ ডেভেলপার। নিচে একটি এরর রিপোর্ট দেওয়া হলো। দয়া করে এররটি বিশ্লেষণ করুন এবং এর সম্ভাব্য সমাধান বা ফিক্স প্রদান করুন। আপনার উত্তরটি ছোট এবং সহজবোধ্য হওয়া উচিত। অবশ্যই বাংলা ভাষায় উত্তর দেবেন।",
        },
      });

      const response = await chat.sendMessage({ 
        message: `এরর: ${error.message}\nস্ট্যাক ট্রেস: ${errorInfo.componentStack}` 
      });
      
      this.setState({ aiFixSuggestion: response.text || "দুঃখিত, আমি এই এররটি বিশ্লেষণ করতে পারিনি।" });
    } catch (e) {
      console.error("AI Analysis error:", e);
      this.setState({ aiFixSuggestion: "এরর বিশ্লেষণ করতে সমস্যা হয়েছে।" });
    } finally {
      this.setState({ isAnalyzing: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-navy-deep)] p-6">
          <div className="glass-card p-8 rounded-3xl max-w-lg w-full text-center space-y-6 border border-red-500/20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">একটি সমস্যা হয়েছে!</h2>
            <p className="text-[var(--color-text-dim)] text-sm">আমাদের সিস্টেম একটি বাগ শনাক্ত করেছে। Amarsite AI এটি বিশ্লেষণ করছে...</p>
            
            {this.state.isAnalyzing ? (
              <div className="flex items-center justify-center gap-2 text-[var(--color-accent)]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>বিশ্লেষণ চলছে...</span>
              </div>
            ) : (
              <div className="bg-black/20 p-4 rounded-xl text-left text-sm text-white/80 border border-white/5">
                <h4 className="font-bold text-[var(--color-accent)] mb-2">Amarsite AI-এর পরামর্শ:</h4>
                <p>{this.state.aiFixSuggestion}</p>
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[var(--color-accent)] text-[var(--color-navy-deep)] py-3 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

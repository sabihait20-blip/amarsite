import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export const chatModel = "gemini-3.1-pro-preview";

export interface Message {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export async function sendMessage(message: string, history: Message[]) {
  const ai = getAi();
  const chat = ai.chats.create({
    model: chatModel,
    config: {
      systemInstruction: "আপনি Amarsite AI। আপনি ব্যবহারকারীদের সাথে বন্ধুত্বপূর্ণ এবং কমিউনিটি-ভিত্তিক উপায়ে কথা বলেন। আপনার উত্তরগুলো সোশ্যাল মিডিয়া পোস্টের মতো হওয়া উচিত। ফরম্যাটিংয়ের জন্য মার্কডাউন ব্যবহার করুন। অবশ্যই বাংলা ভাষায় উত্তর দেবেন।",
    },
  });
  
  const response = await chat.sendMessage({ message });
  return response.text;
}

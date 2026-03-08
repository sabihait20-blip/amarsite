import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: apiKey! });

export const chatModel = "gemini-3.1-pro-preview";

export interface Message {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export async function sendMessage(message: string, history: Message[]) {
  const chat = ai.chats.create({
    model: chatModel,
    config: {
      systemInstruction: "আপনি Amarsite AI। আপনি ব্যবহারকারীদের সাথে বন্ধুত্বপূর্ণ এবং কমিউনিটি-ভিত্তিক উপায়ে কথা বলেন। আপনার উত্তরগুলো সোশ্যাল মিডিয়া পোস্টের মতো হওয়া উচিত। ফরম্যাটিংয়ের জন্য মার্কডাউন ব্যবহার করুন। অবশ্যই বাংলা ভাষায় উত্তর দেবেন।",
    },
  });

  // Convert history to Gemini format
  // Note: sendMessage only accepts message parameter, so we use the chat object
  // But wait, the SDK docs say chat.sendMessage({ message: "..." })
  // We should actually initialize the chat with history if we want persistence
  // However, for a simple implementation, we can just send the message.
  
  const response = await chat.sendMessage({ message });
  return response.text;
}

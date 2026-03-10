import { GoogleGenAI } from "@google/genai";

export const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAIPost = async (topic?: string) => {
  try {
    const ai = getAi();
    const model = "gemini-3-flash-preview";
    
    const prompt = topic 
      ? `Create a short, engaging social media post in Bengali about "${topic}". Use emojis and markdown formatting.`
      : `Create a short, engaging social media post in Bengali about a trending topic in Bangladesh. Use emojis and markdown formatting.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a friendly AI Assistant for a social media platform called Amarsite. Your goal is to keep the community engaged with interesting posts.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating AI post:", error);
    return null;
  }
};

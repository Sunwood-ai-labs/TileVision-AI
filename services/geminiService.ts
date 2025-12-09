import { GoogleGenAI } from "@google/genai";

// Helper to remove data URL prefix for Gemini API
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

export const generateVideoMetadata = async (
  thumbnails: string[]
): Promise<{ title: string; description: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  
  if (thumbnails.length === 0) {
    return { title: "My Video Grid", description: "A compilation of videos." };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash"; // Good for multimodal vision tasks

  // Prepare parts: Instructions + Images
  const parts = [
    { text: "Here are frames from 4 different videos I am combining into a grid montage." },
    ...thumbnails.map((thumb) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64(thumb),
      },
    })),
    {
      text: `Analyze these images and generate:
      1. A catchy, short filename (no extension, max 5 words).
      2. A short description of the theme (max 20 words).
      
      Return JSON in this format: { "title": "string", "description": "string" }`
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const json = JSON.parse(text);
    return {
      title: json.title || "video_grid_export",
      description: json.description || "A video grid compilation.",
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      title: "video_grid_export",
      description: "Could not generate description.",
    };
  }
};

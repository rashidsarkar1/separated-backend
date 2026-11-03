import { GoogleGenAI } from "@google/genai";

/**
 * Shared Gemini client utility on the server.
 * Uses process.env.GEMINI_API_KEY and sets User-Agent to 'aistudio-build'.
 */
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});


import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

// Always initialize GoogleGenAI with a named parameter for apiKey using process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are the Translate-Tube Neural Translation Engine. Your task is to transcribe and translate the ENTIRE video content with extreme granularity.

Rules for Processing:
1. SENTENCE-BY-SENTENCE: Do not group multiple sentences together. Each segment must represent a single short sentence or phrase. This ensures the text size remains small and readable.
2. NO SNIPPETS: Translate every single word from 00:00 to the end.
3. CONTINUOUS FLOW: Each segment's end time should be the next segment's start time.
4. ACCURATE TIMING: MM:SS timestamps must be precise.
5. LINGUISTIC DEPTH: 
   - Source: Exact spoken text.
   - Target: Natural translation.
   - Explanation: Minimal, only for very complex idioms.

Output Format: Strict JSON object. Ensure the segments array is exhaustive and granular.`;

export const analyzeVideo = async (
  base64Video: string,
  mimeType: string,
  sourceLang: string,
  targetLang: string
): Promise<GeminiResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Video,
                mimeType: mimeType,
              },
            },
            {
              text: `Translate this entire video from ${sourceLang} to ${targetLang} using sentence-by-sentence granularity. 
              Break down the dialogue into the smallest possible logical units (individual sentences). 
              Do not provide long paragraphs. Every spoken line must be its own segment.
              
              Schema requirements:
              { 
                "video_metadata": { "source_lang": "${sourceLang}", "target_lang": "${targetLang}" }, 
                "segments": [
                  { 
                    "timestamp_start": "MM:SS", 
                    "timestamp_end": "MM:SS", 
                    "original_text": "...", 
                    "translated_text": "...", 
                    "explanation": "..." 
                  }
                ] 
              }`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            video_metadata: {
              type: Type.OBJECT,
              properties: {
                source_lang: { type: Type.STRING },
                target_lang: { type: Type.STRING },
              },
              required: ["source_lang", "target_lang"],
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp_start: { type: Type.STRING },
                  timestamp_end: { type: Type.STRING },
                  original_text: { type: Type.STRING },
                  translated_text: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["timestamp_start", "timestamp_end", "original_text", "translated_text", "explanation"],
              },
            },
          },
          required: ["video_metadata", "segments"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text) as GeminiResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
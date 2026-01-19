import { GoogleGenAI } from "@google/genai";
import { Message, Highlight } from "../types";

const MODEL_NAME = "gemini-2.5-flash";

// Initialize the client only when needed to ensure API key is present
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const sendMessageToCoach = async (
  history: Message[],
  currentContext: string,
  userMessage: string
): Promise<string> => {
  try {
    const ai = getClient();
    
    // System instruction that defines the persona
    const systemInstruction = `
      You are an expert Deliberate Practice Coach. 
      Your goal is to help the user understand and apply the principles of Deliberate Practice based STRICTLY on the provided guide content.
      
      Context: The user is currently reading a section of a guide about Deliberate Practice.
      The content of the current section they are reading is provided below.
      
      Rules:
      1. Answer questions using the specific terminology and metaphors from the guide (e.g., "Mental Representations", "Fluency vs Accuracy", "Task Alignment").
      2. Be encouraging but practical.
      3. If the user asks something not covered in the guide, provide a general answer based on deliberate practice principles but mention it's outside the current text.
      4. Keep answers concise and actionable.
      
      Current Reading Context:
      ${currentContext}
    `;

    const contents = history
      .filter(msg => !msg.isError)
      .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

    // Add the new user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
      },
      contents: contents
    });

    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to connect to the AI Coach.");
  }
};

export const summarizeHighlights = async (highlights: Highlight[]): Promise<string> => {
  try {
    const ai = getClient();

    if (highlights.length === 0) {
        return "You haven't saved any highlights yet. Highlight some text in the guide to get a summary.";
    }

    const highlightsText = highlights.map(h =>
        `- "${h.text}" (from ${h.sectionTitle})${h.note ? `\n  Note: ${h.note}` : ''}`
    ).join('\n');

    const prompt = `
      You are an expert learning coach. The user has been reading a guide on Deliberate Practice and has saved the following highlights and notes.
      
      Please analyze these highlights to identify:
      1. The core themes the user is interested in.
      2. A summary of the key lessons learned based SPECIFICALLY on these highlights.
      3. Actionable advice based on their notes (if any) or the highlighted content.

      Keep the response concise, encouraging, and structured with clear headings (using Markdown).

      User's Highlights:
      ${highlightsText}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    throw new Error("Failed to generate summary. Please check your API key.");
  }
};
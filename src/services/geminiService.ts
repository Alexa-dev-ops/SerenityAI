import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getChatResponse(message: string, history: { role: string; content: string }[], _token: string | null) {
  const systemInstruction = `
    You are Serenity, an empathetic and supportive addiction recovery companion. 
    Your goal is to provide emotional support, listen without judgment, and offer practical coping strategies.
    
    Guidelines:
    - Be warm, patient, and encouraging.
    - Use "we" and "us" to show partnership in the recovery journey.
    - If a user mentions self-harm or immediate danger, strongly encourage them to use the "Emergency" button or call a local crisis line.
    - Offer evidence-based coping techniques like grounding, deep breathing, or distraction.
    - Keep responses concise but meaningful.
    - Do not give medical advice; focus on emotional support and behavioral strategies.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ],
      config: { systemInstruction }
    });

    return response.text || "I'm here for you, but I'm having trouble connecting right now. Please try again.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm sorry, I'm having a moment. Let's try talking again in a bit.";
  }
}

export async function predictRelapseRisk(moods: any[], journals: any[], _token: string | null) {
  const prompt = `
    Analyze the following recovery data and predict the current relapse risk level (Low, Moderate, High).
    Provide a brief explanation and one key recommendation.
    
    Mood Data (last 30 entries): ${JSON.stringify(moods)}
    Journal Data (last 5 entries): ${JSON.stringify(journals)}
    
    Return the response in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["Low", "Moderate", "High"] },
            explanation: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["riskLevel", "explanation", "recommendation"]
        }
      }
    });

    const text = response.text;
    if (!text) return { riskLevel: "Unknown", explanation: "AI returned an empty response.", recommendation: "Try again later." };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Relapse Prediction Error:", error);
    return { 
      riskLevel: "Unknown", 
      explanation: "Unable to analyze data at this time. " + (error instanceof Error ? error.message : ""), 
      recommendation: "Keep checking in and stay connected." 
    };
  }
}

import { GoogleGenAI, Type } from "@google/genai";

// Use process.env for server-side
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function generateDailyPlanServer(tasks: any[]) {
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in server environment");
    return [];
  }

  try {
    const taskSummary = tasks.map(t => `- [ID: ${t.id}] ${t.title} (Priority: ${t.priority}, Est: ${t.estimated_time}m)`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a smart daily planner. Organize the following tasks into a logical time-blocked schedule for today starting from 9 AM. 
      Return the start and end times in ISO 8601 format for today (${new Date().toISOString().split('T')[0]}).
      
      Tasks:
      ${taskSummary}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task_id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  start: { type: Type.STRING },
                  end: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["task_id", "title", "start", "end", "reason"]
              }
            }
          },
          required: ["plan"]
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed.plan || [];
  } catch (e) {
    console.error("Gemini Server Plan Error:", e);
    return [];
  }
}

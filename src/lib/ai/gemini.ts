import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSubtasks(taskTitle: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Break down the task "${taskTitle}" into 3-5 actionable subtasks.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["subtasks"]
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.subtasks || [];
  } catch (e) {
    console.error("Gemini Breakdown Error:", e);
    return [];
  }
}

export async function generateDailyPlan(tasks: any[]) {
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
                  task_id: { type: Type.STRING, description: "The ID provided in the task summary" },
                  title: { type: Type.STRING },
                  start: { type: Type.STRING, description: "ISO 8601 start time" },
                  end: { type: Type.STRING, description: "ISO 8601 end time" },
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
    console.error("Gemini Plan Error:", e);
    return [];
  }
}

import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. AI features will not work.");
  }
  aiInstance = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });
  return aiInstance;
}

const isServer = typeof window === 'undefined';

export async function calculatePriority(task: any, delayFactor: number = 1.0): Promise<{ score: number; model: string; scored_at: string }> {
  if (isServer) {
    const score = await calculatePriorityInternal(task, delayFactor);
    return {
      score,
      model: "gemini-3-flash-preview",
      scored_at: new Date().toISOString()
    };
  }

  // Client-side: Call the server API
  console.log(`[AI] Requesting score for: ${task.title}`);
  try {
    const response = await fetch('/api/ai/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, delayFactor })
    });
    if (!response.ok) throw new Error('Failed to fetch AI score from server');
    return await response.json();
  } catch (error) {
    console.error("[AI] Client call failed, using fallback:", error);
    return {
      score: calculatePriorityRuleBased(task, delayFactor),
      model: 'fallback-rule-based',
      scored_at: new Date().toISOString()
    };
  }
}

async function calculatePriorityInternal(task: any, delayFactor: number = 1.0) {
  try {
    const ai = getAI();
    const prompt = `
      Phân tích nhiệm vụ sau và gán điểm ưu tiên từ 0 đến 100.
      Điểm cao hơn có nghĩa là độ khẩn cấp và quan trọng cao hơn.
      
      Chi tiết nhiệm vụ:
      - Tiêu đề: ${task.title}
      - Mô tả: ${task.description || 'Không có mô tả'}
      - Mức độ ưu tiên: ${task.priority}
      - Hạn chót: ${task.due_date || 'Không có hạn chót'}
      - Thời gian ước tính: ${task.estimated_time || 'Chưa xác định'} phút
      
      Bối cảnh:
      - Thời gian hiện tại: ${new Date().toISOString()}
      - Hệ số năng suất người dùng: ${delayFactor} (Thấp hơn có nghĩa là người dùng chậm hơn, vì vậy độ khẩn cấp có thể tăng lên)
      
      Xem xét:
      1. Khoảng cách đến hạn chót (Quá hạn hoặc sắp đến hạn = điểm cao).
      2. Mức độ ưu tiên do người dùng thiết lập.
      3. Độ phức tạp của nhiệm vụ (Thời gian ước tính).
      4. Nội dung mô tả cho các từ khóa khẩn cấp ẩn.
      
      CHỈ trả về điểm số dạng số.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: "Điểm ưu tiên được tính toán từ 0 đến 100",
            },
          },
          required: ["score"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"score": 50}');
    return Math.min(Math.max(result.score, 0), 100);
  } catch (error) {
    console.error("AI Priority Calculation failed, falling back to rule-based:", error);
    return calculatePriorityRuleBased(task, delayFactor);
  }
}

function calculatePriorityRuleBased(task: any, delayFactor: number = 1.0) {
  console.log("AI SCORE SOURCE: Fallback Rule-based");
  const now = new Date();
  if (!task.due_date) {
    return 50 * delayFactor;
  }
  
  const due = new Date(task.due_date);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  let score = 50;

  if (diffHours < 0) score = 100;
  else if (diffHours <= 24) score = 90;
  else if (diffHours <= 72) score = 70;

  if (task.priority === 'high') score += 15;
  if (task.estimated_time && task.estimated_time > 120) score += 10;

  return Math.min(score * delayFactor, 100);
}

export async function generateSubtasks(taskTitle: string) {
  if (!isServer) {
    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle })
      });
      const data = await response.json();
      return data.subtasks || [];
    } catch (e) {
      console.error("Client Breakdown Error:", e);
      return [];
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Chia nhỏ nhiệm vụ "${taskTitle}" thành 3-5 nhiệm vụ con có thể thực hiện được.`,
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
  if (!isServer) {
    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
      const data = await response.json();
      return data.plan || [];
    } catch (e) {
      console.error("Client Plan Error:", e);
      return [];
    }
  }

  try {
    const ai = getAI();
    const taskSummary = tasks.map(t => `- [ID: ${t.id}] ${t.title} (Ưu tiên: ${t.priority}, Ước tính: ${t.estimated_time}m)`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một chuyên gia lập kế hoạch thông minh. Hãy sắp xếp các nhiệm vụ sau vào một lịch trình phân bổ thời gian hợp lý cho hôm nay, bắt đầu từ 9 giờ sáng. 
      Trả về thời gian bắt đầu và kết thúc theo định dạng ISO 8601 cho ngày hôm nay (${new Date().toISOString().split('T')[0]}).
      
      Nhiệm vụ:
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
                  task_id: { type: Type.STRING, description: "ID được cung cấp trong tóm tắt nhiệm vụ" },
                  title: { type: Type.STRING },
                  start: { type: Type.STRING, description: "Thời gian bắt đầu ISO 8601" },
                  end: { type: Type.STRING, description: "Thời gian kết thúc ISO 8601" },
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

function getEisenhowerFallback(quadrant: string) {
  const fallbacks: Record<string, { action: string, explanation: string }> = {
    q1: { action: "Thực hiện ngay lập tức", explanation: "Nhiệm vụ này vừa khẩn cấp vừa quan trọng. Hãy tập trung toàn bộ năng lượng vào đây ngay bây giờ." },
    q2: { action: "Lên lịch tập trung", explanation: "Quan trọng nhưng không khẩn cấp. Hãy dành một khoảng thời gian cụ thể để đảm bảo chất lượng." },
    q3: { action: "Ủy quyền/Tự động hóa", explanation: "Khẩn cấp nhưng không quan trọng. Hãy giảm thiểu sự tham gia trực tiếp của bạn nếu có thể." },
    q4: { action: "Lưu trữ/Loại bỏ", explanation: "Không khẩn cấp cũng không quan trọng. Hãy xóa khỏi danh sách hoạt động để giải tỏa tâm trí." }
  };
  return fallbacks[quadrant] || { action: "Xem lại nhiệm vụ", explanation: "Phân tích nhiệm vụ này để xác định mức độ ưu tiên và các bước tiếp theo." };
}

export async function getEisenhowerActionSuggestion(task: any, quadrant: string) {
  if (!isServer) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // Slightly more than server timeout

      const response = await fetch('/api/ai/eisenhower-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, quadrant }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (e) {
      console.warn("Client Eisenhower Action Fallback:", e);
      return getEisenhowerFallback(quadrant);
    }
  }

  try {
    const ai = getAI();
    
    // Timeout wrapper for Gemini call
    const aiCall = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một chuyên gia về năng suất. Với một nhiệm vụ trong ô "${quadrant}" của Ma trận Eisenhower, hãy đề xuất một hành động cụ thể và giải thích lý do.
      
      Nhiệm vụ: ${task.title}
      Mô tả: ${task.description || 'N/A'}
      Ưu tiên: ${task.priority}
      Hạn chót: ${task.due_date || 'N/A'}
      
      Trả về một đối tượng JSON với "action" (chuỗi ngắn) và "explanation" (1 câu).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["action", "explanation"]
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("AI Timeout")), 3000)
    );

    const response: any = await Promise.race([aiCall, timeoutPromise]);

    const text = response.text;
    if (!text) return getEisenhowerFallback(quadrant);
    return JSON.parse(text);
  } catch (e) {
    console.error("Gemini Eisenhower Action Error, using fallback:", e);
    return getEisenhowerFallback(quadrant);
  }
}

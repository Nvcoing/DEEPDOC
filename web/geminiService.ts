
// Use correct import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
import { Language, NewsArticle } from "./types";

// Always use named parameter for apiKey and process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const BACKEND_URL = "http://localhost:8000";

// Giữ nguyên phần tin tức sử dụng Gemini trực tiếp vì backend không có endpoint này
export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Lấy danh sách 4 tin tức thế giới hoặc bài báo mới nhất, nổi bật nhất về công nghệ, khoa học hoặc kinh tế. Trình bày dưới dạng JSON array với các trường: title, summary (ngắn gọn 1 câu), url (nếu có), category. Phản hồi bằng ${language}.`;

  try {
    // Fixed contents to string as per single-turn guideline
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              url: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "summary", "category"]
          }
        }
      },
    });

    // Fixed: response.text is a property, not a method
    const newsText = response.text?.trim() || '[]';
    const news = JSON.parse(newsText);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return news.map((item: any, index: number) => ({
      ...item,
      url: item.url || (chunks[index]?.web?.uri || '#')
    }));
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
}

/** 
 * Gửi file lên backend localhost:8000/files
 */
export async function uploadFilesToBackend(files: File[]) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${BACKEND_URL}/files`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

/**
 * Gọi API generate của backend với cơ chế Streaming
 */
export async function* generateAnswerFromBackend(question: string, fileNames: string[]) {
  const response = await fetch(`${BACKEND_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      file_names: fileNames
    })
  });

  if (!response.ok) throw new Error("Failed to connect to backend");

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}

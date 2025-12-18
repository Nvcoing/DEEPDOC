
import { GoogleGenAI, Type } from "@google/genai";
import { Document, Message, Language, NewsArticle } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Lấy danh sách 4 tin tức thế giới hoặc bài báo mới nhất, nổi bật nhất về công nghệ, khoa học hoặc kinh tế. Trình bày dưới dạng JSON array với các trường: title, summary (ngắn gọn 1 câu), url (nếu có), category. Phản hồi bằng ${language}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    // Extract grounding URLs if available to supplement JSON
    const news = JSON.parse(response.text || '[]');
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

export async function generateDocumentAnswer(
  query: string,
  documents: Document[],
  history: Message[],
  language: Language = 'English'
) {
  const model = 'gemini-3-pro-preview';
  
  const contextText = documents.map(doc => `
--- DOCUMENT: ${doc.name} (ID: ${doc.id}) ---
${doc.content}
--- END DOCUMENT ---
  `).join('\n\n');

  const systemInstruction = `
    You are a professional Document-Centric Knowledge Agent. 
    Your primary goal is to answer questions strictly based on the provided document context.
    
    RULES:
    1. Only use information from the documents provided below.
    2. If the answer is not found in the documents, state: "I cannot find this information in your uploaded documents."
    3. Citations are mandatory. Mention [Document Name].
    4. Respond in ${language}.
    
    CONTEXT DOCUMENTS:
    ${contextText}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          parts: [{ text: m.content }] 
        })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate response.");
  }
}

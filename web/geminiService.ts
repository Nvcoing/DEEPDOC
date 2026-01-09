
import { Language, NewsArticle } from "./types";

const BACKEND_URL = "http://localhost:8000";

/** 
 * Lấy tin tức - Bây giờ chỉ dùng mock hoặc gọi API backend (không dùng Gemini SDK ở frontend)
 */
export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  // Thay thế Gemini bằng một lời gọi đến backend hoặc dữ liệu tĩnh để tránh dùng API Key ở frontend
  try {
    const response = await fetch(`${BACKEND_URL}/news?lang=${language}`);
    if (response.ok) return await response.json();
    
    // Fallback dữ liệu mẫu nếu API backend chưa có
    return [
      { title: "Nâng cấp hệ thống tri thức v2.5", summary: "DocuMind đã chính thức loại bỏ API Key ở client để bảo mật hơn.", category: "System" },
      { title: "Kỹ thuật RAG mới trong quản lý tài liệu", summary: "Tìm hiểu cách hệ thống truy xuất thông tin chính xác từ PDF.", category: "Tech" }
    ];
  } catch (error) {
    return [];
  }
}

/** 
 * Gửi file lên backend
 */
export async function uploadFilesToBackend(files: File[]) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  // Tăng timeout lên 30 phút (1800000ms) để hỗ trợ upload file lớn
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 phút

  try {
    const response = await fetch(`${BACKEND_URL}/files`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 504) {
        throw new Error("Upload timeout: Files may be too large.");
      }
      throw new Error("Upload failed");
    }
    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Upload timeout: Files took too long to upload. Please try smaller files.");
    }
    throw error;
  }
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

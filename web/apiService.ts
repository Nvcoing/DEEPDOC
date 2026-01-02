
import { Language, NewsArticle } from "./types";

const BACKEND_URL = "http://localhost:8000";

export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  return [
    { title: "Cập nhật hệ thống v2.0", summary: "Hệ thống đã hỗ trợ quản lý thư mục và lịch sử phiên bản.", category: "Hệ thống" }
  ];
}

export async function uploadFilesToBackend(files: File[]) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const response = await fetch(`${BACKEND_URL}/files`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

/** 
 * API Tải xuống tài liệu từ FastAPI
 */
export function downloadFile(fileName: string) {
  const url = `${BACKEND_URL}/files/${encodeURIComponent(fileName)}`;
  window.open(url, '_blank');
}

/** 
 * API Xóa tài liệu từ FastAPI (Vật lý)
 */
export async function deleteFilePermanently(fileName: string) {
  const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error("Delete failed");
  return response.json();
}

export async function* generateAnswerFromBackend(question: string, fileNames: string[], language: Language) {
  const response = await fetch(`${BACKEND_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, file_names: fileNames })
  });
  if (!response.ok) throw new Error("Connection failed");
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}

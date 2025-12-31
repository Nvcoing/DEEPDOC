
import { Language, NewsArticle, Document } from "./types";

const BACKEND_URL = "http://localhost:8000";

export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  return [
    { title: "Cập nhật hệ thống v2.0", summary: "Hỗ trợ quản lý thư mục và phòng ban.", url: "#", category: "Hệ thống" }
  ];
}

export async function uploadFilesToBackend(files: File[]) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const response = await fetch(`${BACKEND_URL}/files`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

export async function downloadFile(fileName: string) {
  window.open(`${BACKEND_URL}/files/${fileName}`, '_blank');
}

export async function hardDeleteFile(fileName: string) {
  const response = await fetch(`${BACKEND_URL}/files/${fileName}`, { method: 'DELETE' });
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

/** 
 * Mock tìm kiếm tài liệu (Logic thực tế sẽ gọi API Search)
 */
export function filterDocuments(docs: Document[], query: string) {
  const q = query.toLowerCase();
  return docs.filter(d => d.name.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
}


import { Language } from "./types";

// Sử dụng biến môi trường hoặc fallback về localhost
const BACKEND_URL = "http://localhost:8000";

/** 
 * Tải tài liệu lên Backend
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

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
}

/** 
 * Tải một tài liệu lên Backend với thông tin bổ sung (thư mục, phòng ban)
 * Được sử dụng bởi AdminPanel để tải tài liệu vào các phòng ban hoặc thư mục cụ thể.
 */
export async function uploadFileToBackend(file: File, folderId?: string, departmentId?: string) {
  const formData = new FormData();
  // Backend mong đợi trường 'files' là một danh sách các tệp tin
  formData.append('files', file);
  if (folderId) formData.append('folder_id', folderId);
  if (departmentId) formData.append('department_id', departmentId);

  const response = await fetch(`${BACKEND_URL}/files`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
}

/** 
 * Tải xuống tài liệu từ FastAPI
 */
export function downloadFile(fileName: string) {
  // Theo code backend: GET /files/{file_name}
  const url = `${BACKEND_URL}/files/${encodeURIComponent(fileName)}`;
  window.open(url, '_blank');
}

/** 
 * Xóa tài liệu vật lý từ hệ thống
 */
export async function deleteFilePermanently(fileName: string) {
  // Theo code backend: DELETE /files/{file_name}
  const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error("Xóa tệp không thành công");
  return response.json();
}

/**
 * API Chat với cơ chế Streaming từ Backend /generate
 */
export async function* generateAnswerFromBackend(question: string, fileNames: string[]) {
  const response = await fetch(`${BACKEND_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      question: question, 
      file_names: fileNames
    })
  });

  if (!response.ok) throw new Error("Không thể kết nối với trung tâm trí tuệ AI");

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}

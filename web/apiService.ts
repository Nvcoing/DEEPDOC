
import { Language } from "./types";

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
 */
export async function uploadFileToBackend(file: File, folderId?: string, departmentId?: string) {
  const formData = new FormData();
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
  const url = `${BACKEND_URL}/files/${encodeURIComponent(fileName)}`;
  window.open(url, '_blank');
}

/** 
 * Xóa tài liệu vật lý từ hệ thống theo API cung cấp
 */
export async function deleteFilePermanently(fileName: string) {
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

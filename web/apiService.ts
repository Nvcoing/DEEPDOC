
import { Language } from "./types";

// Khởi tạo URL mặc định
export let BACKEND_URL = "http://localhost:8000";

// Tự động tải cấu hình từ file bên ngoài
const loadConfig = async () => {
  try {
    const response = await fetch('/api.txt');
    if (response.ok) {
      let url = await response.text();
      // Loại bỏ hoàn toàn khoảng trắng, xuống dòng và các ký tự không thuộc URL hợp lệ ở cuối
      url = url.trim().replace(/[^a-zA-Z0-9:/._-]+$/, '').replace(/\/+$/, '');
      if (url && url.startsWith('http')) {
        BACKEND_URL = url;
        console.log("🚀 Backend URL synced:", BACKEND_URL);
      }
    }
  } catch (error) {
    console.warn("⚠️ api.txt not found, using default URL.");
  }
};

loadConfig();

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

export function downloadFile(fileName: string) {
  const url = `${BACKEND_URL}/files/${encodeURIComponent(fileName)}`;
  window.open(url, '_blank');
}

/**
 * Lấy URL Preview từ API mới
 */
export function getPreviewUrl(fileName: string) {
  return `${BACKEND_URL}/files/preview/${encodeURIComponent(fileName)}`;
}

export async function deleteFilePermanently(fileName: string) {
  const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error("Xóa tệp không thành công");
  return response.json();
}

/**
 * Tăng timeout cho API generate (dùng cho streaming)
 */
export async function* generateAnswerFromBackend(question: string, fileNames: string[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 phút timeout

  try {
    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: question, 
        file_names: fileNames
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Không thể kết nối với trung tâm trí tuệ AI hoặc yêu cầu quá lâu");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("Yêu cầu đã quá thời gian xử lý (Timeout). Vui lòng thử lại với câu hỏi ngắn hơn.");
    }
    throw error;
  }
}

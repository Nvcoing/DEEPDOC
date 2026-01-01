
import { Language, NewsArticle } from "./types";

const BACKEND_URL = "http://localhost:8000";

/** 
 * Mock dữ liệu tin tức vì ứng dụng đã loại bỏ Gemini trực tiếp.
 */
export async function fetchTrendingNews(language: Language = 'Vietnamese'): Promise<NewsArticle[]> {
  const mockNews: Record<string, NewsArticle[]> = {
    Vietnamese: [
      { title: "Sự trỗi dậy của AI trong nghiên cứu tài liệu", summary: "Công nghệ RAG đang thay đổi cách chúng ta tương tác với kiến thức.", url: "#", category: "Công nghệ" },
      { title: "Xu hướng làm việc từ xa năm 2025", summary: "Các công cụ cộng tác trực tuyến ngày càng trở nên thông minh hơn.", url: "#", category: "Kinh tế" }
    ],
    English: [
      { title: "The Rise of AI in Document Research", summary: "RAG technology is changing how we interact with knowledge.", url: "#", category: "Tech" },
      { title: "Remote Work Trends 2025", summary: "Online collaboration tools are getting smarter.", url: "#", category: "Economy" }
    ],
    French: [{ title: "L'essor de l'IA", summary: "La technologie RAG change tout.", url: "#", category: "Tech" }, { title: "Travail à distance 2025", summary: "Les outils deviennent plus intelligents.", url: "#", category: "Économie" }],
    German: [{ title: "Der Aufstieg der KI", summary: "RAG-Technologie verändert das Wissen.", url: "#", category: "Tech" }, { title: "Remote-Work-Trends 2025", summary: "Kollaborationstools werden smarter.", url: "#", category: "Wirtschaft" }],
    Japanese: [{ title: "AIの台頭", summary: "RAG技術が知識との関わり方を変える。", url: "#", category: "テクノロジー" }, { title: "2025年のリモートワーク", summary: "コラボレーションツールがよりスマートに。", url: "#", category: "経済" }],
    Korean: [{ title: "AI의 부상", summary: "RAG 기술이 지식 상호작용을 변화시킵니다.", url: "#", category: "기술" }, { title: "2025년 원격 근무 트렌드", summary: "협업 도구가 더 스마트해집니다.", url: "#", category: "경제" }],
    Chinese: [{ title: "AI的兴起", summary: "RAG技术正在改变我们的知识互动方式。", url: "#", category: "科技" }, { title: "2025年远程办公趋势", summary: "协作工具变得更加智能。", url: "#", category: "经济" }]
  };
  
  return mockNews[language] || mockNews.English;
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
 * Gọi API generate của backend với cơ chế Streaming.
 * Tự động chèn yêu cầu ngôn ngữ ẩn dựa trên giao diện.
 */
export async function* generateAnswerFromBackend(question: string, fileNames: string[], language: Language) {
  const languageInstructions: Record<Language, string> = {
    Vietnamese: "Hãy trả lời bằng tiếng Việt: ",
    English: "Please answer in English: ",
    French: "Veuillez répondre en français: ",
    German: "Bitte antworten Sie auf Deutsch: ",
    Japanese: "日本語で答えてください: ",
    Korean: "한국어로 답변해 주세요: ",
    Chinese: "请用中文回答: "
  };

  const augmentedQuestion = `${languageInstructions[language] || ""}${question}`;

  const response = await fetch(`${BACKEND_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: augmentedQuestion,
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

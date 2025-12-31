
import { Language } from './types';

export const TRANSLATIONS: Record<Language, any> = {
  English: {
    langCode: "EN", home: "Home", research: "Research", library: "Library",
    folderMgmt: "Folder Mgmt", trash: "Trash", history: "Version History",
    download: "Download", restore: "Restore", delete: "Delete",
    softDelete: "Move to Trash", hardDelete: "Delete Permanently",
    createFolder: "New Folder", departments: "Departments",
    permissions: "Permissions", searchPlaceholder: "Search by name or content...",
    brandName: "DocuMind", poweredBy: "Powered by DocuMind v2.0",
    welcome: "Welcome back", startNew: "Start New Research", recentDiscussions: "Recent Discussions",
    knowledgeTitle: "Knowledge Base", uploadDesc: "Upload Documents", noDocsFocused: "No documents focused",
    modeLibrary: "Library Mode", modeFocus: "Focus Mode", focusedDocs: "Focused Docs",
    selectMode: "Select Research Mode", focusNewDocs: "Focus on New Docs", focusDesc: "Upload specific documents to analyze them deeply.",
    useLibrary: "Use Library", libraryDesc: "Search across your entire document repository.",
    summaryPrompt: "Summarize the key findings from my library.", docDetails: "Document Details", rawContent: "Raw Content", portalName: "Intelligence Portal"
  },
  Vietnamese: {
    langCode: "VN", home: "Trang chủ", research: "Nghiên cứu", library: "Thư viện",
    folderMgmt: "Quản lý Thư mục", trash: "Thùng rác", history: "Lịch sử phiên bản",
    download: "Tải xuống", restore: "Khôi phục", delete: "Xóa",
    softDelete: "Bỏ vào thùng rác", hardDelete: "Xóa vĩnh viễn",
    createFolder: "Thư mục mới", departments: "Phòng ban",
    permissions: "Phân quyền", searchPlaceholder: "Tìm theo tên hoặc nội dung...",
    brandName: "DocuMind", poweredBy: "Hệ thống quản trị tài liệu v2.0",
    welcome: "Chào mừng trở lại", startNew: "Bắt đầu nghiên cứu mới", recentDiscussions: "Thảo luận gần đây",
    knowledgeTitle: "Cơ sở tri thức", uploadDesc: "Tải tài liệu lên", noDocsFocused: "Chưa có tài liệu tiêu điểm",
    modeLibrary: "Chế độ thư viện", modeFocus: "Chế độ tiêu điểm", focusedDocs: "Tài liệu tiêu điểm",
    selectMode: "Chọn chế độ nghiên cứu", focusNewDocs: "Tập trung tài liệu mới", focusDesc: "Tải lên các tài liệu cụ thể để phân tích chuyên sâu.",
    useLibrary: "Dùng thư viện", libraryDesc: "Tìm kiếm trên toàn bộ kho lưu trữ tài liệu của bạn.",
    summaryPrompt: "Tóm tắt các phát hiện chính từ thư viện của tôi.", docDetails: "Chi tiết tài liệu", rawContent: "Nội dung thô", portalName: "Cổng thông tin thông minh"
  },
  French: {
    langCode: "FR", home: "Accueil", research: "Recherche", library: "Bibliothèque",
    folderMgmt: "Gestion des dossiers", trash: "Corbeille", brandName: "DocuMind", startNew: "Démarrer"
  },
  German: {
    langCode: "DE", home: "Startseite", research: "Forschung", library: "Bibliothek",
    folderMgmt: "Ordnerverwaltung", trash: "Papierkorb", brandName: "DocuMind", startNew: "Starten"
  },
  Japanese: {
    langCode: "JP", home: "ホーム", research: "研究", library: "ライブラリ",
    folderMgmt: "フォルダ管理", trash: "ゴミ箱", brandName: "DocuMind", startNew: "開始"
  },
  Korean: {
    langCode: "KR", home: "홈", research: "연구", library: "라이브러리",
    folderMgmt: "폴더 관리", trash: "휴지통", brandName: "DocuMind", startNew: "시작"
  },
  Chinese: {
    langCode: "CN", home: "首页", research: "研究", library: "库",
    folderMgmt: "文件夹管理", trash: "回收站", brandName: "DocuMind", startNew: "开始"
  }
};

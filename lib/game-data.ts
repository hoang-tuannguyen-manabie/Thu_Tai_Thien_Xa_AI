export type TargetKind = "ai" | "non-ai"
export type QuestionDifficulty = "easy" | "medium" | "hard"

export interface GameQuestion {
  id: number
  question: string
  scenario: string
  image: string | null
  correctAnswer: TargetKind
  explanation: string
  category: string
  illustrationKey: string
  difficulty: QuestionDifficulty
  toolName?: string
}

export const sampleQuestions: GameQuestion[] = [
  {
    id: 1,
    question: "Điện thoại mở khóa bằng cách nhận diện khuôn mặt của em.",
    scenario: "Điện thoại mở khóa bằng cách nhận diện khuôn mặt của em.",
    image: "/assets/tools/tool-2.png",
    illustrationKey: "FACE",
    correctAnswer: "ai",
    category: "THIẾT BỊ THÔNG MINH",
    toolName: "Nhận diện khuôn mặt (Face ID)",
    difficulty: "easy",
    explanation:
      "AI (Thị giác máy tính) phân tích cấu trúc và đặc điểm trên khuôn mặt để nhận ra đúng người dùng ngay cả khi đeo kính hay đổi góc nhìn.",
  },
  {
    id: 2,
    question: "Đồng hồ báo thức reo đúng giờ mà em đã cài đặt.",
    scenario: "Đồng hồ báo thức reo đúng giờ mà em đã cài đặt.",
    image: "/assets/tools/tool-6.png",
    illustrationKey: "TIME",
    correctAnswer: "non-ai",
    category: "ĐỒ DÙNG HẰNG NGÀY",
    toolName: "Đồng hồ báo thức hẹn giờ",
    difficulty: "easy",
    explanation:
      "Đồng hồ chỉ so sánh thời gian hiện tại với mốc giờ cố định đã đặt (quy tắc IF-THEN), không tự học hay suy luận từ dữ liệu.",
  },
  {
    id: 3,
    question: "Trợ lý ảo nghe giọng nói tự nhiên và trả lời câu hỏi của em.",
    scenario: "Trợ lý ảo nghe giọng nói tự nhiên và trả lời câu hỏi của em.",
    image: "/assets/tools/tool-1.png",
    illustrationKey: "VOICE",
    correctAnswer: "ai",
    category: "TRỢ LÝ ẢO",
    toolName: "Trợ lý giọng nói thông minh",
    difficulty: "easy",
    explanation:
      "AI sử dụng công nghệ nhận dạng giọng nói (ASR) và xử lý ngôn ngữ tự nhiên (NLP) để hiểu câu hỏi và tạo câu trả lời phù hợp.",
  },
  {
    id: 4,
    question: "Máy tính bỏ túi thực hiện phép cộng theo con số em nhập.",
    scenario: "Máy tính bỏ túi thực hiện phép cộng theo con số em nhập.",
    image: "/assets/tools/tool-12.png",
    illustrationKey: "CALC",
    correctAnswer: "non-ai",
    category: "CÔNG CỤ HỌC TẬP",
    toolName: "Máy tính bỏ túi cầm tay",
    difficulty: "easy",
    explanation:
      "Máy tính bỏ túi chỉ thực hiện các quy tắc toán học cố định đã được lập trình cứng, không có khả năng học máy.",
  },
  {
    id: 5,
    question: "Ứng dụng video gợi ý nội dung dựa trên sở thích và lịch sử xem của em.",
    scenario: "Ứng dụng video gợi ý nội dung dựa trên sở thích và lịch sử xem của em.",
    image: "/assets/tools/tool-3.png",
    illustrationKey: "VIDEO",
    correctAnswer: "ai",
    category: "ỨNG DỤNG GIẢI TRÍ",
    toolName: "Hệ thống gợi ý video cá nhân hóa",
    difficulty: "medium",
    explanation:
      "AI (Học máy) phân tích thói quen và lựa chọn trước đó của em để tự động cá nhân hóa các video đề xuất.",
  },
  {
    id: 6,
    question: "Công tắc thông thường bật và tắt đèn trong phòng khi em nhấn nút.",
    scenario: "Công tắc thông thường bật và tắt đèn trong phòng khi em nhấn nút.",
    image: "/assets/tools/tool-10.png",
    illustrationKey: "LIGHT",
    correctAnswer: "non-ai",
    category: "ĐIỆN TỬ GIA DỤNG",
    toolName: "Công tắc điện cơ học",
    difficulty: "easy",
    explanation:
      "Công tắc chỉ đóng hoặc ngắt mạch điện vật lý theo thao tác tay của em, hoàn toàn không sử dụng trí tuệ nhân tạo.",
  },
  {
    id: 7,
    question: "Ứng dụng dịch tự động chuyển lời nói sang ngôn ngữ khác đúng ngữ cảnh.",
    scenario: "Ứng dụng dịch tự động chuyển lời nói sang ngôn ngữ khác đúng ngữ cảnh.",
    image: "/assets/tools/tool-4.png",
    illustrationKey: "LANG",
    correctAnswer: "ai",
    category: "NGÔN NGỮ",
    toolName: "Dịch máy nơ-ron (AI Translate)",
    difficulty: "medium",
    explanation:
      "AI xử lý ngôn ngữ tự nhiên (Neural Machine Translation) để nhận biết ngữ cảnh toàn câu và tạo bản dịch chính xác.",
  },
  {
    id: 8,
    question: "Bộ đếm giờ đếm ngược từ 10 phút về 0 rồi phát tiếng chuông báo.",
    scenario: "Bộ đếm giờ đếm ngược từ 10 phút về 0 rồi phát tiếng chuông báo.",
    image: "/assets/tools/tool-9.png",
    illustrationKey: "TIMER",
    correctAnswer: "non-ai",
    category: "THỜI GIAN",
    toolName: "Bộ đếm ngược thời gian",
    difficulty: "easy",
    explanation:
      "Bộ đếm chỉ giảm dần từng giây theo công thức toán học cố định và kêu chuông khi về 0, không có mô hình AI.",
  },
  {
    id: 9,
    question: "Công cụ tạo hình ảnh minh họa mới dựa trên câu mô tả văn bản của em.",
    scenario: "Công cụ tạo hình ảnh minh họa mới dựa trên câu mô tả văn bản của em.",
    image: "/assets/tools/tool-7.png",
    illustrationKey: "CAM",
    correctAnswer: "ai",
    category: "SÁNG TẠO SỐ",
    toolName: "AI Tạo sinh hình ảnh (GenAI)",
    difficulty: "medium",
    explanation:
      "Trí tuệ nhân tạo tạo sinh (Generative AI) học từ dữ liệu hình ảnh và ngôn ngữ để vẽ ra bức tranh mới theo mô tả.",
  },
  {
    id: 10,
    question: "Chuông cửa cơ học kêu kính coong và quạt điện chạy ở mức số cố định em bấm.",
    scenario: "Chuông cửa cơ học kêu kính coong và quạt điện chạy ở mức số cố định em bấm.",
    image: "/assets/tools/tool-8.png",
    illustrationKey: "FAN",
    correctAnswer: "non-ai",
    category: "ĐIỆN TỬ GIA DỤNG",
    toolName: "Chuông cửa & Quạt điện cơ học",
    difficulty: "easy",
    explanation:
      "Thiết bị chỉ hoạt động theo mạch điện và mức tốc độ cố định được chọn sẵn, không tự học hay nhận diện môi trường.",
  },
]

export function getAward(accuracy: number) {
  if (accuracy >= 90) return "XẠ THỦ AI SIÊU ĐẲNG"
  if (accuracy >= 70) return "XẠ THỦ TÀI NĂNG"
  if (accuracy >= 50) return "XẠ THỦ TRIỂN VỌNG"
  return "CÙNG LUYỆN TẬP THÊM NHÉ!"
}

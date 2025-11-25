// frontend/js/config.js - Đã cập nhật thông số chính xác
const CONFIG = {
  REGION: "ap-southeast-1", 
  
  // Thông số API Gateway
  API_BASE_URL: "https://21fq8jnn52.execute-api.ap-southeast-1.amazonaws.com/dev/", 
  FILES_API_BASE_URL: "https://l0l5l9va9b.execute-api.ap-southeast-1.amazonaws.com/dev/",
  
  // COGNITO: Đã dùng ID mới để khắc phục lỗi SECRET_HASH
  COGNITO_USER_POOL_ID: "ap-southeast-1_yZP3iSlwa", 
  COGNITO_CLIENT_ID: "6a716ppbifnvnecotqcv8vuoi3", // <-- ĐÃ DÙNG ID MỚI

  // S3 Backend (Dùng cho upload file)
  S3_BUCKET: "todo-app-group10-backend", // Tên Bucket từ Người 3

  // CẦN THÊM (nếu dùng Identity Pool cho S3 upload):
  // COGNITO_IDENTITY_POOL_ID: "YOUR_IDENTITY_POOL_ID_HERE" // Vẫn cần hỏi Người 2
};

window.CONFIG = CONFIG;
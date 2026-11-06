# TaskFlow Frontend

Frontend MVP được xây dựng bằng React, TypeScript và Vite. Giao diện sử dụng
backend API để đăng nhập, quản lý dự án/thành viên, task/sub-task, bình luận,
tệp đính kèm, dashboard và xuất CSV.

Thông báo trong ứng dụng/email, task lặp, feature flags và triển khai frontend
production chưa nằm trong MVP.

## Phát triển local

1. Khởi chạy API và các dịch vụ phụ thuộc theo hướng dẫn trong
   [README dự án](../README.md).
2. Từ thư mục `frontend/`, cài đặt dependency và chạy Vite:

   ```bash
   npm ci
   npm run dev
   ```

3. Mở URL Vite hiển thị trong terminal. Dev server proxy các route `/auth`,
   `/projects`, `/health` và `/version` đến `http://localhost:3000`, giữ cookie
   refresh cùng origin.

Chỉ đặt `VITE_API_BASE_URL` khi API có thể truy cập qua route cùng origin phù
hợp.

## Xác thực và tích hợp triển khai

- Frontend giữ access token trong bộ nhớ; thời hạn access token là **15 phút**.
- Refresh token được backend quản lý trong cookie HttpOnly và xoay vòng sau
  mỗi lần sử dụng thành công. Phiên đăng nhập hết hạn tuyệt đối sau **30 ngày**;
  refresh không gia hạn giới hạn này.
- Trong production, nên phục vụ frontend và reverse-proxy các route backend
  (`/auth`, `/projects`, `/health`, `/version`) trên cùng origin. Nếu tách
  origin, cần cấu hình CORS có credentials và chính sách cookie tương thích.
- Bytes tệp được tải trực tiếp từ trình duyệt lên presigned S3-compatible URL.
  Cấu hình bucket CORS cho origin frontend, method `PUT` và header
  `Content-Type` đã ký. Backend là nơi thực thi giới hạn kích thước **10 MiB**,
  MIME allowlist và thời hạn presigned URL **5 phút**.
- Mã giao diện tích hợp luồng attachment; việc xác minh end-to-end cần chạy
  upload, complete, download và delete trên SeaweedFS hoặc Amazon S3 thực tế.

## Kiểm tra

```bash
npm test
npm run build
```

## Tài liệu liên quan

- [Thiết kế kỹ thuật](../docs/TECHNICAL_DESIGN_DOCUMENT.md)
- [Chức năng và luồng nghiệp vụ](../docs/business-overview.md)
- [Yêu cầu sản phẩm](../docs/requirements.md)

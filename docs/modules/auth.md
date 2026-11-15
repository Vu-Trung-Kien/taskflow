# Module Xác thực & Quản lý Phiên (Auth Module)

Tài liệu này đặc tả chi tiết module Xác thực và Quản lý Phiên làm việc (`backend/src/auth/`) của TaskFlow: kiến trúc bảo mật token kép, thuật toán băm Argon2id, cơ chế xoay vòng Refresh Token an toàn, các API công khai và các bẫy kỹ thuật cần lưu ý.

---

## 1. Trách nhiệm (Responsibility)

- Tiếp nhận đăng ký người dùng mới và băm mật khẩu an toàn bằng Argon2id.
- Xác thực đăng nhập, phòng chống tấn công đo thời gian (timing attacks).
- Cấp phát Access Token ngắn hạn (JWT 15 phút) phục vụ xác thực các API nghiệp vụ.
- Quản lý phiên đăng nhập dài hạn (`AuthSession`) với giới hạn cứng tối đa 30 ngày.
- Quản lý chu trình xoay vòng Refresh Token (Token Rotation), lưu trữ mã băm SHA-256 trong cơ sở dữ liệu và tự động phát hiện tấn công phát lại (Replay Attack) để thu hồi phiên tức thì.
- Cung cấp `AccessTokenGuard` dùng chung toàn hệ thống để bảo vệ các endpoint yêu cầu xác thực.

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

### 2.1. Endpoints HTTP
- `POST /auth/register`: Đăng ký tài khoản mới (`RegisterDto`: email, password, name). Trả về Access Token và đặt cookie refresh token.
- `POST /auth/login`: Xác thực thông tin đăng nhập (`LoginDto`: email, password). Trả về Access Token và đặt cookie refresh token.
- `POST /auth/refresh`: Làm mới phiên làm việc. Đọc cookie `taskflow_refresh`, xoay vòng token trong database transaction, cấp Access Token mới và đặt cookie mới.
- `POST /auth/logout`: Thu hồi phiên làm việc hiện tại và xóa cookie `taskflow_refresh`.
- `GET /auth/me`: Lấy thông tin hồ sơ của người dùng hiện tại (yêu cầu header `Authorization: Bearer <access-token>`).

### 2.2. Dịch vụ & Guard Xuất bản (Exported Providers)
- `AuthService`: Cung cấp các phương thức xác thực và quản lý session.
- `AccessTokenGuard`: Guard kiểm tra tính hợp lệ của JWT Bearer token, giải mã payload và gắn đối tượng `user: { id, email }` vào request.

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `PrismaModule` (`PrismaService`): Thao tác với các bảng `users`, `auth_sessions`, `refresh_tokens`.
  - `@nestjs/jwt` (`JwtService`): Ký và giải mã JSON Web Token.
  - `@nestjs/config` (`ConfigService`): Đọc cấu hình `JWT_ACCESS_SECRET` và `NODE_ENV`.
  - Thư viện ngoài: `argon2` (băm và kiểm tra mật khẩu), `node:crypto` (sinh token ngẫu nhiên và băm SHA-256).
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - `ProjectsModule`, `TasksModule`, `CollaborationModule`, `NotificationsModule`: Đều import `AuthModule` để sử dụng `AccessTokenGuard` bảo vệ các endpoint controller.

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/auth/auth.module.ts`: Khai báo module, cấu hình JwtModule và xuất bản AuthService, AccessTokenGuard.
- `backend/src/auth/auth.controller.ts`: Tiếp nhận HTTP requests, xử lý cookie `taskflow_refresh` và trả về kết quả.
- `backend/src/auth/auth.service.ts`: Toàn bộ logic nghiệp vụ xác thực, Argon2id, dual-token rotation, transaction và replay detection.
- `backend/src/auth/access-token.guard.ts`: Can thiệp tiền xử lý HTTP, xác thực JWT Bearer header.
- `backend/src/auth/dto/login.dto.ts` & `register.dto.ts`: Định nghĩa và kiểm tra dữ liệu đầu vào.

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Phạm vi đường dẫn của Cookie (`path: '/auth'`)**:
   - Cookie `taskflow_refresh` được cấu hình với thuộc tính `path: '/auth'`. Do đó, trình duyệt **chỉ tự động gửi cookie này** khi request tới các endpoint bắt đầu bằng `/auth/` (như `/auth/refresh`, `/auth/logout`). Các request tới `/projects/...` sẽ không đính kèm cookie này, giúp tiết kiệm băng thông và tăng tính bảo mật.
2. **Không lưu token thô trong Database**:
   - Giá trị gửi trong cookie là chuỗi ngẫu nhiên 32 byte base64url (`rawToken`). Tuy nhiên, bảng `refresh_tokens` chỉ lưu `token_hash = SHA256(rawToken)`. Kẻ tấn công nếu có được database dump cũng không thể mạo danh phiên để làm mới token vì không thể giải mã ngược hàm băm một chiều SHA-256.
3. **Cơ chế thu hồi Replay Attack là vĩnh viễn**:
   - Khi phát hiện một refresh token đã bị thu hồi (`revokedAt != null`) được gửi lên, hệ thống không chỉ trả về 401 mà lập tức cập nhật `auth_sessions.revokedAt = now()`. Toàn bộ chuỗi token thuộc phiên đó bị vô hiệu hóa ngay lập tức.
4. **Giới hạn 30 ngày là tuyệt đối**:
   - Mỗi lần refresh thành công, hệ thống chỉ sinh token mới trong session hiện tại, giá trị `auth_sessions.expires_at` **không bao giờ được gia hạn**. Đúng 30 ngày kể từ lúc người dùng đăng nhập lần đầu, phiên sẽ hết hạn bắt buộc.
5. **Chống tấn công đo thời gian (Timing Attack Mitigation)**:
   - Trong `AuthService.login`, nếu email không tồn tại trong database, service vẫn gọi `argon2.verify(dummyPasswordHash, password)`. Điều này khiến thời gian phản hồi của request khi sai email và khi sai mật khẩu là hoàn toàn tương đương nhau, ngăn chặn kẻ xấu dò tìm sự tồn tại của email.

---

## 6. Kiểm thử Liên quan (Tests)

- **Unit Test Frontend**: `frontend/src/auth.test.tsx` (kiểm tra `AuthProvider`, đăng nhập và duy trì token trong bộ nhớ).
- **E2E Test Backend**: `backend/test/auth.e2e-spec.ts` (kiểm thử toàn diện luồng đăng ký, đăng nhập, xoay vòng refresh token, phát hiện replay attack và đăng xuất).

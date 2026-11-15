# Hướng dẫn Thiết lập Môi trường Phát triển (Local Setup)

Tài liệu này hướng dẫn chi tiết quy trình thiết lập môi trường phát triển cục bộ cho dự án TaskFlow từ đầu, bao gồm các biến môi trường, khởi chạy các service bằng Docker Compose, áp dụng migration cơ sở dữ liệu và khởi động ứng dụng frontend/backend.

---

## 1. Yêu cầu Hệ thống (Prerequisites)

- **Node.js**: Phiên bản 20.x hoặc 22.x LTS.
- **npm**: Đi kèm với Node.js.
- **Docker & Docker Compose**: Docker Engine 24+ và Docker Compose v2+.
- **Git**: Quản lý mã nguồn.

---

## 2. Cấu hình Biến Môi trường (Environment Variables)

Hệ thống sử dụng file `.env` ở thư mục gốc cho Docker Compose và file `backend/.env` cho các lệnh Prisma CLI chạy từ máy host.

### 2.1. File `.env` tại thư mục gốc dự án
Sao chép từ tệp mẫu:
```bash
cp .env.example .env
```
Nội dung file `.env` mẫu (`.env.example`):
- `POSTGRES_USER`: Tên người dùng database (mặc định: `taskflow`).
- `POSTGRES_PASSWORD`: Mật khẩu database (chỉ dùng cho local dev).
- `POSTGRES_DB`: Tên cơ sở dữ liệu (mặc định: `taskflow`).
- `JWT_ACCESS_SECRET`: Chuỗi khóa ký HMAC bí mật (tối thiểu 32 byte base64url ngẫu nhiên).
- `S3_ACCESS_KEY` & `S3_SECRET_KEY`: Khóa truy cập S3 emulator (`localdev` / `change_me_local_only`).
- `S3_BUCKET`: Tên bucket đính kèm (mặc định: `taskflow-attachments`).
- `S3_REGION`: Region S3 (mặc định: `us-east-1`).
- `S3_ENDPOINT`: Endpoint S3 nội bộ giữa các container Docker (`http://seaweedfs:8333`).
- `S3_PUBLIC_ENDPOINT`: Endpoint S3 cho trình duyệt gọi từ máy host (`http://localhost:8333`).
- `S3_FORCE_PATH_STYLE`: `true` (bắt buộc cho SeaweedFS emulator).
- `S3_ALLOWED_CONTENT_TYPES`: Allowlist định dạng MIME được phép tải lên.

### 2.2. File `backend/.env` cho máy host
Khi chạy các lệnh Prisma (`prisma migrate dev`, `prisma generate`) trực tiếp từ máy host, cần tạo file `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Đặt giá trị `DATABASE_URL` khớp với cổng và thông tin đăng nhập PostgreSQL đang bind ở máy host:
```env
DATABASE_URL="postgresql://taskflow:change_me_local_only@127.0.0.1:5432/taskflow?schema=public"
```

---

## 3. Khởi chạy Dịch vụ Nền tảng với Docker Compose

Tại thư mục gốc dự án, khởi chạy PostgreSQL, SeaweedFS (S3 emulator) và MailHog:

```bash
docker compose up -d postgres seaweedfs mailhog
```

Các cổng dịch vụ được bind vào loopback máy host (`127.0.0.1`):
- **PostgreSQL 16**: `127.0.0.1:5432`
- **SeaweedFS S3 API**: `127.0.0.1:8333`
- **MailHog SMTP**: `127.0.0.1:1025`
- **MailHog Web UI**: `http://localhost:8025` (xem email gửi đi tại local)

---

## 4. Khởi chạy Backend NestJS

1. Di chuyển vào thư mục backend và cài đặt dependencies:
   ```bash
   cd backend
   npm ci
   ```
2. Sinh mã nguồn Prisma Client và áp dụng migration:
   ```bash
   npm run db:generate
   npm run db:migrate:dev
   ```
3. Khởi động backend ở chế độ phát triển (hot-reload):
   ```bash
   npm run start:dev
   ```
   API backend sẵn sàng phục vụ tại `http://localhost:3000`.

---

## 5. Khởi chạy Frontend React

Mở một cửa sổ terminal mới:
1. Di chuyển vào thư mục frontend và cài đặt dependencies:
   ```bash
   cd frontend
   npm ci
   ```
2. Khởi chạy Vite dev server:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại địa chỉ `http://localhost:5173`.
   - *Cơ chế Dev Proxy*: Vite được cấu hình trong `frontend/vite.config.ts` để proxy toàn bộ request có prefix `/auth`, `/projects`, `/notifications`, `/health`, `/version` về `http://localhost:3000`. Do đó, cookie `taskflow_refresh` vẫn giữ cùng origin với giao diện frontend mà không gặp trở ngại CORS.

---

## 6. Chạy Toàn bộ Hệ thống trong Docker Compose

Nếu không muốn cài đặt Node.js trên máy host, có thể khởi chạy toàn bộ backend API cùng các dịch vụ phụ trợ trong container:
```bash
docker compose up --build
```
API sẽ lắng nghe tại `http://localhost:3000`.

# Module Giám sát Trạng thái & Phiên bản (Health & Telemetry Module)

Tài liệu này đặc tả chi tiết các module Giám sát Trạng thái và Thông tin Phiên bản (`backend/src/health/` và `backend/src/version/`) của TaskFlow: các endpoint kiểm tra sức khỏe liveness/readiness, kiểm tra kết nối cơ sở dữ liệu và truy vấn metadata phiên bản build phục vụ phát hành.

---

## 1. Trách nhiệm (Responsibility)

- Cung cấp probe kiểm tra sự sống (Liveness Probe): Đảm bảo tiến trình Node.js/NestJS vẫn đang chạy và có khả năng phản hồi HTTP request.
- Cung cấp probe kiểm tra độ sẵn sàng phục vụ (Readiness Probe): Thực hiện ping kiểm tra kết nối trực tiếp tới cơ sở dữ liệu PostgreSQL (`SELECT 1`).
- Cung cấp endpoint thông tin phiên bản phục vụ đối chiếu triển khai: Trả về mã Git SHA của commit tương ứng và thời điểm đóng gói Docker image (`BUILD_TIME`).

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

Toàn bộ các endpoint dưới đây là **công khai (Public)**, không yêu cầu xác thực JWT:

- `GET /health/live`: Trả về `{ status: 'ok' }` ngay lập tức, không phụ thuộc vào trạng thái cơ sở dữ liệu. Dùng cho container orchestrator để kiểm tra tiến trình có bị deadlock hay không.
- `GET /health/ready`: Sử dụng `@nestjs/terminus` và `DatabaseHealthIndicator` chạy truy vấn `prisma.$queryRaw\`SELECT 1\``. Nếu kết nối cơ sở dữ liệu thành công, trả về HTTP 200 kèm chi tiết; nếu database ngắt kết nối, trả về HTTP 503 Service Unavailable.
- `GET /version`: Trả về `{ gitSha: string, buildTime: string }` đọc từ các biến môi trường `GIT_SHA` và `BUILD_TIME` được truyền vào trong quá trình build Docker image.

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `@nestjs/terminus`: Thư viện chuẩn của NestJS để thực thi health checks.
  - `PrismaModule` (`PrismaService`): Thực hiện truy vấn kiểm tra kết nối PostgreSQL.
  - `@nestjs/config` (`ConfigService`): Đọc các biến môi trường build (`GIT_SHA`, `BUILD_TIME`).
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - Không có module nghiệp vụ nào phụ thuộc vào `HealthModule` hay `VersionModule`.
  - Được gọi trực tiếp bởi kịch bản triển khai [`deploy/deploy-release.sh`](../../deploy/deploy-release.sh) trên máy chủ EC2 để nghiệm thu release.

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/health/health.module.ts`: Khai báo module sức khỏe kết hợp với `@nestjs/terminus`.
- `backend/src/health/health.controller.ts`: Định tuyến `/health/live` và `/health/ready`.
- `backend/src/health/database.health.ts`: Lớp `DatabaseHealthIndicator` kế thừa `HealthIndicator` của Terminus để ping PostgreSQL.
- `backend/src/version/version.module.ts` & `version.controller.ts`: Định tuyến `/version`.

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Phân biệt Liveness vs Readiness**:
   - `/health/live` tuyệt đối không kiểm tra cơ sở dữ liệu. Nếu cơ sở dữ liệu tạm thời bận hoặc đang khởi động lại, liveness probe vẫn phải trả về 200 OK để ngăn container orchestrator vô tình khởi động lại API liên tục.
   - `/health/ready` bắt buộc kiểm tra cơ sở dữ liệu. Nếu database chưa sẵn sàng, endpoint trả về 503 để báo hiệu chưa thể nhận lưu lượng truy cập từ người dùng.
2. **Biến Môi trường Build trong Dockerfile**:
   - `GIT_SHA` và `BUILD_TIME` được truyền dưới dạng `ARG` trong quá trình `docker build` (`backend/Dockerfile`), sau đó gán sang `ENV` của container runtime. Nếu chạy trực tiếp trên host mà không cấu hình hai biến này trong file `.env`, endpoint sẽ trả về giá trị mặc định là `"unknown"`.

---

## 6. Kiểm thử Liên quan (Tests)

- **Unit Test Health Controller**: `backend/src/health/health.controller.spec.ts`.
- **Unit Test Version Controller**: `backend/src/version/version.controller.spec.ts`.
- **E2E Test Backend**: `backend/test/health.e2e-spec.ts`.

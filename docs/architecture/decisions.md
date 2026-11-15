# Quyết định Kiến trúc Kỹ thuật (Architectural Decision Records - ADR)

Tài liệu này ghi lại các quyết định kiến trúc quan trọng của hệ thống TaskFlow, bối cảnh lựa chọn, các phương án cân nhắc và trạng thái triển khai thực tế. Tài liệu được cập nhật liên tục theo tiến trình phát triển dự án.

---

## ADR-001: Triển khai Frontend phục vụ môi trường Production

- **Trạng thái**: `[CHƯA LÀM]`
- **Ngày quyết định**: 2026-11-07
- **Người đề xuất**: Tech Lead / DevOps Team

### Bối cảnh
Frontend của TaskFlow hiện tại được viết bằng React 19, TypeScript và Vite. Trong môi trường phát triển local, frontend chạy qua Vite dev server và sử dụng dev server proxy để chuyển tiếp các API request tới backend NestJS (`http://localhost:3000`). Tuy nhiên, ở môi trường production trên EC2, backend đang bind vào port 3000 trên loopback và chưa có giải pháp phục vụ giao diện người dùng tĩnh cũng như reverse proxy công khai.

### Các phương án cân nhắc
1. **Phương án 1: AWS S3 Static Hosting kết hợp CloudFront CDN**
   - *Ưu điểm*: Tách biệt hoàn toàn tầng tĩnh, tận dụng mạng lưới CDN toàn cầu, giảm tải tối đa cho EC2.
   - *Nhược điểm*: Yêu cầu cấu hình CORS phức tạp giữa domain frontend và backend; tốn thêm chi phí và tài nguyên Terraform trong giai đoạn MVP.
2. **Phương án 2 (Được chọn): Caddy Web Server trong Docker Compose trên cùng EC2**
   - *Ưu điểm*:
     - Tích hợp trực tiếp vào Docker Compose trên EC2 production bên cạnh container backend NestJS và PostgreSQL.
     - Caddy tự động quản lý chứng chỉ SSL/TLS (HTTPS) thông qua Let's Encrypt ngay khi được cấu hình domain công khai.
     - Phục vụ trực tiếp thư mục static build của React (`dist/`) và làm reverse proxy cho các route `/api/*` về backend container cùng mạng nội bộ.
     - Cookie xác thực (`refresh_token`) tiếp tục được lưu cùng origin, hạn chế tối đa rủi ro CORS và CSRF.
   - *Nhược điểm*: Tăng tải CPU/RAM cho máy chủ EC2 (hiện dùng `t3.small`).

### Quyết định đã chốt
- Sử dụng **Caddy** chạy dưới dạng một service container trong Docker Compose trên cùng máy chủ EC2 production.
- Trách nhiệm của Caddy:
  1. Phục vụ các tệp tĩnh từ bản build production của frontend.
  2. Định tuyến (reverse proxy) các request có prefix `/api/` (hoặc trực tiếp các endpoint backend) về container API NestJS.
  3. Tự động kích hoạt HTTPS khi có domain công khai `[CHƯA LÀM - Chưa quyết định domain]`.

### Kế hoạch thực hiện `[CHƯA LÀM]`
- Thêm cấu hình service Caddy và `Caddyfile` vào kịch bản Compose production.
- Bổ sung bước build frontend vào workflow CI/CD GitHub Actions và copy artifact vào thư mục phục vụ của Caddy trên EC2.


---

## ADR-002: Kiến trúc Đơn Máy chủ EC2 + Docker, PostgreSQL trên EBS gp3 (Không dùng AWS RDS)

- **Trạng thái**: `[ĐÃ CÓ]`
- **Ngày quyết định**: 2026-10-16
- **Người đề xuất**: DevOps / Infrastructure Team
- **Tài liệu đối chiếu**: [`infra/terraform/README.md`](../../infra/terraform/README.md) và [`infra/terraform/main.tf`](../../infra/terraform/main.tf)

### Bối cảnh
Khi thiết kế nền tảng hạ tầng AWS cho TaskFlow trong giai đoạn MVP, nhóm cần cân nhắc phương án lưu trữ cơ sở dữ liệu quan hệ PostgreSQL 16 và mô hình máy chủ ứng dụng: sử dụng dịch vụ cơ sở dữ liệu được quản lý (AWS RDS PostgreSQL) hay tự triển khai PostgreSQL dưới dạng container chạy trên cùng một máy chủ EC2 lưu trữ dữ liệu vào ổ cứng EBS riêng biệt.

### Các phương án cân nhắc
1. **Phương án 1: AWS RDS PostgreSQL kết hợp EC2 / ECS**
   - *Ưu điểm*: AWS tự động quản lý backup, cập nhật bản vá, tự động failover Multi-AZ, dễ dàng scale cấu hình và read-replica.
   - *Nhược điểm*: Chi phí duy trì RDS hàng tháng cao hơn đáng kể so với ngân sách MVP đồ án; kiến trúc mạng phức tạp hơn (cần Subnet Group, VPC Peering hoặc private subnet routing).
2. **Phương án 2 (Được chọn): Một máy chủ EC2 + Docker Compose, PostgreSQL mount EBS gp3 riêng biệt**
   - *Ưu điểm*:
     - Tối ưu chi phí tối đa: Chỉ cần duy trì một máy chủ `t3.small` chạy toàn bộ stack dịch vụ qua Docker Compose (`deploy/compose.production.yaml`).
     - Tách biệt dữ liệu và vòng đời máy chủ: Dữ liệu PostgreSQL được lưu trữ trên một EBS gp3 20 GiB mã hóa riêng biệt, bật cờ `prevent_destroy` trong Terraform và mount vào `/var/lib/taskflow/postgres/data`. Khi EC2 gặp sự cố hoặc cần thay thế instance, dữ liệu trên EBS vẫn an toàn và có thể gắn lại.
     - Bảo mật mạng nội bộ: PostgreSQL chỉ bind vào loopback trong container network, không mở port 5432 ra Internet qua Security Group. Truy cập quản trị chỉ qua AWS Systems Manager (SSM) Session Manager (không mở port 22 SSH).

### Đánh đổi Kỹ thuật (Trade-offs)
Lựa chọn kiến trúc đơn máy chủ kèm tự quản lý DB mang lại các đánh đổi sau:
- **Điểm nghẽn lỗi đơn nhất (Single Point of Failure - SPOF)**: Cả API NestJS và cơ sở dữ liệu PostgreSQL đều nằm trên cùng một EC2. Nếu máy chủ vật lý gặp sự cố phần cứng hoặc kernel crash, toàn bộ hệ thống sẽ ngừng hoạt động cho đến khi EC2 được khởi động lại hoặc thay thế.
- **Không có khả năng mở rộng ngang (No Horizontal Auto-scaling)**: Không thể scale-out nhiều instance EC2 chạy API mà không tách riêng tầng database ra khỏi máy chủ.
- **Tự quản lý sao lưu và phục hồi (Self-managed Backups & Disaster Recovery)**: Không có tính năng tự động sao lưu Point-in-Time Recovery (PITR) như RDS. Hệ thống phải tự xây dựng cron job chạy `pg_dump` nén tải lên S3 bucket backup và tự diễn tập kịch bản khôi phục khi gặp sự cố.
- **Tự quản lý Reverse Proxy & HTTPS**: Không sử dụng AWS Application Load Balancer (ALB) kết hợp AWS Certificate Manager (ACM) mà tự chạy Caddy trong Docker Compose trên cùng EC2 để quản lý chứng chỉ Let's Encrypt.

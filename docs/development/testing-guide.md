# Quy chuẩn Kiểm thử & Chất lượng Mã nguồn (Testing Guide)

Tài liệu này quy định các bước và câu lệnh thực thi kiểm tra chất lượng mã nguồn, bao gồm phân tích tĩnh (linting), kiểm tra kiểu (typecheck), kiểm thử đơn vị (unit tests) và kiểm thử tích hợp đầu cuối (e2e tests) cho cả backend NestJS và frontend React.

---

## 1. Kiểm tra Chất lượng Mã nguồn Backend

Mọi câu lệnh dưới đây được thực thi từ thư mục `backend/`:

### 1.1. Phân tích Tĩnh (Linting với Oxlint)
Dự án sử dụng `oxlint` tốc độ cao với chế độ kiểm tra type-aware:
```bash
npm run lint
```
Lệnh thực thi `oxlint --type-aware src/ test/` dựa trên cấu hình tại `backend/.oxlintrc.json`.

### 1.2. Kiểm tra Kiểu TypeScript (Typecheck)
Đảm bảo tính chặt chẽ về mặt kiểu dữ liệu trước khi build:
```bash
npm run typecheck
```
Lệnh thực thi `tsc --noEmit --incremental false` dựa trên `backend/tsconfig.json`.

### 1.3. Kiểm thử Đơn vị (Unit Tests với Jest)
Kiểm thử các service và controller độc lập với mock dependencies:
```bash
# Chạy toàn bộ unit tests
npm test -- --runInBand

# Chạy ở chế độ theo dõi thay đổi (Watch mode)
npm run test:watch

# Tạo báo cáo độ bao phủ mã nguồn (Coverage Report)
npm run test:cov
```
Cấu hình Jest nằm tại `backend/jest.config.ts`, hỗ trợ ESM qua `--experimental-vm-modules`.

### 1.4. Kiểm thử Tích hợp Đầu cuối (E2E Tests)
Kiểm thử toàn bộ luồng HTTP API kết nối tới cơ sở dữ liệu PostgreSQL thực tế:
```bash
npm run test:e2e -- --runInBand
```
- **Yêu cầu**: Cần có container PostgreSQL đang chạy (qua Docker Compose) và biến môi trường `DATABASE_URL` hợp lệ trong `backend/.env`.
- Cấu hình E2E test nằm tại `backend/test/jest-e2e.json`.

---

## 2. Kiểm thử Frontend React

Mọi câu lệnh dưới đây được thực thi từ thư mục `frontend/`:

### 2.1. Kiểm thử Giao diện & Logic (Vitest & React Testing Library)
Dự án sử dụng `vitest` kết hợp `@testing-library/react` và `jsdom`:
```bash
npm test
```
Lệnh chạy toàn bộ các file test như `frontend/src/api.test.ts` và `frontend/src/auth.test.tsx`.

### 2.2. Kiểm tra Build & Typecheck Frontend
```bash
npm run build
```
Lệnh thực hiện `tsc -b && vite build` để đảm bảo mã nguồn React biên dịch thành công mà không có lỗi TypeScript hay lỗi đóng gói tài nguyên tĩnh.

---

## 3. Tiêu chuẩn Kiểm thử trên CI Pipeline (GitHub Actions)

Mọi Pull Request gửi lên repository đều được kiểm tra tự động qua 3 job độc lập trong `.github/workflows/ci.yml`:
1. **Job `test`**: Thực thi `npm run lint`, `npm run typecheck`, và `npm test`.
2. **Job `e2e`**: Khởi tạo service container `postgres:16-alpine`, chạy `npx prisma migrate deploy` và thực thi `npm run test:e2e`.
3. **Job `image`**: Build multi-stage Docker image và quét lỗ hổng an ninh với Aqua Security Trivy. Pipeline sẽ bị chặn nếu phát hiện lỗ hổng nghiêm trọng (CRITICAL/HIGH) đã có bản vá.

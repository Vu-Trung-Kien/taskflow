# ADR-0003: Công cụ giả lập S3 ở môi trường local

- Trạng thái: Accepted
- Ngày: 2026-10-15
- Phân loại: Quyết định thiết kế (thay đổi so với kế hoạch dùng MinIO)

## Bối cảnh
Kế hoạch dùng MinIO để giả lập S3 khi phát triển local (presigned URL cho
đính kèm file). Theo các nguồn tổng hợp bên thứ ba, MinIO ngừng phát hành
Docker image cộng đồng từ 10/2025, vào maintenance mode 12/2025 và bị archive
repo năm 2026. Không còn image chính thức để kéo về.
Trên AWS vẫn dùng S3 thật, nên chỉ môi trường local bị ảnh hưởng.

## Quyết định
Dùng SeaweedFS (image chrislusf/seaweedfs, chế độ weed mini) làm S3 giả lập
local. Credential và tên bucket đặt trong .env. Image được ghim bằng digest.
Backend dùng AWS SDK với endpoint cấu hình qua biến môi trường, nên đổi công
cụ không ảnh hưởng mã nguồn.

## Phương án đã loại
- Garage: nhẹ nhưng phải khởi tạo layout, key, bucket bằng CLI, setup nhiều hơn.
- Ghim MinIO bản cũ: không còn bản vá bảo mật, chưa xác minh tag còn pull được.

## Hệ quả
- Chỉ dùng cho local và CI, không dùng cho production.
- Khác biệt hành vi giữa SeaweedFS và S3 thật có thể xuất hiện: phải test
  presigned URL trên S3 thật (bucket dev) trước khi nghiệm thu tính năng đính kèm.
- Cần ghim lại digest khi nâng phiên bản.

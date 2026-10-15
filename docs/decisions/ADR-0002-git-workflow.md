# ADR-0002: Quy ước Git, nhánh và commit

- Trạng thái: Accepted
- Ngày: 2026-10-15
- Phân loại: Đề cương (nhánh main được bảo vệ, PR, Conventional Commits) và
  quyết định thiết kế (chi tiết quy ước)

## Quyết định
1. Monorepo "taskflow": backend, frontend, infra, deploy, docs.
2. Mô hình trunk-based. Nhánh main luôn ổn định, không push trực tiếp.
3. Tên nhánh: feat/<module>-<mô-tả>, fix/<mô-tả>, và chore/, ci/, infra/,
   docs/ cho việc không phải tính năng.
4. Nhánh sống ngắn, mỗi nhánh một việc, PR nhỏ. Xóa nhánh sau khi merge.
5. Chỉ dùng Squash and merge, mỗi PR thành một commit trên main.
6. Conventional Commits: <type>(<scope>): <mô tả>. Các type: feat, fix,
   docs, test, refactor, chore, ci, infra, perf.
7. Release tag theo SemVer (v0.1.0, ..., v1.0.0), đi cùng git SHA trên ECR.

## Bảo vệ nhánh main
Repo để public (GitHub Free chỉ hỗ trợ ruleset cho repo public). Ruleset
"protect-main": bắt buộc PR (0 approval vì làm một mình), chặn force push,
chặn xóa nhánh, yêu cầu lịch sử tuyến tính, chỉ cho squash. Bypass list để
trống. Sẽ bật required status checks khi pipeline CI hoàn thành.

## Hệ quả
- Mã nguồn công khai, phải rà soát secret trước mỗi commit.
- Không có reviewer thứ hai, nên CI là lớp kiểm tra chính.

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription(
      'Tài liệu OpenAPI / Swagger chính thức của TaskFlow - Nền tảng quản lý dự án và cộng tác đa người dùng doanh nghiệp.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập JSON Web Token (Access Token) để xác thực các API yêu cầu đăng nhập',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Xác thực tài khoản, phiên làm việc (Refresh Token), đổi mật khẩu và cập nhật hồ sơ cá nhân')
    .addTag('Projects', 'Quản lý dự án, phân quyền RBAC (Owner/Member/Viewer), chuyển quyền và số liệu metrics')
    .addTag('Tasks', 'Quản lý công việc, sub-tasks, sắp xếp Kanban (Fractional Indexing), lọc và xuất CSV')
    .addTag('Collaboration', 'Bình luận trên công việc và quản lý tệp đính kèm với luồng Presigned URL S3')
    .addTag('Notifications', 'Hệ thống thông báo in-app và đánh dấu đã đọc')
    .addTag('Health', 'Kiểm tra trạng thái Liveness và Readiness (kết nối PostgreSQL)')
    .addTag('Version', 'Thông tin phiên bản mã nguồn và Git commit SHA')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'TaskFlow API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}

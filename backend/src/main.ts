import { NestFactory } from '@nestjs/core';
import { configureApplication } from './app-setup';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger-setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  setupSwagger(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

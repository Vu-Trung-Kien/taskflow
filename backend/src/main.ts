import { NestFactory } from '@nestjs/core';
import { configureApplication } from './app-setup';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

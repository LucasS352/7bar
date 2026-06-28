import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3520;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 PDV Pro rodando em: http://localhost:${port}/api`);
}
bootstrap();

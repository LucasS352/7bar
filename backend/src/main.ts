import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      // Desenvolvimento local
      'http://localhost:3521',
      'http://localhost:3000',
      // Produção HTTP
      'http://179.127.59.225:3521',
      // Produção HTTPS (quando configurado no reverse proxy)
      'https://7bar.smartek.com.br',
      'http://7bar.smartek.com.br',
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3520, '0.0.0.0');
}
bootstrap();

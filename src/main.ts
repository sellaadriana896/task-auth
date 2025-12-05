import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const originsRaw = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  const allowedOrigins = originsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  if (process.env.ENABLE_FINGERPRINT === 'true') {
    // включаем только при явном флаге, иначе отключено на дев/прод
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fp = require('express-fingerprint');
    app.use(fp());
  }
  app.use(cookieParser()); 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

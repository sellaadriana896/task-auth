import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { WsAdapter } from '@nestjs/platform-ws';
import { MicroserviceOptions } from '@nestjs/microservices';
import { RmqServerOptionsService } from './common/rabbit/rabbit.server.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const originsRaw =
    process.env.CORS_ORIGINS ??
    process.env.FRONTEND_ORIGIN ??
    'http://localhost:3000';
  const allowedOrigins = originsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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

    const fp = require('express-fingerprint');
    app.use(fp());
  }
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Подключаем RMQ микросервис через централизованный сервис опций
  const rmqOptions = app.get(RmqServerOptionsService).getOptions();
  app.connectMicroservice<MicroserviceOptions>(rmqOptions);

  // Сначала поднимаем HTTP сервер, затем запускаем микросервисы асинхронно
  await app.listen(process.env.PORT ?? 3000);
  app
    .startAllMicroservices()
    .then(() => console.log('RMQ microservice started'))
    .catch((e) => console.warn('RMQ microservice failed to start:', e));
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as fingerprint from 'express-fingerprint';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const fingerprint = require('express-fingerprint');
  const app = await NestFactory.create(AppModule);
  app.enableCors ({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(fingerprint());
  app.use(cookieParser()); 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

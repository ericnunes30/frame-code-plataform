/**
 * NestJS Backend API Entry Point
 * Frame-Code Platform - Workspace Management API
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Frame-Code Platform API                                  ║
╠══════════════════════════════════════════════════════════╣
║  API:     http://localhost:${port}/api/v1                   ║
║  WS:      ws://localhost:${port}/ws                         ║
╚══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();

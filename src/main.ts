import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cluster from 'cluster';
import * as os from 'os';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors();

  // Global settings
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('The Backend API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
}

// Clustering for high-load (10M user handle)
// In production, horizontal scaling (Kubernetes) is preferred over local clustering,
// but local clustering helps maximize single-node performance.
const clusterModule = cluster as any;
const numCPUs = os.cpus().length;

if (clusterModule.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    clusterModule.fork();
  }

  clusterModule.on('exit', (worker: any) => {
    console.log(`worker ${worker.process.pid} died. forking a new one...`);
    clusterModule.fork();
  });
} else {
  bootstrap();
}
// Trigger dev watcher reload for database connection to lawaldb

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ErroPadraoFilter } from './api/filters/erro-padrao.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ErroPadraoFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Raízes do Nordeste')
    .setDescription(
      'Back-end da rede de lanchonetes Raízes do Nordeste. Fluxo crítico: pedido → pagamento mock → status.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API em http://localhost:${port}`);
  console.log(`Swagger em http://localhost:${port}/docs`);
}

void bootstrap();

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import open from 'open';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('CargoGrid API')
    .setVersion('0.0.1')
    .setDescription('Warehouse & Port Storage Optimization Simulator')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const url = `http://localhost:${port}/docs`;
  console.log(`Swagger docs: ${url}`);

  if (process.env.NODE_ENV !== 'production') {
    await open(url);
  }
}

bootstrap();
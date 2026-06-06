import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_TENANT }
  }
});

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('products/uploads/images/:id')
  async serveProductImage(@Param('id') id: string, @Res() res: Response) {
    try {
      const image = await prisma.image.findUnique({
        where: { id }
      });

      if (!image) {
        throw new NotFoundException('Image not found');
      }

      res.setHeader('Content-Type', image.mimeType);
      res.send(image.data);
    } catch (err) {
      res.status(404).send('Product image not found');
    }
  }
}

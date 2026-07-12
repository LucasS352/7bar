import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { HeartPrismaService } from './prisma/heart-prisma.service';

@Controller()
export class AppController {
  constructor(private readonly heartPrisma: HeartPrismaService) {}

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
      const image = await this.heartPrisma.image.findUnique({
        where: { id }
      });

      if (!image) {
        throw new NotFoundException('Image not found');
      }

      // Cache imutável: ID é UUID único por imagem — conteúdo nunca muda
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', `"${id}"`);
      res.setHeader('Vary', 'Accept-Encoding');

      // Suporte a conditional GET (If-None-Match)
      const ifNoneMatch = res.req?.headers?.['if-none-match'];
      if (ifNoneMatch === `"${id}"`) {
        return res.status(304).end();
      }

      res.send(image.data);
    } catch (err) {
      res.status(404).send('Product image not found');
    }
  }
}

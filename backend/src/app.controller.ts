import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

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

  @Get('products/uploads/images/:filename')
  serveProductImage(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads/products', filename);
    if (!existsSync(filePath)) {
      res.status(404).send('Product image not found');
      return;
    }
    const file = createReadStream(filePath);
    file.pipe(res);
  }
}

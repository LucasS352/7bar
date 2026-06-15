import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch, Query, UseInterceptors, UploadedFile, UploadedFiles, Request, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService, TenantSettingsDto } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

interface AuthUser {
  tenantId: string;
  databaseUrl: string;
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.productsService.findAll(
      Number(page || 1), 
      Number(limit || 50)
    );
  }

  @Get('lookup/:barcode')
  lookupBarcode(@Param('barcode') barcode: string) {
    return this.productsService.lookupBarcode(barcode);
  }

  @Post()
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    return this.productsService.uploadPhoto(req.user.tenantId, file);
  }

  @Post('bulk-images')
  @UseInterceptors(FilesInterceptor('files', 300))
  async bulkImageUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.productsService.bulkImageUpload(req.user.tenantId, files);
  }

  @Post('bulk')
  bulkEntry(@Body('items') items: any[]) {
    return this.productsService.bulkEntry(items);
  }

  /** Entrada de estoque incremental — usa Prisma increment (sem condição de corrida) */
  @Post('add-stock/:id')
  addStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('costPrice') costPrice?: number,
    @Body('reason') reason?: string,
  ) {
    return this.productsService.addStock(id, Number(quantity), costPrice !== undefined ? Number(costPrice) : undefined, reason);
  }

  /** Lê configurações globais do tenant (ex: allowNegativeStock) */
  @Get('settings')
  getSettings(): Promise<TenantSettingsDto> {
    return this.productsService.getSettings();
  }

  /** Salva configurações globais do tenant */
  @Patch('settings')
  saveSettings(@Body() body: { allowNegativeStock: boolean }): Promise<TenantSettingsDto> {
    return this.productsService.saveSettings(body);
  }

  @Get(':id/composition')
  getComposition(@Param('id') id: string) {
    return this.productsService.getComposition(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Get(':id/lots')
  getProductLots(@Param('id') id: string) {
    return this.productsService.getProductLots(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  /** Exporta lista de produtos para contagem de inventário */
  @Get('inventory/export')
  inventoryExport(
    @Query('categoryIds') categoryIds?: string,
    @Query('productIds') productIds?: string,
  ) {
    return this.productsService.inventoryExport({
      categoryIds: categoryIds ? categoryIds.split(',').filter(Boolean) : undefined,
      productIds: productIds ? productIds.split(',').filter(Boolean) : undefined,
    });
  }

  /** Importa resultado da contagem física e atualiza o estoque */
  @Post('inventory/import')
  inventoryImport(@Body('items') items: { productId: string; newStock: number }[]) {
    return this.productsService.inventoryImport(items);
  }

  /** Retorna histórico de contagens físicas agrupado por sessão */
  @Get('inventory/history')
  inventoryHistory() {
    return this.productsService.inventoryHistory();
  }
}

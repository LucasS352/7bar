import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

/** Estrutura de um slide individual */
export interface VitrineSlide {
  slideType?: 'single';
  productId: string;
  productName: string;
  imageUrl: string | null;
  priceSell: number;
  promoPrice: number | null;
  badge: string | null;
  order: number;
}

export interface VitrineGridSlide {
  slideType: 'grid';
  gridId: string;
  order: number;
  gridTitle: string;
  gridSubtitle?: string;
  gridEmoji?: string;
  gridBadge?: string | null;
  duration?: number;
  gridProducts: {
    productId: string;
    productName: string;
    imageUrl: string | null;
    priceSell: number;
    promoPrice: number | null;
  }[];
}

export type AnyVitrineSlide = VitrineSlide | VitrineGridSlide;

/** Payload do rascunho enviado pelo frontend */
export interface DraftDto {
  theme?: string;
  customBgUrl?: string | null;
  showLogo?: boolean;
  logoPosition?: string;
  instagramHandle?: string | null;
  slideDuration?: number;
  gridSlideDuration?: number;
  draftSlides?: AnyVitrineSlide[];
}

/** Payload de publicação */
export interface PublishDto {
  userId: string;
  userName: string;
}

@Injectable()
export class VitrineService {
  private readonly logger = new Logger(VitrineService.name);

  constructor(
    private heartPrisma: HeartPrismaService,
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService,
  ) {}

  /** Retorna o cliente Prisma do tenant atual via contexto */
  private async getTenantPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  /** Retorna configuração completa (rascunho + info de publicação) */
  async getConfig() {
    const prisma = await this.getTenantPrisma();
    const config = await prisma.vitrineConfig.findFirst();

    if (!config) {
      // Retorna defaults se ainda não existe configuração
      return {
        active: false,
        version: 0,
        publishedAt: null,
        publishedByUserId: null,
        publishedByName: null,
        draftUpdatedAt: null,
        theme: 'dark_premium',
        customBgUrl: null,
        showLogo: true,
        logoPosition: 'top-left',
        instagramHandle: null,
        slideDuration: 8,
        draftSlides: [],
        publishedSlides: [],
      };
    }

    const { position, instagram } = this.parseLogoPosition(config.logoPosition);

    return {
      ...config,
      logoPosition: position,
      instagramHandle: instagram,
    };
  }

  /** Auxiliar para decodificar logoPosition + instagramHandle */
  private parseLogoPosition(raw: string | null) {
    if (!raw) return { position: 'top-left', instagram: null };
    try {
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        return {
          position: parsed.position || 'top-left',
          instagram: parsed.instagram || null,
        };
      }
      if (raw.includes('|')) {
        const [pos, insta] = raw.split('|');
        return { position: pos || 'top-left', instagram: insta || null };
      }
    } catch {}
    return { position: raw || 'top-left', instagram: null };
  }

  /** Salva rascunho sem publicar */
  async saveDraft(data: DraftDto) {
    const prisma = await this.getTenantPrisma();
    const existing = await prisma.vitrineConfig.findFirst();

    const payload: any = {
      draftUpdatedAt: new Date(),
    };
    if (data.theme !== undefined) payload.theme = data.theme;
    if (data.customBgUrl !== undefined) payload.customBgUrl = data.customBgUrl;
    if (data.showLogo !== undefined) payload.showLogo = data.showLogo;
    
    if (data.logoPosition !== undefined || data.instagramHandle !== undefined) {
      const current = this.parseLogoPosition(existing?.logoPosition || null);
      const newPos = data.logoPosition !== undefined ? data.logoPosition : current.position;
      const newInsta = data.instagramHandle !== undefined ? data.instagramHandle : current.instagram;
      payload.logoPosition = JSON.stringify({ position: newPos, instagram: newInsta });
    }

    if (data.slideDuration !== undefined) payload.slideDuration = data.slideDuration;
    if (data.draftSlides !== undefined) payload.draftSlides = data.draftSlides as any;

    if (existing) {
      return prisma.vitrineConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return prisma.vitrineConfig.create({ data: payload });
  }

  /**
   * Publica a vitrine:
   * - Copia draftSlides → publishedSlides (snapshot)
   * - Incrementa version
   * - Registra publishedBy + publishedAt
   */
  async publish(dto: PublishDto) {
    const prisma = await this.getTenantPrisma();
    const existing = await prisma.vitrineConfig.findFirst();

    if (!existing) {
      throw new NotFoundException('Configure a vitrine antes de publicar.');
    }

    const newVersion = existing.version + 1;

    return prisma.vitrineConfig.update({
      where: { id: existing.id },
      data: {
        version: newVersion,
        publishedAt: new Date(),
        publishedByUserId: dto.userId,
        publishedByName: dto.userName,
        publishedSlides: existing.draftSlides as any,
      },
    });
  }

  /** Liga ou desliga a vitrine sem republicar */
  async setActive(active: boolean) {
    const prisma = await this.getTenantPrisma();
    const existing = await prisma.vitrineConfig.findFirst();

    if (existing) {
      return prisma.vitrineConfig.update({
        where: { id: existing.id },
        data: { active },
      });
    }

    return prisma.vitrineConfig.create({ data: { active } });
  }

  /**
   * Endpoint PÚBLICO consumido pela TV.
   * Recebe o tvPublicId (do Heart DB), resolve o tenant
   * e retorna os publishedSlides + metadados de exibição.
   * Sem JWT — sem autenticação.
   */
  async getPublicPlaylist(tvPublicId: string) {
    // 1. Resolver o tenant pelo tvPublicId no Heart DB
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { tvPublicId },
    });

    if (!tenant) {
      throw new NotFoundException('Vitrine não encontrada.');
    }

    // 2. Conectar ao banco do tenant
    const tenantPrisma = await this.tenantManager.getTenantClient(
      tenant.id,
      tenant.databaseUrl,
    );

    // 3. Buscar configuração da vitrine
    const config = await tenantPrisma.vitrineConfig.findFirst();

    // Se não configurada ou desativada, retorna inactive
    if (!config || !config.active) {
      return { active: false };
    }

    const { position, instagram } = this.parseLogoPosition(config.logoPosition);

    return {
      active: true,
      version: config.version,
      theme: config.theme,
      customBgUrl: config.customBgUrl,
      showLogo: config.showLogo,
      logoPosition: position,
      instagramHandle: instagram,
      logoUrl: tenant.logoUrl ?? null,
      slideDuration: config.slideDuration,
      slides: config.publishedSlides,
    };
  }

  /** Lista os 10 temas pré-definidos disponíveis */
  getThemes() {
    return [
      { slug: 'dark_premium',     name: '✨ Dark Premium',    description: 'Preto fosco com partículas douradas' },
      { slug: 'neon_night',       name: '🌃 Neon Night',      description: 'Escuro com bordas neon coloridas' },
      { slug: 'gradient_sunset',  name: '🌅 Sunset',          description: 'Gradiente laranja/roxo dramático' },
      { slug: 'gradient_ocean',   name: '🌊 Ocean',           description: 'Azul profundo para ciano' },
      { slug: 'light_clean',      name: '💡 Clean Light',     description: 'Branco com sombras suaves' },
      { slug: 'dark_glass',       name: '🪟 Glassmorphism',   description: 'Vidro fosco sobre escuro' },
      { slug: 'forest_green',     name: '🌿 Forest',          description: 'Verde escuro premium' },
      { slug: 'fire_red',         name: '🔥 Fire',            description: 'Vermelho/laranja — energia máxima' },
      { slug: 'purple_luxury',    name: '💜 Luxury',          description: 'Roxo/dourado — sofisticação' },
      { slug: 'carbon_fiber',     name: '⬛ Carbon',          description: 'Textura carbono com detalhes metálicos' },
    ];
  }
}

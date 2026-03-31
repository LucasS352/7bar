import { Injectable } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';

@Injectable()
export class TenantsService {
  constructor(private heartPrisma: HeartPrismaService) {}

  findAll() {
    return this.heartPrisma.tenant.findMany({ include: { users: true } });
  }

  create(data: any) {
    return this.heartPrisma.tenant.create({ data });
  }
}

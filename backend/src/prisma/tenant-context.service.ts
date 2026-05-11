import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable } from 'rxjs';

export interface TenantContext {
  tenantId: string;
  databaseUrl: string;
  userId: string;
}

@Injectable()
export class TenantContextService {
  private static readonly storage = new AsyncLocalStorage<TenantContext>();

  run(context: TenantContext, callback: () => void) {
    TenantContextService.storage.run(context, callback);
  }

  get(): TenantContext {
    const context = TenantContextService.storage.getStore();
    if (!context) {
      throw new Error('TenantContext não inicializado para este request.');
    }
    return context;
  }
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return next.handle();

    const tenantContext: TenantContext = {
      tenantId: user.tenantId,
      databaseUrl: user.databaseUrl,
      userId: user.id || user.sub,
    };

    return new Observable((observer) => {
      this.tenantContext.run(tenantContext, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}

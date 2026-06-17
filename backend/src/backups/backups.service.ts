import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import archiver = require('archiver');
import { HeartPrismaService } from '../prisma/heart-prisma.service';

const execAsync = promisify(exec);

export interface BackupGroup {
  folderName: string;
  isHeart: boolean;
  tenantName: string | null;
  files: {
    filename: string;
    sizeBytes: number;
    createdAt: Date;
    path: string;
  }[];
}

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private readonly configPath = path.join(process.cwd(), 'backups', 'schedule.json');
  private lastScheduledBackupDate: string | null = null;

  constructor(private heartPrisma: HeartPrismaService) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private getDbConfig(url: string) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '3306',
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      db: parsed.pathname.slice(1)
    };
  }

  private async cleanOldBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) return;
      const dirs = fs.readdirSync(this.backupDir, { withFileTypes: true });
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      for (const dirent of dirs) {
        if (dirent.isDirectory()) {
          const folderPath = path.join(this.backupDir, dirent.name);
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            if (!file.endsWith('.sql') && !file.endsWith('.sql.gz')) continue;
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > SEVEN_DAYS) {
              fs.unlinkSync(filePath);
              this.logger.log(`Backup antigo removido: ${folderPath}/${file}`);
            }
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao limpar backups antigos: ${e.message}`);
    }
  }

  async listBackups(): Promise<BackupGroup[]> {
    await this.cleanOldBackups();
    if (!fs.existsSync(this.backupDir)) return [];
    
    const dirs = fs.readdirSync(this.backupDir, { withFileTypes: true });
    const groups: BackupGroup[] = [];

    for (const dirent of dirs) {
      if (!dirent.isDirectory()) continue;
      
      const folderPath = path.join(this.backupDir, dirent.name);
      const isHeart = dirent.name === 'heart';
      const tenantName = dirent.name.startsWith('tenant_') ? dirent.name.replace('tenant_', '') : null;
      
      const filesInDir = fs.readdirSync(folderPath);
      const files = filesInDir
        .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
        .map(file => {
          const stats = fs.statSync(path.join(folderPath, file));
          return {
            filename: file,
            sizeBytes: stats.size,
            createdAt: stats.mtime,
            path: `${dirent.name}/${file}`
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (files.length > 0) {
        groups.push({
          folderName: dirent.name,
          isHeart,
          tenantName,
          files
        });
      }
    }

    // Ordenar para que "heart" venha primeiro
    groups.sort((a, b) => {
      if (a.isHeart) return -1;
      if (b.isHeart) return 1;
      return a.folderName.localeCompare(b.folderName);
    });

    return groups;
  }

  async createBackup(type: 'heart' | 'tenant' | 'all', tenantId?: string) {
    await this.cleanOldBackups();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const heartConfig = this.getDbConfig(process.env.DATABASE_URL_HEART!);
    
    if (type === 'heart' || type === 'all') {
      const folderPath = path.join(this.backupDir, 'heart');
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
      
      const filename = `backup_heart_${timestamp}.sql`;
      const filepath = path.join(folderPath, filename);
      const cmd = `mysqldump --skip-ssl-verify-server-cert -h ${heartConfig.host} -P ${heartConfig.port} -u ${heartConfig.user} -p"${heartConfig.password}" ${heartConfig.db} > "${filepath}"`;
      
      try {
        await execAsync(cmd);
        this.logger.log(`Backup do Heart criado em: heart/${filename}`);
      } catch (e: any) {
        this.logger.error(`Falha no backup do Heart: ${e.message}`);
        throw new BadRequestException('Falha ao criar backup do Heart');
      }
    }

    if (type === 'tenant' && tenantId) {
      const tenant = await this.heartPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new NotFoundException('Tenant não encontrado');
      
      const tConfig = this.getDbConfig(tenant.databaseUrl);
      const slug = tenant.razaoSocial ? tenant.razaoSocial.replace(/[^a-zA-Z0-9]/g, '_') : tenant.name;
      const folderName = `tenant_${slug}`;
      const folderPath = path.join(this.backupDir, folderName);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const filename = `backup_tenant_${slug}_${timestamp}.sql`;
      const filepath = path.join(folderPath, filename);
      const cmd = `mysqldump --skip-ssl-verify-server-cert -h ${tConfig.host} -P ${tConfig.port} -u ${tConfig.user} -p"${tConfig.password}" ${tConfig.db} > "${filepath}"`;
      
      try {
        await execAsync(cmd);
        this.logger.log(`Backup do Tenant ${tenant.name} criado em: ${folderName}/${filename}`);
      } catch (e: any) {
        this.logger.error(`Falha no backup do Tenant ${tenant.name}: ${e.message}`);
        throw new BadRequestException('Falha ao criar backup do Tenant');
      }
    }

    if (type === 'all') {
      const tenants = await this.heartPrisma.tenant.findMany();
      for (const tenant of tenants) {
        const tConfig = this.getDbConfig(tenant.databaseUrl);
        const slug = tenant.razaoSocial ? tenant.razaoSocial.replace(/[^a-zA-Z0-9]/g, '_') : tenant.name;
        const folderName = `tenant_${slug}`;
        const folderPath = path.join(this.backupDir, folderName);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

        const filename = `backup_tenant_${slug}_${timestamp}.sql`;
        const filepath = path.join(folderPath, filename);
        const cmd = `mysqldump --skip-ssl-verify-server-cert -h ${tConfig.host} -P ${tConfig.port} -u ${tConfig.user} -p"${tConfig.password}" ${tConfig.db} > "${filepath}"`;
        
        try {
          await execAsync(cmd);
        } catch (e: any) {
          this.logger.error(`Falha no backup do Tenant ${tenant.name}: ${e.message}`);
        }
      }
    }

    return { success: true, message: 'Backup concluído com sucesso' };
  }

  async deleteBackup(folder: string, filename: string) {
    const filepath = path.join(this.backupDir, folder, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException('Arquivo de backup não encontrado');
    fs.unlinkSync(filepath);
    return { success: true };
  }

  async restoreBackup(folder: string, filename: string) {
    const filepath = path.join(this.backupDir, folder, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException('Arquivo de backup não encontrado');

    const heartConfig = this.getDbConfig(process.env.DATABASE_URL_HEART!);

    let dbConfig = heartConfig;
    if (folder === 'heart') {
      // Mantém dbConfig = heartConfig
    } else if (folder.startsWith('tenant_')) {
      const tenants = await this.heartPrisma.tenant.findMany();
      const tenant = tenants.find(t => {
        const slug = t.razaoSocial ? t.razaoSocial.replace(/[^a-zA-Z0-9]/g, '_') : t.name;
        return `tenant_${slug}` === folder;
      });
      if (!tenant) throw new NotFoundException('Tenant referente a este backup não foi encontrado no banco de dados principal.');
      
      dbConfig = this.getDbConfig(tenant.databaseUrl);
    } else {
       throw new BadRequestException('Formato de arquivo não reconhecido.');
    }

    const cmd = `mysql --skip-ssl-verify-server-cert -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p"${dbConfig.password}" ${dbConfig.db} < "${filepath}"`;
    try {
      await execAsync(cmd);
      this.logger.log(`Backup restaurado: ${folder}/${filename}`);
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Falha ao restaurar backup: ${e.message}`);
      throw new BadRequestException('Falha ao restaurar backup: ' + e.message);
    }
  }

  getBackupFilePath(folder: string, filename: string) {
    const filepath = path.join(this.backupDir, folder, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException('Arquivo não encontrado');
    return filepath;
  }

  getSchedule() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch {
        return { enabled: false, time: '02:00' };
      }
    }
    return { enabled: false, time: '02:00' };
  }

  setSchedule(config: { enabled: boolean; time: string }) {
    fs.writeFileSync(this.configPath, JSON.stringify(config));
    return config;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const config = this.getSchedule();
    if (!config.enabled) return;

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${mins}`;

    if (currentTime === config.time) {
      const today = now.toISOString().split('T')[0];
      if (this.lastScheduledBackupDate !== today) {
        this.lastScheduledBackupDate = today;
        this.logger.log(`Disparando backup agendado para ${config.time}...`);
        await this.createBackup('all');
      }
    }
  }

  async downloadAll(res: any) {
    if (!fs.existsSync(this.backupDir)) throw new NotFoundException('Nenhum backup disponível');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Backups_PDV_Geral_${new Date().toISOString().replace(/[:.]/g, '-')}.zip"`);
    
    archive.on('error', (err: any) => {
      this.logger.error(`Erro ao criar ZIP: ${err.message}`);
      res.status(500).send({ error: err.message });
    });

    const groups = await this.listBackups();
    for (const group of groups) {
      if (group.files.length > 0) {
        const mostRecentFile = group.files[0];
        const filepath = path.join(this.backupDir, mostRecentFile.path);
        archive.file(filepath, { name: `backups/${mostRecentFile.path}` });
      }
    }

    archive.pipe(res);
    await archive.finalize();
  }
}

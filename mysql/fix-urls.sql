-- ─────────────────────────────────────────────────────────────────────────────
-- 03-fix-urls.sql
-- Executado automaticamente após o dump ser importado.
-- Corrige as database_url dos tenants de localhost:3307 (XAMPP)
-- para mysql:3306 (serviço Docker interno).
-- ─────────────────────────────────────────────────────────────────────────────

USE heart;

-- Corrige host nas URLs de conexão dos tenants
UPDATE tenants
SET database_url = REPLACE(
    REPLACE(database_url, 'localhost:3307', 'mysql:3306'),
    'localhost:3306', 'mysql:3306'
);

-- Garante que a senha está correta na URL (caso venha sem senha do XAMPP)
UPDATE tenants
SET database_url = REPLACE(database_url, 'mysql://root:@mysql:3306/', 'mysql://root:7bar%402025@mysql:3306/')
WHERE database_url LIKE 'mysql://root:@mysql:3306/%';

-- Pre-migra a coluna modulos de longtext para JSON
-- (necessário para o Prisma db push não gerar SQL inválido no startup)
ALTER TABLE tenants MODIFY COLUMN modulos JSON NULL;

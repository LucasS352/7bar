"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function migrateMissingShortCodes() {
    const tenantDatabaseUrl = process.env.DATABASE_URL_TENANT;
    if (!tenantDatabaseUrl) {
        console.error('❌ DATABASE_URL_TENANT não está definida no ambiente!');
        process.exit(1);
    }
    const { PrismaClient } = require('../../node_modules/@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: tenantDatabaseUrl } } });
    try {
        await prisma.$connect();
        console.log('✅ Conectado ao banco do tenant');
        const productsWithoutCode = await prisma.product.findMany({
            where: { shortCode: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true }
        });
        if (productsWithoutCode.length === 0) {
            console.log('✅ Todos os produtos já possuem shortCode. Nada a fazer.');
            return;
        }
        console.log(`🔄 Encontrados ${productsWithoutCode.length} produtos sem shortCode. Iniciando migração...`);
        const allProducts = await prisma.product.findMany({
            where: { shortCode: { not: null } },
            select: { shortCode: true }
        });
        let maxNum = 0;
        allProducts.forEach((p) => {
            const num = parseInt(p.shortCode || '0', 10);
            if (!isNaN(num) && num > maxNum)
                maxNum = num;
        });
        console.log(`📌 Maior shortCode existente: ${maxNum}. Próximo será: ${maxNum + 1}`);
        let counter = maxNum + 1;
        for (const product of productsWithoutCode) {
            const newCode = counter.toString();
            await prisma.product.update({
                where: { id: product.id },
                data: { shortCode: newCode }
            });
            console.log(`  → [${newCode}] ${product.name}`);
            counter++;
        }
        console.log(`\n🎉 Migração concluída! ${productsWithoutCode.length} produtos atualizados.`);
    }
    catch (err) {
        console.error('❌ Erro durante a migração:', err);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
migrateMissingShortCodes();
//# sourceMappingURL=migrate-shortcodes.js.map
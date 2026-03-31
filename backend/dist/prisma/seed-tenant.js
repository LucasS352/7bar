"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:@localhost:3307/7bar'
        }
    }
});
async function main() {
    await prisma.saleItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    const catCervejas = await prisma.category.create({ data: { name: 'Cervejas' } });
    const catDestilados = await prisma.category.create({ data: { name: 'Destilados' } });
    const catConveniencia = await prisma.category.create({ data: { name: 'Conveniência' } });
    const catEnergeticos = await prisma.category.create({ data: { name: 'Energéticos' } });
    const catSucos = await prisma.category.create({ data: { name: 'Refrigerantes e Sucos' } });
    const catPetiscos = await prisma.category.create({ data: { name: 'Salgadinhos e Petiscos' } });
    const catDoces = await prisma.category.create({ data: { name: 'Chocolates e Balas' } });
    const catCombos = await prisma.category.create({ data: { name: 'Copão / Combos' } });
    const catTabacaria = await prisma.category.create({ data: { name: 'Tabacaria' } });
    const products = [
        { name: 'Heineken Long Neck 330ml', priceSell: 6.90, priceCost: 4.80, stock: 120, categoryId: catCervejas.id },
        { name: 'Heineken Latão 473ml', priceSell: 7.50, priceCost: 5.50, stock: 100, categoryId: catCervejas.id },
        { name: 'Brahma Duplo Malte Latão 473ml', priceSell: 4.90, priceCost: 3.20, stock: 300, categoryId: catCervejas.id },
        { name: 'Brahma Chopp Lata 350ml', priceSell: 3.50, priceCost: 2.20, stock: 150, categoryId: catCervejas.id },
        { name: 'Amstel Lata 350ml', priceSell: 4.00, priceCost: 2.80, stock: 200, categoryId: catCervejas.id },
        { name: 'Amstel Latão 473ml', priceSell: 4.80, priceCost: 3.50, stock: 120, categoryId: catCervejas.id },
        { name: 'Spaten Long Neck 355ml', priceSell: 5.90, priceCost: 4.00, stock: 90, categoryId: catCervejas.id },
        { name: 'Stella Artois Long Neck 330ml', priceSell: 7.50, priceCost: 5.50, stock: 40, categoryId: catCervejas.id },
        { name: 'Corona Long Neck 330ml', priceSell: 6.90, priceCost: 4.90, stock: 60, categoryId: catCervejas.id },
        { name: 'Skol Lata 350ml', priceSell: 3.20, priceCost: 2.00, stock: 250, categoryId: catCervejas.id },
        { name: 'Absolut Vodka 1L', priceSell: 95.00, priceCost: 65.00, stock: 15, categoryId: catDestilados.id },
        { name: 'Smirnoff Vodka 998ml', priceSell: 49.90, priceCost: 35.00, stock: 30, categoryId: catDestilados.id },
        { name: 'Johnnie Walker Red Label 1L', priceSell: 109.90, priceCost: 80.00, stock: 20, categoryId: catDestilados.id },
        { name: 'Johnnie Walker Black Label 1L', priceSell: 189.90, priceCost: 140.00, stock: 8, categoryId: catDestilados.id },
        { name: 'Jack Daniels No. 7 1L', priceSell: 159.90, priceCost: 110.00, stock: 10, categoryId: catDestilados.id },
        { name: 'Gin Tanqueray 750ml', priceSell: 139.90, priceCost: 95.00, stock: 12, categoryId: catDestilados.id },
        { name: 'Gin Gordon\'s 750ml', priceSell: 79.90, priceCost: 55.00, stock: 18, categoryId: catDestilados.id },
        { name: 'Campari 900ml', priceSell: 65.00, priceCost: 45.00, stock: 20, categoryId: catDestilados.id },
        { name: 'Cachaça 51 965ml', priceSell: 14.00, priceCost: 8.50, stock: 40, categoryId: catDestilados.id },
        { name: 'Tequila Jose Cuervo 750ml', priceSell: 129.90, priceCost: 90.00, stock: 15, categoryId: catDestilados.id },
        { name: 'Red Bull Lata 250ml', priceSell: 9.90, priceCost: 6.90, stock: 80, categoryId: catEnergeticos.id },
        { name: 'Red Bull Tropical 250ml', priceSell: 9.90, priceCost: 6.90, stock: 60, categoryId: catEnergeticos.id },
        { name: 'Monster Energy 473ml', priceSell: 11.90, priceCost: 8.50, stock: 50, categoryId: catEnergeticos.id },
        { name: 'Monster Mango Loco 473ml', priceSell: 11.90, priceCost: 8.50, stock: 45, categoryId: catEnergeticos.id },
        { name: 'Baly Morango/Pêssego 2L', priceSell: 15.00, priceCost: 10.00, stock: 35, categoryId: catEnergeticos.id },
        { name: 'Baly Tradicional 2L', priceSell: 15.00, priceCost: 10.00, stock: 40, categoryId: catEnergeticos.id },
        { name: 'Fusion 2L', priceSell: 16.00, priceCost: 11.00, stock: 25, categoryId: catEnergeticos.id },
        { name: 'Coca-Cola 2L', priceSell: 11.00, priceCost: 7.50, stock: 60, categoryId: catSucos.id },
        { name: 'Guaraná Antarctica 2L', priceSell: 8.50, priceCost: 5.50, stock: 70, categoryId: catSucos.id },
        { name: 'Coca-Cola Lata 350ml', priceSell: 5.00, priceCost: 3.20, stock: 120, categoryId: catSucos.id },
        { name: 'Guaraná Antarctica Lata 350ml', priceSell: 4.50, priceCost: 2.90, stock: 100, categoryId: catSucos.id },
        { name: 'Sprite 2L', priceSell: 9.00, priceCost: 6.00, stock: 30, categoryId: catSucos.id },
        { name: 'Fanta Laranja 2L', priceSell: 9.00, priceCost: 6.00, stock: 30, categoryId: catSucos.id },
        { name: 'Suco Del Valle Uva 1L', priceSell: 7.50, priceCost: 5.00, stock: 40, categoryId: catSucos.id },
        { name: 'Suco Del Valle Pêssego 1L', priceSell: 7.50, priceCost: 5.00, stock: 40, categoryId: catSucos.id },
        { name: 'Água Mineral c/ Gás 500ml', priceSell: 2.50, priceCost: 1.00, stock: 100, categoryId: catSucos.id },
        { name: 'Água Mineral s/ Gás 500ml', priceSell: 2.00, priceCost: 0.80, stock: 120, categoryId: catSucos.id },
        { name: 'Ruffles Original 76g', priceSell: 8.50, priceCost: 5.50, stock: 30, categoryId: catPetiscos.id },
        { name: 'Doritos Queijo Nacho 76g', priceSell: 8.50, priceCost: 5.50, stock: 35, categoryId: catPetiscos.id },
        { name: 'Cheetos Queijo 75g', priceSell: 7.50, priceCost: 4.80, stock: 25, categoryId: catPetiscos.id },
        { name: 'Fandangos Presunto 75g', priceSell: 7.00, priceCost: 4.50, stock: 20, categoryId: catPetiscos.id },
        { name: 'Amendoim Japones Dori', priceSell: 6.00, priceCost: 3.50, stock: 40, categoryId: catPetiscos.id },
        { name: 'Salamitos 70g', priceSell: 7.00, priceCost: 4.50, stock: 15, categoryId: catPetiscos.id },
        { name: 'Kit Kat ao Leite 41,5g', priceSell: 4.50, priceCost: 2.80, stock: 60, categoryId: catDoces.id },
        { name: 'Laka 90g', priceSell: 7.50, priceCost: 4.80, stock: 30, categoryId: catDoces.id },
        { name: 'Diamante Negro 90g', priceSell: 7.50, priceCost: 4.80, stock: 30, categoryId: catDoces.id },
        { name: 'Trident Hortelã', priceSell: 3.00, priceCost: 1.90, stock: 100, categoryId: catDoces.id },
        { name: 'Trident Melancia', priceSell: 3.00, priceCost: 1.90, stock: 100, categoryId: catDoces.id },
        { name: 'Halls Menta', priceSell: 2.50, priceCost: 1.50, stock: 80, categoryId: catDoces.id },
        { name: 'Halls Cereja', priceSell: 2.50, priceCost: 1.50, stock: 80, categoryId: catDoces.id },
        { name: 'Balas Variadas (Pacote)', priceSell: 8.00, priceCost: 5.00, stock: 20, categoryId: catDoces.id },
        { name: 'Gelo Escama 5kg', priceSell: 12.00, priceCost: 6.00, stock: 30, categoryId: catConveniencia.id },
        { name: 'Carvão 3kg', priceSell: 15.00, priceCost: 8.00, stock: 40, categoryId: catConveniencia.id },
        { name: 'Copo Descartável 400ml (50 un)', priceSell: 10.00, priceCost: 6.00, stock: 25, categoryId: catConveniencia.id },
        { name: 'Copo Acrílico (Unidade)', priceSell: 1.50, priceCost: 0.50, stock: 100, categoryId: catConveniencia.id },
        { name: 'Combo: Vodka Smirnoff + Baly 2L + Gelo', priceSell: 68.00, priceCost: 48.00, stock: 50, categoryId: catCombos.id },
        { name: 'Combo: Red Label + 4 Red Bull + Gelo', priceSell: 155.00, priceCost: 115.00, stock: 30, categoryId: catCombos.id },
        { name: 'Copão: Vodka e Energético 500ml', priceSell: 15.00, priceCost: 7.00, stock: 200, categoryId: catCombos.id },
        { name: 'Copão: Gin e Tropical 500ml', priceSell: 18.00, priceCost: 9.00, stock: 150, categoryId: catCombos.id },
        { name: 'Cigarro Marlboro Vermelho', priceSell: 12.50, priceCost: 10.00, stock: 50, categoryId: catTabacaria.id },
        { name: 'Cigarro Carlton Box', priceSell: 12.50, priceCost: 10.00, stock: 40, categoryId: catTabacaria.id },
        { name: 'Essência Zomo Menta', priceSell: 18.00, priceCost: 12.00, stock: 30, categoryId: catTabacaria.id },
        { name: 'Carvão de Narguile (Caixa)', priceSell: 25.00, priceCost: 16.00, stock: 20, categoryId: catTabacaria.id },
        { name: 'Isqueiro Bic', priceSell: 6.00, priceCost: 3.50, stock: 80, categoryId: catTabacaria.id },
    ];
    await prisma.product.createMany({ data: products });
    console.log(`Tenant 7bar Populado com ${products.length} Produtos reais!`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-tenant.js.map
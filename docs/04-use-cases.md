# 7bar SaaS POS - Casos de Uso e Regras de Negócio

Este documento destrincha o comportamento esperado e as funções cruciais de negócio implementadas por baixo dos panos na infraestrutura SaaS PDV.

## 1. Módulo: Provisionamento Automático de Lojas (Seeding / sys-init)
A regra pedia um painel dinâmico que não necessitasse de inserções burocráticas no banco no momento de captar novos clientes assinantes. O processo todo ocorre via chamada HTTP.
- **Segurança (O PIN):** O endpoint exposto em `/sys-init` não acessa banco nenhum a não ser que o *Setup Pin* (variável de ambiente) seja igual a `'teltech352'`. Se errar o PIN, ele trava a thread para evitar força bruta.
- **Criação do Tenant Lógico na Central:** Insere a Lojista no banco central (`heart`) nomeando a `database_name`.
- **Criação Isolada do Banco Físico:** O NestJS atira via Prisma um `CREATE DATABASE \`nome_da_adeqa\``.
- **Mapeamento:** O ORM força a injeção do schema de produtos (`node dist/prisma/seed-tenant.js` ou equivalente) validando que as tabelas do Caixa e Vendas sejam criadas naquele exato minuto.
- Enfim lança o usuário Admin com permissões globais do lojista específico usando a senha informada. Tudo dentro de 1 transação controlada que dá "Rollback" caso a porta de banco rejeite o comando (ex: usuário SQL com permissão errada).

## 2. Módulo de Gestão de Cota da Conta (Gerência Staff)
- **A Regra dos Limites:** Para o MVP, permitimos apenas a presença de "1 Admin" e "1 Colaborador Operador" (2 Funcionários Logados Ativos por assinatura). O Controller trava a inserção de `POST` para criar mais que isso se ambos baterem no teto `role: 'operator'`.
- **Exclusão Lógica e Soft Delete:** Porque manter o funcionário na Base? O Caixa de um bar não pode "esquecer" que a funcionária Maria assinou uma Sangria ou retirou notas, e as auditorias caíram numa chave estrangeira (FK) morta no banco de dados, o Prisma ia lançar erros de `RecordNotFound`. Excluindo logicamente (`active = false`), a FK permanece válida, e o colaborador apenas deixa de poder Fazer Login na Rota de Auth (O Hash de Senha é ignorado e um Exception 401 jorra na tela). 

## 3. Dinâmica das Vendas (O "POS" de Frente)
- Toda **Venda Confirmada** (`insert(Sale)` and `insert(SaleItem)`) automaticamente debita (`UPDATE`) a tabela de produto em seu campo de Estoque `stock`.
- Essa ação também gera logs no histórico individual do produto (`Inventory Logs`), garantindo que furtos ou erros possam ser checados, demonstrando Exatamente a hora que aquele Item sofreu baixa (Out), de qual Caixa (PDV Register) veio a requisição de venda e seu Preço.

## 4. Gerenciamento do Lote e Histórico de Estoque
Ao alterar manual ou via Nota Fiscal a Entrada de novos produtos: Um `InventoryLog` do tipo `IN` é lançado associando o custo (`costPrice`) em Real na hora da compra e o motivo. Esse rastreio ativará relatórios mais preciosos na aba do Painel de Faturamento permitindo cruzar Custo vs Venda em Lotes.

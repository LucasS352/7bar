# 7bar SaaS POS - Arquitetura e Stack Tecnológica

Este documento fornece a visão geral de alto nível da infraestrutura tecnológica e da arquitetura base do PDV em nuvem 7bar. É essencial para o *onboarding* de novos desenvolvedores e equipe de infraestrutura (DevOps).

## 1. Visão Geral do Sistema
O **7bar** é um Ponto de Venda (PDV) focado em adegas, bares e distribuidoras de bebidas. Ele foi desenvolvido sob a arquitetura **SaaS Multitenant (Software as a Service)**. Em vez de todos os clientes misturarem seus dados na mesma tabela de estoque, **cada lojista tem seu banco de dados isolado**.

Isso garante:
- **Alta Segurança**: O faturamento de um bar nunca vazará para outro.
- **Performance Escalável**: Sem travamentos ao buscar produtos porque as tabelas de um restaurante são curtas.
- **Backup Granular**: É possível restaurar ou exportar os dados de um cliente específico caso ele saia da plataforma.

## 2. Stack Tecnológica
A Stack é baseada inteiramente no ecossistema JavaScript/TypeScript de ponta, priorizando uma curva de aprendizado baixa, alta resiliência e código estritamente tipado.

### Backend (API REST)
- **Framework:** NestJS (Node.js) utilizando o estilo arquitetônico modular (Decorators, Dependency Injection, Guards).
- **ORM:** Prisma (Usado com múltiplos schemas para gerenciar bancos dinâmicos).
- **Autenticação:** JWT (JSON Web Tokens) com validação asssimétrica e criptografia bcrypt.
- **Linguagem:** TypeScript.

### Frontend (User Interface)
- **Framework:** Next.js (React) rodando em Application Router Mode.
- **Estilização:** Tailwind CSS (focado no padrão estético "Glassmorphism dark theme").
- **Gerenciamento de Estado:** Zustand.
- **Requisições HTTP:** Axios (com *interceptors* injetando token automaticamente).

### Infraestrutura e Dados
- **Banco de Dados Principal:** MariaDB / MySQL 8.
- **Orquestração de Containers:** Docker + Docker Compose.
- **Gerenciamento DevOps:** Portainer.

## 3. Diagrama de Implantação (Deployment)

O diagrama abaixo ilustra como os containers Docker atuam juntos na camada servidor, garantindo isolamento da rede pública para o banco de dados.

```mermaid
graph TD
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,color:#fff;
    classDef db fill:#f59e0b,stroke:#b45309,color:#fff;
    classDef external fill:#1f2937,stroke:#111827,color:#fff;

    User((Usuário / Internet)):::external
    
    subgraph Servidor Produção (Portainer / Docker Compose)
        Network[Docker Network: 7bar_network]
        
        FE[7bar_frontend\n Porta Pública: 3521]:::frontend
        BE[7bar_backend\n Porta Pública: 3520]:::backend
        DB[(MySQL 8.0 \n Porta Interna: 3306)]:::db
        
        Network --- FE
        Network --- BE
        Network --- DB
    end

    User -->|Acesso UI| FE
    FE -->|Axios REST| BE
    BE -->|Prisma TCP| DB
```

### Comportamento da Infraestrutura (Docker)
1. O banco `7bar_mysql` isola sua rede; apenas o container `7bar_backend` ou portas mapeadas conseguem manipulá-lo usando a senha fixa no `docker-compose.yml`.
2. O `entrypoint.sh` do backend obrigatoriamente roda as *Prisma Migrations* ao instanciar o container para validar a integridade estrutural das tabelas.
3. As senhas de conectores SQL exigem tratamento via **URL Encoder** caso usem caracteres reservados na string do ORM. Ex: O `@` é traduzido obrigatoriamente para `%40`.

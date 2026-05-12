FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build com variáveis de ambiente de produção (Vite usa prefixo VITE_)
ARG VITE_API_URL=http://179.127.59.225:3520
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Production stage (Nginx) ----
# Nginx com proxy /api/ → backend para que imagens e uploads funcionem
FROM nginx:alpine AS production

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração com proxy para o backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3521

CMD ["nginx", "-g", "daemon off;"]

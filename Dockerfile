FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instala todas as dependências necessárias para garantir o interpretador tsx em produção
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

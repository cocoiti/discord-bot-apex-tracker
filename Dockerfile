FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY config/ ./config/

CMD ["node", "dist/index.js"]

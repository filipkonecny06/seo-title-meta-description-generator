FROM node:22-bookworm-slim AS development
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY migrations ./migrations
COPY seeders ./seeders
COPY scripts ./scripts

EXPOSE 3000
CMD ["node", "src/server.js"]

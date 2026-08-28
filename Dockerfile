# Development retains tooling and source files for the bind-mounted local workflow.
FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS development
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
EXPOSE 3000
USER node
CMD ["npm", "run", "dev"]

# Schema and demo-account setup run as a release task, not at app startup.
FROM development AS migration
CMD ["npm", "run", "db:setup"]

# Production contains runtime dependencies and application code only.
FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

EXPOSE 3000
# The unprivileged image user limits the impact of a compromised process.
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "const port=process.env.PORT||3000;fetch('http://127.0.0.1:'+port+'/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "src/server.js"]

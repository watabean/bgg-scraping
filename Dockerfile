FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json .puppeteerrc.cjs ./
RUN npm ci && apt-get update && npx puppeteer browsers install chrome --install-deps \
    && rm -rf /var/lib/apt/lists/*
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && chown -R node:node /app
USER node
CMD ["node", "dist/job.js"]

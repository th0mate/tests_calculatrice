FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install

COPY src ./src
COPY tests ./tests
COPY e2e ./e2e

RUN npx jest tests

ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]

FROM node:22-alpine

WORKDIR /app

COPY web ./web
COPY public ./public
COPY src ./src

ENV WEB_PORT=8080
EXPOSE 8080
CMD ["node", "web/server.js"]

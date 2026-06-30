FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
COPY game.py ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.js"]
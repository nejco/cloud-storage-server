FROM node:26-alpine

ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

CMD ["node", "./bin/www"]

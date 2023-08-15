FROM node:lts-alpine3.18
EXPOSE 3000


COPY package.json package-lock.json ./

RUN npm i

COPY . .


CMD ["npm", "start"]
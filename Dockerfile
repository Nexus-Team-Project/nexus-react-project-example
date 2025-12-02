FROM node:20-slim

WORKDIR /app

COPY client .

RUN npm ci 

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:22-slim

RUN cd client

WORKDIR /app

COPY . .

RUN npm ci 

EXPOSE 3000

CMD ["npm", "run", "dev"]

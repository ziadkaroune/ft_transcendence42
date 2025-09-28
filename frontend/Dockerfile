FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Don’t copy source code here — we will mount it as a volume

EXPOSE 3000

CMD ["npm", "run", "dev"]

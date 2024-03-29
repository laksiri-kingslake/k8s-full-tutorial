FROM node:18.0-slim
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY index.js ./

# Create directory for database (matches.db is stored in /app/database)
RUN mkdir -p /app/database

EXPOSE 3102

CMD ["node", "index.js"]

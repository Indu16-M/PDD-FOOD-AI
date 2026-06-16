FROM node:20-slim

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package.json .
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

# Run Vite dev server bound to 0.0.0.0 so Docker container port routing works
CMD ["npm", "run", "dev", "--", "--host"]

FROM node:18-alpine

WORKDIR /app

# Copy only what the server needs (no node_modules — zero deps)
COPY package.json ./
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

# Docker container must listen on 0.0.0.0 so the port is reachable from outside
ENV HOST=0.0.0.0
ENV PORT=3042

EXPOSE 3042

CMD ["node", "server.js"]

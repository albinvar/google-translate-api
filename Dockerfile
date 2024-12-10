# Use the official Node.js 18 Alpine base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json, pnpm-lock.yaml, and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

# Copy only the source code (excluding node_modules, data, etc.)
COPY src ./src

# Create a volume for the SQLite database
VOLUME [ "/usr/src/app/data" ]

# Expose the port for the application
EXPOSE 3000

# Set default environment variables (can be overridden with `-e`)
ENV PORT=3000
ENV API_TOKEN=you-are-lucky
ENV ENABLE_PROXIFLY_PLUGIN=true
ENV ENABLE_SCRAPE_PROXY_PLUGIN=true
ENV ENABLE_PROXY_FREE_ONLY_PLUGIN=true
ENV ENABLE_SPYS_ONE_PLUGIN=true
ENV MAX_RETRIES=3
ENV MAX_TIMEOUT=3000

# Start the application
CMD ["node", "src/server.js"]

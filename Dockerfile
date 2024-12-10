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

# Start the application
CMD ["node", "src/server.js"]

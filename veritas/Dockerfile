# Veritas CAP provider (apps/cap-agent) — a long-running agent that connects to
# CROO, accepts jobs, runs verification, and settles deliveries on-chain.
# This is NOT a Vercel-style serverless function; it needs a persistent host
# (Railway / Render / Fly / a VM). The static showcase in web/ deploys separately.
FROM node:20-slim

# tsx runs the TypeScript entrypoint directly (the repo has no compiled dist step
# for the apps; scripts use tsx). Keep the image lean.
ENV NODE_ENV=production \
    CI=true

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the source (tsconfig path aliases resolve packages/* and apps/* at runtime).
COPY tsconfig.json tsconfig.packages.json ./
COPY packages ./packages
COPY apps ./apps

# The CAP provider has no inbound HTTP surface by default; it holds an outbound
# connection to CROO. If you enable the health endpoint, expose its port here.
# EXPOSE 8080

# Runs apps/cap-agent/src/main.ts via tsx (the "agent" script in package.json).
CMD ["npm", "run", "agent"]

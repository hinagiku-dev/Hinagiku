FROM node:22-slim AS builder

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV SVELTEKIT_ADAPTER=node

ENV GOOGLE_APPLICATION_CREDENTIALS=service-account-file.example.json

RUN pnpm build
# Replace __dirname with import.meta.dirname in all .js files in /app/build and subdirectories
RUN find /app/build -type f -name "*.js" -exec sed -i 's/__dirname/import.meta.dirname/g' {} \;

FROM node:22-slim

WORKDIR /app
COPY --from=builder /app/build /app
RUN echo '{"type": "module"}' > package.json

CMD ["node", "index.js"]

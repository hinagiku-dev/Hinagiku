FROM node:22-slim AS builder

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV SVELTEKIT_ADAPTER=node

ENV GOOGLE_APPLICATION_CREDENTIALS=service-account-file.example.json
ENV PUBLIC_FIREBASE_API_KEY=AIzaSyA1YtQNcg8tfI1MqS9KdZMaUTtcqNEoEMw
ENV PUBLIC_FIREBASE_AUTH_DOMAIN=hinagiku-dev.firebaseapp.com
ENV PUBLIC_FIREBASE_PROJECT_ID=hinagiku-dev
ENV PUBLIC_FIREBASE_STORAGE_BUCKET=hinagiku-dev.firebasestorage.app
ENV PUBLIC_FIREBASE_MESSAGING_SENDER_ID=585902608528
ENV PUBLIC_FIREBASE_APP_ID=1:585902608528:web:908698a423651bb865c815
ENV PUBLIC_FIREBASE_MEASUREMENT_ID=G-QFXF543DV8
ENV HINAGIKU_STORAGE_BACKEND="firebase"

RUN pnpm build
# Replace __dirname with import.meta.dirname in all .js files in /app/build and subdirectories
RUN find /app/build -type f -name "*.js" -exec sed -i 's/__dirname/import.meta.dirname/g' {} \;

FROM node:22-slim

WORKDIR /app
COPY --from=builder /app/build /app
RUN echo '{"type": "module"}' > package.json

CMD ["node", "index.js"]

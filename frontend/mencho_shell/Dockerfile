FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY frontend/mencho_shell/package.json frontend/mencho_shell/package-lock.json ./
RUN npm ci
COPY frontend/mencho_shell/ ./
RUN npm run lint && npm test && npm run build

FROM nginx:stable-alpine AS runtime

COPY frontend/mencho_shell/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
# Bypass the image's configuration-writing entrypoint for read-only operation.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]

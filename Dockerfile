# Stage 1 — build
FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit
COPY . .
RUN npm run test
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/traces.js /etc/nginx/njs/traces.js
# njs runs the trace endpoint; the module ships with the image but is not loaded by default
RUN sed -i '1i load_module modules/ngx_http_js_module.so;' /etc/nginx/nginx.conf \
 && mkdir -p /var/log/traces && chown nginx /var/log/traces
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ || exit 1

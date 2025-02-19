# Build stage
FROM node:18-alpine AS builder
LABEL maintainer="DevOps Team <devops@example.com>" \
      version="1.0.0" \
      description="Random Word Generator Frontend"

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Production stage
FROM nginx:1.25-alpine
LABEL maintainer="DevOps Team <devops@example.com>" \
      version="1.0.0" \
      description="Random Word Generator Frontend"

# Configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Configure Nginx worker settings
ENV NGINX_WORKER_PROCESSES=auto \
    NGINX_WORKER_CONNECTIONS=1024

# Create nginx.conf with optimizations
RUN echo "worker_processes ${NGINX_WORKER_PROCESSES};" > /etc/nginx/nginx.conf && \
    echo "events { worker_connections ${NGINX_WORKER_CONNECTIONS}; }" >> /etc/nginx/nginx.conf && \
    echo "http {" >> /etc/nginx/nginx.conf && \
    echo "    include /etc/nginx/mime.types;" >> /etc/nginx/nginx.conf && \
    echo "    default_type application/octet-stream;" >> /etc/nginx/nginx.conf && \
    echo "    sendfile on;" >> /etc/nginx/nginx.conf && \
    echo "    tcp_nopush on;" >> /etc/nginx/nginx.conf && \
    echo "    tcp_nodelay on;" >> /etc/nginx/nginx.conf && \
    echo "    keepalive_timeout 65;" >> /etc/nginx/nginx.conf && \
    echo "    types_hash_max_size 2048;" >> /etc/nginx/nginx.conf && \
    echo "    gzip on;" >> /etc/nginx/nginx.conf && \
    echo "    gzip_types text/plain text/css application/javascript application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;" >> /etc/nginx/nginx.conf && \
    echo "    gzip_comp_level 6;" >> /etc/nginx/nginx.conf && \
    echo "    gzip_min_length 1000;" >> /etc/nginx/nginx.conf && \
    echo "    gzip_proxied any;" >> /etc/nginx/nginx.conf && \
    echo "    server {" >> /etc/nginx/nginx.conf && \
    echo "        listen 80;" >> /etc/nginx/nginx.conf && \
    echo "        root /usr/share/nginx/html;" >> /etc/nginx/nginx.conf && \
    echo "        index index.html;" >> /etc/nginx/nginx.conf && \
    echo "        location / {" >> /etc/nginx/nginx.conf && \
    echo "            try_files \$uri \$uri/ /index.html;" >> /etc/nginx/nginx.conf && \
    echo "            add_header Cache-Control 'public, max-age=31536000';" >> /etc/nginx/nginx.conf && \
    echo "            add_header X-Content-Type-Options nosniff;" >> /etc/nginx/nginx.conf && \
    echo "            add_header X-Frame-Options DENY;" >> /etc/nginx/nginx.conf && \
    echo "            add_header X-XSS-Protection \"1; mode=block\";" >> /etc/nginx/nginx.conf && \
    echo "        }" >> /etc/nginx/nginx.conf && \
    echo "        location /static/ {" >> /etc/nginx/nginx.conf && \
    echo "            expires 1y;" >> /etc/nginx/nginx.conf && \
    echo "            add_header Cache-Control \"public, no-transform\";" >> /etc/nginx/nginx.conf && \
    echo "        }" >> /etc/nginx/nginx.conf && \
    echo "    }" >> /etc/nginx/nginx.conf && \
    echo "}" >> /etc/nginx/nginx.conf

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
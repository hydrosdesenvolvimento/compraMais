# Landing pública do Compra Mais (site estático servido por nginx). Sem build: apenas HTML/CSS/JS.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js logo.png /usr/share/nginx/html/
EXPOSE 80

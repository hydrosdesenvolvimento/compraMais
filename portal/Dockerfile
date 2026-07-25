# Landing pública do Compra Mais (site estático servido por nginx). Sem build: apenas HTML/CSS/JS.
FROM nginx:1.27-alpine AS runtime

# Base pública da aplicação injetada nos CTAs da landing (data-app-base) no boot, via template do
# nginx (envsubst) + sub_filter. Default vazio → CTAs relativos à própria origem do portal.
# Em prod, defina APP_BASE_URL com a URL pública do app (ex.: https://compramais.example).
ENV APP_BASE_URL=""

# nginx.conf vira template: o entrypoint do nginx roda envsubst em /etc/nginx/templates/*.template
# e escreve o resultado em /etc/nginx/conf.d/ (resolve ${APP_BASE_URL}; vars nginx $host/$uri ficam).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY index.html styles.css app.js logo.png /usr/share/nginx/html/
EXPOSE 80

# Alinhado ao healthcheck do frontend: nginx respondendo a landing.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

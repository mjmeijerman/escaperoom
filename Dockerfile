FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY hogwarts.html edo.html index.html classic.html pcdoc.html murdoku.html /usr/share/nginx/html/
COPY murdoku/levels /usr/share/nginx/html/murdoku/levels
COPY vendor /usr/share/nginx/html/vendor

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

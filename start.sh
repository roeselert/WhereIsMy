docker run --rm -d \
  --name nginx-server \
  -p 3000:80 \
  -v $(pwd)/.:/usr/share/nginx/html:ro \
  nginx
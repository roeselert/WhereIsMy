docker run --rm -d \
  --name nginx-server \
  -p 3000:80 \
  -v $(pwd)/public:/usr/share/nginx/html:ro \
  nginx
# Deployment — VPS (alternative)

Ubuntu 22.04/24.04, Nginx, PM2, MariaDB 10.11 or MySQL 8. Not the purchased hosting — kept as an alternative.

```bash
# packages
sudo apt install -y nginx mariadb-server
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

# database
sudo mariadb -e "CREATE DATABASE carely CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'carely'@'localhost' IDENTIFIED BY '<strong>'; GRANT ALL ON carely.* TO 'carely'@'localhost';"

# app
git clone <repo> /srv/carely && cd /srv/carely
npm ci && npm run build
cp apps/api/.env.example apps/api/.env   # production values (see DEPLOY-CPANEL §4)
cp apps/web/.env.example apps/web/.env
npm run db:migrate:deploy && npm run db:seed

pm2 start apps/api/dist/main.js --name carely-api --cwd apps/api
pm2 start apps/web/.output/server/index.mjs --name carely-web --cwd apps/web
pm2 save && pm2 startup
```

Nginx (TLS via certbot):
```nginx
server {
  server_name carely.am;
  client_max_body_size 10m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```
With Nginx → Nuxt → API set `TRUST_PROXY=2`. Cron: `*/10 * * * * cd /srv/carely/apps/api && node dist/jobs-cli.js`. Monitoring: Netdata; backups: nightly `mariadb-dump` off-host.

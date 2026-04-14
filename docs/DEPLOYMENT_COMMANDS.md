# Deployment Commands — TilesERP

Working deployment commands for VPS (tserp.digiwebdex.com).

---

## 🚀 Full Deployment (One-Liner)

```bash
cd /var/www/tilessaas && git pull && npm install && npm run build && cd backend && npm install && set -a && . .env && set +a && npx knex migrate:latest --knexfile src/db/knexfile.ts && pm2 restart tilessaas-api && pm2 save && sleep 2 && curl -s http://127.0.0.1:3003/api/health
```

---

## 📋 Step-by-Step Commands

### 1. Pull Latest Code
```bash
cd /var/www/tilessaas
git pull origin main
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Build Frontend
```bash
npm run build
```
Output: `dist/` folder with static assets served by Nginx.

### 4. Install Backend Dependencies
```bash
cd backend
npm install
```

### 5. Load Environment Variables
```bash
set -a && . .env && set +a
```

### 6. Run Database Migrations
```bash
npx knex migrate:latest --knexfile src/db/knexfile.ts
```

### 7. Restart Backend Process
```bash
pm2 restart tilessaas-api
pm2 save
```

### 8. Verify Health
```bash
sleep 2
curl -s http://127.0.0.1:3003/api/health
```
Expected: `{"status":"ok","database":"connected"}`

---

## 🔧 Maintenance Commands

### PM2 Management
```bash
# View all processes
pm2 list

# View logs
pm2 logs tilessaas-api

# View logs (last 100 lines)
pm2 logs tilessaas-api --lines 100

# Monitor in real-time
pm2 monit

# Restart
pm2 restart tilessaas-api

# Stop
pm2 stop tilessaas-api

# Delete process
pm2 delete tilessaas-api

# Start fresh
pm2 start backend/dist/index.js --name tilessaas-api

# Save process list
pm2 save

# Startup script (run once)
pm2 startup
```

### Nginx Commands
```bash
# Test config
sudo nginx -t

# Reload config
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### SSL Certificate
```bash
# Renew Let's Encrypt
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Database Commands
```bash
# Connect to PostgreSQL
psql -h localhost -p 5440 -U tileserp -d tileserp

# Run migrations
cd /var/www/tilessaas/backend
set -a && . .env && set +a
npx knex migrate:latest --knexfile src/db/knexfile.ts

# Rollback last migration
npx knex migrate:rollback --knexfile src/db/knexfile.ts

# Create new migration
npx knex migrate:make migration_name --knexfile src/db/knexfile.ts

# Run seeds
npx knex seed:run --knexfile src/db/knexfile.ts

# Backup database
pg_dump -h localhost -p 5440 -U tileserp tileserp > /tmp/tileserp_backup_$(date +%Y%m%d).sql

# Restore database
psql -h localhost -p 5440 -U tileserp tileserp < /tmp/tileserp_backup.sql
```

### Git Commands
```bash
# Check current branch
git branch

# Check remote status
git fetch origin && git status

# View recent commits
git log --oneline -10

# Discard local changes (CAUTION)
git checkout -- .

# Hard reset to remote (CAUTION)
git reset --hard origin/main
```

---

## 🔍 Debugging Commands

### Check Running Services
```bash
# PM2 processes
pm2 list

# Check port 3003
ss -tlnp | grep 3003

# Check port 5440 (DB)
ss -tlnp | grep 5440

# Check nginx
systemctl status nginx
```

### Check Disk Space
```bash
df -h
du -sh /var/www/tilessaas
du -sh /var/www/tilessaas/node_modules
du -sh /var/www/tilessaas/dist
```

### Check Memory & CPU
```bash
free -h
htop
pm2 monit
```

### Check Application Logs
```bash
# Backend logs
pm2 logs tilessaas-api --lines 200

# Nginx access logs
sudo tail -100 /var/log/nginx/access.log

# Nginx error logs
sudo tail -100 /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx --since "1 hour ago"
```

---

## 🔄 Rollback Commands

### Quick Rollback (to previous commit)
```bash
cd /var/www/tilessaas
git log --oneline -5          # Find the commit to rollback to
git checkout <commit-hash>     # Checkout specific commit
npm install && npm run build
cd backend && npm install
set -a && . .env && set +a
npx knex migrate:rollback --knexfile src/db/knexfile.ts
pm2 restart tilessaas-api && pm2 save
```

### Database Restore
```bash
# From backup file
psql -h localhost -p 5440 -U tileserp tileserp < /path/to/backup.sql
pm2 restart tilessaas-api
```

---

## 📦 Frontend-Only Deploy (No Backend Changes)
```bash
cd /var/www/tilessaas && git pull && npm install && npm run build
```
No PM2 restart needed — Nginx serves static files from `dist/`.

---

## 🔌 Backend-Only Deploy (No Frontend Changes)
```bash
cd /var/www/tilessaas && git pull
cd backend && npm install
set -a && . .env && set +a
npx knex migrate:latest --knexfile src/db/knexfile.ts
pm2 restart tilessaas-api && pm2 save
```

---

## ⚠️ Important Notes

1. **NEVER change the backend port (3003)** — See RESOURCE_LOCK.md
2. **NEVER change the database port (5440)** — See RESOURCE_LOCK.md
3. **NEVER change the project directory** (`/var/www/tilessaas`)
4. **ALWAYS run `pm2 save`** after restart to persist across reboots
5. **ALWAYS verify health** after deployment
6. **Backend `.env` is NOT in git** — maintain it directly on VPS
7. **Supabase migrations** are auto-applied by Lovable Cloud, not on VPS

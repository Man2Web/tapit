// PM2 process config for apps/web on the Hostinger VPS.
//
// Usage (from the repo root on the server, after `pnpm install` and
// `pnpm --filter @tapit/web build`):
//   pm2 start deploy/ecosystem.config.js
//   pm2 save            # persist across reboots (after `pm2 startup` once)
//   pm2 restart tapit-web   # after a redeploy
//
// `next start` reads apps/web/.env.local for NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY — copy apps/web/.env.example there with real
// values before starting. This file only sets the PORT PM2 launches on;
// point Nginx (see deploy/nginx.conf.example) at the same port.
module.exports = {
  apps: [
    {
      name: "tapit-web",
      cwd: "apps/web",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};

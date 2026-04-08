// PM2 Ecosystem Configuration
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Start:   pm2 start ecosystem.config.js
// Reload:  pm2 reload ecosystem.config.js --update-env
// Save:    pm2 save   (persist across reboots after: pm2 startup)

'use strict'

const APP_DIR = __dirname

module.exports = {
  apps: [
    // ── Web Application ────────────────────────────────────────────────────
    {
      name: 'definodenexus',
      script: '.next/standalone/server.js',
      cwd: APP_DIR,
      instances: 1,          // Use 'max' to enable cluster mode across all CPU cores
      exec_mode: 'fork',     // Change to 'cluster' when using instances: 'max'
      watch: false,

      // Runtime environment
      env: {
        NODE_ENV: 'production',
        PORT: 9002,
        HOSTNAME: '0.0.0.0',
      },

      // Resource limits
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=460',

      // Logging
      out_file: '/home/ubuntu/.pm2/logs/definodenexus-out.log',
      error_file: '/home/ubuntu/.pm2/logs/definodenexus-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',

      // Restart policy
      autorestart: true,
      restart_delay: 3000,    // 3 s cooldown before restart
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,
    },

    // ── Keeper Bot (scheduled on-chain tasks) ─────────────────────────────
    // Runs once, then handled by cron/timer — uncomment if you want PM2-managed loop
    // {
    //   name: 'definode-keeper',
    //   script: 'scripts/keeper.js',
    //   cwd: APP_DIR,
    //   instances: 1,
    //   exec_mode: 'fork',
    //   watch: false,
    //   env: { NODE_ENV: 'production' },
    //   cron_restart: '*/10 * * * *',   // re-run every 10 minutes
    //   autorestart: false,
    // },
  ],
}

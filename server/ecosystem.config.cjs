// PM2 process file for VPS / FastPanel deployments:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'chillyflakes-api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
  ],
};

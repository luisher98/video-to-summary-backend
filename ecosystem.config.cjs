/**
 * PM2 ecosystem configuration
 * Defines process management settings for production deployment
 * 
 * @type {Object}
 */
module.exports = {
  apps: [{
    name: 'youtube-summary-api',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    min_uptime: '60s',
    max_restarts: 5,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    output: 'process.stdout',
    error: 'process.stderr',
    merge_logs: true
  }]
}; 
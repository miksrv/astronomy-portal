module.exports = {
    apps: [
        {
            args: 'start',
            autorestart: true,
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            max_memory_restart: '256M',
            name: 'astro.miksoft.pro',
            script: 'server.js',
            watch: false
        }
    ]
}

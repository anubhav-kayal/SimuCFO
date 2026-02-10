require('dotenv').config();
const app = require('./app');

console.log('App type:', typeof app);
console.log('App function:', app.toString().slice(0, 50));

const PORT = process.env.PORT || 5000;

console.log('Attempting to start server on port:', PORT);

try {
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on('close', () => {
        console.log('Server closed event fired');
    });

    server.on('error', (err) => {
        console.error('Server error:', err);
    });

} catch (e) {
    console.error('Exception during app.listen:', e);
}

process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log("Caught SIGINT");
    process.exit();
});

// Force keep-alive to see if it helps
setInterval(() => { }, 10000);

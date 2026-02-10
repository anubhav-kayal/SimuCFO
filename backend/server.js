require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Enhanced error handling for server startup
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free up the port and restart.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
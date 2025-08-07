const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware
app.use(morgan('dev'));

// CORS configuration - important for Media Composer communication
app.use(cors({
    origin: '*', // Media Composer will handle security via allowedDomains
    credentials: true
}));

// Serve static files with correct MIME types (CRITICAL for gRPC-web)
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Explicit gRPC route to ensure availability
app.use('/grpc-web', express.static(path.join(__dirname, 'public', 'grpc-web'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// Main panel route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎬 Avid Panel SDK Server Running`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`📂 Serving from: ${path.join(__dirname, 'public')}`);
    console.log(`\n⚠️  Remember to:`);
    console.log(`   1. Copy gRPC-web files from Panel SDK to public/grpc-web/`);
    console.log(`   2. Install the plugin (.avpi) file in Media Composer`);
    console.log(`   3. Ensure Feature Toggle Files are installed\n`);
});
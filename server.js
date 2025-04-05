import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import SetUpServer from './src/WebSocket/index.js';

// Use process.env.PORT or default to an available port (like 3000).
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

SetUpServer(io);

server.listen(PORT, () => {
    console.log("Web Socket Connected ... !");
    console.log("Express Server is running ... !");
    console.log(`Server is running on port: ${PORT}`);
});

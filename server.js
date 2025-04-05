import app from './app.js';
import http from 'http';
import {Server} from 'socket.io';
import SetUpServer from './src/WebSocket/index.js'

const server = http.createServer(app);

const io = new Server(server,{
    cors : {
        origin : "*",
        methods : ["GET","POST"]
    }
});
 
SetUpServer(io);

server.listen(process.env.PORT, () => {
    console.log("Web Socket Connected ... !");
    console.log("Express Server is running ... !");
    console.log(process.env.PORT);
})
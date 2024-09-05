const WebSocket = require('ws');
const port = 5000;

const server = new WebSocket.Server({ port });

server.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        // 这里可以处理客户端发送的消息
    });

    ws.send('Hello! Message From Server!!'); // 向客户端发送消息
});

console.log(`WebSocket server is listening on ws://localhost:${port}`);

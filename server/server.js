const http = require('http');
const websocket = require('websocket');
const fs = require('fs');

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('WebSocket server is running');
});

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});

const wsServer = new websocket.server({
    httpServer: server
});

const users = loadUsers(); // Load users from file on server start

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    console.log('New connection');

    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            console.log('Received message:', message.utf8Data);
            wsServer.connections.forEach((client) => {
                if (client !== connection && client.connected) {
                    client.sendUTF(message.utf8Data);
                }
            });
        }
    });

    connection.on('close', () => {
        console.log('Connection closed');
    });
});

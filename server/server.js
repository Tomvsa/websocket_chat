const http = require('http');
const websocket = require('websocket');
const fs = require('fs');
const path = require('path');


const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running');
});

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});

const wsServer = new websocket.server({
    httpServer: server
});

const users = loadUsers();

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    console.log('New connection');

    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            console.log(message);
            const data = JSON.parse(message.utf8Data);
            if (data.type === 'register') {
                handleRegistration(data, connection);
            } else if (data.type === 'login') {
                handleLogin(data, connection);
            } else if (data.type === 'chat_message') {
                if (data.message.startsWith('/private')) {
                    const parts = data.message.split(' ');
                    const recipient = parts[1]; // El segundo elemento es el nombre del destinatario
                    const messageContent = parts.slice(2).join(' '); // El resto es el contenido del mensaje
                    const recipientConnection = wsServer.connections.find((client) => client.username === recipient);
                    if (recipientConnection && recipientConnection.connected) {
                        recipientConnection.sendUTF(JSON.stringify({ type: 'private_message', sender: connection.username, message: messageContent }));
                        // connection.sendUTF(JSON.stringify({ type: 'private_message', recipient: recipient }));
                    } else {
                        connection.sendUTF(JSON.stringify({ type: 'private_message_failure', message: 'Recipient not found or not connected' }));
                    }
                } else {
                    // Broadcast the regular chat message to all connected clients
                    wsServer.connections.forEach((client) => {
                        if (client !== connection && client.connected) {
                            client.sendUTF(JSON.stringify({ type: 'chat_message', username: connection.username, message: data.message }));
                        }
                    });
                }
                console.log('Received message:', message.utf8Data);
            }
            
            console.log('Received message:', message.utf8Data);
        }
    });

    connection.on('close', () => {
        console.log('Connection closed');
        // Send a special message indicating that the user has disconnected
        const disconnectedUsername = connection.username; // Get the username of the disconnected user
        wsServer.connections.forEach((client) => {
            if (client !== connection && client.connected) {
                // Include the username with the special message
                client.sendUTF(JSON.stringify({ type: 'user_disconnected', username: disconnectedUsername }));
            }
        });
    });
});



function loadUsers() {
    try {
        const filePath = path.join(__dirname, 'users.json');
        const usersData = fs.readFileSync(filePath);
        return JSON.parse(usersData);
    } catch (error) {
        console.error('Error loading users:', error);
        return { users: [] };
    }
}


function saveUsers() {
    try {
        const filePath = path.join(__dirname, 'users.json');
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}


function handleRegistration(data, connection) {
    const { username, password } = data;
    if (!users.users.find(user => user.username === username)) {
        users.users.push({ username, password });
        saveUsers();
        connection.sendUTF(JSON.stringify({ type: 'registration_success' }));
    } else {
        connection.sendUTF(JSON.stringify({ type: 'registration_failure', message: 'Username already exists' }));
    }
}

function handleLogin(data, connection) {
    const { username, password } = data;
    const user = users.users.find(user => user.username === username && user.password === password);
    if (user) {
        connection.username = username; // Assign the username to the connection
        connection.sendUTF(JSON.stringify({ type: 'login_success' }));
    } else {
        connection.sendUTF(JSON.stringify({ type: 'login_failure', message: 'Invalid username or password' }));
    }
}


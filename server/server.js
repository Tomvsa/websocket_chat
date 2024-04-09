const http = require('http');
const websocket = require('websocket');
const fs = require('fs');
const path = require('path');
const Participant = require('../Model/Participant');
let Participants = [];
6
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running');
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
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
                        connection.sendUTF(JSON.stringify({ type: 'private_message', sender: connection.username, message: messageContent }));
                        // connection.sendUTF(JSON.stringify({ type: 'private_message', recipient: recipient }));
                    } else {
                        connection.sendUTF(JSON.stringify({ type: 'private_message_failure', message: 'Recipient not found or not connected' }));
                    }
                } else {
                    // Broadcast the regular chat message to all connected clients
                    wsServer.connections.forEach((client) => {
                        if (client.connected) {
                            client.sendUTF(JSON.stringify({ type: 'chat_message', username: connection.username, message: data.message }));
                        }
                    });
                }
                console.log('Received message:', message.utf8Data);
            } else if (data.type === 'get_connected_users') {
                sendConnectedUsers(connection);
            } else if (data.type === 'game_request') {
                handleGameRequest(data, connection)
            } else if (data.type === 'game_response') {
                handleGameResponse(data, connection);
            } else if (data.type === 'game_move') {
                handleGameMove(data.index, connection);
            } else if (data.type === 'reset_game'){
                gameEnded = false;
                currentPlayerIndex = 0;
                gameBoardServer = ['', '', '', '', '', '', '', '', ''];
                Participants.forEach(participant => {
                    participant.connection.sendUTF(JSON.stringify({ type: 'game_reset', gameBoard: gameBoardServer }));
                });
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
        wsServer.connections.forEach((conn) => {
            let isConnected = conn === connection;
            conn.sendUTF(JSON.stringify({ type: 'login_success', user: username, authenticatedConnection: isConnected }));
        });
    } else {
        connection.sendUTF(JSON.stringify({ type: 'login_failure', message: 'Invalid username or password' }));
    }
}

function sendConnectedUsers(connection) {
    // Extract usernames from active connections excluding the current connection
    const connectedUsers = wsServer.connections
        .filter(conn => conn !== connection) // Excluir la conexión actual
        .map(conn => ({ username: conn.username }));

    // Send the list of connected users to the requesting client
    connection.sendUTF(JSON.stringify({ type: 'connected_users', users: connectedUsers }));
}

function handleGameRequest(data, connection) {
    const opponentUsername = data.opponent;
    const opponentConnection = wsServer.connections.find(client => client.username === opponentUsername);

    if (opponentConnection && opponentConnection.connected) {
        // Enviar la solicitud de juego al oponente
        opponentConnection.sendUTF(JSON.stringify({ type: 'game_request', sender: connection.username, receiver: opponentUsername }));
    } else {
        // Manejar el caso en que el oponente no está conectado
        connection.sendUTF(JSON.stringify({ type: 'game_request_failure', message: 'Opponent not found or not connected' }));
    }
}

function handleGameResponse(data, connection) {
    const senderUsername = data.sender;
    const senderConnection = wsServer.connections.find(client => client.username === senderUsername);
    const reiceiverConnection = wsServer.connections.find(client => client.username === data.receiver);
    let participant1 = new Participant(senderConnection, data.sender, 'X');
    let participant2 = new Participant(reiceiverConnection, data.receiver, 'O');

    if (senderConnection && senderConnection.connected) {
        // Reenviar la respuesta al solicitante
        Participants = [];
        Participants.push(participant1, participant2);
        senderConnection.sendUTF(JSON.stringify({ type: 'game_response', accept: data.accept, sender: data.sender, receiver: data.receiver }));
        reiceiverConnection.sendUTF(JSON.stringify({ type: 'game_response', accept: data.accept, sender: data.sender, receiver: data.receiver }));
    } else {
        // Manejar el caso en que el solicitante no está conectado
        connection.sendUTF(JSON.stringify({ type: 'game_response_failure', message: 'Sender not found or not connected' }));
    }
}

let currentPlayerIndex = 0;
let gameEnded = false;
let gameBoardServer = ['', '', '', '', '', '', '', '', ''];
function handleGameMove(index, connection) {
    if (gameEnded) {
        connection.sendUTF(JSON.stringify({ type: 'invalid_move', message: 'The game has already ended' }));
        gameBoardServer = ['', '', '', '', '', '', '', '', ''];
        return;
    }

    // Verificar si el movimiento es válido (por ejemplo, si la celda está vacía)
    if (gameBoardServer[index] === '') {
        // Obtener el símbolo del jugador actual basado en su conexión
        const currentPlayer = Participants[currentPlayerIndex];
        // const currentPlayerSymbol = Participants.find(participant => participant.connection === connection).symbol;

        // Realizar el movimiento actualizando el tablero en el servidor
        const currentPlayerSymbol = currentPlayer.symbol;

        // Verificar si el jugador que realiza el movimiento es el que le corresponde en el turno
        if (currentPlayer.connection !== connection) {
            connection.sendUTF(JSON.stringify({ type: 'invalid_move', message: 'It\'s not your turn' }));
            return;
        }
        gameBoardServer[index] = currentPlayerSymbol;

        // Comprobar si hay un ganador después del movimiento
        const winner = checkWinner(gameBoardServer, currentPlayerSymbol);
        if (winner) {
            gameEnded = true;
            // Notificar a ambos jugadores sobre el ganador y enviar el estado final del juego
            Participants.forEach(participant => {
                participant.connection.sendUTF(JSON.stringify({ type: 'game_over', winner: winner, gameBoard: gameBoardServer, name: currentPlayer.name }));
            });
        } else {
            // Si no hay ganador, enviar el nuevo estado del juego a ambos jugadores
            Participants.forEach(participant => {
                participant.connection.sendUTF(JSON.stringify({ type: 'game_state', gameBoard: gameBoardServer }));
            });
        }
        // Alternar el turno al siguiente jugador
        currentPlayerIndex = (currentPlayerIndex + 1) % Participants.length;
    } else {
        // Enviar un mensaje de error al cliente si la celda está ocupada
        connection.sendUTF(JSON.stringify({ type: 'invalid_move', message: 'The selected cell is already occupied' }));
    }
}

// Función para comprobar si alguien ha ganado
function checkWinner(gameBoard, currentPlayer) {
    // Comprobar filas
    if (
        (gameBoard[0] === currentPlayer && gameBoard[1] === currentPlayer && gameBoard[2] === currentPlayer) ||
        (gameBoard[3] === currentPlayer && gameBoard[4] === currentPlayer && gameBoard[5] === currentPlayer) ||
        (gameBoard[6] === currentPlayer && gameBoard[7] === currentPlayer && gameBoard[8] === currentPlayer)
    ) {
        return true;
    }

    // Comprobar columnas
    if (
        (gameBoard[0] === currentPlayer && gameBoard[3] === currentPlayer && gameBoard[6] === currentPlayer) ||
        (gameBoard[1] === currentPlayer && gameBoard[4] === currentPlayer && gameBoard[7] === currentPlayer) ||
        (gameBoard[2] === currentPlayer && gameBoard[5] === currentPlayer && gameBoard[8] === currentPlayer)
    ) {
        return true;
    }

    // Comprobar diagonales
    if (
        (gameBoard[0] === currentPlayer && gameBoard[4] === currentPlayer && gameBoard[8] === currentPlayer) ||
        (gameBoard[2] === currentPlayer && gameBoard[4] === currentPlayer && gameBoard[6] === currentPlayer)
    ) {
        return true;
    }

    return false;
}



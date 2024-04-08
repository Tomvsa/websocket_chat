const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (message) => {
    const data = JSON.parse(message.data); // Parse JSON data

    switch (data.type) {
        case 'registration_success':
            alert('Registration successful');
            break;
        case 'registration_failure':
            alert(`Registration failed: ${data.message}`);
            break;
        case 'login_success':
            if (data.authenticatedConnection) {
                document.getElementById('loginForm').style.display = 'none';
            }
            const connectedDiv = document.createElement('div');
            connectedDiv.textContent = `Sistema: ${data.user} has connected.`;
            connectedDiv.style.color = "green";
            const chatDiv3 = document.getElementById('chat');
            chatDiv3.appendChild(connectedDiv);
            chatDiv3.scrollTop = chatDiv3.scrollHeight;
            break;
        case 'login_failure':
            alert(`Login failed: ${data.message}`);
            break;
        case 'user_disconnected':
            // Handle user disconnection
            const disconnectedDiv = document.createElement('div');
            if (data.username) {
                const disconnectedMessage = `Sistema: ${data.username} has disconnected.`;
                disconnectedDiv.textContent = disconnectedMessage;
            } else {
                const disconnectedMessage = `Sistema: anonymous has disconnected.`;
                disconnectedDiv.textContent = disconnectedMessage;
            }
            disconnectedDiv.style.color = "red";
            const chatDiv = document.getElementById('chat');
            chatDiv.appendChild(disconnectedDiv);
            chatDiv.scrollTop = chatDiv.scrollHeight; // Scrolls to the bottom of the chat div
            break;
        case 'private_message':
            // Handle private messages
            const ChatDiv = document.getElementById('chat');
            if (ChatDiv) {
                const messageDiv = document.createElement('div');
                messageDiv.style.color = "#de4c8a";
                messageDiv.textContent = `${data.sender} (private): ${data.message}`; // Include the sender and mark as private
                ChatDiv.appendChild(messageDiv);
                ChatDiv.scrollTop = ChatDiv.scrollHeight; // Scrolls to the bottom of the private chat div
            } else {
                console.log('Private chat div not found');
            }
            break;
        case 'connected_users':
            // Actualizar la lista de usuarios conectados cuando se recibe una actualización del servidor
            const usersListDiv = document.getElementById('usersList');
            usersListDiv.innerHTML = '';
            usersListDiv.innerHTML = "<h2>Selecciona un contrincante:</h2>"
            const connectedUsers = data.users;
            connectedUsers.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.textContent = user.username;
                userDiv.addEventListener('click', () => requestGame(user.username)); // Solicitar juego al hacer clic en el usuario
                usersListDiv.appendChild(userDiv);
            });
            break;
        case 'game_request':
            const gameRequestModal = document.getElementById('gameRequestModal');
            const gameRequestModalYesBtn = document.getElementById('gameRequestModalYesBtn');
            const gameRequestModalNoBtn = document.getElementById('gameRequestModalNoBtn');
            // Mostrar modal de confirmación
            gameRequestModal.classList.add('show');
            gameRequestModal.style.display = 'block';
            // Capturar la respuesta del usuario al hacer clic en los botones
            gameRequestModalYesBtn.addEventListener('click', () => {
                // Enviar respuesta al servidor de que el usuario acepta la solicitud de juego
                ws.send(JSON.stringify({ type: 'game_response', accept: true, sender: data.sender, receiver: data.receiver }));
                gameRequestModal.classList.remove('show'); // Ocultar el modal
                gameRequestModal.style.display = 'none';
            });

            gameRequestModalNoBtn.addEventListener('click', () => {
                // Enviar respuesta al servidor de que el usuario rechaza la solicitud de juego
                ws.send(JSON.stringify({ type: 'game_response', accept: false, sender: data.sender, receiver: data.receiver }));
                gameRequestModal.classList.remove('show'); // Ocultar el modal
                gameRequestModal.style.display = 'none';
            });
            break;
        case 'game_response':
            const ChatDiv2 = document.getElementById('chat');
            if (ChatDiv2) {
                const messageDiv = document.createElement('div');
                if (data.accept) {
                    messageDiv.style.color = "green";
                    messageDiv.textContent = "Sistema: Comienza el juego 3 en rayas";
                    const usersListDiv = document.getElementById('usersList');
                    usersListDiv.innerHTML = '';
                    const table = document.getElementById('game-board').style.display = "flex";
                    const button = document.getElementById('reset-button').style.display = "block";
                } else {
                    messageDiv.style.color = "red";
                    messageDiv.textContent = "Sistema: La solicitud ha sido cancelada";
                    const usersListDiv = document.getElementById('usersList');
                    usersListDiv.innerHTML = '';
                }

                ChatDiv2.appendChild(messageDiv);
                ChatDiv2.scrollTop = ChatDiv2.scrollHeight;
                participants.push(data.sender, data.receiver);
                console.log(participants);
            } else {
                console.log('chat div not found');
            }
            break;
        case 'game_over':
            gameBoard = data.gameBoard;
            updateBoard(gameBoard);
            alert(`Game Over! Winner: ${data.winner}`);
            break;
        case 'game_state':
            gameBoard = data.gameBoard;
            updateBoard(gameBoard);
            break;
        case 'invalid_move':
            alert(data.message);
            break;

    }


    if (data.type === 'chat_message') {
        const chatDiv = document.getElementById('chat');
        if (chatDiv) {
            const messageDiv = document.createElement('div');
            if (data.username) {
                messageDiv.textContent = `${data.username}: ${data.message}`;
            } else {
                messageDiv.textContent = `anonymous: ${data.message}`;
            }

            chatDiv.appendChild(messageDiv);
            chatDiv.scrollTop = chatDiv.scrollHeight; // Scrolls to the bottom of the chat div
        } else {
            console.log('Chat div not found');
        }
    } else {
        console.log('Received message:', message.data); // Handle other types of messages
    }

};


ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('WebSocket connection closed');
};

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;
    const chatDiv = document.getElementById('chat');
    if (chatDiv) {
        const messageDiv = document.createElement('div');
        if (message.startsWith('/private')) {
            messageDiv.style.color = '#de4c8a';
        }
        messageDiv.textContent = `${'You: '} ${message}`;
        chatDiv.appendChild(messageDiv);
        chatDiv.scrollTop = chatDiv.scrollHeight; // Scrolls to the bottom of the chat div
    } else {
        console.log('Chat div not found');
    }
    ws.send(JSON.stringify({ type: 'chat_message', message: message }));
    messageInput.value = '';
}


function register() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value;
    const password = passwordInput.value;
    ws.send(JSON.stringify({ type: 'register', username, password }));
    usernameInput.value = '';
    passwordInput.value = '';
}

function login() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value;
    const password = passwordInput.value;
    ws.send(JSON.stringify({ type: 'login', username, password }));
    usernameInput.value = '';
    passwordInput.value = '';
}

function displayConnectedUsers() {
    // Limpiar la lista antes de actualizarla
    const usersListDiv = document.getElementById('usersList');
    usersListDiv.innerHTML = '';

    // Consultar al servidor para obtener la lista de usuarios conectados
    ws.send(JSON.stringify({ type: 'get_connected_users' }));
}

function requestGame(opponentUsername) {
    // Enviar una solicitud de juego al servidor
    const requestData = {
        type: 'game_request',
        opponent: opponentUsername
    };
    ws.send(JSON.stringify(requestData));
}

// Variables globales
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameOver = false;
const participants = [];

// Función para enviar el movimiento al servidor
function sendMoveToServer(index) {
    ws.send(JSON.stringify({ type: 'game_move', index: index, gameboard: gameBoard, participants: participants }));
}


// Obtener las celdas del tablero
const cells = document.querySelectorAll('.cell');

// Función para actualizar el tablero
function updateBoard(gameBoard) {
    cells.forEach((cell, index) => {
        cell.textContent = gameBoard[index];
    });
}


// Dentro de la función para manejar los clics en las celdas del tablero
cells.forEach((cell, index) => {
    cell.addEventListener('click', () => {
        sendMoveToServer(index);
    });
});


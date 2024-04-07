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
            alert('Login successful');
            document.getElementById('loginForm').style.display = 'none';
            break;
        case 'login_failure':
            alert(`Login failed: ${data.message}`);
            break;
        case 'user_disconnected':
            // Handle user disconnection
            console.log('estoy aqui');
            if (data.username) {
                const disconnectedMessage = `${data.username} has disconnected.`;
            } else {
                const disconnectedMessage = `anonymous has disconnected.`;
            }
            // Display the disconnected message in the chat
            const disconnectedDiv = document.createElement('div');
            disconnectedDiv.textContent = disconnectedMessage;
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

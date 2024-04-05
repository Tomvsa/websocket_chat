const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

// ws.onmessage = (message) => {
//     const data = JSON.parse(message.data);
//     switch (data.type) {
//         case 'registration_success':
//             alert('Registration successful');
//             break;
//         case 'registration_failure':
//             alert(`Registration failed: ${data.message}`);
//             break;
//         case 'login_success':
//             alert('Login successful');
//             document.getElementById('loginForm').style.display = 'none';
//             break;
//         case 'login_failure':
//             alert(`Login failed: ${data.message}`);
//             break;
//     }
// };

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
    }

    
    if (data.type === 'chat_message') {
        const chatDiv = document.getElementById('chat');
        if (chatDiv) {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = data.message; // Use 'data.message' instead of 'message.data'
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
        messageDiv.textContent = message;
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

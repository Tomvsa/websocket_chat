const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (message) => {
    console.log('Message received:', message.data);
    const chatDiv = document.getElementById('chat');
    if (chatDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message.data;
        chatDiv.appendChild(messageDiv);
        chatDiv.scrollTop = chatDiv.scrollHeight; // Scrolls to the bottom of the chat div
    } else {
        console.log('Chat div not found');
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
    ws.send(message);
    messageInput.value = '';
}

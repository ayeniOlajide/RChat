const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

const menuItems = [
  { id: 1, name: 'Jollof Rice', price: 15 },
  { id: 2, name: 'Spaghetti', price: 10 },
  { id: 3, name: 'Salad', price: 7 },
  { id: 4, name: 'Meat', price: 17 },
];

const botResponses = {
  welcome: `Welcome to Ziggy's restaurant! Please select an option:
1. Place an order 
99. Checkout order
98. See Order history
97. See current order
0. Cancel order`,
  orderPlaced: 'Order placed successfully!',
  noOrderToPlace: 'No order to place.',
  noCurrentOrder: 'No current order.',
  orderCancelled: 'Order cancelled successfully.',
};

const connections = {};

io.on('connection', (socket) => {
  const userId = socket.id;
  connections[userId] = { currentOrder: [], orderHistory: [] };

  socket.emit('bot-message', botResponses.welcome);
  console.log('A user connected', socket.id);

  socket.on('user-message', (message) => {
    if (!message) return;

    const connection = connections[userId];
    const text = message.trim();

    if (text === '1') {
      const menu = menuItems.map(item => `${item.id}. ${item.name} - $${item.price}`).join('\n');
      socket.emit('bot-message', `Here is our menu:\n ${menu}\n Please select an item by its number.`);
  
    } else if (text === '99') {
      if (connection.currentOrder.length === 0) {
        socket.emit('bot-message', botResponses.noOrderToPlace);
      } else {
        connection.orderHistory.push(...connection.currentOrder);
        connection.currentOrder = [];
        socket.emit('bot-message', `${botResponses.orderPlaced}\n Your order:\n ${connection.orderHistory.map(item => `${item.name} - $${item.price}`).join('\n')}`);
      }
    } else if (text === '98') {
      if (connection.orderHistory.length === 0) {
        socket.emit('bot-message', 'No order history.');
      } else {
        const history = connection.orderHistory.map((item, index) => `${index + 1}. ${item.name} - $${item.price}`).join('\n');
        socket.emit('bot-message', `Order history:\n${history}`);
      }
    } else if (text === '97') {
      if (connection.currentOrder.length === 0) {
        socket.emit('bot-message', botResponses.noCurrentOrder);
      } else {
        const current = connection.currentOrder.map((item, index) => `${index + 1}. ${item.name} - $${item.price}`).join('\n');
        socket.emit('bot-message', `Current order:\n${current}`);
      }
    } else if (text === '0') {
      if (connection.currentOrder.length === 0) {
        socket.emit('bot-message', botResponses.noCurrentOrder);
      } else {
        connection.currentOrder = [];
        socket.emit('bot-message', botResponses.orderCancelled);
      }
    } else {
      const selectedItem = menuItems.find(item => item.id.toString() === text);
      if (selectedItem) {
        connection.currentOrder.push(selectedItem);
        socket.emit('bot-message', `${selectedItem.name} added to your order.`);
      } else {
        socket.emit('bot-message', 'Invalid option. Please try again.');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    delete connections[userId];
  });
});

app.post('/chat', (req, res) => {
  const socketId = req.query.socketId;

  if (!socketId || !connections[socketId]) {
    return res.status(400).send('Invalid socket ID');
  }

  const socket = connections[socketId];
  socket.emit('chat message', req.body.message);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

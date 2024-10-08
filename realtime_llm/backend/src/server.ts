import express from 'express';
import { WebSocketServer} from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received audio data');

    wss.clients.forEach((client) => {
      client.send(message);
    })
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
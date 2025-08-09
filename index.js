const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 静的ファイルを配信（publicフォルダ）
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// クライアント接続時の処理
io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('ユーザー切断:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('3000番ポートで起動中');
});

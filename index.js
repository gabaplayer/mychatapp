const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// セッション設定
app.use(session({
  secret: '将軍の極秘鍵',
  resave: false,
  saveUninitialized: true,
}));

// POSTデータをパース
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル配信（publicフォルダ）
app.use(express.static(path.join(__dirname, 'public')));

// 簡単なユーザー管理（ハードコーディングでデモ用）
const users = {
  shogun: 'katana',
  takumi: 'ninja123',
};

// ログインページ（GET）
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// ログイン処理（POST）
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.username = username;  // セッションにユーザー名保存
    res.redirect('/chat.html');       // ログイン成功でチャット画面へ
  } else {
    res.send('ログイン失敗！ユーザー名かパスワードが違うぜ！');
  }
});

// ログインチェックミドルウェア
app.use((req, res, next) => {
  if (req.session.username || req.path === '/login' || req.path === '/login.html') {
    next();
  } else {
    res.redirect('/login');
  }
});

// チャット画面ルート（GET）
app.get('/chat.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/chat.html'));
});

// Socket.io 接続時の処理
io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  // 接続ユーザー名を取得する
  const username = socket.request.session?.username || '名無し';

  // メッセージ受信時にユーザー名付きで全員に送信
  socket.on('chat message', (msg) => {
    io.emit('chat message', { user: username, message: msg });
  });

  socket.on('disconnect', () => {
    console.log('ユーザー切断:', socket.id);
  });
});

// express-session を socket.io で共有する設定
const sharedSession = require("express-socket.io-session");
io.use(sharedSession(session({
  secret: '将軍の極秘鍵',
  resave: false,
  saveUninitialized: true,
})));

// サーバ起動
server.listen(3000, () => {
  console.log('3000番ポートで起動中');
});

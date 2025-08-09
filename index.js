const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sharedSession = require('express-socket.io-session');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const USERS_FILE = path.join(__dirname, 'users.json');

// ユーザーデータをJSONから読み込む関数
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {}; // ファイルなければ空オブジェクト
  }
}

// ユーザーデータをJSONに書き込む関数
async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// 新規登録ページ（GET）
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

// 新規登録処理（POST）
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send('ユーザー名とパスワードは必須だ！');
  }

  const users = await loadUsers();

  if (users[username]) {
    return res.send('そのユーザー名は既に使われているぜ！');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users[username] = hashedPassword;

  await saveUsers(users);

  res.send('登録成功！ログインページに行くぜ → <a href="/login">ログイン</a>');
});

// ← セッション設定を変数に格納（これを共有する）
const sessionMiddleware = session({
  secret: '将軍の極秘鍵',
  resave: false,
  saveUninitialized: true,
});

// Expressでセッションを使う
app.use(sessionMiddleware);

// POSTデータをパース
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル配信（publicフォルダ）
app.use(express.static(path.join(__dirname, 'public')));


// ログインページ（GET）
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// ログイン処理（POST）
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const users = await loadUsers();

  const hashedPassword = users[username];
  if (!hashedPassword) {
    return res.send('ユーザーがいません');
  }

  const match = await bcrypt.compare(password, hashedPassword);
  if (match) {
    req.session.username = username;
    res.redirect('/chat.html');
  } else {
    res.send('パスワードが違うぜ！');
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

// Socket.io に express-session を共有設定
io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));

// Socket.io 接続時の処理
io.on('connection', (socket) => {
  const username = socket.handshake.session.username || '名無し';
  console.log('ユーザー接続:', socket.id, 'ユーザー名:', username);

  socket.on('chat message', (msg) => {
    io.emit('chat message', { user: username, message: msg });
  });

  socket.on('disconnect', () => {
    console.log('ユーザー切断:', socket.id);
  });
});

// サーバ起動
server.listen(3000, () => {
  console.log('3000番ポートで起動中');
});

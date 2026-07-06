import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server as IOServer } from 'socket.io';
import { db } from './db.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { verifyToken } from './auth.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: CLIENT_ORIGIN } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    socket.data.user = verifyToken(token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join('accounts');
  socket.emit('hello', { userId: socket.data.user.id });
});

export { io };

server.listen(PORT, () => {
  console.log(`FF-CMS server: http://localhost:${PORT}`);
  console.log(`DB tables: user=${db.prepare('SELECT COUNT(*) c FROM user').get().c}, account=${db.prepare('SELECT COUNT(*) c FROM account').get().c}`);
});

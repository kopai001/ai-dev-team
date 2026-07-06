import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, authRequired } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const user = db.prepare('SELECT * FROM user WHERE username = ?').get(username);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const account = db.prepare('SELECT * FROM account WHERE userId = ?').get(user.id);

  const token = signToken({ id: user.id, username: user.username });

  db.prepare('INSERT INTO session_log (userId, action) VALUES (?, ?)').run(user.id, 'login');

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: account?.firstname ?? '',
      lastname: account?.lastname ?? '',
      role: account?.role ?? 'user',
    },
  });
});

authRouter.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, username, email, isActive FROM user WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  const account = db.prepare('SELECT firstname, lastname, role FROM account WHERE userId = ?').get(user.id);
  res.json({ ...user, ...(account || {}) });
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import yaml from 'js-yaml';
import { db } from './db.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed in production. Set NODE_ENV != production.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, 'fixtures');

const load = (f) => yaml.load(fs.readFileSync(path.join(FIX, f), 'utf8')) || [];
const users = load('user.yaml');
const accounts = load('account.yaml');

const accountByUsername = new Map(accounts.map((a) => [a.username, a]));

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO user (username, password, email, isActive) VALUES (?, ?, ?, ?)'
);
const insertAccount = db.prepare(
  'INSERT OR IGNORE INTO account (userId, firstname, lastname, role) VALUES (?, ?, ?, ?)'
);
const findUser = db.prepare('SELECT id FROM user WHERE username = ?');

const tx = db.transaction(() => {
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.username, hash, u.email, u.isActive ? 1 : 0);
    const row = findUser.get(u.username);
    if (!row) continue;
    const a = accountByUsername.get(u.username);
    if (a) insertAccount.run(row.id, a.firstname, a.lastname, a.role);
  }
});

tx();

console.log('Seed done from fixtures.');
console.log('Users:', db.prepare('SELECT COUNT(*) c FROM user').get().c);
console.log('Accounts:', db.prepare('SELECT COUNT(*) c FROM account').get().c);
console.log('Login: admin / admin123');

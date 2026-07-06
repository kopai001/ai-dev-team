# FF-CMS

Full-stack CMS scaffold.

- **Client:** React + Vite (port 5173)
- **Server:** Node.js + Express + Socket.IO (port 4000)
- **DB:** SQLite (`server/data.db`, auto-created)
- **Auth:** JWT (Bearer token)

## Domains

- `user` — username, password (bcrypt hash), isActive, email
- `account` — firstname, lastname, role (linked to user 1:1)

## Quick Start

```bash
# 1. Server
cd server
npm install
npm run seed     # creates data.db + admin user (admin / admin123)
npm run dev      # http://localhost:4000

# 2. Client (new terminal)
cd client
npm install
npm run dev      # http://localhost:5173
```

## Default Login

- **username:** `admin`
- **password:** `admin123`

## Pages

- `/login` — public
- `/` — home (protected)
- `/accounts` — account list w/ pagination (protected)

## API

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/login` | – | `{ username, password }` |
| GET | `/api/auth/me` | ✓ | – |
| GET | `/api/accounts?page=&pageSize=` | ✓ | – |

Socket.IO room: `accounts` — emits `account:changed` on create/update/delete.

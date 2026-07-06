import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../auth.js';

export const accountsRouter = Router();

accountsRouter.get('/', authRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  const total = db.prepare('SELECT COUNT(*) AS c FROM account').get().c;

  const rows = db.prepare(`
    SELECT a.id, a.firstname, a.lastname, a.role,
           u.username, u.email, u.isActive
    FROM account a
    JOIN user u ON u.id = a.userId
    ORDER BY a.id ASC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset);

  res.json({
    data: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

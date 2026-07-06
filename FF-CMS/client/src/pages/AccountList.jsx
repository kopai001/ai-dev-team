import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AccountList() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/accounts', { params: { page, pageSize } });
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setErr(e.response?.data?.error || 'load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Accounts</h2>
          <div>
            <label style={{ display: 'inline', marginRight: 6 }}>Page size:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              style={{ padding: 6 }}
            >
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {err && <div className="error">{err}</div>}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Firstname</th>
              <th>Lastname</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>No data</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.username}</td>
                <td>{r.firstname}</td>
                <td>{r.lastname}</td>
                <td>{r.email}</td>
                <td><span className={`badge ${r.role}`}>{r.role}</span></td>
                <td>{r.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pager">
          <span className="info">
            Total {total} • Page {page}/{totalPages}
          </span>
          <button className="ghost" disabled={page <= 1} onClick={() => setPage(1)}>« First</button>
          <button className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <button className="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
          <button className="ghost" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last »</button>
        </div>
      </div>
    </div>
  );
}

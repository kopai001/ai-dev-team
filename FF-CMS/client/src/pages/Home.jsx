import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext.jsx';

export default function Home() {
  const { user, token } = useAuth();
  const [socketStatus, setSocketStatus] = useState('connecting...');

  useEffect(() => {
    const s = io('/', { auth: { token } });
    s.on('connect', () => setSocketStatus('connected'));
    s.on('disconnect', () => setSocketStatus('disconnected'));
    s.on('connect_error', (e) => setSocketStatus(`error: ${e.message}`));
    return () => s.close();
  }, [token]);

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Welcome, {user?.firstname || user?.username}</h2>
        <p>You are signed in as <b>{user?.username}</b> ({user?.email}).</p>
        <p>Role: <span className={`badge ${user?.role}`}>{user?.role}</span></p>
        <p>Socket.IO: <b>{socketStatus}</b></p>
      </div>
    </div>
  );
}

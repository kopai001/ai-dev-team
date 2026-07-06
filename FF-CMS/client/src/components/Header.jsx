import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const onLogout = () => {
    logout();
    nav('/login', { replace: true });
  };

  return (
    <header className="header">
      <div className="brand">
        <span>FF-CMS</span>
        <nav style={{ marginLeft: 24 }}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
        </nav>
      </div>
      <div className="user">
        <span className="name">
          {user ? `${user.firstname || user.username} (${user.role || 'user'})` : ''}
        </span>
        <button className="ghost" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}

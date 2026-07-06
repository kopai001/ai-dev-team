import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import AccountList from './pages/AccountList.jsx';

export default function App() {
  const { token } = useAuth();
  const loc = useLocation();
  const showHeader = token && loc.pathname !== '/login';

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AccountList /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

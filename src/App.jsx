import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';

function LayoutShell() {
  return <Layout><Outlet /></Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<LayoutShell />}>
              <Route path="/"        element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import CustomReportsPage from './pages/CustomReportsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import BatchPrintPage from './pages/BatchPrintPage';

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
              <Route path="/"               element={<DashboardPage />} />
              <Route path="/custom-reports" element={<CustomReportsPage />} />
              <Route path="/profile"        element={<ProfilePage />} />
              <Route path="*"               element={<Navigate to="/" replace />} />
            </Route>
          </Route>
          {/* No auth guard — accessed only by the Playwright backend */}
          <Route path="/batch-print" element={<BatchPrintPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

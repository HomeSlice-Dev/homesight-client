import { useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function renderPage() {
    switch (activePage) {
      case 'profile': return <ProfilePage />;
      default:        return <DashboardPage />;
    }
  }

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      isLoggedIn={isLoggedIn}
      onLoginToggle={() => setIsLoggedIn((prev) => !prev)}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;

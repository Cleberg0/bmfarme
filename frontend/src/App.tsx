import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import GodModePanel from './components/GodModePanel';
import ToastContainer from './components/ui/Toast';

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <GodModePanel /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer />
    </AuthProvider>
  );
}
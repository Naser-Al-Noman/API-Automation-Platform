import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import Environments from './pages/Environments';
import ExecutionHistory from './pages/ExecutionHistory';
import ExecutionDetail from './pages/ExecutionDetail';

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading…
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/collections" element={<Protected><Collections /></Protected>} />
          <Route path="/collections/:id" element={<Protected><Collections /></Protected>} />
          <Route path="/environments" element={<Protected><Environments /></Protected>} />
          <Route path="/environments/:id" element={<Protected><Environments /></Protected>} />
          <Route path="/executions" element={<Protected><ExecutionHistory /></Protected>} />
          <Route path="/executions/:id" element={<Protected><ExecutionDetail /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

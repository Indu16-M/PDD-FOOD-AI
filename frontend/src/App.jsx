import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Route Guard to verify user has logged in and has the right role
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized for this dashboard, redirect to their role's default dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'donor') return <Navigate to="/donor" replace />;
    return <Navigate to="/ngo" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { user, token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        token ? (
          user.role === 'admin' ? <Navigate to="/admin" replace /> :
          user.role === 'donor' ? <Navigate to="/donor" replace /> :
          <Navigate to="/ngo" replace />
        ) : <Login />
      } />
      
      <Route path="/register" element={<Register />} />
      
      <Route path="/donor" element={
        <ProtectedRoute allowedRoles={['donor']}>
          <DonorDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/ngo" element={
        <ProtectedRoute allowedRoles={['ngo']}>
          <NgoDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Fallback redirects */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

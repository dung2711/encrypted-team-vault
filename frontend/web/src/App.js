import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KeyStoreProvider } from './context/KeyStoreContext';
import theme from './theme';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PersonalVault from './pages/PersonalVault';
import TeamList from './pages/TeamList';
import TeamDetail from './pages/TeamDetail';
import Settings from './pages/Settings';

// Components
import Layout from './components/Layout';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return null; // or a loading spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vault" element={<PersonalVault />} />
        <Route path="/teams" element={<TeamList />} />
        <Route path="/teams/:teamId" element={<TeamDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <KeyStoreProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </KeyStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

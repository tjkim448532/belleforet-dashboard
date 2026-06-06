import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { MappingProvider } from './contexts/MappingContext';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import Simulator from './pages/Simulator';
import AdminLogs from './pages/AdminLogs';
import AdminMapping from './pages/AdminMapping';

import ManagementSupport from './pages/ManagementSupport';

// Auth Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SimulationProvider>
          <MappingProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Home />} />
                  <Route path="management-support" element={<ManagementSupport />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route path="simulator" element={<Simulator />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="mapping" element={<AdminMapping />} />
                  <Route index element={<Navigate to="simulator" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </MappingProvider>
        </SimulationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

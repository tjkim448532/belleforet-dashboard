import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { MappingProvider } from './contexts/MappingContext';
import { DateProvider } from './contexts/DateContext';
import { CoreDataProvider } from './contexts/CoreDataContext';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import Simulator from './pages/Simulator';
import AdminLogs from './pages/AdminLogs';
import AdminMapping from './pages/AdminMapping';
import AdminRoles from './pages/AdminRoles';

import ManagementSupport from './pages/ManagementSupport';
import ResortBusiness from './pages/ResortBusiness';
import GolfBusiness from './pages/GolfBusiness';
import Members from './pages/Members';
import { DataSyncStatus } from './pages/DataSyncStatus';
import MatrixDashboard from './pages/MatrixDashboard';
import MatrixWeeklyDashboard from './pages/MatrixWeeklyDashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authReady } = useAuth();
  const isSessionAuth = sessionStorage.getItem('auth') === 'true';
  
  if (!authReady) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">잠시만 기다려주세요...</div>;
  }

  // React 상태 업데이트 지연(Race condition)으로 인해 방금 로그인했는데도 다시 튕기는 현상 방지
  if (!isAuthenticated && !isSessionAuth) {
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
            <DateProvider>
              <CoreDataProvider>
                <BrowserRouter>
                  <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Home />} />
                    <Route path="management-support" element={<ManagementSupport />} />
                    <Route path="resort-business" element={<ResortBusiness />} />
                    <Route path="golf-business" element={<GolfBusiness />} />
                    <Route path="executive" element={<ExecutiveDashboard />} />
                    <Route path="matrix" element={<MatrixDashboard />} />
                    <Route path="matrix-weekly" element={<MatrixWeeklyDashboard />} />
                    <Route path="members" element={<Members />} />
                    <Route path="etl-status" element={<DataSyncStatus />} />
                  </Route>

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route path="simulator" element={<Simulator />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="mapping" element={<AdminMapping />} />
                    <Route path="roles" element={<AdminRoles />} />
                    <Route index element={<Navigate to="simulator" replace />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </CoreDataProvider>
            </DateProvider>
          </MappingProvider>
        </SimulationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

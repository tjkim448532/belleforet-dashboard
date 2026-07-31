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
// AdminLeisureMapping removed
import AdminDaolRules from './pages/AdminDaolRules';
import AdminRoles from './pages/AdminRoles';

import ResortBusiness from './pages/ResortBusiness';
import GolfBusiness from './pages/GolfBusiness';
import LeisureFacility from './pages/LeisureFacility';
import Members from './pages/Members';
import { DataSyncStatus } from './pages/DataSyncStatus';

import MatrixWeeklyDashboard from './pages/MatrixWeeklyDashboard';
import Synergy from './pages/Synergy';
import SynergyCorrelation from './pages/SynergyCorrelation';
import SynergyBundles from './pages/SynergyBundles';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authReady } = useAuth();
  const isSessionAuth = sessionStorage.getItem('auth') === 'true';
  
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isSessionAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
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
                      <Route path="resort-business" element={<ResortBusiness />} />
                      <Route path="golf-business" element={<GolfBusiness />} />
                      <Route path="leisure" element={<LeisureFacility />} />

                    <Route path="matrix-weekly" element={<MatrixWeeklyDashboard />} />
                    <Route path="members" element={<Members />} />
                    <Route path="etl-status" element={<DataSyncStatus />} />
                    <Route path="synergy" element={<Synergy />} />
                    <Route path="synergy/correlation" element={<SynergyCorrelation />} />
                    <Route path="synergy-correlation" element={<SynergyCorrelation />} />
                    <Route path="synergy/bundles" element={<SynergyBundles />} />
                    <Route path="synergy-bundles" element={<SynergyBundles />} />
                  </Route>

                  <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route path="simulator" element={<Simulator />} />
                    <Route path="daol-rules" element={<AdminDaolRules />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="mapping" element={<AdminMapping />} />
                    {/* <Route path="leisure-mapping" element={<AdminLeisureMapping />} /> */}
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

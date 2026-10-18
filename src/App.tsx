import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MappingProvider } from './contexts/MappingContext';
import { DateProvider } from './contexts/DateContext';
import { CoreDataProvider } from './contexts/CoreDataContext';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import SleepModeModal from './components/SleepModeModal';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminLogs from './pages/AdminLogs';
import AdminMapping from './pages/AdminMapping';
import AdminDaolRules from './pages/AdminDaolRules';
import AdminRoles from './pages/AdminRoles';

import ResortBusiness from './pages/ResortBusiness';
import ResortRoomGuestsYoy from './pages/ResortRoomGuestsYoy';
import RoomGuestAnalysis from './pages/RoomGuestAnalysis';
import GolfBusiness from './pages/GolfBusiness';
import GolfChannelIntelligence from './pages/GolfChannelIntelligence';
import LeisureFacility from './pages/LeisureFacility';
import LeisureOrganization from './pages/LeisureOrganization';
import LeisureUsageRate from './pages/LeisureUsageRate';
import LeisureSimulator from './pages/LeisureSimulator';
import LeisurePricing from './pages/LeisurePricing';
import Members from './pages/Members';
import { DataSyncStatus } from './pages/DataSyncStatus';

import MatrixWeeklyDashboard from './pages/MatrixWeeklyDashboard';
import Synergy from './pages/Synergy';
import SynergyCorrelation from './pages/SynergyCorrelation';
import FacilityTrend from './pages/FacilityTrend';
import OnlineMembers from './pages/OnlineMembers';
import GroupSales from './pages/GroupSales';
import StrategicSimulator from './pages/StrategicSimulator';
import WeatherSalesCorrelation from './pages/WeatherSalesCorrelation';
import TomorrowRevenueForecast from './pages/TomorrowRevenueForecast';
import OutsourcedFnbDashboard from './pages/OutsourcedFnbDashboard';
import GroupVenuePreferenceSection from './components/dashboard/GroupVenuePreferenceSection';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authReady } = useAuth();
  const isSessionAuth = sessionStorage.getItem('auth') === 'true';
  
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">인증 확인 중...</p>
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
        <MappingProvider>
          <DateProvider>
            <CoreDataProvider>
              <BrowserRouter>
                <SleepModeModal />
                <Routes>
                <Route path="/login" element={<Login />} />
                  
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Home />} />
                    <Route path="resort-business" element={<ResortBusiness />} />
                    <Route path="resort/room-guest-analysis" element={<RoomGuestAnalysis />} />
                    <Route path="resort/room-guests-yoy" element={<ResortRoomGuestsYoy />} />
                    <Route path="resort-room-guests-yoy" element={<ResortRoomGuestsYoy />} />
                    <Route path="golf-business" element={<GolfBusiness />} />
                    <Route path="golf/channel-intelligence" element={<GolfChannelIntelligence />} />
                    <Route path="golf-channel-intelligence" element={<GolfChannelIntelligence />} />
                    <Route path="group-sales" element={<GroupSales pageSection="ROOM_CHANNELS" />} />
                    <Route path="sales/room-channels" element={<GroupSales pageSection="ROOM_CHANNELS" />} />
                    <Route path="sales/venue-performance" element={<GroupSales pageSection="VENUE_PERFORMANCE" />} />
                    <Route path="sales/group-master-crm" element={<GroupSales pageSection="GROUP_MASTER_CRM" />} />
                    <Route path="sales/group-venue-preference" element={<GroupSales pageSection="GROUP_VENUE_PREFERENCE" />} />
                    <Route path="leisure" element={<LeisureFacility />} />
                    <Route path="leisure/organization" element={<LeisureOrganization />} />
                    <Route path="leisure-organization" element={<LeisureOrganization />} />
                    <Route path="leisure/usage-rate" element={<LeisureUsageRate />} />
                    <Route path="leisure-usage-rate" element={<LeisureUsageRate />} />
                    <Route path="leisure/simulator" element={<LeisureSimulator />} />
                    <Route path="leisure-simulator" element={<LeisureSimulator />} />
                    <Route path="leisure/pricing" element={<LeisurePricing />} />
                    <Route path="leisure-pricing" element={<LeisurePricing />} />
                    <Route path="content/outsourced-fnb" element={<OutsourcedFnbDashboard viewMode="CARDS" />} />
                    <Route path="outsourced-fnb" element={<OutsourcedFnbDashboard viewMode="CARDS" />} />
                    <Route path="content/group-rankings" element={<GroupVenuePreferenceSection mode="RANKINGS_ONLY" isStandalonePage={true} />} />
                    <Route path="content/group-segments" element={<GroupVenuePreferenceSection mode="SEGMENTS_AND_TRAILS" isStandalonePage={true} />} />
                    <Route path="content/fnb-directory" element={<OutsourcedFnbDashboard viewMode="DIRECTORY" />} />
                    <Route path="target-simulator" element={<Navigate to="/strategic-simulator" replace />} />
                    <Route path="strategic-simulator" element={<StrategicSimulator />} />
                    <Route path="target-simulator/strategic" element={<Navigate to="/strategic-simulator" replace />} />

                  <Route path="matrix-weekly" element={<MatrixWeeklyDashboard />} />
                  <Route path="day-of-week-sales" element={<MatrixWeeklyDashboard defaultTab="day-of-week" />} />
                  <Route path="facility-trend" element={<FacilityTrend />} />
                  <Route path="members" element={<Members />} />
                  <Route path="etl-status" element={<DataSyncStatus />} />
                  <Route path="synergy" element={<Synergy />} />
                  <Route path="synergy/correlation" element={<SynergyCorrelation />} />
                  <Route path="synergy-correlation" element={<SynergyCorrelation />} />
                  <Route path="synergy/weather-sales" element={<WeatherSalesCorrelation />} />
                  <Route path="synergy-weather" element={<WeatherSalesCorrelation />} />
                  <Route path="synergy/forecast" element={<TomorrowRevenueForecast />} />
                  <Route path="synergy-forecast" element={<TomorrowRevenueForecast />} />
                  <Route path="online-members" element={<OnlineMembers />} />
                </Route>

                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route path="daol-rules" element={<AdminDaolRules />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="mapping" element={<AdminMapping />} />
                  <Route path="roles" element={<AdminRoles />} />
                  <Route index element={<Navigate to="roles" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </CoreDataProvider>
          </DateProvider>
        </MappingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

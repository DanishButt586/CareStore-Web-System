import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MedicineProvider } from './context/MedicineContext';

import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import POS from './pages/POS';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Bills from './pages/Bills';
import Logs from './pages/Logs';
import { hasSectionAccess } from './constants/appSections';

const AccessDenied = ({ section }) => (
  <div className="bg-white border border-red-200 rounded-lg p-6 text-sm text-red-700">
    You do not have access to {section}.
  </div>
);

const SectionRoute = ({ section, children }) => {
  const { user } = useAuth();
  if (!hasSectionAccess(user, section)) {
    return <AccessDenied section={section} />;
  }
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MedicineProvider>
              <DashboardLayout />
            </MedicineProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<SectionRoute section="medicines"><Medicines /></SectionRoute>} />
        <Route path="suppliers" element={<SectionRoute section="suppliers"><Suppliers /></SectionRoute>} />
        <Route path="customers" element={<SectionRoute section="customers"><Customers /></SectionRoute>} />
        <Route path="pos" element={<SectionRoute section="pos"><POS /></SectionRoute>} />
        <Route path="bills" element={<SectionRoute section="bills"><Bills /></SectionRoute>} />
        <Route path="purchases" element={<SectionRoute section="purchases"><Purchases /></SectionRoute>} />
        <Route path="reports" element={<SectionRoute section="reports"><Reports /></SectionRoute>} />
        <Route path="logs" element={<SectionRoute section="logs"><Logs /></SectionRoute>} />
        <Route path="admin/users" element={<SectionRoute section="adminUsers"><AdminUsers /></SectionRoute>} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
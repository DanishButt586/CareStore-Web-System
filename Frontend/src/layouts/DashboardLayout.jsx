import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, ShoppingCart, LayoutDashboard, LogOut, Truck, Users, Package, BarChart3, Shield, ReceiptText, PanelLeftClose, PanelLeftOpen, FileClock } from 'lucide-react';
import { hasSectionAccess } from '../constants/appSections';

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { key: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { key: 'medicines', name: 'Medicines', path: '/medicines', icon: Pill },
    { key: 'suppliers', name: 'Suppliers', path: '/suppliers', icon: Truck },
    { key: 'customers', name: 'Customers', path: '/customers', icon: Users },
    { key: 'pos', name: 'POS (Billing)', path: '/pos', icon: ShoppingCart },
    { key: 'bills', name: 'Bills', path: '/bills', icon: ReceiptText },
    { key: 'purchases', name: 'Purchases', path: '/purchases', icon: Package },
    { key: 'reports', name: 'Reports', path: '/reports', icon: BarChart3 },
    { key: 'logs', name: 'Logs', path: '/logs', icon: FileClock },
    { key: 'adminUsers', name: 'Admin Users', path: '/admin/users', icon: Shield },
  ];

  const visibleMenuItems = menuItems.filter((item) => hasSectionAccess(user, item.key));

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-white border-r shadow-sm hidden md:flex flex-col overflow-hidden transition-all duration-200 ${sidebarHidden ? 'w-0 opacity-0 pointer-events-none' : 'w-64 opacity-100'}`}>
        <div className="h-16 flex items-center px-6 border-b">
          <Pill className="text-medical-teal w-8 h-8 mr-2" />
          <span className="text-xl font-bold text-gray-800">CareStore</span>
        </div>
        <div className="flex-1 py-6">
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-medical-light text-medical-dark border-r-4 border-medical-dark'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-medical'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-medical text-white flex items-center justify-center font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="hidden md:flex h-16 bg-white border-b px-4 items-center justify-between">
          <button
            onClick={() => setSidebarHidden((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {sidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
          </button>
          <button onClick={handleLogout} className="text-sm text-red-600 font-medium">Logout</button>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <Pill className="text-medical-teal w-6 h-6 mr-2" />
            <span className="text-lg font-bold">CareStore</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-600 font-medium">Logout</button>
        </header>

        {/* Scrollable container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
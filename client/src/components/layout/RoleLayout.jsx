// src/components/layout/RoleLayout.jsx

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTransition } from '../ui';

export const RoleLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-35 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <div className={`lg:pl-64 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : ''}`}>
        {/* Header */}
        <Header onMenuClick={toggleMobileMenu} />

        {/* Page content */}
        <main className={`pt-16 p-6 ${mobileMenuOpen ? 'lg:pl-64' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
};
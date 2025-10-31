import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { LayoutProvider } from '../../contexts/LayoutContext';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <LayoutProvider>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content">
          {/* O Outlet renderiza o componente da rota filha aqui */}
          <Outlet />
        </main>
      </div>
    </LayoutProvider>
  );
};

export default DashboardLayout; 
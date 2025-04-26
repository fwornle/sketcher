import React, { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => (
  <div className="d-flex flex-column min-vh-100 p-0 m-0 overflow-hidden">
    <TopBar />
    <main className="flex-fill container-fluid my-4">
      {children}
    </main>
    <BottomBar />
  </div>
);

export default MainLayout; 
import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar, MobileNav } from './Sidebar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-cairo" dir="rtl">
      <Navbar />
      <div className="flex flex-1 max-w-[1600px] mx-auto w-full">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFF] font-cairo" dir="rtl">
      {children}
    </div>
  );
};

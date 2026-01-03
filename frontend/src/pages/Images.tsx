import React from 'react';
import Sidebar from '../components/layout/Sidebar';

const Images = () => {
  return (
    <div className="bg-background-dark text-white font-display antialiased h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 shrink-0 bg-[#111418]">
          <h1 className="text-white font-bold tracking-tight">Images</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-card-dark border border-border-dark rounded-lg p-6">
            <h2 className="text-lg font-bold text-white">Coming soon</h2>
            <p className="text-text-muted mt-2">This page is a placeholder so navigation stays functional.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Images;


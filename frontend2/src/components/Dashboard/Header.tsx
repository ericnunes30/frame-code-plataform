import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 shrink-0 bg-[#111418]">
      <div className="flex items-center gap-2">
        <span className="text-text-muted">Home</span>
        <span className="material-symbols-outlined text-text-muted text-sm">chevron_right</span>
        <span className="text-white font-medium">Dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-text-muted hover:text-white transition-colors" type="button">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-[#111418]"></span>
        </button>
        <Link
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          to="/create-workspace"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Workspace
        </Link>
      </div>
    </header>
  );
};

export default Header;


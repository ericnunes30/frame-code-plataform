import React from 'react';
import { NavLink } from 'react-router-dom';

type NavLinkArgs = { isActive: boolean };

const Sidebar = () => {
  const baseLinkClass = 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors';
  const activeClass = 'bg-primary/10 text-primary border border-primary/20';
  const inactiveClass = 'hover:bg-white/5 text-text-muted';

  const navClassName = ({ isActive }: NavLinkArgs) =>
    `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`;

  return (
    <aside className="w-64 flex flex-col border-r border-border-dark bg-[#111418] h-full shrink-0">
      <div className="p-4 flex items-center gap-3 border-b border-border-dark">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
          D
        </div>
        <h1 className="text-white text-lg font-bold tracking-tight">DevWorkspace</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <NavLink className={navClassName} to="/">
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="text-sm font-medium">Dashboard</span>
        </NavLink>
        <NavLink className={navClassName} to="/workspaces">
          <span className="material-symbols-outlined text-[20px]">deployed_code</span>
          <span className="text-sm font-medium">Workspaces</span>
        </NavLink>
        <NavLink className={navClassName} to="/images">
          <span className="material-symbols-outlined text-[20px]">imagesmode</span>
          <span className="text-sm font-medium">Images</span>
        </NavLink>
        <NavLink className={navClassName} to="/logs">
          <span className="material-symbols-outlined text-[20px]">terminal</span>
          <span className="text-sm font-medium">Logs</span>
        </NavLink>
        <div className="my-2 border-t border-border-dark"></div>
        <NavLink className={navClassName} to="/settings">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="text-sm font-medium">Settings</span>
        </NavLink>
      </nav>
      <div className="p-4 border-t border-border-dark">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDwxZxrZ7lOpAQyqJ-aVH5DmGUHUBD_oL6LvXUKzekoyt524AcHj2FK6Ss5-7Q0Lnnq4ECRubahlAVGVoU2MyAcUBum3Z6ICdfIaBft4l4SqL_16oW7bQR0npqBuH_EDgfjJo4rC2h4Pornc-w1TzM9I_GQLN7zisp26blOqcawtee-Tn-Zufcaxo3sJi8aN_AH0XvO0NLbuerjFlkVOg5K4ClqUiPLCzG2uMXDg1LYCXRNn4Ds1tz-CgKHX9R9bs6RFypFy4fg3lA')",
            }}
          ></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Alex Chen</span>
            <span className="text-xs text-text-muted">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


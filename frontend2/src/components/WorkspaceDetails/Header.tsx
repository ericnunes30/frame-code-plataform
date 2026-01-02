import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

type Props = {
  runningCount?: number;
  stoppedCount?: number;
};

const Header = ({ runningCount, stoppedCount }: Props) => {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'tasks';

  const makeTabHref = (tab: string) => {
    const next = new URLSearchParams(location.search);
    next.set('tab', tab);
    return `/workspaces/${encodeURIComponent(id || '')}?${next.toString()}`;
  };

  const tabClass = (tab: string) =>
    tab === activeTab
      ? 'text-white text-sm font-medium border-b-2 border-primary py-4'
      : 'text-[#9dabb9] hover:text-white text-sm font-medium transition-colors py-4';

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-5 py-2 bg-surface-dark shrink-0 z-20">
      <div className="flex items-center gap-4 text-white">
        <div className="size-6 flex items-center justify-center bg-primary/20 rounded text-primary">
          <span className="material-symbols-outlined text-lg">terminal</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-[#9dabb9] font-medium">
            <Link className="hover:text-white transition-colors" to="/workspaces">
              Workspaces
            </Link>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="font-mono">{id}</span>
          </div>
          <h2 className="text-white text-sm font-bold leading-tight tracking-wide">Workspace Details</h2>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6">
          <Link className={tabClass('overview')} to={makeTabHref('overview')}>
            Overview
          </Link>
          <Link className={tabClass('tasks')} to={makeTabHref('tasks')}>
            Tasks
          </Link>
          <Link className={tabClass('settings')} to={makeTabHref('settings')}>
            Settings
          </Link>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono ml-2">
            {runningCount ?? 0} running / {stoppedCount ?? 0} stopped
          </span>
        </div>
        <div className="h-6 w-px bg-border-dark mx-2"></div>
        <div className="flex items-center gap-3">
          <button className="text-[#9dabb9] hover:text-white" type="button">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full size-8 border border-border-dark"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_XBxexb2NVlbRa2Cel2ngRVLN_Vh9W_qb6XZ6yea6Z3PjByfUANuTOoISkRSJBVe4Htyoejis9q3c3Kq9o0zSXklTaq7WHx9A5aLppCs8orsiZHKrimfauVCUTKaFaSa84JOAFY5Jqb7TRuOo_7DAralds9NRen97I2N_HasXO8dx5T6G2RCXsjelkMwWVmv6pqcOfo_f2ruPTUj7RHQ7IDoVBkKOqFs18WwfLLXwE77HMF_qe4lhKcJTQVZmO409ye7WukFbwL4")',
            }}
            aria-label="User avatar profile picture"
          ></div>
        </div>
      </div>
    </header>
  );
};

export default Header;


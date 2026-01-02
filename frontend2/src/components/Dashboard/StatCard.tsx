import React from 'react';

type Progress = {
  value: string;
  details: string;
  width: string;
  color: string;
};

type Props = {
  title: string;
  status?: 'online' | 'offline';
  value?: string;
  details?: string;
  icon?: string;
  progress?: Progress;
};

const StatCard = ({ title, status, value, details, icon, progress }: Props) => {
  const isOnline = status === 'online';
  const isOffline = status === 'offline';

  return (
    <div className="bg-card-dark border border-border-dark rounded-xl p-5 flex flex-col justify-between h-32 hover:border-primary/50 transition-colors group">
      <div className="flex justify-between items-start">
        <span className="text-text-muted text-sm font-medium">{title}</span>
        {status && (
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''} ${
              isOffline ? 'bg-red-500' : ''
            }`}
          ></span>
        )}
        {icon && (
          <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">
            {icon}
          </span>
        )}
      </div>

      {progress ? (
        <div className="w-full">
          <div className="flex justify-between items-end mb-2">
            <div className="text-2xl font-bold text-white">{progress.value}</div>
            <span className="text-xs text-text-muted">{progress.details}</span>
          </div>
          <div className="w-full bg-[#283039] rounded-full h-1.5 overflow-hidden">
            <div className={`${progress.color} h-1.5 rounded-full`} style={{ width: progress.width }}></div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{value}</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${isOnline ? 'text-emerald-500' : 'text-text-muted'}`}>
            {isOnline && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
            {details}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;


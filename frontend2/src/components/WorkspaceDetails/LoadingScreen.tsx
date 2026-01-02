import React from 'react';

const LoadingScreen = () => {
  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
      <div className="h-14 border-b border-border-dark flex items-center justify-between px-6 bg-surface-dark/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-white text-base font-bold leading-tight">Untitled Task</h1>
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 rounded border border-primary/20 font-mono">ID: 9421</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9dabb9] font-mono mt-0.5">
            <span className="material-symbols-outlined text-[12px]">call_split</span>
            <span>task/untitled-1</span>
            <span className="w-1 h-1 bg-[#5a6b7c] rounded-full mx-1"></span>
            <span>
              Docker Container:{' '}
              <span className="text-blue-400 flex items-center gap-1">
                <span className="animate-pulse">●</span> Starting
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#283039]/50 cursor-not-allowed rounded text-xs font-medium text-[#5a6b7c] transition-colors border border-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Open Preview</span>
          </button>
          <button className="p-1.5 text-[#9dabb9] hover:text-white hover:bg-[#283039] rounded transition-colors" type="button">
            <span className="material-symbols-outlined text-lg">settings</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-4 opacity-100 transition-opacity animate-[fadeIn_0.5s_ease-out]">
          <div className="relative size-12 flex items-center justify-center">
            <span className="absolute inset-0 border-2 border-primary/20 rounded-full"></span>
            <span className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            <span className="material-symbols-outlined text-primary text-xl">deployed_code</span>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-white font-medium">Provisioning Environment</h3>
            <p className="text-sm text-[#9dabb9]">Allocating resources and starting container...</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 w-64">
            <div className="flex items-center gap-3 text-xs text-[#d1d5db]">
              <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
              <span>Task created</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#d1d5db]">
              <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
              <span>Repository branch created</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white font-medium">
              <span className="size-3 border border-current border-t-transparent rounded-full animate-spin text-blue-400"></span>
              <span>Booting container...</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-border-dark bg-background-dark">
        <div className="relative flex items-end gap-2 bg-surface-dark/50 border border-border-dark rounded-xl p-2 transition-all">
          <button className="p-2 text-[#5a6b7c] cursor-not-allowed rounded-lg shrink-0" type="button">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>
          <textarea
            className="w-full bg-transparent border-none text-sm text-[#5a6b7c] placeholder-[#5a6b7c] focus:ring-0 resize-none py-2.5 max-h-32 min-h-[44px] cursor-not-allowed"
            disabled
            placeholder="Waiting for environment initialization..."
            rows={1}
          ></textarea>
          <button className="p-2 bg-[#283039] text-[#5a6b7c] cursor-not-allowed rounded-lg shrink-0 mb-0.5" type="button">
            <span className="material-symbols-outlined text-lg">arrow_upward</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-[10px] text-[#5a6b7c]">System is preparing your workspace.</p>
        </div>
      </div>
    </main>
  );
};

export default LoadingScreen;


import React, { ReactNode } from 'react';

type Message = {
  sender: string;
  time: string;
  isUser: boolean;
  content: ReactNode;
  status?: string;
  statusIcon?: string;
};

const InitialScreen = () => {
  const messages: Message[] = [
    {
      sender: 'System',
      time: '10:42 AM',
      isUser: false,
      content: (
        <div className="p-3 rounded-lg rounded-tl-none bg-[#1e2732] border border-border-dark text-sm text-[#d1d5db] shadow-sm">
          <p>
            Container initialized successfully. Repository{' '}
            <span className="text-white font-mono text-xs bg-black/20 px-1 py-0.5 rounded">backend-service-v2</span>{' '}
            cloned to <span className="text-white font-mono text-xs bg-black/20 px-1 py-0.5 rounded">/app</span>.
          </p>
        </div>
      ),
    },
    {
      sender: 'You',
      time: 'Just now',
      isUser: true,
      content: (
        <div className="p-3 rounded-lg rounded-tr-none bg-primary text-white text-sm shadow-md">
          <p>Can you verify the environment variables are loaded correctly?</p>
        </div>
      ),
      status: 'Sent',
      statusIcon: 'check',
    },
  ];

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
              <span className="text-green-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px] filled">circle</span> Running
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#283039] hover:bg-[#3a4552] cursor-pointer rounded text-xs font-medium text-white transition-colors border border-transparent"
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
        <div className="flex justify-center mb-4">
          <span className="text-[10px] font-medium text-[#5a6b7c] bg-[#161e27] px-2 py-0.5 rounded-full border border-border-dark">
            Today, 10:42 AM
          </span>
        </div>
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 max-w-[85%] group ${msg.isUser ? 'self-end flex-row-reverse' : ''}`}>
            <div
              className={`size-8 rounded ${
                msg.isUser
                  ? 'rounded-full border border-border-dark'
                  : 'bg-surface-darker flex items-center justify-center border border-border-dark'
              }`}
              style={
                msg.isUser
                  ? {
                      backgroundImage:
                        'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_XBxexb2NVlbRa2Cel2ngRVLN_Vh9W_qb6XZ6yea6Z3PjByfUANuTOoISkRSJBVe4Htyoejis9q3c3Kq9o0zSXklTaq7WHx9A5aLppCs8orsiZHKrimfauVCUTKaFaSa84JOAFY5Jqb7TRuOo_7DAralds9NRen97I2N_HasXO8dx5T6G2RCXsjelkMwWVmv6pqcOfo_f2ruPTUj7RHQ7IDoVBkKOqFs18WwfLLXwE77HMF_qe4lhKcJTQVZmO409ye7WukFbwL4")',
                      backgroundSize: 'cover',
                    }
                  : {}
              }
            >
              {!msg.isUser && <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>}
            </div>
            <div className={`flex flex-col gap-1 ${msg.isUser ? 'items-end' : ''}`}>
              <div className={`flex items-baseline gap-2 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs font-bold text-white">{msg.sender}</span>
                <span className="text-[10px] text-[#5a6b7c]">{msg.time}</span>
              </div>
              {msg.content}
              {msg.status && (
                <div className="flex items-center gap-1 text-[10px] text-[#5a6b7c]">
                  <span>{msg.status}</span>
                  <span className="material-symbols-outlined text-[12px]">{msg.statusIcon}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border-dark bg-background-dark">
        <div className="relative flex items-end gap-2 bg-surface-dark border border-border-dark rounded-xl p-2 transition-all ring-1 ring-border-dark/50 focus-within:ring-primary/50 focus-within:border-primary/50">
          <button className="p-2 text-[#9dabb9] hover:text-white hover:bg-[#283039] rounded-lg shrink-0 transition-colors" type="button">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>
          <textarea
            className="w-full bg-transparent border-none text-sm text-white placeholder-[#5a6b7c] focus:ring-0 resize-none py-2.5 max-h-32 min-h-[44px]"
            placeholder="Type a message..."
            rows={1}
          ></textarea>
          <button
            className="p-2 bg-primary hover:bg-blue-600 text-white rounded-lg shrink-0 mb-0.5 transition-colors shadow-lg shadow-blue-900/20 group"
            type="button"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-y-0.5 transition-transform">arrow_upward</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-[10px] text-[#5a6b7c]">
            Press{' '}
            <span className="font-mono text-[9px] bg-[#283039] px-1 rounded border border-border-dark text-[#d1d5db]">
              Enter
            </span>{' '}
            to send
          </p>
        </div>
      </div>
    </main>
  );
};

export default InitialScreen;


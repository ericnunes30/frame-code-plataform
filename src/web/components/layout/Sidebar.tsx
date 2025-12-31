import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { HomeIcon, CubeIcon, ChatBubbleLeftIcon } from './icons';

const routes = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/workspaces', label: 'Workspaces', icon: CubeIcon },
  { path: '/chat', label: 'Chat', icon: ChatBubbleLeftIcon },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen">
      <nav className="p-4 space-y-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const isActive = location.pathname === route.path;

          return (
            <Link
              key={route.path}
              href={route.path}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{route.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

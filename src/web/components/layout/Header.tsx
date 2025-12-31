import { useSystemStats } from '../../hooks';

export function Header() {
  const { stats } = useSystemStats();

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">
            Frame-Code Platform
          </h1>
          <span className="text-gray-400 text-sm">
            Isolated Workspace Management
          </span>
        </div>

        {stats && (
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Total:</span>
              <span className="text-white font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Running:</span>
              <span className="text-green-400 font-semibold">{stats.running}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Paused:</span>
              <span className="text-yellow-400 font-semibold">{stats.paused}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Stopped:</span>
              <span className="text-gray-400 font-semibold">{stats.stopped}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

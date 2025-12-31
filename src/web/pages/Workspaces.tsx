import { Link } from 'wouter';
import { useWorkspaces } from '../hooks';
import { WorkspaceStatusBadge } from '../components/workspace';

export function Workspaces() {
  const { workspaces, loading, error } = useWorkspaces();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Workspaces</h1>
        <p className="text-gray-400">Browse and manage all workspaces</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No workspaces found</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Task ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {workspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{workspace.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400 font-mono">{workspace.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400 font-mono">{workspace.taskId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <WorkspaceStatusBadge status={workspace.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, FormEvent } from 'react';

interface WorkspaceFormProps {
  onSubmit: (taskId: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function WorkspaceForm({ onSubmit, onCancel, loading = false }: WorkspaceFormProps) {
  const [taskId, setTaskId] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskId.trim()) return;
    await onSubmit(taskId.trim());
    setTaskId('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Workspace</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="taskId" className="block text-sm font-medium text-gray-300 mb-2">
              Task ID
            </label>
            <input
              id="taskId"
              type="text"
              value={taskId}
              onChange={(e) => setTaskId((e.target as HTMLInputElement).value)}
              placeholder="Enter task identifier"
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              A unique identifier for the task this workspace will handle
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !taskId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

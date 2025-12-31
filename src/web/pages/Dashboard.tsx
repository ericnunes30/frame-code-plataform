import { useState } from 'react';
import { useWorkspaces, useSystemStats } from '../hooks';
import { api } from '../services';
import { WorkspaceForm, WorkspaceList } from '../components/workspace';

export function Dashboard() {
  const { workspaces, loading, error, refetch } = useWorkspaces();
  const { stats } = useSystemStats();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateWorkspace = async (taskId: string) => {
    try {
      setActionLoading(true);
      await api.post('/workspaces', { taskId });
      setShowCreateForm(false);
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      setActionLoading(true);
      await api.post(`/workspaces/${id}/start`, {});
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    try {
      setActionLoading(true);
      await api.post(`/workspaces/${id}/stop`, {});
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionLoading(true);
      await api.post(`/workspaces/${id}/pause`, {});
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (id: string) => {
    try {
      setActionLoading(true);
      await api.post(`/workspaces/${id}/resume`, {});
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDestroy = async (id: string) => {
    if (!confirm('Are you sure you want to destroy this workspace?')) return;
    try {
      setActionLoading(true);
      await api.delete(`/workspaces/${id}`);
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Total Workspaces</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Running</div>
            <div className="text-3xl font-bold text-green-400">{stats.running}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Paused</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.paused}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Stopped</div>
            <div className="text-3xl font-bold text-gray-400">{stats.stopped}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-gray-400">Manage your isolated workspaces</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create Workspace
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Workspace List */}
      {!loading && (
        <WorkspaceList
          workspaces={workspaces}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
          onResume={handleResume}
          onDestroy={handleDestroy}
          actionDisabled={actionLoading}
        />
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <WorkspaceForm
          onSubmit={handleCreateWorkspace}
          onCancel={() => setShowCreateForm(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

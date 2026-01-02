import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Images from './pages/Images';
import Logs from './pages/Logs';
import Login from './pages/Login';
import Settings from './pages/Settings';
import CreateWorkspaceModal from './pages/CreateWorkspaceModal';
import DeleteWorkspaceModal from './pages/DeleteWorkspaceModal';
import WorkspaceDetails from './pages/WorkspaceDetails';
import WorkspacesList from './pages/WorkspacesList';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/workspaces" element={<WorkspacesList />} />
        <Route path="/workspaces/:id" element={<WorkspaceDetails />} />
        <Route path="/workspace/:id" element={<WorkspaceDetails />} />
        <Route path="/create-workspace" element={<CreateWorkspaceModal />} />
        <Route path="/delete-workspace" element={<DeleteWorkspaceModal />} />
        <Route path="/images" element={<Images />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </div>
  );
}

export default App;


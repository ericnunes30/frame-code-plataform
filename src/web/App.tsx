import { Route, Router } from 'wouter';
import { Header, Sidebar } from './components/layout';
import { Dashboard, WorkspaceDetail, Workspaces, Chat } from './pages';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/workspaces', component: Workspaces },
  { path: '/workspaces/:id', component: WorkspaceDetail },
  { path: '/chat/:id', component: Chat },
];

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white flex">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Header />

          <main className="flex-1 overflow-auto">
            {routes.map(({ path, component: Component }) => (
              <Route key={path} path={path}>
                {(params) => <Component {...params} />}
              </Route>
            ))}
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

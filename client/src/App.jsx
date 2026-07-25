import { useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useSocketConnection } from './hooks/useSocketConnection';
import { useSelector, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { getCurrentUser } from './store/slices/authSlice';
import { useTheme } from './hooks/useTheme';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PermissionGuard } from './components/guards/PermissionGuard';
import { WorkspaceGuard } from './components/guards/WorkspaceGuard';
import { SuperAdminGuard } from './components/guards/SuperAdminGuard';

// Layouts
const DashboardLayout = lazy(() =>
  import('./components/layout/DashboardLayout').then((module) => ({
    default: module.DashboardLayout,
  }))
);

// ── Super Admin Layout & Pages ─────────────────────────────────────────────────
const SuperAdminLayout = lazy(() =>
  import('./pages/super-admin/SuperAdminLayout').then((m) => ({
    default: m.SuperAdminLayout,
  }))
);
const PlatformDashboard = lazy(
  () => import('./pages/super-admin/PlatformDashboard')
);
const WorkspacesList = lazy(() => import('./pages/super-admin/WorkspacesList'));
const WorkspaceDetail = lazy(
  () => import('./pages/super-admin/WorkspaceDetail')
);
const AllUsers = lazy(() => import('./pages/super-admin/AllUsers'));
const SecurityLogs = lazy(() => import('./pages/super-admin/SecurityLogs'));
const PlatformSettings = lazy(
  () => import('./pages/super-admin/PlatformSettings')
);
const Announcements = lazy(() => import('./pages/super-admin/Announcements'));

// Auth Pages
const Login = lazy(() =>
  import('./pages/auth/Login').then((module) => ({ default: module.Login }))
);
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() =>
  import('./pages/auth/ForgotPassword').then((module) => ({
    default: module.ForgotPassword,
  }))
);
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

const SelectWorkspace = lazy(() => import('./pages/auth/SelectWorkspace'));
const Team = lazy(() => import('./pages/team/Team'));
const JoinWorkspace = lazy(() => import('./pages/auth/JoinWorkspace'));

// Main Pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Clients = lazy(() => import('./pages/clients/Clients'));
const AddClient = lazy(() => import('./pages/clients/AddClient'));
const ClientDetail = lazy(() => import('./pages/clients/ClientDetail'));
const Employees = lazy(() => import('./pages/employees/Employees'));
const AddEmployee = lazy(() => import('./pages/employees/AddEmployee'));
const EmployeeDetail = lazy(() => import('./pages/employees/EmployeeDetail'));
const Projects = lazy(() => import('./pages/projects/Projects'));
const AddProject = lazy(() => import('./pages/projects/AddProject'));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'));
const Tasks = lazy(() => import('./pages/tasks/Tasks'));
const AddTask = lazy(() => import('./pages/tasks/AddTask'));
const TaskDetail = lazy(() => import('./pages/tasks/TaskDetail'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const AddInvoice = lazy(() => import('./pages/invoices/AddInvoice'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const CreateWorkspace = lazy(
  () => import('./pages/workspaces/CreateWorkspace')
);

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, workspace, user } = useSelector(
    (state) => state.auth
  );

  // Super admin skips workspace routing
  if (isAuthenticated && user?.isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (isAuthenticated && workspace?.slug) {
    return <Navigate to={`/${workspace.slug}/dashboard`} replace />;
  }

  if (isAuthenticated && !workspace?.slug) {
    return <PageLoader />;
  }

  return children;
};

const RootRedirect = () => {
  const { isAuthenticated, workspace, user } = useSelector(
    (state) => state.auth
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin goes to their own dashboard
  if (user?.isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (workspace?.slug) {
    return <Navigate to={`/${workspace.slug}/dashboard`} replace />;
  }

  return <PageLoader />;
};

const NotFound = () => {
  const { workspace, user } = useSelector((state) => state.auth);
  const homeHref = user?.isSuperAdmin
    ? '/super-admin/dashboard'
    : workspace?.slug
      ? `/${workspace.slug}/dashboard`
      : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">
          404
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">
          Page not found
        </p>
        <a
          href={homeHref}
          className="inline-block mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { theme } = useTheme();

  useSocketConnection();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            <Route path="/select-workspace" element={<SelectWorkspace />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/join/:token" element={<JoinWorkspace />} />

            {/*
              ── Super Admin Routes ─────────────────────────────────────────────
              Accessible only to users with isSuperAdmin === true.
              These sit outside the workspace slug routing entirely.
            */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute>
                  <SuperAdminGuard>
                    <SuperAdminLayout />
                  </SuperAdminGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="workspaces" element={<WorkspacesList />} />
              <Route
                path="workspaces/:workspaceId"
                element={<WorkspaceDetail />}
              />
              <Route path="users" element={<AllUsers />} />
              <Route path="logs" element={<SecurityLogs />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="announcements" element={<Announcements />} />
            </Route>

            {/*
              Workspace-scoped Protected Routes.
              Every dashboard route is nested under "/:workspaceSlug" so the
              active tenant is always visible in the URL.
            */}
            <Route
              path="/:workspaceSlug"
              element={
                <ProtectedRoute>
                  <WorkspaceGuard>
                    <DashboardLayout />
                  </WorkspaceGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="clients/new"
                element={
                  <PermissionGuard permission="create_clients" showLocked>
                    <AddClient />
                  </PermissionGuard>
                }
              />
              <Route
                path="clients"
                element={
                  <PermissionGuard permission="view_clients" showLocked>
                    <Clients />
                  </PermissionGuard>
                }
              />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route
                path="employees/new"
                element={
                  <PermissionGuard permission="create_users" showLocked>
                    <AddEmployee />
                  </PermissionGuard>
                }
              />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route
                path="employees"
                element={
                  <PermissionGuard permission="view_users" showLocked>
                    <Employees />
                  </PermissionGuard>
                }
              />
              <Route
                path="projects/new"
                element={
                  <PermissionGuard permission="create_projects" showLocked>
                    <AddProject />
                  </PermissionGuard>
                }
              />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route
                path="projects"
                element={
                  <PermissionGuard permission="view_projects" showLocked>
                    <Projects />
                  </PermissionGuard>
                }
              />
              <Route
                path="tasks/new"
                element={
                  <PermissionGuard permission="create_tasks" showLocked>
                    <AddTask />
                  </PermissionGuard>
                }
              />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route
                path="tasks"
                element={
                  <PermissionGuard permission="view_tasks" showLocked>
                    <Tasks />
                  </PermissionGuard>
                }
              />
              <Route
                path="invoices/new"
                element={
                  <PermissionGuard permission="create_invoices" showLocked>
                    <AddInvoice />
                  </PermissionGuard>
                }
              />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route
                path="invoices"
                element={
                  <PermissionGuard permission="view_invoices" showLocked>
                    <Invoices />
                  </PermissionGuard>
                }
              />
              <Route
                path="team"
                element={
                  <PermissionGuard permission="view_users" showLocked>
                    <Team />
                  </PermissionGuard>
                }
              />
              <Route
                path="reports"
                element={
                  <PermissionGuard permission="view_reports" showLocked>
                    <Reports />
                  </PermissionGuard>
                }
              />
              <Route
                path="settings"
                element={
                  <PermissionGuard permission="view_settings" showLocked>
                    <Settings />
                  </PermissionGuard>
                }
              />
              <Route path="workspaces/create" element={<CreateWorkspace />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#f3f4f6' : '#111827',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          },
        }}
      />
    </ErrorBoundary>
  );
};

export default App;

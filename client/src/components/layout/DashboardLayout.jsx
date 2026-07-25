import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';
import TeamChat from '../common/TeamChat';
import AnnouncementBanner from '../common/AnnouncementBanner';
import { clsx } from 'clsx';

export const DashboardLayout = () => {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const workspace = useSelector((state) => state.auth.workspace);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        className={clsx(
          'transition-all duration-300',
          sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-20'
        )}
      >
        <Header />
        <AnnouncementBanner />
        <div className="flex gap-6 p-4 lg:p-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Team Chat - Floating */}
      {workspace && <TeamChat workspaceId={workspace.id || workspace._id} />}
    </div>
  );
};

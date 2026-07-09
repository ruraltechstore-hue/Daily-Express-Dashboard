import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Sidebar, MobileSidebar } from './sidebar';
import { Navbar } from './navbar';
import { LoadingSpinner } from '@/components/shared';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Missing profile (fetch failed or not provisioned)
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-text-muted">Your account does not have admin access.</p>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  // Not admin
  if (profile.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-text-muted">Only administrators can access this dashboard.</p>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
        />

        {/* Main Content */}
        <motion.main
          initial={false}
          animate={{
            marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
              ? (sidebarCollapsed ? 72 : 260)
              : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-1 flex flex-col min-h-screen overflow-hidden"
        >
          <Navbar
            onMenuClick={() => setMobileSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
          />

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-6 max-w-[1600px] mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </div>
        </motion.main>
      </div>
    </TooltipProvider>
  );
}

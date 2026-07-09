import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  categories: 'Categories',
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  'delivery-boys': 'Delivery Boys',
  subscriptions: 'Subscriptions',
  notifications: 'Notifications',
  reports: 'Reports',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Home className="h-4 w-4 text-text-muted" />
        <span className="font-medium">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <div key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
            {isLast ? (
              <span className="font-medium truncate max-w-[200px]">{label}</span>
            ) : (
              <Link
                to={path}
                className="text-text-muted hover:text-text-primary transition-colors truncate max-w-[200px]"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

import {
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingCart,
  Users,
  Truck,
  CalendarClock,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Categories', href: '/categories', icon: FolderTree },
      { title: 'Products', href: '/products', icon: Package },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Orders', href: '/orders', icon: ShoppingCart },
      { title: 'Subscriptions', href: '/subscriptions', icon: CalendarClock },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Customers', href: '/customers', icon: Users },
      { title: 'Delivery Boys', href: '/delivery-boys', icon: Truck },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { Link } from '@inertiajs/react';
import AppLogo from './app-logo';
import { PhoneCall } from 'lucide-react';
import { PhoneCallIcon } from 'lucide-react';

const callCenterNav = [
  {
    label: 'Call Center',
    items: [
      { title: 'Call Center', href: '/voice', icon: PhoneCall },
      { title: 'Call Logs & Sessions', href: '/voice/logs', icon: PhoneCallIcon },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* LOGO */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* NAVIGATION */}
      <SidebarContent className="scrollbar-custom overflow-y-auto">
        {callCenterNav.map((dept) => (
          <div key={dept.label} className="mb-4">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider 
              transition-all duration-200
              group-data-[state=collapsed]:hidden">
              {dept.label}
            </p>
            <NavMain items={dept.items} />
          </div>
        ))}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

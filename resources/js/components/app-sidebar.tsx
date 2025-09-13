import { NavFooter } from '@/components/nav-footer';
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
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
  BookOpen,
  BoxesIcon,
  FileSpreadsheetIcon,
  Waypoints,
  HandCoins,
  Folder,
  LayoutGrid,
  ListCheckIcon,
  UserRoundIcon,
  PenBoxIcon,
  SquareArrowDownLeftIcon,
  Smartphone,
  FileAxis3DIcon,
  BookmarkXIcon,
  FileX2,
  FileX,
  MessagesSquareIcon,
  PlusIcon,
  PackagePlusIcon,
  BrainCircuitIcon,
} from 'lucide-react';
import AppLogo from './app-logo';

// --- grouped nav items by department ---
const departmentNav = [
  {
    label: "General",
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: 'Orders', href: '/sheetorders', icon: ListCheckIcon },
      { title: 'Dispatch', href: '/dispatch', icon: Waypoints },
      { title: 'Sheets', href: '/sheets', icon: FileSpreadsheetIcon },
      { title: 'Import Orders', href: '/import', icon: PlusIcon },
      { title: 'Whatsapp Chats', href: '/whatsapp', icon: MessagesSquareIcon },
    
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: 'Products', href: '/products', icon: BoxesIcon },
      { title: 'Update Stock', href: '/units', icon: PackagePlusIcon },
      { title: 'Merchants', href: '/units', icon: UserRoundIcon },
      { title: 'Categories', href: '/categories', icon: SquareArrowDownLeftIcon },
      { title: 'Rdl Ai', href: '/ai', icon: BrainCircuitIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: 'Transactions', href: '/transactions', icon: HandCoins },
      { title: 'Reports', href: '/report', icon: FileAxis3DIcon},
      { title: 'Undelivered Orders', href: '/undelivered', icon: BookmarkXIcon},
      { title: 'Unremitted Orders', href: '/unremitted', icon: FileX},
      { title: 'STK push', href: '/stk', icon: Smartphone }
    ],
  },
];

const footerNavItems: NavItem[] = [
  {
    title: 'Repository',
    href: 'https://github.com/laravel/react-starter-kit',
    icon: Folder,
  },
  {
    title: 'Documentation',
    href: 'https://laravel.com/docs/starter-kits#react',
    icon: BookOpen,
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
  {departmentNav.map((dept) => (
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
        {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

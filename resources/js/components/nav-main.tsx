import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const [pendingHref, setPendingHref] = React.useState<string | null>(null);

    React.useEffect(() => {
        const removeFinish = router.on('finish', () => setPendingHref(null));
        const removeCancel = router.on('cancel', () => setPendingHref(null));
        const removeError = router.on('error', () => setPendingHref(null));
        return () => {
            removeFinish();
            removeCancel();
            removeError();
        };
    }, []);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={page.url.startsWith(item.href)} tooltip={{ children: item.title }}>
                            <Link
                                href={item.href}
                                prefetch
                                onClick={() => setPendingHref(item.href)}
                                aria-busy={pendingHref === item.href ? true : undefined}
                            >
                                {item.icon &&
                                    (pendingHref === item.href ? <Loader2 className="animate-spin" /> : <item.icon />)}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

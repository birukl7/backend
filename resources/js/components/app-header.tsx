import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NotificationBell } from '@/components/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import {
    getNavItemsForRole,
    resolveAppRole,
} from '@/config/navigation';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

const activeItemStyles =
    'text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100';

export function AppHeader() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
    const role = resolveAppRole(auth.roles);
    const mainNavItems = getNavItemsForRole(role);
    const homeHref = role === 'employer' ? '/dashboard' : '/jobs';

    return (
        <>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px]"
                                    aria-label="Open navigation menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex h-full w-72 flex-col bg-sidebar p-0"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation menu
                                </SheetTitle>
                                <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
                                    <Link
                                        href={homeHref}
                                        className="flex items-center"
                                        onClick={() => undefined}
                                    >
                                        <AppLogo />
                                    </Link>
                                </SheetHeader>
                                <nav
                                    className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
                                    aria-label="Main navigation"
                                >
                                    {mainNavItems.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                                isCurrentUrl(item.href)
                                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="h-5 w-5 shrink-0" />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={homeHref}
                        prefetch
                        className="flex min-w-0 items-center"
                    >
                        <AppLogo />
                    </Link>

                    <div className="ml-3 hidden h-full min-w-0 flex-1 items-center lg:flex lg:ml-4">
                        <NavigationMenu className="flex h-full max-w-full items-stretch">
                            <NavigationMenuList className="flex h-full flex-wrap items-stretch gap-1">
                                {mainNavItems.map((item) => (
                                    <NavigationMenuItem
                                        key={item.title}
                                        className="relative flex h-full items-center"
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                whenCurrentUrl(
                                                    item.href,
                                                    activeItemStyles,
                                                ),
                                                'h-9 cursor-pointer px-4',
                                            )}
                                        >
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white" />
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                    aria-label="User menu"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user.avatar}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {/* Breadcrumb row intentionally removed in header layout
                so page content starts directly below the top nav. */}
        </>
    );
}

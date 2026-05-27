import { ErrorBoundary } from "react-error-boundary";

import { Home, Calendar } from "lucide-react";
import { Link, Outlet } from "react-router";
import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarFooter } from "~/components/atoms/sidebar";
import { Toaster } from "~/components/atoms/sonner";

export default function MainLayout() {

  return (
      <SidebarProvider>
        <MainSidebar />
        
            <main className="w-full h-full flex flex-col pt-4 gap-4 flex flex-col flex-1 min-h-0 overflow-auto">
            <SidebarTrigger className="z-100 fixed ml-2 mt-4" />
                <ErrorBoundary fallback={ <div>whoops... something went wrong.</div> } >
                    <Outlet />
                </ErrorBoundary>
            </main>
        
        <Toaster richColors />
      </SidebarProvider>
  );
}

const MainSidebar = () => {

    const mainLinks = [
        { title: "Dashboard", path: "/", icon: Home},
        { title: "Events", path: "/events", icon: Calendar },
    ]

    return (
        <Sidebar variant="sidebar" collapsible="offcanvas"
            className="text-neutral-100 border-none"
        >
            {/* <SidebarHeader>
                <Megaphone />
                Shout Marketing
            </SidebarHeader> */}
            <SidebarContent className="pt-6">
                {/* MAIN APP LINKS */}
                <SidebarGroup>
                    <SidebarMenu>
                        {mainLinks.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <Link to={item.path}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                       
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>

            </SidebarFooter>
        </Sidebar>
    )
}

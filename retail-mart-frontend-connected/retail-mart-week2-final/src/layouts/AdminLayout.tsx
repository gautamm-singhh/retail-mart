import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { useDisclosure } from "@/hooks/useDisclosure";
import { cn } from "@/utils/cn";

export default function AdminLayout() {
  const drawer = useDisclosure();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("rm_admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("rm_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F6F8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Fixed Collapsible Sidebar */}
      <div
        className={cn(
          "hidden shrink-0 transition-all duration-300 ease-in-out lg:block",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile Drawer */}
      <MobileNavDrawer isOpen={drawer.isOpen} onClose={drawer.close} />

      {/* Main Operations Body */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={drawer.open} onToggleCollapse={toggleCollapse} isCollapsed={isCollapsed} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-page-entrance">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

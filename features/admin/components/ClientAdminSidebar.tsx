"use client";

import dynamic from "next/dynamic";


// Import AdminSidebar dynamically with SSR disabled
const DynamicAdminSidebar = dynamic(
  () => import("./AdminSidebar").then((mod) => mod.AdminSidebar),
  { ssr: false }
);

// We need to type the props because it's a wrapper
type AdminSidebarProps = {
  role?: string;
  className?: string;
};

export function ClientAdminSidebar(props: AdminSidebarProps) {
  return <DynamicAdminSidebar {...props} />;
}

import AdminLayout from "@/components/admin/admin-layout"

/**
 * Single shell for all /admin/* routes so AdminLayout does not remount on client navigation.
 * (Per-page AdminLayout remounts reset access state; a brief null token then denied access and redirect.)
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}

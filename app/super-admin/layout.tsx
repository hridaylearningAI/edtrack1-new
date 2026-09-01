import SuperAdminLayout from "@/components/super-admin/super-admin-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SuperAdminLayout>{children}</SuperAdminLayout>
}

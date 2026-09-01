import { redirect } from "next/navigation"

export default function DummyAccountsRedirect() {
  redirect("/admin/students")
}

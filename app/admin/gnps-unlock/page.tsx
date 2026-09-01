import { redirect } from "next/navigation"

export default function GnpsUnlockRedirect() {
  redirect("/admin/content-unlocks")
}

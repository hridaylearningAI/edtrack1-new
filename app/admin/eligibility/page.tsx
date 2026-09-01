import { redirect } from "next/navigation"

export default function EligibilityRedirect() {
  redirect("/admin/leads?tab=eligibility")
}

import { redirect } from "next/navigation"

export default function EmailCampaignRedirect() {
  redirect("/admin/notifications")
}

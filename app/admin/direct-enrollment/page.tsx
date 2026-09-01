import { redirect } from "next/navigation"

export default function DirectEnrollmentRedirect() {
  redirect("/admin/enrolment?tab=quick")
}

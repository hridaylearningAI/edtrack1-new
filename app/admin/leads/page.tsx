import { redirect } from 'next/navigation'

/** Leads hub now uses the edtec CRM UI at /admin/crm. */
export default function LeadsRedirectPage() {
  redirect('/admin/crm')
}

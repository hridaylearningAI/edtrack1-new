/**
 * Fetch a certificate PDF with Bearer auth and open it in a new tab.
 */
export async function openCertificateView(
  enrollmentId: number,
  getAccessToken: () => Promise<string | null>
): Promise<void> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error("Please log in to view your certificate")
  }

  const response = await fetch(`/api/certificates/view/${enrollmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message =
      (error as { error?: string; message?: string }).error ??
      (error as { message?: string }).message ??
      "Failed to view certificate"
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank")
  setTimeout(() => window.URL.revokeObjectURL(url), 100)
}

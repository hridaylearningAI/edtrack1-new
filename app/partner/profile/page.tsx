"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import PartnerLayout from "@/components/partner/partner-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/hooks/useUser"

type PartnerProfile = {
  name: string
  email: string
  country_code: string
  phone: string
  address: string
  partner_code: string
}

const EMPTY_PROFILE: PartnerProfile = {
  name: "",
  email: "",
  country_code: "",
  phone: "",
  address: "",
  partner_code: "",
}

export default function PartnerProfilePage() {
  const { isAuthenticated, isLoading, getAccessToken } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<PartnerProfile>(EMPTY_PROFILE)

  const isCodeMissing = useMemo(() => !profile.partner_code, [profile.partner_code])

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        const token = await getAccessToken()
        if (!token) throw new Error("Authentication token missing")

        const res = await fetch("/api/partners/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        const p = json?.data?.partner
        if (!cancelled && p) {
          setProfile({
            name: p.name ?? "",
            email: p.email ?? "",
            country_code: p.country_code ?? "",
            phone: p.phone ?? "",
            address: p.address ?? "",
            partner_code: p.partner_code ?? "",
          })
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Failed to load partner profile")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isLoading])

  const onSave = async () => {
    try {
      setSaving(true)
      const token = await getAccessToken()
      if (!token) throw new Error("Authentication token missing")

      const res = await fetch("/api/partners/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          country_code: profile.country_code,
          phone: profile.phone,
          address: profile.address,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to save profile")

      const p = json?.data?.partner
      setProfile((prev) => ({
        ...prev,
        name: p?.name ?? prev.name,
        country_code: p?.country_code ?? prev.country_code,
        phone: p?.phone ?? prev.phone,
        address: p?.address ?? prev.address,
        partner_code: p?.partner_code ?? prev.partner_code,
      }))

      if (json?.data?.generated_partner_code) {
        toast.success(`Partner code generated: ${json.data.generated_partner_code}`)
      } else {
        toast.success("Profile updated")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save partner profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PartnerLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My partner profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your details. When your profile has required values, your unique partner code is generated automatically.
          </p>
        </div>

        <Card className="border-brand-blue/15">
          <CardHeader>
            <CardTitle>Partner details</CardTitle>
            <CardDescription>
              Code format: <span className="font-mono">[COUNTRY]-[YYMM]-[FL]-[SEQ]</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading profile…
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="partner-name">Name</Label>
                    <Input
                      id="partner-name"
                      value={profile.name}
                      onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Raj Malhotra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-email">Email</Label>
                    <Input id="partner-email" value={profile.email} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-country">Country code</Label>
                    <Input
                      id="partner-country"
                      value={profile.country_code}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, country_code: e.target.value.toUpperCase().slice(0, 2) }))
                      }
                      placeholder="IN"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-phone">Phone number</Label>
                    <Input
                      id="partner-phone"
                      value={profile.phone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner-address">Address</Label>
                  <Textarea
                    id="partner-address"
                    value={profile.address}
                    onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street, city, state, postal code"
                    rows={3}
                  />
                </div>

                <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Partner code</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                    {profile.partner_code || "Not generated yet"}
                  </p>
                  {isCodeMissing ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Save this form with name + country code to generate your unique partner code.
                    </p>
                  ) : null}
                </div>

                <Button onClick={onSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save details
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  )
}


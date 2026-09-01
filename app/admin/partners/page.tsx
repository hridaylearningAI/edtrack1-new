"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Search, Plus, Edit, Trash2, Users, Loader2, UserPlus } from "lucide-react"

import { apiClient, EligibleClerkUserForPartner, Partner, PartnerCreate, PartnerUpdate } from "@/lib/api"
import { usePartners } from "@/lib/hooks/usePartners"

export default function AdminPartnersPage() {
  const { partners, loading, createPartner, updatePartner, deletePartner } = usePartners()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)

  const [clerkUsers, setClerkUsers] = useState<EligibleClerkUserForPartner[]>([])
  const [clerkUsersLoading, setClerkUsersLoading] = useState(false)
  const [selectedClerkUserId, setSelectedClerkUserId] = useState("")

  const [form, setForm] = useState<PartnerCreate>({
    name: "",
    email: "",
    status: "Active",
    join_date: new Date().toISOString().split("T")[0],
    avatar: "",
    notes: "",
  })

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return partners
    return partners.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [partners, searchTerm])

  useEffect(() => {
    if (!isDialogOpen || selectedPartner) return
    let cancelled = false
    ;(async () => {
      setClerkUsersLoading(true)
      try {
        const res = await apiClient.getEligibleClerkUsersForPartners({ limit: 200 })
        if (!cancelled) setClerkUsers(res.data || [])
      } finally {
        if (!cancelled) setClerkUsersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isDialogOpen, selectedPartner])

  const openCreate = () => {
    setSelectedPartner(null)
    setSelectedClerkUserId("")
    setForm({
      name: "",
      email: "",
      status: "Active",
      join_date: new Date().toISOString().split("T")[0],
      avatar: "",
      notes: "",
    })
    setIsDialogOpen(true)
  }

  const openEdit = (partner: Partner) => {
    setSelectedPartner(partner)
    setSelectedClerkUserId("")
    setForm({
      name: partner.name,
      email: partner.email,
      status: partner.status,
      join_date: partner.join_date || new Date().toISOString().split("T")[0],
      avatar: partner.avatar || "",
      notes: partner.notes || "",
    })
    setIsDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.name || !form.email) return
    if (selectedPartner) {
      await updatePartner(selectedPartner.id, form as PartnerUpdate)
    } else {
      await createPartner(form)
    }
    setIsDialogOpen(false)
  }

  const onDelete = async (id: number) => {
    if (!confirm("Remove this partner?")) return
    await deletePartner(id)
  }

  const activeCount = partners.filter((p) => p.status === "Active").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add and manage partner emails for partner portal access.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{partners.length}</div>
                <p className="text-xs text-muted-foreground">Total Partners</p>
              </div>
              <Users className="h-6 w-6 text-brand-blue" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Active Access</p>
              </div>
              <UserPlus className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Directory</CardTitle>
          <CardDescription>Emails listed here are used to control partner portal access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={partner.avatar || "/placeholder.svg"} alt={partner.name} />
                            <AvatarFallback>{partner.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{partner.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{partner.email}</TableCell>
                      <TableCell>
                        <Badge variant={partner.status === "Active" ? "default" : "secondary"}>{partner.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{partner.join_date || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(partner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(partner.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No partners found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedPartner ? "Edit partner" : "Add partner"}</DialogTitle>
            <DialogDescription>
              {selectedPartner ? "Update partner access details." : "Pick a registered Clerk user or enter details manually."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedPartner && (
              <div className="space-y-2">
                <Label>Registered user</Label>
                <Select
                  value={selectedClerkUserId}
                  onValueChange={(value) => {
                    setSelectedClerkUserId(value)
                    const chosen = clerkUsers.find((u) => u.id === value)
                    if (!chosen) return
                    setForm((prev) => ({
                      ...prev,
                      name: chosen.fullName || prev.name,
                      email: chosen.email || prev.email,
                      avatar: chosen.avatarUrl || prev.avatar,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={clerkUsersLoading ? "Loading users..." : "Select Clerk user"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clerkUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status || "Active"}
                onValueChange={(value) => setForm((p) => ({ ...p, status: value as "Active" | "Inactive" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


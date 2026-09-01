"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCourses } from "@/lib/hooks/useCourses"
import { useUser } from "@/lib/hooks/useUser"
import { toast } from "sonner"
import { Database, Download, ExternalLink, FileJson, Loader2, RefreshCw, Save, Trash2 } from "lucide-react"
import { FolderSlidePreview } from "@/components/admin/folder-slide-preview"
import type { SlidesManifest } from "@/lib/types/slides-manifest"

function validateSlidesManifestJson(value: unknown): string | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { folders?: unknown }).folders)) {
    return 'JSON must be an object with folders[]'
  }
  const folders = (value as { folders: unknown[] }).folders
  for (const entry of folders) {
    if (!entry || typeof entry !== "object") return "Each folders[] entry must be an object"
    const e = entry as { folder?: unknown; slides?: unknown }
    if (typeof e.folder !== "string" || !e.folder.trim()) return "Each entry must have a non-empty folder"
    if (!Array.isArray(e.slides) || !e.slides.every((s) => typeof s === "string")) {
      return "Each entry must have slides as string[]"
    }
  }
  return null
}

export function SlidesManifestManager() {
  const { courses, loading: coursesLoading, fetchCourses } = useCourses()
  const { getAccessToken } = useUser()
  const [courseId, setCourseId] = useState<string>("")
  const [overridesLoading, setOverridesLoading] = useState(false)
  const [hasSlidesOverride, setHasSlidesOverride] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [manifest, setManifest] = useState<SlidesManifest | null>(null)
  const [scanningSlides, setScanningSlides] = useState(false)
  const [syncingSlides, setSyncingSlides] = useState(false)
  const [clearingSlides, setClearingSlides] = useState(false)
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false)
  const [jsonEditorText, setJsonEditorText] = useState("")
  const [jsonEditorError, setJsonEditorError] = useState<string | null>(null)
  const [jsonEditorLoading, setJsonEditorLoading] = useState(false)
  const [jsonEditorSaving, setJsonEditorSaving] = useState(false)
  const [jsonEditorCdnLoading, setJsonEditorCdnLoading] = useState(false)

  useEffect(() => {
    fetchCourses({ limit: 200 })
  }, [fetchCourses])

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === courseId) ?? null,
    [courses, courseId]
  )

  const loadManifest = useCallback(async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      setHasSlidesOverride(false)
      setUpdatedAt(null)
      setManifest(null)
      return
    }
    setOverridesLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides?courseId=${cid}&includeData=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Could not load slides manifest")
        setHasSlidesOverride(false)
        setUpdatedAt(null)
        setManifest(null)
        return
      }
      setHasSlidesOverride(!!json?.data?.hasSlidesOverride)
      setUpdatedAt(json?.data?.updated_at ?? null)
      const m = json?.data?.slides_manifest as SlidesManifest | null
      setManifest(m?.folders?.length ? m : null)
    } catch {
      toast.error("Could not load slides manifest")
      setHasSlidesOverride(false)
      setUpdatedAt(null)
      setManifest(null)
    } finally {
      setOverridesLoading(false)
    }
  }, [courseId, getAccessToken])

  useEffect(() => {
    loadManifest()
  }, [loadManifest])

  const scanSlidesToDatabase = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setScanningSlides(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/admin/course-content-overrides/scan-slides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, save: true }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Slide scan failed.")
        return
      }
      const errors = json?.data?.errors as { folder: string; message: string }[] | undefined
      const folderCount = json?.data?.manifest?.folders?.length ?? 0
      if (errors?.length) {
        toast.warning(`Saved manifest for ${folderCount} folder(s). ${errors.length} folder(s) had no slides.`)
      } else {
        toast.success(`Scanned and saved slide manifest (${folderCount} folders).`)
      }
      await loadManifest()
    } catch {
      toast.error("Slide scan failed")
    } finally {
      setScanningSlides(false)
    }
  }

  const copySlidesFromCdn = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setSyncingSlides(true)
    try {
      const token = await getAccessToken()
      const previewRes = await fetch(`/api/admin/course-content-overrides/preview-cdn?courseId=${cid}&kind=slides`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const previewJson = await previewRes.json()
      if (!previewJson?.success || !previewJson?.data?.data?.folders?.length) {
        toast.error(previewJson?.message || "No slides-manifest.json on CDN. Use Scan CDN → Save instead.")
        return
      }
      const saveRes = await fetch("/api/admin/course-content-overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, slides_manifest: previewJson.data.data }),
      })
      const saveJson = await saveRes.json()
      if (!saveJson?.success) {
        toast.error(saveJson?.message || "Failed to save slides override.")
        return
      }
      toast.success("Copied slides-manifest.json to database.")
      await loadManifest()
    } catch {
      toast.error("Failed to copy slides manifest")
    } finally {
      setSyncingSlides(false)
    }
  }

  const clearOverride = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setClearingSlides(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/admin/course-content-overrides", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, target: "slides_manifest" }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Failed to clear override")
        return
      }
      toast.success("Cleared lecture slides override.")
      await loadManifest()
    } catch {
      toast.error("Failed to clear override")
    } finally {
      setClearingSlides(false)
    }
  }

  const openJsonEditor = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setJsonEditorOpen(true)
    setJsonEditorError(null)
    setJsonEditorLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides?courseId=${cid}&includeData=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      const current = json?.data?.slides_manifest ?? { folders: [] }
      setJsonEditorText(JSON.stringify(current, null, 2))
    } catch {
      setJsonEditorText('{\n  "folders": []\n}')
      setJsonEditorError("Could not load existing override")
    } finally {
      setJsonEditorLoading(false)
    }
  }

  const loadEditorFromCdn = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) return
    setJsonEditorCdnLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides/preview-cdn?courseId=${cid}&kind=slides`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success || !json?.data?.data) {
        setJsonEditorError(json?.message || "Could not load CDN content")
        return
      }
      setJsonEditorText(JSON.stringify(json.data.data, null, 2))
      setJsonEditorError(null)
      toast.success("Loaded slides-manifest.json from CDN.")
    } catch {
      setJsonEditorError("Could not load CDN content")
    } finally {
      setJsonEditorCdnLoading(false)
    }
  }

  const saveJsonEditor = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setJsonEditorSaving(true)
    setJsonEditorError(null)
    try {
      const parsed = JSON.parse(jsonEditorText) as unknown
      const validationError = validateSlidesManifestJson(parsed)
      if (validationError) {
        setJsonEditorError(validationError)
        return
      }
      const token = await getAccessToken()
      const res = await fetch("/api/admin/course-content-overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, slides_manifest: parsed }),
      })
      const json = await res.json()
      if (!json?.success) {
        setJsonEditorError(json?.message || "Failed to save")
        return
      }
      toast.success("Saved lecture slides manifest.")
      setJsonEditorOpen(false)
      await loadManifest()
    } catch {
      setJsonEditorError("Invalid JSON syntax.")
    } finally {
      setJsonEditorSaving(false)
    }
  }

  const totalSlides = manifest?.folders.reduce((n, f) => n + f.slides.length, 0) ?? 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Course</CardTitle>
          <CardDescription>
            Scans lecture folders from{" "}
            <Link href="/admin/course-content" className="text-brand-blue underline-offset-2 hover:underline">
              Learn content order
            </Link>{" "}
            (program overview + topics). Ensure sections are saved there first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="slides-manifest-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId} disabled={coursesLoading}>
                <SelectTrigger id="slides-manifest-course">
                  <SelectValue placeholder={coursesLoading ? "Loading courses…" : "Select a course"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.content_folder ? ` (${c.content_folder})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground sm:max-w-md">
                Content folder:{" "}
                <code className="bg-muted px-1 rounded">{selectedCourse.content_folder || "— not set —"}</code>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manifest actions</CardTitle>
          <CardDescription>
            Store slide filenames in the database so the learn page skips sequential CDN probing. Students load the
            current slide plus adjacent slides only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!courseId ? (
            <p className="text-sm text-muted-foreground">Select a course to manage its lecture slides manifest.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Button type="button" variant="ghost" size="sm" onClick={loadManifest} disabled={overridesLoading}>
                  {overridesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
                <span>
                  Database override: <strong>{hasSlidesOverride ? "ON" : "OFF"}</strong>
                </span>
                {updatedAt && (
                  <>
                    <span>·</span>
                    <span>Updated {new Date(updatedAt).toLocaleString()}</span>
                  </>
                )}
                {manifest && (
                  <>
                    <span>·</span>
                    <span>
                      {manifest.folders.length} folders, {totalSlides} slides
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={scanSlidesToDatabase}
                  disabled={scanningSlides || syncingSlides || overridesLoading || !selectedCourse?.content_folder}
                  title={!selectedCourse?.content_folder ? "Set content_folder on the course first" : undefined}
                >
                  {scanningSlides ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Scan CDN → Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copySlidesFromCdn}
                  disabled={syncingSlides || scanningSlides || overridesLoading}
                >
                  {syncingSlides ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Copy slides-manifest.json
                </Button>
                <Button type="button" variant="secondary" onClick={openJsonEditor} disabled={overridesLoading}>
                  <FileJson className="h-4 w-4" />
                  Edit JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearOverride}
                  disabled={!hasSlidesOverride || clearingSlides || overridesLoading}
                >
                  {clearingSlides ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Clear override
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link href="/admin/course-content">
                    <ExternalLink className="h-4 w-4" />
                    Edit section folders
                  </Link>
                </Button>
              </div>

              {!selectedCourse?.content_folder && (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 rounded-lg px-3 py-2">
                  This course has no <code className="text-xs">content_folder</code>. Set it on the course record before
                  scanning.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {courseId && manifest && manifest.folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved manifest</CardTitle>
            <CardDescription>Folders and slide filenames currently stored for this course.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folder (CDN)</TableHead>
                    <TableHead className="w-[100px]">Slides</TableHead>
                    <TableHead className="min-w-[200px]">Filenames</TableHead>
                    <TableHead className="min-w-[280px]">Preview (slide 1)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifest.folders.map((entry) => (
                    <TableRow key={entry.folder}>
                      <TableCell className="font-mono text-sm">{entry.folder}</TableCell>
                      <TableCell>{entry.slides.length}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate" title={entry.slides.join(", ")}>
                        {entry.slides.slice(0, 8).join(", ")}
                        {entry.slides.length > 8 ? ` … +${entry.slides.length - 8} more` : ""}
                      </TableCell>
                      <TableCell>
                        <FolderSlidePreview
                          contentFolder={selectedCourse?.content_folder}
                          folder={entry.folder}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {courseId && !overridesLoading && !hasSlidesOverride && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No slides manifest in the database yet. Run <strong>Scan CDN → Save</strong> after section folders are
            configured, or upload <code className="bg-muted px-1 rounded">slides-manifest.json</code> to the bucket and
            use <strong>Copy slides-manifest.json</strong>.
          </CardContent>
        </Card>
      )}

      <Dialog open={jsonEditorOpen} onOpenChange={setJsonEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit lecture slides manifest</DialogTitle>
            <DialogDescription>
              JSON shape: <code className="text-xs bg-muted px-1 rounded">{`{ "folders": [{ "folder": "Topic 1", "slides": ["1.png"] }] }`}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button type="button" variant="outline" onClick={loadEditorFromCdn} disabled={jsonEditorCdnLoading || jsonEditorSaving}>
              {jsonEditorCdnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Load from CDN
            </Button>
            {jsonEditorLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading JSON…
              </div>
            ) : (
              <Textarea
                value={jsonEditorText}
                onChange={(e) => setJsonEditorText(e.target.value)}
                className="min-h-[420px] font-mono text-xs"
                placeholder='{\n  "folders": []\n}'
              />
            )}
            {jsonEditorError && <p className="text-sm text-destructive">{jsonEditorError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setJsonEditorOpen(false)} disabled={jsonEditorSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={saveJsonEditor} disabled={jsonEditorSaving || jsonEditorLoading}>
              {jsonEditorSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save manifest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

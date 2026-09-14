"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Course } from "@/lib/api"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowDown, ArrowUp, Database, Download, ExternalLink, Loader2, Plus, Save, Trash2, RefreshCw, FileJson } from "lucide-react"
import type { CourseContentSectionKind } from "@/lib/course-content-sections"
import { FolderSlidePreview } from "@/components/admin/folder-slide-preview"

type EditableRow = {
  key: string
  section_kind: CourseContentSectionKind
  topic_slug: string
  folder: string
  label: string
  practice_q_source_topic_num: string
  quiz_source_topic_num: string
  ngn_source_topic_num: string
}

function newKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function AdminCourseContentPage() {
  const { courses, loading: coursesLoading, fetchCourses } = useCourses()
  const { getAccessToken } = useUser()
  const [courseId, setCourseId] = useState<string>("")
  const [rows, setRows] = useState<EditableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [seedingDb, setSeedingDb] = useState(false)
  const [overridesLoading, setOverridesLoading] = useState(false)
  const [hasPracticeQOverride, setHasPracticeQOverride] = useState(false)
  const [hasQuizOverride, setHasQuizOverride] = useState(false)
  const [syncingPracticeQ, setSyncingPracticeQ] = useState(false)
  const [syncingQuiz, setSyncingQuiz] = useState(false)
  const [clearingPracticeQ, setClearingPracticeQ] = useState(false)
  const [clearingQuiz, setClearingQuiz] = useState(false)
  const [jsonEditorKind, setJsonEditorKind] = useState<"practice_q" | "quiz" | null>(null)
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

  const loadSections = useCallback(async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-sections?courseId=${cid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Failed to load sections")
        setRows([])
        return
      }
      const list = json?.data?.sections as Array<{
        section_kind: CourseContentSectionKind
        topic_slug: string | null
        folder: string
        label: string
        practice_q_source_topic_num?: number | null
        quiz_source_topic_num?: number | null
        ngn_source_topic_num?: number | null
      }>
      if (!Array.isArray(list)) {
        setRows([])
        return
      }
      setRows(
        list.map((s) => ({
          key: newKey(),
          section_kind: s.section_kind,
          topic_slug: s.topic_slug ?? "",
          folder: s.folder,
          label: s.label,
          practice_q_source_topic_num:
            s.section_kind === "topic" && s.practice_q_source_topic_num != null ? String(s.practice_q_source_topic_num) : "",
          quiz_source_topic_num:
            s.section_kind === "topic" && s.quiz_source_topic_num != null ? String(s.quiz_source_topic_num) : "",
          ngn_source_topic_num:
            s.section_kind === "topic" && s.ngn_source_topic_num != null ? String(s.ngn_source_topic_num) : "",
        }))
      )
    } catch {
      toast.error("Failed to load sections")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [courseId, getAccessToken])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  const loadOverridesStatus = useCallback(async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      setHasPracticeQOverride(false)
      setHasQuizOverride(false)
      return
    }
    setOverridesLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides?courseId=${cid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Could not load override status")
        setHasPracticeQOverride(false)
        setHasQuizOverride(false)
        return
      }
      setHasPracticeQOverride(!!json?.data?.hasPracticeQOverride)
      setHasQuizOverride(!!json?.data?.hasQuizOverride)
    } catch {
      toast.error("Could not load override status")
      setHasPracticeQOverride(false)
      setHasQuizOverride(false)
    } finally {
      setOverridesLoading(false)
    }
  }, [courseId, getAccessToken])

  useEffect(() => {
    loadOverridesStatus()
  }, [loadOverridesStatus])

  const copyPracticeQToDatabase = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setSyncingPracticeQ(true)
    try {
      const token = await getAccessToken()
      const previewRes = await fetch(`/api/admin/course-content-overrides/preview-cdn?courseId=${cid}&kind=practice_q`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const previewJson = await previewRes.json()
      if (!previewJson?.success || !previewJson?.data?.data) {
        toast.error(previewJson?.message || "Could not load practice-q.json from CDN.")
        return
      }
      const saveRes = await fetch("/api/admin/course-content-overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, practice_q_manifest: previewJson.data.data }),
      })
      const saveJson = await saveRes.json()
      if (!saveJson?.success) {
        toast.error(saveJson?.message || "Failed to save Practice Q override.")
        return
      }
      toast.success("Copied practice-q.json to database override.")
      await loadOverridesStatus()
    } catch {
      toast.error("Failed to copy Practice Q override")
    } finally {
      setSyncingPracticeQ(false)
    }
  }

  const copyQuizToDatabase = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setSyncingQuiz(true)
    try {
      const token = await getAccessToken()
      const previewRes = await fetch(`/api/admin/course-content-overrides/preview-cdn?courseId=${cid}&kind=quiz`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const previewJson = await previewRes.json()
      if (!previewJson?.success || !previewJson?.data?.data) {
        toast.error(previewJson?.message || "Could not load quiz JSON from CDN.")
        return
      }
      const saveRes = await fetch("/api/admin/course-content-overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, quiz_json: previewJson.data.data }),
      })
      const saveJson = await saveRes.json()
      if (!saveJson?.success) {
        toast.error(saveJson?.message || "Failed to save quiz override.")
        return
      }
      toast.success("Copied quiz JSON to database override.")
      await loadOverridesStatus()
    } catch {
      toast.error("Failed to copy quiz override")
    } finally {
      setSyncingQuiz(false)
    }
  }

  const clearOverride = async (target: "practice_q_manifest" | "quiz_json") => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    if (target === "practice_q_manifest") setClearingPracticeQ(true)
    if (target === "quiz_json") setClearingQuiz(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/admin/course-content-overrides", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, target }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Failed to clear override")
        return
      }
      toast.success(target === "practice_q_manifest" ? "Cleared Practice Q override." : "Cleared quiz override.")
      await loadOverridesStatus()
    } catch {
      toast.error("Failed to clear override")
    } finally {
      if (target === "practice_q_manifest") setClearingPracticeQ(false)
      if (target === "quiz_json") setClearingQuiz(false)
    }
  }

  const validatePracticeQJson = (value: unknown): string | null => {
    if (!value || typeof value !== "object" || !Array.isArray((value as { folders?: unknown }).folders)) {
      return "Practice Q JSON must be an object with folders[]"
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

  const validateQuizJson = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return "Quiz JSON must be an object"
    const v = value as Record<string, unknown>
    if (typeof v.title !== "string" || !v.title.trim()) return "Quiz JSON must have a non-empty title"
    if (Array.isArray(v.topics)) return null
    if (Array.isArray(v.modules)) return null
    return "Quiz JSON must include either topics[] or modules[]"
  }

  const openJsonEditor = async (kind: "practice_q" | "quiz") => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setJsonEditorKind(kind)
    setJsonEditorOpen(true)
    setJsonEditorError(null)
    setJsonEditorLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides?courseId=${cid}&includeData=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) {
        setJsonEditorText(kind === "practice_q" ? '{\n  "folders": []\n}' : '{\n  "title": "Quiz",\n  "topics": []\n}')
        setJsonEditorError(json?.message || "Could not load existing override")
        return
      }
      const currentValue = kind === "practice_q" ? json?.data?.practice_q_manifest : json?.data?.quiz_json
      const fallback = kind === "practice_q" ? { folders: [] } : { title: "Quiz", topics: [] }
      setJsonEditorText(JSON.stringify(currentValue ?? fallback, null, 2))
    } catch {
      setJsonEditorText(kind === "practice_q" ? '{\n  "folders": []\n}' : '{\n  "title": "Quiz",\n  "topics": []\n}')
      setJsonEditorError("Could not load existing override")
    } finally {
      setJsonEditorLoading(false)
    }
  }

  const loadEditorFromCdn = async () => {
    const cid = parseInt(courseId, 10)
    if (!jsonEditorKind || Number.isNaN(cid) || cid <= 0) return
    setJsonEditorCdnLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/course-content-overrides/preview-cdn?courseId=${cid}&kind=${jsonEditorKind}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success || !json?.data?.data) {
        setJsonEditorError(json?.message || "Could not load CDN content")
        return
      }
      setJsonEditorText(JSON.stringify(json.data.data, null, 2))
      setJsonEditorError(null)
      toast.success("Loaded current CDN JSON into the editor.")
    } catch {
      setJsonEditorError("Could not load CDN content")
    } finally {
      setJsonEditorCdnLoading(false)
    }
  }

  const saveJsonEditor = async () => {
    if (!jsonEditorKind) return
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setJsonEditorSaving(true)
    setJsonEditorError(null)
    try {
      const parsed = JSON.parse(jsonEditorText) as unknown
      const validationError =
        jsonEditorKind === "practice_q" ? validatePracticeQJson(parsed) : validateQuizJson(parsed)
      if (validationError) {
        setJsonEditorError(validationError)
        return
      }

      const token = await getAccessToken()
      const body =
        jsonEditorKind === "practice_q"
          ? { course_id: cid, practice_q_manifest: parsed }
          : { course_id: cid, quiz_json: parsed }
      const res = await fetch("/api/admin/course-content-overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json?.success) {
        setJsonEditorError(json?.message || "Failed to save JSON override")
        return
      }
      toast.success(jsonEditorKind === "practice_q" ? "Saved Practice Q JSON override." : "Saved Quiz JSON override.")
      setJsonEditorOpen(false)
      await loadOverridesStatus()
    } catch {
      setJsonEditorError("Invalid JSON syntax.")
    } finally {
      setJsonEditorSaving(false)
    }
  }

  const hasProgramOverview = rows.some((r) => r.section_kind === "program_overview")
  const topicSourceOptions = useMemo(
    () =>
      rows
        .filter((r) => r.section_kind === "topic")
        .map((r, idx) => ({
          value: String(idx + 1),
          label: `Topic ${idx + 1} (${r.label?.trim() || r.topic_slug?.trim() || r.folder?.trim() || `topic-${idx + 1}`})`,
        })),
    [rows]
  )

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= rows.length) return
    setRows((prev) => {
      const copy = [...prev]
      const t = copy[index]
      copy[index] = copy[next]
      copy[next] = t
      return copy
    })
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = (kind: CourseContentSectionKind) => {
    if (kind === "program_overview" && hasProgramOverview) {
      toast.error("Only one Program Overview row is allowed.")
      return
    }
    setRows((prev) => [
      ...prev,
      {
        key: newKey(),
        section_kind: kind,
        topic_slug: kind === "topic" ? `topic-${prev.filter((r) => r.section_kind === "topic").length + 1}` : "",
        folder: "",
        label: kind === "program_overview" ? "Program Overview" : "",
        practice_q_source_topic_num: "",
        quiz_source_topic_num: "",
        ngn_source_topic_num: "",
      },
    ])
  }

  /** Fetches `{base}/{content_folder}/manifest.json` and returns section payloads (same shape as save). */
  const fetchCdnManifestSections = useCallback(async (): Promise<
    Array<{
      section_kind: CourseContentSectionKind
      topic_slug: string | null
      folder: string
      label: string
    }> | null
  > => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return null
    }
    const token = await getAccessToken()
    const res = await fetch(`/api/admin/course-content-sections/preview-cdn?courseId=${cid}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const json = await res.json()
    if (!json?.success || !Array.isArray(json?.data?.sections)) {
      toast.error(json?.message || "Could not load manifest.json from CDN. Check content folder and that the file exists.")
      return null
    }
    const list = json.data.sections as Array<{
      section_kind: CourseContentSectionKind
      topic_slug?: string | null
      folder: string
      label: string
    }>
    if (list.length === 0) {
      toast.error("manifest.json has no sections (no program overview or topics). Check the file on the CDN.")
      return null
    }
    return list.map((s) => ({
      section_kind: s.section_kind,
      topic_slug: s.section_kind === "topic" ? (s.topic_slug ?? "").trim() || null : null,
      folder: s.folder,
      label: s.label,
    }))
  }, [courseId, getAccessToken])

  /** Loads CDN manifest into the table only — review and click Save order when ready. */
  const loadManifestIntoEditor = async () => {
    setImporting(true)
    try {
      const sections = await fetchCdnManifestSections()
      if (!sections) return
      setRows(
        sections.map((s) => ({
          key: newKey(),
          section_kind: s.section_kind,
          topic_slug: s.topic_slug ?? "",
          folder: s.folder,
          label: s.label,
          practice_q_source_topic_num: "",
          quiz_source_topic_num: "",
          ngn_source_topic_num: "",
        }))
      )
      toast.success("Loaded manifest.json into the editor. Adjust order or labels, then click Save order.")
    } finally {
      setImporting(false)
    }
  }

  /** One step: copy existing CDN manifest.json into the database as the managed structure. */
  const copyManifestToDatabase = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course first.")
      return
    }
    setSeedingDb(true)
    try {
      const sections = await fetchCdnManifestSections()
      if (!sections) return
      const token = await getAccessToken()
      const res = await fetch("/api/admin/course-content-sections", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, sections }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Save failed")
        return
      }
      toast.success("manifest.json was copied into the database. The learn page will use this order; you can still edit and save changes here.")
      await loadSections()
    } catch {
      toast.error("Could not copy manifest to the database")
    } finally {
      setSeedingDb(false)
    }
  }

  const save = async () => {
    const cid = parseInt(courseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      toast.error("Select a course.")
      return
    }
    setSaving(true)
    try {
      const token = await getAccessToken()
      const sections = rows.map((r) => ({
        section_kind: r.section_kind,
        topic_slug: r.section_kind === "topic" ? r.topic_slug.trim() : null,
        folder: r.folder.trim(),
        label: r.label.trim(),
        practice_q_source_topic_num:
          r.section_kind === "topic" && r.practice_q_source_topic_num.trim()
            ? parseInt(r.practice_q_source_topic_num.trim(), 10)
            : null,
        quiz_source_topic_num:
          r.section_kind === "topic" && r.quiz_source_topic_num.trim()
            ? parseInt(r.quiz_source_topic_num.trim(), 10)
            : null,
        ngn_source_topic_num:
          r.section_kind === "topic" && r.ngn_source_topic_num.trim()
            ? parseInt(r.ngn_source_topic_num.trim(), 10)
            : null,
      }))
      const res = await fetch("/api/admin/course-content-sections", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: cid, sections }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.message || "Save failed")
        return
      }
      toast.success(json?.message || "Saved")
      await loadSections()
    } catch {
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-[min(100%,1600px)] mx-auto px-4 sm:px-6 xl:px-10 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight tracking-tight">Learn content order</h1>
        <p className="text-muted-foreground mt-1">
          Define Program Overview and topic order for the trial/learn sidebar. Start from your existing{" "}
          <code className="text-xs bg-muted px-1 rounded">manifest.json</code> on the CDN, then tweak order or labels
          here. Folder names must match your bucket folders under the course content folder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course</CardTitle>
          <CardDescription>
            {selectedCourse?.content_folder ? (
              <>
                Content folder: <code className="text-xs bg-muted px-1 rounded">{selectedCourse.content_folder}</code>
              </>
            ) : (
              "Set content folder on the course record if you use CDN-hosted slides."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-2 flex-1 w-full min-w-0 max-w-2xl xl:max-w-none">
            <Label>Select course</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={coursesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={coursesLoading ? "Loading courses…" : "Choose a course"} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c: Course) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} (ID {c.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                onClick={copyManifestToDatabase}
                disabled={!courseId || seedingDb || importing || loading || saving}
                title="Reads manifest.json from the CDN and writes it to the database in one step"
              >
                {seedingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Copy manifest to database
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadManifestIntoEditor}
                disabled={!courseId || importing || seedingDb || loading}
                title="Loads manifest.json into the table so you can edit before saving"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Load manifest into editor
              </Button>
              <Button type="button" variant="secondary" onClick={save} disabled={!courseId || saving || loading || seedingDb}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save order
              </Button>
            </div>
            <p className="text-xs text-muted-foreground max-w-4xl">
              <strong>Copy manifest to database</strong> uses your current CDN <code className="bg-muted px-1 rounded">manifest.json</code> as the
              base and stores it—no need to re-type units. <strong>Load manifest into editor</strong> only fills the form; use Save order when
              ready.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice Q & Quiz overrides</CardTitle>
          <CardDescription>
            Similar to manifest: use CDN files as base and store DB overrides per course. Learn page uses DB first, then falls back
            to bucket files.{" "}
            <Link href="/admin/slides-manifest" className="text-brand-blue underline-offset-2 hover:underline inline-flex items-center gap-1">
              Lecture slides manifest
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>{" "}
            is managed on a separate page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!courseId ? (
            <p className="text-sm text-muted-foreground">Select a course to manage Practice Q and Quiz overrides.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Button type="button" variant="ghost" size="sm" onClick={loadOverridesStatus} disabled={overridesLoading}>
                  {overridesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh status
                </Button>
                <span>Practice Q override: {hasPracticeQOverride ? "ON" : "OFF"}</span>
                <span>·</span>
                <span>Quiz override: {hasQuizOverride ? "ON" : "OFF"}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-medium">Practice Q manifest</h3>
                  <p className="text-xs text-muted-foreground">
                    Copies <code className="bg-muted px-1 rounded">practice-q.json</code> from CDN into database.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={copyPracticeQToDatabase} disabled={syncingPracticeQ || overridesLoading}>
                      {syncingPracticeQ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      Copy to DB
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => openJsonEditor("practice_q")} disabled={overridesLoading}>
                      <FileJson className="h-4 w-4" />
                      Edit JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearOverride("practice_q_manifest")}
                      disabled={!hasPracticeQOverride || clearingPracticeQ || overridesLoading}
                    >
                      {clearingPracticeQ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Clear override
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-medium">Quiz JSON</h3>
                  <p className="text-xs text-muted-foreground">
                    Copies the course quiz JSON from CDN into database (supports topics or modules format).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={copyQuizToDatabase} disabled={syncingQuiz || overridesLoading}>
                      {syncingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      Copy to DB
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => openJsonEditor("quiz")} disabled={overridesLoading}>
                      <FileJson className="h-4 w-4" />
                      Edit JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearOverride("quiz_json")}
                      disabled={!hasQuizOverride || clearingQuiz || overridesLoading}
                    >
                      {clearingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Clear override
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Sections</CardTitle>
            <CardDescription>Top to bottom = order in the learn sidebar. Use arrows to reorder.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => addRow("program_overview")} disabled={!courseId || hasProgramOverview}>
              <Plus className="h-4 w-4 mr-1" />
              Add program overview
            </Button>
            <Button type="button" size="sm" onClick={() => addRow("topic")} disabled={!courseId}>
              <Plus className="h-4 w-4 mr-1" />
              Add topic
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : !courseId ? (
            <p className="text-muted-foreground py-6">Select a course to edit sections.</p>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 space-y-4">
              <p className="text-sm text-foreground font-medium">No saved structure yet</p>
              <p className="text-sm text-muted-foreground">
                The learn page is still using the file on the CDN. To manage order here, copy your existing{" "}
                <code className="text-xs bg-muted px-1 rounded">manifest.json</code> into the database (recommended), or load
                it into the editor and save after editing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={copyManifestToDatabase} disabled={seedingDb || importing || saving}>
                  {seedingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Copy manifest to database
                </Button>
                <Button type="button" variant="outline" onClick={loadManifestIntoEditor} disabled={importing || seedingDb}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Load manifest into editor
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Topic slug</TableHead>
                  <TableHead className="min-w-[380px] w-[36%]">Folder (CDN) & preview</TableHead>
                  <TableHead className="min-w-[170px]">Practice Q source topic #</TableHead>
                  <TableHead className="min-w-[150px]">Quiz source topic #</TableHead>
                  <TableHead className="min-w-[150px]">NGN source topic #</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.key}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => move(index, 1)}
                          disabled={index === rows.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="text-sm font-medium">{row.section_kind === "program_overview" ? "Program overview" : "Topic"}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      {row.section_kind === "topic" ? (
                        <Input
                          value={row.topic_slug}
                          onChange={(e) => {
                            const v = e.target.value
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, topic_slug: v } : r)))
                          }}
                          placeholder="topic-1"
                          className="font-mono text-sm"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4 w-full min-w-0">
                        <Input
                          value={row.folder}
                          onChange={(e) => {
                            const v = e.target.value
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, folder: v } : r)))
                          }}
                          placeholder="Topic 1"
                          className="min-w-0 flex-1 font-mono text-sm lg:min-w-[200px]"
                        />
                        <FolderSlidePreview contentFolder={selectedCourse?.content_folder} folder={row.folder} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 hidden sm:block">
                        First slide: tries 01.png / 1.png (and Practice Q names when applicable).
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      {row.section_kind === "topic" ? (
                        <Select
                          value={row.practice_q_source_topic_num || "__same__"}
                          onValueChange={(v) => {
                            const next = v === "__same__" ? "" : v
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, practice_q_source_topic_num: next } : r)))
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Same topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__same__">Same topic</SelectItem>
                            {topicSourceOptions.map((opt) => (
                              <SelectItem key={`pq-${opt.value}`} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {row.section_kind === "topic" ? (
                        <Select
                          value={row.quiz_source_topic_num || "__same__"}
                          onValueChange={(v) => {
                            const next = v === "__same__" ? "" : v
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quiz_source_topic_num: next } : r)))
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Same topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__same__">Same topic</SelectItem>
                            {topicSourceOptions.map((opt) => (
                              <SelectItem key={`quiz-${opt.value}`} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {row.section_kind === "topic" ? (
                        <Select
                          value={row.ngn_source_topic_num || "__same__"}
                          onValueChange={(v) => {
                            const next = v === "__same__" ? "" : v
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ngn_source_topic_num: next } : r)))
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Same topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__same__">Same topic</SelectItem>
                            {topicSourceOptions.map((opt) => (
                              <SelectItem key={`ngn-${opt.value}`} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.label}
                        onChange={(e) => {
                          const v = e.target.value
                          setRows((prev) => prev.map((r, i) => (i === index ? { ...r, label: v } : r)))
                        }}
                        placeholder="Display name"
                      />
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} aria-label="Remove row">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={jsonEditorOpen} onOpenChange={setJsonEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {jsonEditorKind === "practice_q" ? "Edit Practice Q JSON override" : "Edit Quiz JSON override"}
            </DialogTitle>
            <DialogDescription>
              Paste or edit JSON directly. Validation runs before save and the API performs final validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={loadEditorFromCdn} disabled={jsonEditorCdnLoading || jsonEditorSaving}>
                {jsonEditorCdnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Load from CDN
              </Button>
            </div>

            {jsonEditorLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading JSON...
              </div>
            ) : (
              <Textarea
                value={jsonEditorText}
                onChange={(e) => setJsonEditorText(e.target.value)}
                className="min-h-[420px] font-mono text-xs"
                placeholder='{\n  "folders": []\n}'
              />
            )}

            {jsonEditorError && (
              <p className="text-sm text-destructive">{jsonEditorError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setJsonEditorOpen(false)} disabled={jsonEditorSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={saveJsonEditor} disabled={jsonEditorSaving || jsonEditorLoading}>
              {jsonEditorSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save JSON override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

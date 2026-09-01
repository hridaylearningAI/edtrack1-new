"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { MessageCircle, Send, Loader2, Reply } from "lucide-react"

import TrainerLayout from "@/components/trainer/trainer-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

import { useUser } from "@/lib/hooks/useUser"

const NCLEX_COURSE_ID = 45

type ForumRow = {
  id: number
  course_id: number
  type: string
  enrollment_id: number | null
  created_at: string
}

type ThreadRow = {
  id: number
  forum_id: number
  title: string
  author_id: number
  author_name?: string
  created_at: string
  updated_at: string
}

type PostRow = {
  id: number
  thread_id: number
  author_id: number
  author_name?: string
  content: string
  created_at: string
  updated_at: string
}

export default function TrainerNclexForumsPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [canReply, setCanReply] = useState<boolean | null>(null)

  const [loading, setLoading] = useState(true)
  const [forumsError, setForumsError] = useState<string | null>(null)
  const [forumId, setForumId] = useState<number | null>(null)
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setCanReply(false)
      return
    }

    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error("Auth token missing")
        const res = await fetch("/api/trainers/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled) setCanReply(!!json?.data?.allowed)
      } catch {
        if (!cancelled) setCanReply(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isLoading])

  const fetchForumAndThreads = useCallback(async () => {
    if (!canReply) return
    setLoading(true)
    setForumsError(null)
    try {
      const token = await getAccessToken()

      // Ensure the general forum exists (this endpoint creates it if missing).
      const ensureRes = await fetch(`/api/course-forums?courseId=${NCLEX_COURSE_ID}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const ensureJson = await ensureRes.json()
      if (!ensureJson?.success || !Array.isArray(ensureJson.data)) throw new Error(ensureJson?.message || "Failed to ensure forums")

      const general = (ensureJson.data as ForumRow[]).find((f) => f.type === "general" && f.enrollment_id == null) ?? null
      if (!general) throw new Error("General forum not available")
      setForumId(general.id)

      setThreadsLoading(true)
      const threadsRes = await fetch(`/api/course-forums/admin/${general.id}/threads`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const threadsJson = await threadsRes.json()
      if (!threadsJson?.success || !Array.isArray(threadsJson.data)) throw new Error(threadsJson?.message || "Failed to load threads")
      const list = threadsJson.data as ThreadRow[]
      setThreads(list)
      setSelectedThreadId(list[0]?.id ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load forums"
      setForumsError(msg)
      setForumId(null)
      setThreads([])
      setSelectedThreadId(null)
      setPosts([])
    } finally {
      setThreadsLoading(false)
      setLoading(false)
    }
  }, [getAccessToken, canReply])

  useEffect(() => {
    if (canReply == null) return
    fetchForumAndThreads()
  }, [canReply, fetchForumAndThreads])

  const fetchPosts = useCallback(
    async (threadId: number) => {
      if (!canReply) return
      setPostsLoading(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(`/api/course-forums/admin/threads/${threadId}/posts`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (!json?.success || !Array.isArray(json.data)) throw new Error(json?.message || "Failed to load posts")
        setPosts(json.data as PostRow[])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load posts"
        toast.error(msg)
        setPosts([])
      } finally {
        setPostsLoading(false)
      }
    },
    [getAccessToken, canReply]
  )

  useEffect(() => {
    if (selectedThreadId != null) fetchPosts(selectedThreadId)
  }, [fetchPosts, selectedThreadId])

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) ?? null, [threads, selectedThreadId])

  const handleReply = useCallback(async () => {
    if (!canReply || selectedThreadId == null) return
    const content = replyContent.trim()
    if (!content) {
      toast.error("Write a reply first")
      return
    }
    setPosting(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/admin/threads/${selectedThreadId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || "Failed to post reply")
      toast.success("Reply posted")
      setReplyContent("")
      await fetchPosts(selectedThreadId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to post reply"
      toast.error(msg)
    } finally {
      setPosting(false)
    }
  }, [fetchPosts, getAccessToken, canReply, replyContent, selectedThreadId])

  if (isLoading || !isAuthenticated) {
    return (
      <TrainerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Loading forums…</p>
          </div>
        </div>
      </TrainerLayout>
    )
  }

  if (canReply === false) {
    return (
      <TrainerLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">NCLEX Forums</h1>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Your account does not have trainer portal access.
          </p>
          <Button asChild variant="outline">
            <Link href="/trainer/nclex">Back to NCLEX trainer</Link>
          </Button>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand-blue" />
              NCLEX Forums (Reply)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Reply to general course forum threads for course {NCLEX_COURSE_ID}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/50 dark:bg-neutral-900/50">
              {threads.length} threads
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/trainer/nclex">Back to NCLEX</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-blue" />
            <p className="mt-2">Loading forum threads…</p>
          </div>
        ) : forumsError ? (
          <div className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{forumsError}</p>
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={fetchForumAndThreads}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="border-brand-blue/15 dark:border-brand-blue/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Reply className="h-4 w-4 text-brand-blue" />
                  Threads
                </CardTitle>
                <CardDescription>Latest general discussion threads.</CardDescription>
              </CardHeader>
              <CardContent>
                {threadsLoading ? (
                  <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading threads…</div>
                ) : threads.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No threads found.</p>
                ) : (
                  <div className="space-y-2">
                    {threads.map((t) => {
                      const active = t.id === selectedThreadId
                      return (
                        <Button
                          key={t.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedThreadId(t.id)}
                        >
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-sm font-medium line-clamp-2">{t.title}</span>
                            <span className="text-xs text-muted-foreground">{t.author_name ? `by ${t.author_name}` : ""}</span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-brand-blue/15 dark:border-brand-blue/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{selectedThread ? selectedThread.title : "Select a thread"}</CardTitle>
                <CardDescription>
                  {selectedThread ? `Replies for thread #${selectedThread.id}` : "Choose a thread on the left to view replies."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {postsLoading ? (
                  <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading posts…</div>
                ) : selectedThreadId == null ? (
                  <p className="text-sm text-muted-foreground">No thread selected.</p>
                ) : posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posts yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {posts.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-medium">{p.author_name ?? `User #${p.author_id}`}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{p.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-border/70 bg-white/60 dark:bg-neutral-900/40 p-3">
                  <label className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Reply className="h-4 w-4 text-brand-blue" />
                    Add a reply
                  </label>
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your response to the student queries…"
                    className="mt-2"
                    rows={4}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Posting will appear immediately under this thread.
                    </p>
                    <Button onClick={handleReply} disabled={posting || selectedThreadId == null} className="gap-2">
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Post reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TrainerLayout>
  )
}


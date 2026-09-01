"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, MessageCircle, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"

interface ForumRow {
  id: number
  course_id: number
  course_name: string
  type: string
  created_at: string
}

interface ThreadRow {
  id: number
  forum_id: number
  title: string
  author_id: number
  author_name?: string
  created_at: string
  updated_at: string
}

interface PostRow {
  id: number
  thread_id: number
  author_id: number
  author_name?: string
  content: string
  created_at: string
  updated_at: string
}

export default function AdminCourseForumsPage() {
  const { getAccessToken } = useUser()
  const [forums, setForums] = useState<ForumRow[]>([])
  const [selectedForumId, setSelectedForumId] = useState<number | null>(null)
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loadingForums, setLoadingForums] = useState(true)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const selectedForum = forums.find((f) => f.id === selectedForumId)

  const fetchForums = useCallback(async () => {
    setLoadingForums(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/course-forums/admin", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) {
        setForums(json.data)
      } else {
        setForums([])
      }
    } catch {
      setForums([])
      toast.error("Failed to load forums")
    } finally {
      setLoadingForums(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchForums()
  }, [fetchForums])

  const fetchThreads = useCallback(async () => {
    if (selectedForumId == null) {
      setThreads([])
      return
    }
    setLoadingThreads(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/admin/${selectedForumId}/threads`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) {
        setThreads(json.data)
      } else {
        setThreads([])
      }
    } catch {
      setThreads([])
      toast.error("Failed to load threads")
    } finally {
      setLoadingThreads(false)
    }
  }, [selectedForumId, getAccessToken])

  useEffect(() => {
    setExpandedThreadId(null)
    setPosts([])
    fetchThreads()
  }, [fetchThreads])

  const fetchPosts = useCallback(async (threadId: number) => {
    setLoadingPosts(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/admin/threads/${threadId}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) {
        setPosts(json.data)
      } else {
        setPosts([])
      }
    } catch {
      setPosts([])
      toast.error("Failed to load posts")
    } finally {
      setLoadingPosts(false)
    }
  }, [getAccessToken])

  const toggleThread = (threadId: number) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null)
      setPosts([])
    } else {
      setExpandedThreadId(threadId)
      fetchPosts(threadId)
    }
  }

  const deleteThread = async (threadId: number) => {
    setActionId(`thread-${threadId}`)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/admin/threads/${threadId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success) {
        toast.success("Thread and all replies deleted")
        if (expandedThreadId === threadId) {
          setExpandedThreadId(null)
          setPosts([])
        }
        fetchThreads()
      } else {
        toast.error(json?.message ?? "Failed to delete thread")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setActionId(null)
    }
  }

  const deletePost = async (postId: number) => {
    setActionId(`post-${postId}`)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/admin/posts/${postId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success) {
        toast.success("Post deleted")
        if (expandedThreadId != null) fetchPosts(expandedThreadId)
      } else {
        toast.error(json?.message ?? "Failed to delete post")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setActionId(null)
    }
  }

  return (
          <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Course Forums (General)</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monitor and moderate general discussion forums. You can delete individual replies or entire threads.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchForums} disabled={loadingForums}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingForums ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Select a course forum
            </CardTitle>
            <CardDescription>
              General forums only. Personal journals are not shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingForums ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            ) : forums.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No general forums found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {forums.map((f) => (
                  <Button
                    key={f.id}
                    variant={selectedForumId === f.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedForumId(f.id)}
                  >
                    {f.course_name}
                  </Button>
                ))}
              </div>
            )}

            {selectedForum && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Threads in {selectedForum.course_name}
                </h3>
                {loadingThreads ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
                  </div>
                ) : threads.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No threads yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {threads.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden"
                      >
                        <div className="flex items-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => toggleThread(t.id)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                            aria-label={expandedThreadId === t.id ? "Collapse" : "Expand"}
                          >
                            {expandedThreadId === t.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t.author_name ?? "Unknown"} · {new Date(t.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0"
                            disabled={actionId !== null}
                            onClick={() => deleteThread(t.id)}
                          >
                            {actionId === `thread-${t.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Delete thread
                          </Button>
                        </div>
                        {expandedThreadId === t.id && (
                          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                            {loadingPosts ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-brand-blue" />
                              </div>
                            ) : (
                              posts.map((p) => (
                                <div
                                  key={p.id}
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        {p.author_name ?? "Unknown"} · {new Date(p.created_at).toLocaleString()}
                                      </p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-1">
                                        {p.content}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0"
                                      disabled={actionId !== null}
                                      onClick={() => deletePost(p.id)}
                                    >
                                      {actionId === `post-${p.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}

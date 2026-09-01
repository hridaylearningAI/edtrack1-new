"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MessageCircle, FileText, Plus, ArrowLeft, Send, Loader2 } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"
import { toast } from "sonner"

interface Forum {
  id: number
  course_id: number
  type: string
  enrollment_id: number | null
  created_at: string
}

interface Thread {
  id: number
  forum_id: number
  title: string
  author_id: number
  author_name?: string
  created_at: string
  updated_at: string
}

interface Post {
  id: number
  thread_id: number
  author_id: number
  author_name?: string
  content: string
  created_at: string
  updated_at: string
}

export function CourseForumsView({
  courseId,
  enrollmentId,
  courseDisplayName,
  onBack,
}: {
  courseId: number
  enrollmentId: number | null
  courseDisplayName: string
  onBack: () => void
}) {
  const { getAccessToken } = useUser()
  const [forums, setForums] = useState<Forum[]>([])
  const [tab, setTab] = useState<"general" | "personal">("general")
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingForums, setLoadingForums] = useState(true)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [replyContent, setReplyContent] = useState("")
  const [posting, setPosting] = useState(false)

  const currentForum = forums.find((f) => f.type === tab) ?? null

  const fetchForums = useCallback(async () => {
    if (!courseId) return
    setLoadingForums(true)
    try {
      const token = await getAccessToken()
      const url = `/api/course-forums?courseId=${courseId}${enrollmentId != null ? `&enrollmentId=${enrollmentId}` : ""}`
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) setForums(json.data)
      else setForums([])
    } catch {
      setForums([])
    } finally {
      setLoadingForums(false)
    }
  }, [courseId, enrollmentId, getAccessToken])

  useEffect(() => {
    fetchForums()
  }, [fetchForums])

  const fetchThreads = useCallback(async () => {
    if (!currentForum?.id) {
      setThreads([])
      return
    }
    setLoadingThreads(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/${currentForum.id}/threads`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) setThreads(json.data)
      else setThreads([])
    } catch {
      setThreads([])
    } finally {
      setLoadingThreads(false)
    }
  }, [currentForum?.id, getAccessToken])

  useEffect(() => {
    setSelectedThreadId(null)
    setPosts([])
    fetchThreads()
  }, [fetchThreads, tab])

  const fetchPosts = useCallback(async () => {
    if (!selectedThreadId) {
      setPosts([])
      return
    }
    setLoadingPosts(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/threads/${selectedThreadId}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) setPosts(json.data)
      else setPosts([])
    } catch {
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }, [selectedThreadId, getAccessToken])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleCreateThread = async () => {
    if (!currentForum?.id) return
    const title = newTitle.trim() || (tab === "personal" ? new Date().toLocaleDateString() : "")
    if (tab === "general" && !title) return
    if (tab === "personal" && !newContent.trim()) return
    setPosting(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/${currentForum.id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title || new Date().toLocaleDateString(), content: newContent.trim() }),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success(tab === "personal" ? "Entry saved" : "Discussion started")
        setNewTitle("")
        setNewContent("")
        fetchThreads()
      } else {
        toast.error(json?.message ?? "Failed to create")
      }
    } catch {
      toast.error("Failed to create")
    } finally {
      setPosting(false)
    }
  }

  const handleReply = async () => {
    if (!selectedThreadId || !replyContent.trim()) return
    setPosting(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-forums/threads/${selectedThreadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: replyContent.trim() }),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success("Reply posted")
        setReplyContent("")
        fetchPosts()
      } else {
        toast.error(json?.message ?? "Failed to post")
      }
    } catch {
      toast.error("Failed to post")
    } finally {
      setPosting(false)
    }
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId)
  const showList = selectedThreadId == null

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-slate-50 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10">
      <header className="h-16 bg-white dark:bg-[#15202b] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Back to course"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Forums</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{courseDisplayName}</p>
          </div>
        </div>
      </header>

      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15202b]">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "general"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          General
        </button>
        <button
          type="button"
          onClick={() => setTab("personal")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "personal"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          My journal
        </button>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {loadingForums ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          </div>
        ) : tab === "personal" && !currentForum ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">Enroll in this course to use your journal.</p>
        ) : showList ? (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {tab === "general" ? "Discussions" : "My entries"}
            </h2>
            {tab === "general" && (
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                Start a discussion, ask for clarification, or help a fellow learner.
              </h3>
            )}
            {tab === "personal" && (
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                Record your learning reflections, key takeaways, questions, and action points from today's lesson.
              </h3>
            )}
            {currentForum && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <input
                  type="text"
                  placeholder={tab === "personal" ? "Title (optional)" : "Thread title"}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
                <textarea
                  placeholder={tab === "personal" ? "Write your thoughts..." : "First post (optional)"}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-y"
                />
                {tab === "general" && (
                  <button
                    type="button"
                    onClick={handleCreateThread}
                    disabled={posting || !newTitle.trim()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    New thread
                  </button>
                )}
                {tab === "personal" && (
                  <button
                    type="button"
                    onClick={handleCreateThread}
                    disabled={posting || !newContent.trim()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    New entry
                  </button>
                )}
              </div>
            )}
            {loadingThreads ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                {tab === "general" ? "No discussions yet. Start one!" : "No entries yet. Write your first thought."}
              </p>
            ) : (
              <ul className="space-y-2">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="font-medium text-slate-900 dark:text-white">{t.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {tab === "general" && t.author_name ? (
                          <>{t.author_name} · {new Date(t.created_at).toLocaleDateString()}</>
                        ) : (
                          new Date(t.created_at).toLocaleDateString()
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <button
              type="button"
              onClick={() => { setSelectedThreadId(null); setReplyContent("") }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
            {selectedThread && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedThread.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tab === "general" && selectedThread.author_name ? (
                      <>{selectedThread.author_name} · {new Date(selectedThread.created_at).toLocaleString()}</>
                    ) : (
                      new Date(selectedThread.created_at).toLocaleString()
                    )}
                  </p>
                </div>
                {loadingPosts ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {posts.map((p) => (
                      <li
                        key={p.id}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                      >
                        {tab === "general" && p.author_name && (
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{p.author_name}</p>
                        )}
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{p.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {new Date(p.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {tab === "general" && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-y"
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={posting || !replyContent.trim()}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50"
                    >
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Reply
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

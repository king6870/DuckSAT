"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { DEFAULT_TARGET_QUESTIONS, MIN_TARGET_QUESTIONS, MAX_TARGET_QUESTIONS } from '@/constants/topics'
import { Plus, Pencil, Archive, ArchiveRestore, ChevronDown, ChevronRight, BookOpen, Calculator, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subtopic {
  id: string
  name: string
  description: string | null
  targetQuestions: number
  currentCount: number
  isActive: boolean
}

interface Topic {
  id: string
  name: string
  moduleType: string
  description: string | null
  isActive: boolean
  subtopics: Subtopic[]
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const color =
    pct >= 100 ? 'bg-emerald-500' :
    pct >= 60  ? 'bg-blue-500' :
    pct >= 30  ? 'bg-amber-500' :
    'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 whitespace-nowrap w-16 text-right">
        {current} / {target}
      </span>
      <span className={`text-xs font-bold w-10 text-right ${
        pct >= 100 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : 'text-amber-600'
      }`}>{pct}%</span>
    </div>
  )
}

// ─── Inline Text Input (edit in place) ───────────────────────────────────────

function InlineEdit({
  initialValue,
  placeholder,
  onSave,
  onCancel,
  type = 'text',
}: {
  initialValue: string
  placeholder?: string
  onSave: (v: string) => void
  onCancel: () => void
  type?: 'text' | 'number'
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()) }}
    >
      <input
        autoFocus
        type={type}
        min={type === 'number' ? MIN_TARGET_QUESTIONS : undefined}
        max={type === 'number' ? MAX_TARGET_QUESTIONS : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="border rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button type="submit" className="text-emerald-600 hover:text-emerald-800" aria-label="Save">
        <Check className="w-4 h-4" />
      </button>
      <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Cancel">
        <X className="w-4 h-4" />
      </button>
    </form>
  )
}

// ─── Subtopic Row ─────────────────────────────────────────────────────────────

function SubtopicRow({
  subtopic,
  topicId,
  onRefresh,
}: {
  subtopic: Subtopic
  topicId: string
  onRefresh: () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [busy, setBusy] = useState(false)

  const patch = async (data: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/topics/${topicId}/subtopics/${subtopic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Failed to update subtopic')
        return
      }
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!confirm(`Archive subtopic "${subtopic.name}"? It will be hidden from generation but data is preserved.`)) return
    await patch({ isActive: false })
  }

  const restore = async () => {
    await patch({ isActive: true })
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm ${
      subtopic.isActive ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50/40 opacity-60'
    } transition-colors`}>
      <div className="flex-1 min-w-0">
        {editingName ? (
          <InlineEdit
            initialValue={subtopic.name}
            onSave={(v) => { setEditingName(false); patch({ name: v }) }}
            onCancel={() => setEditingName(false)}
          />
        ) : (
          <span className={`font-medium ${subtopic.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
            {subtopic.name}
          </span>
        )}
      </div>

      <div className="w-52">
        <ProgressBar current={subtopic.currentCount} target={subtopic.targetQuestions} />
      </div>

      <div className="flex items-center gap-1">
        {/* Edit target */}
        {editingTarget ? (
          <InlineEdit
            initialValue={String(subtopic.targetQuestions)}
            type="number"
            onSave={(v) => { setEditingTarget(false); patch({ targetQuestions: Number(v) }) }}
            onCancel={() => setEditingTarget(false)}
          />
        ) : (
          <button
            onClick={() => setEditingTarget(true)}
            disabled={busy}
            className="text-gray-400 hover:text-indigo-600 p-1 rounded"
            aria-label="Edit target"
            title="Edit target questions"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}

        {/* Rename */}
        {!editingName && !editingTarget && (
          <button
            onClick={() => setEditingName(true)}
            disabled={busy}
            className="text-gray-400 hover:text-indigo-600 p-1 rounded text-xs"
            aria-label="Rename subtopic"
            title="Rename"
          >
            ✎
          </button>
        )}

        {/* Archive / Restore */}
        {subtopic.isActive ? (
          <button
            onClick={archive}
            disabled={busy}
            className="text-gray-400 hover:text-rose-600 p-1 rounded"
            aria-label="Archive subtopic"
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={restore}
            disabled={busy}
            className="text-gray-400 hover:text-emerald-600 p-1 rounded"
            aria-label="Restore subtopic"
            title="Restore"
          >
            <ArchiveRestore className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add Subtopic Form ────────────────────────────────────────────────────────

function AddSubtopicForm({
  topicId,
  onDone,
}: {
  topicId: string
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState(String(DEFAULT_TARGET_QUESTIONS))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/topics/${topicId}/subtopics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), targetQuestions: Number(target) }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to create subtopic')
        return
      }
      setName('')
      setTarget('100')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2 px-3">
      <input
        type="text"
        placeholder="Subtopic name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        required
      />
      <input
        type="number"
        min={MIN_TARGET_QUESTIONS}
        max={MAX_TARGET_QUESTIONS}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        title="Target questions"
        placeholder="Target"
      />
      <Button type="submit" size="sm" disabled={loading || !name.trim()}>
        {loading ? '…' : 'Add'}
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  )
}

// ─── Topic Card ───────────────────────────────────────────────────────────────

function TopicCard({
  topic,
  showArchived,
  onRefresh,
}: {
  topic: Topic
  showArchived: boolean
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [addingSubtopic, setAddingSubtopic] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [busy, setBusy] = useState(false)

  const visibleSubtopics = showArchived
    ? topic.subtopics
    : topic.subtopics.filter((s) => s.isActive)

  const totalCurrent = topic.subtopics.reduce((s, st) => s + st.currentCount, 0)
  const totalTarget = topic.subtopics.reduce((s, st) => s + st.targetQuestions, 0)

  const patch = async (data: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Failed to update topic')
        return
      }
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!confirm(`Archive topic "${topic.name}"? All its subtopics will also be hidden.`)) return
    await patch({ isActive: false })
  }

  const restore = async () => {
    await patch({ isActive: true })
  }

  const borderColor = topic.moduleType === 'math' ? 'border-purple-300' : 'border-blue-300'
  const badgeStyle = topic.moduleType === 'math'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'

  return (
    <div className={`bg-white rounded-2xl shadow-md border-l-4 ${borderColor} ${!topic.isActive ? 'opacity-60' : ''}`}>
      {/* Topic header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-700"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        <div className={topic.moduleType === 'math' ? 'text-purple-600' : 'text-blue-600'}>
          {topic.moduleType === 'math' ? <Calculator className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <InlineEdit
              initialValue={topic.name}
              onSave={(v) => { setEditingName(false); patch({ name: v }) }}
              onCancel={() => setEditingName(false)}
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold text-gray-900 text-base ${!topic.isActive ? 'line-through text-gray-400' : ''}`}>
                {topic.name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeStyle}`}>
                {topic.moduleType === 'math' ? 'Math' : 'Reading & Writing'}
              </span>
              {!topic.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
              )}
            </div>
          )}
        </div>

        {/* Topic overall progress */}
        {totalTarget > 0 && (
          <div className="w-52 hidden sm:block">
            <ProgressBar current={totalCurrent} target={totalTarget} />
          </div>
        )}

        <div className="flex items-center gap-1 ml-2">
          {!editingName && (
            <button
              onClick={() => setEditingName(true)}
              disabled={busy}
              className="text-gray-400 hover:text-indigo-600 p-1 rounded"
              aria-label="Rename topic"
              title="Rename"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {topic.isActive ? (
            <button
              onClick={archive}
              disabled={busy}
              className="text-gray-400 hover:text-rose-600 p-1 rounded"
              aria-label="Archive topic"
              title="Archive topic"
            >
              <Archive className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={restore}
              disabled={busy}
              className="text-gray-400 hover:text-emerald-600 p-1 rounded"
              aria-label="Restore topic"
              title="Restore topic"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subtopics list */}
      {expanded && (
        <div className="border-t border-gray-100 px-2 py-2 space-y-1">
          {visibleSubtopics.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2">No subtopics yet.</p>
          ) : (
            visibleSubtopics.map((st) => (
              <SubtopicRow
                key={st.id}
                subtopic={st}
                topicId={topic.id}
                onRefresh={onRefresh}
              />
            ))
          )}

          {/* Add subtopic */}
          {topic.isActive && (
            addingSubtopic ? (
              <AddSubtopicForm
                topicId={topic.id}
                onDone={() => { setAddingSubtopic(false); onRefresh() }}
              />
            ) : (
              <button
                onClick={() => setAddingSubtopic(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Subtopic
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Topic Form ───────────────────────────────────────────────────────────

function AddTopicForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [moduleType, setModuleType] = useState<'math' | 'reading-writing'>('math')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), moduleType, description: description.trim() || null }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to create topic')
        return
      }
      setName('')
      setDescription('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md border-2 border-dashed border-indigo-200 p-5 space-y-3"
    >
      <h3 className="font-bold text-gray-900">New Topic</h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Topic name (e.g. Algebra)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
        <select
          value={moduleType}
          onChange={(e) => setModuleType(e.target.value as 'math' | 'reading-writing')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="math">Math</option>
          <option value="reading-writing">Reading & Writing</option>
        </select>
      </div>
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !name.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          {loading ? 'Creating…' : 'Create Topic'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTopicsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [addingTopic, setAddingTopic] = useState(false)
  const [moduleFilter, setModuleFilter] = useState<'all' | 'math' | 'reading-writing'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
    if (session?.user?.email && !ADMIN_EMAILS.includes(session.user.email)) {
      router.push('/')
    }
  }, [session, status, router])

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/topics?all=${showArchived}`)
      if (!res.ok) throw new Error('Failed to load topics')
      const data = await res.json()
      setTopics(data.topics || [])
      setError(null)
    } catch {
      setError('Failed to load topics')
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchTopics()
    }
  }, [session, fetchTopics])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return null
  }

  // Totals
  const totalTopics = topics.filter((t) => t.isActive).length
  const totalSubtopics = topics.flatMap((t) => t.subtopics).filter((s) => s.isActive).length
  const totalCurrent = topics.flatMap((t) => t.subtopics).reduce((s, st) => s + st.currentCount, 0)
  const totalTarget = topics.flatMap((t) => t.subtopics).reduce((s, st) => s + st.targetQuestions, 0)

  const filtered = topics.filter((t) => {
    if (moduleFilter !== 'all' && t.moduleType !== moduleFilter) return false
    if (!showArchived && !t.isActive) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🗂️ Topics & Subtopics</h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage SAT topics, subtopics, and question targets
              </p>
            </div>
            <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700 underline">
              ← Admin Home
            </a>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Active Topics', value: totalTopics, color: 'from-indigo-50 to-purple-50 border-indigo-200', text: 'text-indigo-700' },
              { label: 'Active Subtopics', value: totalSubtopics, color: 'from-blue-50 to-cyan-50 border-blue-200', text: 'text-blue-700' },
              { label: 'Questions Created', value: totalCurrent, color: 'from-emerald-50 to-green-50 border-emerald-200', text: 'text-emerald-700' },
              { label: 'Target Questions', value: totalTarget, color: 'from-amber-50 to-yellow-50 border-amber-200', text: 'text-amber-700' },
            ].map((k) => (
              <div key={k.label} className={`p-4 bg-gradient-to-br ${k.color} rounded-2xl border-2`}>
                <div className={`text-2xl font-bold ${k.text}`}>{k.value.toLocaleString()}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Module filter */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['all', 'math', 'reading-writing'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                    moduleFilter === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {m === 'all' ? 'All' : m === 'math' ? 'Math' : 'R&W'}
                </button>
              ))}
            </div>

            {/* Show archived toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              Show archived
            </label>

            <div className="flex-1" />

            {!addingTopic && (
              <Button onClick={() => setAddingTopic(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Topic
              </Button>
            )}
          </div>

          {/* Add Topic Form */}
          {addingTopic && (
            <div className="mb-6">
              <AddTopicForm onDone={() => { setAddingTopic(false); fetchTopics() }} />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading topics…</div>
          ) : error ? (
            <div className="text-center py-16 text-rose-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {addingTopic ? null : 'No topics found. Create one above!'}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  showArchived={showArchived}
                  onRefresh={fetchTopics}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useId, useRef, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { notesBeatKindLabel } from '@/lib/learn/notes-lesson-beats'
import type {
  ThemeActivityContentPatch,
  ThemeFlashcardsContentPatch,
  ThemeNotesContentPatch,
  ThemeQuizContentPatch,
  ThemeVideoContentPatch,
} from '@/lib/lms/theme'
import s from './theme-studio.module.css'

type Props = {
  value: ThemeActivityContentPatch
  /** 0-based index of the card/question currently shown in the preview. */
  activeIndex?: number
  onChange: (next: ThemeActivityContentPatch) => void
  onFocusField?: (fieldKey: string) => void
  onBlurField?: () => void
}

export function ActivityContentEditor({
  value,
  activeIndex = 0,
  onChange,
  onFocusField,
  onBlurField,
}: Props) {
  switch (value.kind) {
    case 'notes':
      return (
        <NotesCurrentCardEditor
          value={value}
          activeIndex={activeIndex}
          onChange={onChange}
          onFocusField={onFocusField}
          onBlurField={onBlurField}
        />
      )
    case 'video':
      return (
        <VideoUploadEditor
          value={value}
          onChange={onChange}
          onFocusField={onFocusField}
          onBlurField={onBlurField}
        />
      )
    case 'flashcards':
      return (
        <FlashcardCurrentEditor
          value={value}
          activeIndex={activeIndex}
          onChange={onChange}
          onFocusField={onFocusField}
          onBlurField={onBlurField}
        />
      )
    case 'quiz':
      return (
        <QuizCurrentEditor
          value={value}
          activeIndex={activeIndex}
          onChange={onChange}
          onFocusField={onFocusField}
          onBlurField={onBlurField}
        />
      )
    default: {
      const _exhaustive: never = value
      return _exhaustive
    }
  }
}

function NotesCurrentCardEditor({
  value,
  activeIndex,
  onChange,
  onFocusField,
  onBlurField,
}: {
  value: ThemeNotesContentPatch
  activeIndex: number
  onChange: (next: ThemeNotesContentPatch) => void
  onFocusField?: (fieldKey: string) => void
  onBlurField?: () => void
}) {
  const safeIndex =
    value.beats.length > 0 ? Math.min(Math.max(0, activeIndex), value.beats.length - 1) : 0
  const beat = value.beats[safeIndex]

  if (!beat) {
    return <p className={s.emptyInspector}>No learning-note cards in this section yet.</p>
  }

  const updateBeat = (patch: Partial<typeof beat>) => {
    onChange({
      ...value,
      beats: value.beats.map((item, index) => (index === safeIndex ? { ...item, ...patch } : item)),
    })
  }

  return (
    <div className={s.contentEditor}>
      <p className={s.settingsGroupTitle}>
        Card {safeIndex + 1} of {value.beats.length} · {notesBeatKindLabel(beat.kind)}
      </p>
      <div className={s.field}>
        <label>Section title</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          onFocus={() => onFocusField?.('title')}
          onBlur={onBlurField}
        />
      </div>
      <div className={s.field}>
        <label>Card title</label>
        <input
          type="text"
          value={beat.title}
          onChange={(e) => updateBeat({ title: e.target.value })}
          onFocus={() => onFocusField?.(`beat.${safeIndex}.title`)}
          onBlur={onBlurField}
        />
      </div>
      <div className={s.field}>
        <label>Body</label>
        <textarea
          value={beat.body ?? ''}
          onChange={(e) => updateBeat({ body: e.target.value })}
          onFocus={() => onFocusField?.(`beat.${safeIndex}.body`)}
          onBlur={onBlurField}
        />
      </div>
      <div className={s.field}>
        <label>Bullets (one per line)</label>
        <textarea
          value={(beat.bullets ?? []).join('\n')}
          onChange={(e) =>
            updateBeat({
              bullets: e.target.value.split('\n'),
            })
          }
          onFocus={() => onFocusField?.(`beat.${safeIndex}.bullets`)}
          onBlur={onBlurField}
        />
      </div>
      <p className={s.imageHint}>Navigate cards in the preview to edit the next note.</p>
    </div>
  )
}

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'
const VIDEO_MAX_BYTES = 80 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function VideoUploadEditor({
  value,
  onChange,
  onFocusField,
  onBlurField,
}: {
  value: ThemeVideoContentPatch
  onChange: (next: ThemeVideoContentPatch) => void
  onFocusField?: (fieldKey: string) => void
  onBlurField?: () => void
}) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const clearVideo = () => {
    onChange({ ...value, videoUrl: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error('Video must be under 80MB')
      return
    }
    if (file.type && !VIDEO_ACCEPT.split(',').includes(file.type)) {
      toast.error('Use MP4, WebM, or MOV')
      return
    }

    setUploading(true)
    onFocusField?.('videoUrl')
    try {
      const localUrl = await readFileAsDataUrl(file)
      onChange({ ...value, videoUrl: localUrl })
      toast.success('Video applied to preview')
    } catch (error) {
      console.error('Theme studio video upload failed', error)
      toast.error('Could not read that video file')
    } finally {
      setUploading(false)
      onBlurField?.()
    }
  }

  return (
    <div className={s.contentEditor}>
      <p className={s.settingsGroupTitle}>Lecture video</p>
      <div className={s.field}>
        <label htmlFor={inputId}>Upload video</label>
        {value.videoUrl ? (
          <div className={s.imagePreview}>
            <video src={value.videoUrl} controls playsInline preload="metadata" />
            <button type="button" className={s.imageClear} onClick={clearVideo} aria-label="Remove video">
              <X size={14} />
            </button>
          </div>
        ) : null}
        <div className={s.imageActions}>
          <input
            ref={fileInputRef}
            id={inputId}
            className={s.imageFileInput}
            type="file"
            accept={VIDEO_ACCEPT}
            onChange={(e) => void handleUpload(e.target.files?.[0])}
            onFocus={() => onFocusField?.('videoUrl')}
            onBlur={onBlurField}
          />
          <button
            type="button"
            className={s.btn}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 size={14} className={s.spin} /> : <Upload size={14} />}
            {value.videoUrl ? 'Replace video' : 'Upload video'}
          </button>
        </div>
        <p className={s.imageHint}>MP4, WebM, or MOV up to 80MB. Applied to this lecture in the preview.</p>
      </div>
    </div>
  )
}

function FlashcardCurrentEditor({
  value,
  activeIndex,
  onChange,
  onFocusField,
  onBlurField,
}: {
  value: ThemeFlashcardsContentPatch
  activeIndex: number
  onChange: (next: ThemeFlashcardsContentPatch) => void
  onFocusField?: (fieldKey: string) => void
  onBlurField?: () => void
}) {
  const safeIndex =
    value.cards.length > 0 ? Math.min(Math.max(0, activeIndex), value.cards.length - 1) : 0
  const card = value.cards[safeIndex]

  if (!card) {
    return <p className={s.emptyInspector}>No flashcards rendered for this section.</p>
  }

  const updateCard = (patch: Partial<typeof card>) => {
    onChange({
      ...value,
      cards: value.cards.map((item, index) => (index === safeIndex ? { ...item, ...patch } : item)),
    })
  }

  return (
    <div className={s.contentEditor}>
      <p className={s.settingsGroupTitle}>
        Card {safeIndex + 1} of {value.cards.length}
      </p>
      <div className={s.field}>
        <label>Front</label>
        <textarea
          value={card.front}
          onChange={(e) => updateCard({ front: e.target.value })}
          onFocus={() => onFocusField?.(`card.${safeIndex}.front`)}
          onBlur={onBlurField}
        />
      </div>
      <div className={s.field}>
        <label>Back</label>
        <textarea
          value={card.back}
          onChange={(e) => updateCard({ back: e.target.value })}
          onFocus={() => onFocusField?.(`card.${safeIndex}.back`)}
          onBlur={onBlurField}
        />
      </div>
      <p className={s.imageHint}>Flip or advance cards in the preview to edit the next one.</p>
    </div>
  )
}

function QuizCurrentEditor({
  value,
  activeIndex,
  onChange,
  onFocusField,
  onBlurField,
}: {
  value: ThemeQuizContentPatch
  activeIndex: number
  onChange: (next: ThemeQuizContentPatch) => void
  onFocusField?: (fieldKey: string) => void
  onBlurField?: () => void
}) {
  const safeIndex =
    value.questions.length > 0
      ? Math.min(Math.max(0, activeIndex), value.questions.length - 1)
      : 0
  const question = value.questions[safeIndex]

  if (!question) {
    return <p className={s.emptyInspector}>No quiz question is currently rendered.</p>
  }

  const updateQuestion = (patch: Partial<typeof question>) => {
    onChange({
      ...value,
      questions: value.questions.map((item, index) =>
        index === safeIndex ? { ...item, ...patch } : item,
      ),
    })
  }

  return (
    <div className={s.contentEditor}>
      <p className={s.settingsGroupTitle}>
        Question {safeIndex + 1} of {value.questions.length}
      </p>
      <div className={s.field}>
        <label>Stem</label>
        <textarea
          value={question.stem}
          onChange={(e) => updateQuestion({ stem: e.target.value })}
          onFocus={() => onFocusField?.(`question.${safeIndex}.stem`)}
          onBlur={onBlurField}
        />
      </div>
      {question.options.map((option, optionIndex) => (
        <div key={option.id || `opt-${optionIndex}`} className={s.field}>
          <label>
            Option {option.id}
            <span className={s.inlineCheck}>
              <input
                type="radio"
                name={`correct-${safeIndex}`}
                checked={question.correctOptionId === option.id}
                onChange={() => updateQuestion({ correctOptionId: option.id })}
              />
              Correct
            </span>
          </label>
          <input
            type="text"
            value={option.text}
            onChange={(e) =>
              updateQuestion({
                options: question.options.map((opt, oi) =>
                  oi === optionIndex ? { ...opt, text: e.target.value } : opt,
                ),
              })
            }
            onFocus={() => onFocusField?.(`question.${safeIndex}.option.${optionIndex}`)}
            onBlur={onBlurField}
          />
        </div>
      ))}
      <div className={s.field}>
        <label>Rationale</label>
        <textarea
          value={question.rationale}
          onChange={(e) => updateQuestion({ rationale: e.target.value })}
          onFocus={() => onFocusField?.(`question.${safeIndex}.rationale`)}
          onBlur={onBlurField}
        />
      </div>
      <p className={s.imageHint}>Move to another question in the preview to edit it here.</p>
    </div>
  )
}

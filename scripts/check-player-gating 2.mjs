/**
 * Behaviour lock for the course player foundation: lib/player/gating.ts (what a learner can open)
 * and lib/player/adapters.ts (how both content sources become one model).
 * Run: node scripts/check-player-gating.mjs
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('package.json'))
let createJiti
try {
  ({ createJiti } = await import(require.resolve('jiti', { paths: [path.resolve('node_modules/.pnpm/jiti@2.5.1/node_modules')] })))
} catch {
  console.error('needs jiti (installed transitively by tailwind): pnpm add -D jiti')
  process.exit(1)
}
const jiti = createJiti(import.meta.url, { alias: { '@': path.resolve('.') } })
const g = await jiti.import(path.resolve('lib/player/gating.ts'))
const gnps = await jiti.import(path.resolve('lib/gnps/ethtl115.ts'))

// 1. GNPS: every step of the pathway counts towards progress (nothing is optional).
const gnpsOrder = gnps.buildEthtl115ProgressionOrder()
assert.deepEqual(g.getRequiredProgressionOrder(gnpsOrder), gnpsOrder, 'GNPS pathway is fully required')
assert.deepEqual(g.getGnpsPathwayOrder(gnpsOrder), gnpsOrder, 'GNPS pathway is shown in full')

// 2. General courses: flashcards and practice questions never block progress.
const order = ['t1-notes', 't1-flashcards', 't1-slides', 't1-quiz', 't1-practice-q', 't2-notes']
assert.deepEqual(g.getRequiredProgressionOrder(order), ['t1-notes', 't1-slides', 't1-quiz', 't2-notes'])
assert.equal(g.isFlashcardsPageId('t1-flashcards'), true)
assert.equal(g.isPracticeQPageId('t1-practice-q'), true)

// 3. Sequential unlock, skipping optional pages.
const opts = { structure: { topics: [] }, courseId: 1, nclexExtendedApproved: false }
assert.equal(g.isUnlocked('t1-notes', new Set(), order, opts), true, 'first page is open')
assert.equal(g.isUnlocked('t1-slides', new Set(), order, opts), false, 'later page is locked')
assert.equal(g.isUnlocked('t1-slides', new Set(['t1-notes']), order, opts), true, 'opens once the previous required page is done')
assert.equal(g.isUnlocked('t1-quiz', new Set(['t1-notes', 't1-slides']), order, opts), true, 'skipped flashcards do not block')
assert.equal(g.isUnlocked('t1-quiz', new Set(), order, { ...opts, forceFullyUnlocked: true }), true, 'trainer view bypasses gating')

// 4. NGN opens with its topic's slides, not after the quiz.
assert.equal(g.isUnlocked('t1-ngn', new Set(), order, opts), false)
assert.equal(g.isUnlocked('t1-ngn', new Set(['t1-slides']), order, opts), true)

// 5. NCLEX: paid stage caps modules, and modules past the open set need approval.
const topics = Array.from({ length: 12 }, (_, i) => ({ id: `topic-${i + 1}`, title: `Topic ${i + 1}` }))
const structure = { topics }
const nclex = { structure, courseId: g.NCLEX_COURSE_ID, nclexExtendedApproved: false }
const lateId = 'topic-11-quiz'
const lateIdx = topics.findIndex((t) => lateId.startsWith(t.id))
if (lateIdx >= g.NCLEX_OPEN_MODULES_COUNT) {
  assert.equal(g.isUnlocked(lateId, new Set(), [lateId], nclex), false, 'module past the open set needs approval')
  assert.equal(g.isUnlocked(lateId, new Set(), [lateId], { ...nclex, nclexExtendedApproved: true }), true, 'approval opens it')
  assert.equal(g.isUnlocked(lateId, new Set(), [lateId], { ...nclex, nclexPaidMaxTopicIdx: 2 }), false, 'above the paid stage stays locked')
}

// 6. Legacy saved progress still counts after notes were split per section.
const noteOrder = ['student-learning-note-0', 'student-learning-note-1', 't1-quiz']
const migrated = g.normalizeSavedSectionIdsToProgression(['student-learning-note'], noteOrder)
assert.ok(migrated.has('student-learning-note-0') && migrated.has('student-learning-note-1'), 'legacy note id covers indexed notes')

const adapters = await jiti.import(path.resolve('lib/player/adapters.ts'))
const model = await jiti.import(path.resolve('lib/player/model.ts'))
const structureLib = await jiti.import(path.resolve('lib/types/course-structure.ts'))

// 7. GNPS adapter: 3 levels, 4 sections of 4 activities, 5 cases and 8 decisions per level.
const gnpsModel = adapters.buildGnpsModel({ courseId: 201, courseCode: 'ETHTL115', title: 'ETHTL115' })
assert.equal(gnpsModel.levels.length, 3)
for (const level of gnpsModel.levels) {
  assert.equal(level.sections.length, 4, 'four sections per level')
  for (const section of level.sections) assert.deepEqual(section.activities.map((a) => a.kind), ['notes', 'video', 'flashcards', 'quiz'])
  assert.equal(level.extras.filter((a) => a.kind === 'case-study').length, 5)
  assert.equal(level.extras.filter((a) => a.kind === 'decision').length, 8)
}
assert.equal(gnpsModel.levels[1].lead.length, 1, 'levels 2+ open with an intro video')
assert.equal(gnpsModel.levels[0].lead.length, 0, 'level 1 has no intro video')
assert.ok(model.flattenActivities(gnpsModel).every((a) => !a.optional), 'every GNPS step counts')

// The model must present the canonical order, never reorder it.
const flatGnps = model.flattenActivities(gnpsModel).map((a) => a.id)
const inOrder = (ids, order) => { const idx = ids.map((id) => order.indexOf(id)).filter((i) => i >= 0); return idx.every((v, i, arr) => i === 0 || arr[i - 1] < v) }
assert.ok(inOrder(flatGnps, gnpsOrder), 'GNPS model follows the progression order')
const missing = gnpsOrder.filter((id) => !flatGnps.includes(id) && !id.endsWith('-home'))
assert.deepEqual(missing, [], 'every GNPS pathway page appears in the model')

// 8. Standard adapter: topics become sections; notes/overview lead; case study trails.
const stdStructure = structureLib.DEFAULT_COURSE_STRUCTURE
const stdOrder = structureLib.getProgressionOrder(stdStructure)
const stdModel = adapters.buildStandardModel({ courseId: 7, courseCode: 'BSBCRT511', title: 'Critical thinking', structure: stdStructure, progressionOrder: stdOrder, contentFolder: 'BSBCRT511' })
assert.equal(stdModel.levels.length, 1, 'a general course is one level')
assert.deepEqual(stdModel.levels[0].lead.map((a) => a.id), ['student-learning-note', 'program-overview'])
assert.deepEqual(stdModel.levels[0].sections.map((s) => s.id), stdStructure.topics.map((t) => t.id))
assert.deepEqual(stdModel.levels[0].sections[0].activities.map((a) => a.kind), ['slides', 'practice-q', 'quiz'])
assert.deepEqual(stdModel.levels[0].extras.map((a) => a.id), ['course-case-study'])
assert.deepEqual(model.flattenActivities(stdModel).map((a) => a.id), stdOrder, 'standard model reproduces the order exactly')
assert.deepEqual(model.requiredActivities(stdModel).map((a) => a.id), g.getRequiredProgressionOrder(stdOrder), 'optional flags match the gating rules')

const prog = await jiti.import(path.resolve('lib/player/progression.ts'))

// 9. Progression pipeline: base order, empty-slide filtering, NCLEX extras, orientation.
const progInput = {
  structure: stdStructure,
  notesList: [],
  topicSubsections: [[], []],
  learningNotePageIds: ['student-learning-note'],
  hasNotesInSections: false,
  includeTopicVideoAndAudio: false,
  isNclexExamOnly: false,
  isNclexFull: false,
  isNclexAdaptiveShell: false,
  slidesManifest: { hasManifest: false, isLoading: false, segmentByFolder: {} },
}
const base = prog.buildStandardProgressionOrder(progInput)
assert.deepEqual(base, structureLib.getProgressionOrderWithPracticeQSubsections(stdStructure, [[], []], ['student-learning-note'], { includeTopicVideoAndAudio: false, examPracticeOnly: false }), 'base order unchanged')

// Slide pages whose manifest segment has no files are dropped (avoids probing missing images).
const filtered = prog.buildStandardProgressionOrder({ ...progInput, slidesManifest: { hasManifest: true, isLoading: false, segmentByFolder: {} } })
assert.ok(!filtered.some((id) => id.endsWith('-slides') || id === 'program-overview'), 'empty slide pages removed')
assert.ok(filtered.includes('topic-1-quiz'), 'non-slide pages kept')

// Full NCLEX adds an NGN page after each topic quiz.
const withNgn = prog.buildStandardProgressionOrder({ ...progInput, isNclexFull: true })
assert.equal(withNgn.indexOf('topic-1-ngn'), withNgn.indexOf('topic-1-quiz') + 1, 'NGN follows its topic quiz')

// Orientation is prepended once, only when enabled.
const oriented = prog.withNclexOrientation(base, ['nclex-orientation', 'nclex-orientation-1-video'], true, true)
assert.deepEqual(oriented.slice(0, 2), ['nclex-orientation', 'nclex-orientation-1-video'])
assert.deepEqual(prog.withNclexOrientation(base, ['nclex-orientation'], false, true), base, 'disabled leaves the order alone')
assert.deepEqual(prog.withNclexOrientation(oriented, ['nclex-orientation'], true, true).filter((id) => id === 'nclex-orientation').length, 1, 'no duplicates')

// GNPS case studies and decision prompts are looked up by 1-based index into the level pack, so a
// pack with fewer entries than the model claims would render a blank screen.
const ethtl = await jiti.import(path.resolve('lib/gnps/ethtl115.ts'))
for (const level of [1, 2, 3]) {
  const pack = ethtl.getEthtl115Pack(level, 'ETHTL115')
  const cases = model.flattenActivities(gnpsModel).filter((a) => a.kind === 'case-study' && a.source.level === level)
  const decisions = model.flattenActivities(gnpsModel).filter((a) => a.kind === 'decision' && a.source.level === level)
  for (const a of cases) {
    assert.ok(pack.cases.cases[a.source.index - 1], `level ${level} has no case at index ${a.source.index} (${a.id})`)
  }
  for (const a of decisions) {
    assert.ok(
      pack.decisions.decisions[a.source.index - 1],
      `level ${level} has no decision at index ${a.source.index} (${a.id})`
    )
  }
  assert.ok(cases.length > 0 && decisions.length > 0, `level ${level} has cases and decisions`)
}

// Every activity the adapters can produce needs a screen, or a paying learner hits the
// "still being moved to the new player" placeholder.
const RENDERED_KINDS = new Set([
  'notes', 'video', 'slides', 'overview', 'flashcards', 'quiz', 'practice-q', 'case-study', 'decision', 'ngn',
])
const unrendered = [...model.flattenActivities(gnpsModel), ...model.flattenActivities(stdModel)]
  .filter((a) => !RENDERED_KINDS.has(a.kind))
  .map((a) => a.id + ' (' + a.kind + ')')
assert.deepEqual(unrendered, [], 'activities with no player screen: ' + unrendered.join(', '))

console.log('player checks: all passed', { gnpsPathwaySteps: gnpsOrder.length, gnpsActivities: flatGnps.length, standardActivities: stdOrder.length })

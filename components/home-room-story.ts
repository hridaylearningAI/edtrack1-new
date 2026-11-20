/** Room positions use metres: X across the room, Z toward its open front. */
export const ROOM_CHAPTERS = [
  { label: 'The connected campus', eyebrow: 'A place for everything. One place to work.', title: 'Your institution.\nFinally connected.', description: 'Students, learning and everyday operations — working together in one system. Step inside and see how.', benefit: 'Explore the room', color: '#245ac6', preview: 'workspace', point: [-2.5, .05], look: [-2.5, -2], connection: 'One workspace for your whole institution.' },
  { label: 'CRM & enquiries', eyebrow: '01 / A shared starting point', title: 'Every enquiry.\nOne clear pipeline.', description: 'Follow leads from first contact through to enrolment. Give admissions a shared board instead of scattered inboxes.', benefit: 'Enquiry → contact → enrolment', color: '#245ac6', preview: 'students', point: [-2.5, -.8], look: [-2.5, -2], connection: 'An enquiry connects the learner to their campus journey.' },
  { label: 'Scheduling & delivery', eyebrow: '02 / Turn enrolment into progress', title: 'Learning with\na clear next step.', description: 'Plan sessions, rooms and trainers in one timetable. Keep delivery connected to the learners already on the record.', benefit: 'Sessions → rooms → trainers', color: '#208064', preview: 'learning', point: [0, -.8], look: [0, -2], connection: 'Scheduled delivery becomes visible across your team.' },
  { label: 'Insight analytics', eyebrow: '03 / See what needs attention', title: 'The details.\nThe bigger picture.', description: 'Follow enquiry, enrolment, learning and completion signals in one observatory. Spot risk early without leaving the campus workspace.', benefit: 'Journey → trends → health', color: '#c44b37', preview: 'fees', point: [2.5, -.8], look: [2.5, -2], connection: 'Operational insight stays beside student administration.' },
  { label: 'Platform map', eyebrow: '04 / A workspace for every role', title: 'Different roles.\nShared direction.', description: 'Open the connected campus map. Jump into the module each role needs without losing the whole institution view.', benefit: 'Students · trainers · admins · partners', color: '#245ac6', preview: 'workspace', point: [2.5, 1.25], look: [3.55, 1.25], connection: 'Role-based access connects people to the right information.' },
  { label: 'Resource management', eyebrow: '05 / Keep the campus in view', title: 'Rooms, seats,\nand everything inside.', description: 'Manage classrooms, occupancy, boards, fans and kit lists in one floor plan — with who is teaching and who is present.', benefit: 'Spaces → assets → attendance', color: '#208064', preview: 'records', point: [-2.5, 1.25], look: [-3.4, 1.25], connection: 'Physical campus resources stay connected to the schedule.' },
  { label: 'All together', eyebrow: 'Your institution. All in one.', title: 'A whole system.\nWorking as one.', description: 'You’ve seen how the pieces fit. Now explore the EdTrack demo and find the workspace your institution needs.', benefit: 'Learn. Manage. Comply. All in One.', color: '#245ac6', preview: 'workspace', point: [0, 1.25], look: [0, -2], connection: 'One connected home for your institution.' },
] as const

export type RoomDriver = { progress: number; render?: () => void }

/** Deterministic, reversible movement. Every segment stays inside the open aisle. */
export function getRoomJourney(progress: number) {
  const value = Math.max(0, Math.min(6.95, progress))
  const chapter = Math.min(6, Math.floor(value))
  const local = value - chapter
  const previous = ROOM_CHAPTERS[Math.max(0, chapter - 1)]
  const current = ROOM_CHAPTERS[chapter]
  const t = Math.max(0, Math.min(1, local / .48))
  const travel = chapter === 0 ? 1 : t * t * (3 - 2 * t)
  const dx = current.point[0] - previous.point[0]
  const dz = current.point[1] - previous.point[1]
  return { chapter, local, current, travel, dx, dz,
    x: previous.point[0] + dx * travel,
    z: previous.point[1] + dz * travel }
}

export type RoomVector = readonly [number, number, number]
const easeRoom = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
const mixRoom = (a: RoomVector, b: RoomVector, t: number): RoomVector => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Screen-facing eye positions, kept in the aisle rather than inside the furniture. */
export const ROOM_VIEWS: readonly { eye: RoomVector; screen: RoomVector }[] = [
  { eye: [-2.37, 1.65, -.8], screen: [-2.37, 1.65, -2.287] },
  { eye: [-2.37, 1.65, -.8], screen: [-2.37, 1.65, -2.287] },
  { eye: [.13, 1.65, -.8], screen: [.13, 1.65, -2.287] },
  { eye: [2.63, 1.65, -.8], screen: [2.63, 1.65, -2.287] },
  { eye: [2.5, 1.7, 2.25], screen: [3.615, 1.7, 1.135] },
  { eye: [-2.05, 1.65, 1.2], screen: [-3.527, 1.65, 1.2] },
]

/** One reversible camera track: establish → enter → visit screens → exit → roof. */
export function getRoomCamera(progress: number) {
  const p = Math.max(0, Math.min(6.95, progress))
  const chapter = Math.min(6, Math.floor(p))
  const overview: RoomVector = [11.2, 9.8, 13.2]
  const overviewTarget: RoomVector = [0, 1, 0]
  const entry = easeRoom((p - .25) / 1.13)
  const exit = easeRoom((p - 6) / .53)
  const immersion = entry * (1 - exit)
  let eye: RoomVector
  let target: RoomVector
  if (p < 1.38) {
    // Enter through the open front, above the aisle, then settle at eye height.
    const entrance: RoomVector = [0, 3.8, 4.8]
    eye = entry < .5 ? mixRoom(overview, entrance, easeRoom(entry * 2)) : mixRoom(entrance, ROOM_VIEWS[1].eye, easeRoom((entry - .5) * 2))
    target = mixRoom(overviewTarget, ROOM_VIEWS[1].screen, entry)
  } else if (chapter < 6) {
    const previous = ROOM_VIEWS[Math.max(1, chapter - 1)], next = ROOM_VIEWS[chapter]
    const t = chapter === 1 ? 1 : easeRoom((p - chapter) / .52)
    eye = mixRoom(previous.eye, next.eye, t)
    // Interpolate heading, rather than look-at points that can cross the camera.
    const a = Math.atan2(previous.screen[0] - previous.eye[0], previous.screen[2] - previous.eye[2])
    const b = Math.atan2(next.screen[0] - next.eye[0], next.screen[2] - next.eye[2])
    const turn = Math.atan2(Math.sin(b - a), Math.cos(b - a))
    const yaw = a + turn * t
    target = [eye[0] + Math.sin(yaw) * 1.487, eye[1], eye[2] + Math.cos(yaw) * 1.487]
  } else {
    eye = mixRoom(ROOM_VIEWS[5].eye, overview, exit)
    target = mixRoom(ROOM_VIEWS[5].screen, overviewTarget, exit)
  }
  return { eye, target, immersion, roof: easeRoom((p - 6.58) / .34), chapter }
}

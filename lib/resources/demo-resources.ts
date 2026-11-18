export type CampusFloor = 'ground' | 'level-1' | 'level-2' | 'annex'

export type RoomKind = 'classroom' | 'lab' | 'studio' | 'hall' | 'library' | 'office'

export type OccupancyStatus = 'free' | 'occupied' | 'reserved' | 'maintenance'

export type AssetCategory =
  | 'seating'
  | 'board'
  | 'av'
  | 'climate'
  | 'furniture'
  | 'lab'
  | 'safety'

export type AssetCondition = 'good' | 'fair' | 'service'

export type RoomAsset = {
  id: string
  name: string
  category: AssetCategory
  qty: number
  condition: AssetCondition
  note?: string
}

export type RoomBooking = {
  title: string
  trainer: string
  cohort?: string
  startsAt: string
  endsAt: string
  durationLabel: string
}

export type AttendanceStudent = {
  id: string
  name: string
  code: string
}

export type RoomAttendance = {
  present: AttendanceStudent[]
  missing: AttendanceStudent[]
}

export type CampusRoom = {
  id: string
  code: string
  name: string
  floor: CampusFloor
  kind: RoomKind
  capacity: number
  occupiedSeats: number
  occupancy: OccupancyStatus
  nowLabel: string
  areaSqm: number
  assets: RoomAsset[]
  /** Who is using the room right now (or holding a reservation). */
  currentSession?: RoomBooking | null
  /** Next schedule lined up after the current block. */
  nextSession?: RoomBooking | null
  /** Live class roll when a teaching session is underway. */
  attendance?: RoomAttendance | null
}

export type ResourceKpis = {
  roomsTotal: number
  roomsFree: number
  seatsTotal: number
  seatsFree: number
  assetsOk: number
  assetsService: number
  occupancyPct: number
}

export const CAMPUS_FLOORS: { id: CampusFloor; label: string }[] = [
  { id: 'ground', label: 'Ground' },
  { id: 'level-1', label: 'Level 1' },
  { id: 'level-2', label: 'Level 2' },
  { id: 'annex', label: 'Annex' },
]

export const ROOM_KINDS: { id: RoomKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All spaces' },
  { id: 'classroom', label: 'Classrooms' },
  { id: 'lab', label: 'Labs' },
  { id: 'studio', label: 'Studios' },
  { id: 'hall', label: 'Halls' },
  { id: 'library', label: 'Library' },
  { id: 'office', label: 'Offices' },
]

export const ASSET_CATEGORIES: { id: AssetCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All assets' },
  { id: 'seating', label: 'Seats' },
  { id: 'board', label: 'Boards' },
  { id: 'av', label: 'AV' },
  { id: 'climate', label: 'Climate' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'lab', label: 'Lab gear' },
  { id: 'safety', label: 'Safety' },
]

export const OCCUPANCY_LABEL: Record<OccupancyStatus, string> = {
  free: 'Unoccupied',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Maintenance',
}

function assets(
  items: Array<[string, string, AssetCategory, number, AssetCondition, string?]>
): RoomAsset[] {
  return items.map(([id, name, category, qty, condition, note]) => ({
    id,
    name,
    category,
    qty,
    condition,
    note,
  }))
}

function students(
  items: Array<[string, string, string]>
): AttendanceStudent[] {
  return items.map(([id, name, code]) => ({ id, name, code }))
}

function attendance(
  present: Array<[string, string, string]>,
  missing: Array<[string, string, string]> = []
): RoomAttendance {
  return { present: students(present), missing: students(missing) }
}

export function attendanceCounts(room: CampusRoom): {
  present: number
  missing: number
  expected: number
} | null {
  if (!room.attendance) return null
  const present = room.attendance.present.length
  const missing = room.attendance.missing.length
  return { present, missing, expected: present + missing }
}

export function sessionSummary(room: CampusRoom): string {
  const session = room.currentSession
  if (!session) return room.nowLabel
  const who = session.trainer
  return `${session.title} · ${who} · until ${session.endsAt}`
}

export const CAMPUS_ROOMS: CampusRoom[] = [
  {
    id: 'r1',
    code: 'G-01',
    name: 'Room 1',
    floor: 'ground',
    kind: 'classroom',
    capacity: 32,
    occupiedSeats: 28,
    occupancy: 'occupied',
    nowLabel: 'NCLEX cohort · until 11:30',
    areaSqm: 48,
    currentSession: {
      title: 'NCLEX Pharmacology',
      trainer: 'Dr Sarah Mitchell',
      cohort: 'NCLEX-RN · Cohort B',
      startsAt: '09:00',
      endsAt: '11:30',
      durationLabel: '2h 30m',
    },
    nextSession: {
      title: 'NCLEX Case Review',
      trainer: 'James Whitfield',
      cohort: 'NCLEX-RN · Cohort B',
      startsAt: '12:30',
      endsAt: '14:00',
      durationLabel: '1h 30m',
    },
    attendance: attendance(
      [
        ['s1', 'Aisha Khan', 'ST-214'],
        ['s2', 'Ben Carter', 'ST-218'],
        ['s3', 'Chloe Nguyen', 'ST-221'],
        ['s4', 'Daniel Okonkwo', 'ST-225'],
        ['s5', 'Elena Vasquez', 'ST-229'],
        ['s6', 'Farah Ali', 'ST-233'],
        ['s7', 'Grace Liu', 'ST-237'],
        ['s8', 'Hassan Rahman', 'ST-241'],
        ['s9', 'Isla Bennett', 'ST-244'],
        ['s10', 'Jordan Miles', 'ST-248'],
        ['s11', 'Keisha Brown', 'ST-252'],
        ['s12', 'Liam Okafor', 'ST-256'],
        ['s13', 'Maya Patel', 'ST-260'],
        ['s14', 'Noah Singh', 'ST-264'],
        ['s15', 'Olivia Chen', 'ST-268'],
        ['s16', 'Priya Nambiar', 'ST-272'],
        ['s17', 'Quinn Adler', 'ST-276'],
        ['s18', 'Ravi Mehta', 'ST-280'],
        ['s19', 'Sofia Rossi', 'ST-284'],
        ['s20', 'Tom Hughes', 'ST-288'],
        ['s21', 'Uma Desai', 'ST-292'],
        ['s22', 'Victor Lang', 'ST-296'],
        ['s23', 'Wendy Park', 'ST-300'],
        ['s24', 'Xavier Cole', 'ST-304'],
        ['s25', 'Yara Haddad', 'ST-308'],
        ['s26', 'Zane Brooks', 'ST-312'],
        ['s27', 'Amelia Crowe', 'ST-316'],
        ['s28', 'Blake Turner', 'ST-320'],
      ],
      [
        ['m1', 'Camille Ortiz', 'ST-324'],
        ['m2', 'Dev Sharma', 'ST-328'],
        ['m3', 'Erin Walsh', 'ST-332'],
        ['m4', 'Felix Grant', 'ST-336'],
      ]
    ),
    assets: assets([
      ['r1-s', 'Student desks', 'seating', 32, 'good'],
      ['r1-c', 'Trainer chair', 'seating', 1, 'good'],
      ['r1-b', 'Whiteboard', 'board', 2, 'good'],
      ['r1-bb', 'Chalkboard', 'board', 1, 'fair', 'Left panel scuffed'],
      ['r1-p', 'Ceiling projector', 'av', 1, 'good'],
      ['r1-sp', 'Wall speakers', 'av', 2, 'good'],
      ['r1-f', 'Ceiling fans', 'climate', 4, 'good'],
      ['r1-ac', 'Split AC', 'climate', 2, 'fair'],
      ['r1-lt', 'LED tube lights', 'furniture', 8, 'good'],
      ['r1-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'r3',
    code: 'G-03',
    name: 'Room 3',
    floor: 'ground',
    kind: 'classroom',
    capacity: 28,
    occupiedSeats: 0,
    occupancy: 'free',
    nowLabel: 'Available all morning',
    areaSqm: 42,
    currentSession: null,
    nextSession: {
      title: 'Diploma of Nursing · Anatomy',
      trainer: 'Priya Nambiar',
      cohort: 'DoN · Year 1',
      startsAt: '13:00',
      endsAt: '15:00',
      durationLabel: '2h',
    },
    attendance: null,
    assets: assets([
      ['r3-s', 'Student desks', 'seating', 28, 'good'],
      ['r3-b', 'Interactive whiteboard', 'board', 1, 'good'],
      ['r3-p', 'Short-throw projector', 'av', 1, 'good'],
      ['r3-f', 'Ceiling fans', 'climate', 3, 'good'],
      ['r3-ac', 'Cassette AC', 'climate', 1, 'good'],
      ['r3-w', 'Window blinds', 'furniture', 4, 'fair'],
      ['r3-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'lib',
    code: 'G-L1',
    name: 'Library',
    floor: 'ground',
    kind: 'library',
    capacity: 64,
    occupiedSeats: 41,
    occupancy: 'occupied',
    nowLabel: 'Study hall open',
    areaSqm: 120,
    currentSession: {
      title: 'Open study hall',
      trainer: 'Library desk · Amira Said',
      cohort: 'Self-directed',
      startsAt: '08:00',
      endsAt: '17:00',
      durationLabel: '9h',
    },
    nextSession: {
      title: 'Research skills workshop',
      trainer: 'David Park',
      cohort: 'GNPS · mixed',
      startsAt: '17:30',
      endsAt: '18:30',
      durationLabel: '1h',
    },
    attendance: null,
    assets: assets([
      ['lib-s', 'Reading seats', 'seating', 64, 'good'],
      ['lib-t', 'Study tables', 'furniture', 16, 'good'],
      ['lib-sh', 'Bookshelves', 'furniture', 24, 'good'],
      ['lib-pc', 'Catalogue PCs', 'av', 4, 'fair'],
      ['lib-f', 'Ceiling fans', 'climate', 8, 'good'],
      ['lib-ac', 'Central AC zones', 'climate', 2, 'good'],
      ['lib-ex', 'Fire extinguishers', 'safety', 3, 'good'],
      ['lib-exi', 'Exit signage', 'safety', 4, 'good'],
    ]),
  },
  {
    id: 'lab2',
    code: '1-L2',
    name: 'Lab 2',
    floor: 'level-1',
    kind: 'lab',
    capacity: 24,
    occupiedSeats: 20,
    occupancy: 'occupied',
    nowLabel: 'Clinical skills · until 13:00',
    areaSqm: 56,
    currentSession: {
      title: 'Clinical skills lab',
      trainer: 'Hassan Rahman',
      cohort: 'DoN · Year 2',
      startsAt: '10:00',
      endsAt: '13:00',
      durationLabel: '3h',
    },
    nextSession: {
      title: 'Medication admin practical',
      trainer: 'Amelia Crowe',
      cohort: 'DoN · Year 2',
      startsAt: '14:00',
      endsAt: '16:00',
      durationLabel: '2h',
    },
    attendance: attendance(
      [
        ['l1', 'Ava Morgan', 'ST-401'],
        ['l2', 'Bill Torres', 'ST-405'],
        ['l3', 'Cara Singh', 'ST-409'],
        ['l4', 'Diego Ramos', 'ST-413'],
        ['l5', 'Eva Holm', 'ST-417'],
        ['l6', 'Finn Gallagher', 'ST-421'],
        ['l7', 'Gina Park', 'ST-425'],
        ['l8', 'Hugo Berg', 'ST-429'],
        ['l9', 'Ivy Chen', 'ST-433'],
        ['l10', 'Jake Wilson', 'ST-437'],
        ['l11', 'Kira Nair', 'ST-441'],
        ['l12', 'Leo Santos', 'ST-445'],
        ['l13', 'Mina Cho', 'ST-449'],
        ['l14', 'Ned Quinn', 'ST-453'],
        ['l15', 'Opal Reid', 'ST-457'],
        ['l16', 'Paul Kim', 'ST-461'],
        ['l17', 'Rita Bose', 'ST-465'],
        ['l18', 'Sam Ortiz', 'ST-469'],
        ['l19', 'Tina Wu', 'ST-473'],
        ['l20', 'Uri Mandel', 'ST-477'],
      ],
      [
        ['lm1', 'Vera Costa', 'ST-481'],
        ['lm2', 'Will Hart', 'ST-485'],
        ['lm3', 'Xena Price', 'ST-489'],
        ['lm4', 'Yves Dupont', 'ST-493'],
      ]
    ),
    assets: assets([
      ['lab-s', 'Lab stools', 'seating', 24, 'good'],
      ['lab-b', 'Bench stations', 'lab', 12, 'good'],
      ['lab-man', 'Nursing manikins', 'lab', 6, 'good'],
      ['lab-bp', 'BP monitors', 'lab', 8, 'fair'],
      ['lab-wb', 'Whiteboard', 'board', 1, 'good'],
      ['lab-f', 'Ceiling fans', 'climate', 4, 'service', 'Bay 3 rattling'],
      ['lab-ac', 'Split AC', 'climate', 2, 'good'],
      ['lab-sink', 'Handwash stations', 'lab', 4, 'good'],
      ['lab-ex', 'Fire blanket', 'safety', 2, 'good'],
      ['lab-fa', 'First-aid kit', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'studio-a',
    code: '1-SA',
    name: 'Studio A',
    floor: 'level-1',
    kind: 'studio',
    capacity: 18,
    occupiedSeats: 0,
    occupancy: 'reserved',
    nowLabel: 'Reserved · mock viva 14:00',
    areaSqm: 36,
    currentSession: {
      title: 'Mock viva recording',
      trainer: 'James Whitfield',
      cohort: 'NCLEX-RN · Cohort A',
      startsAt: '14:00',
      endsAt: '16:00',
      durationLabel: '2h',
    },
    nextSession: {
      title: 'Trainer briefing',
      trainer: 'Dr Sarah Mitchell',
      startsAt: '16:30',
      endsAt: '17:00',
      durationLabel: '30m',
    },
    attendance: null,
    assets: assets([
      ['sa-s', 'Soft chairs', 'seating', 18, 'good'],
      ['sa-cam', 'Recording camera', 'av', 2, 'good'],
      ['sa-mic', 'Lavalier mics', 'av', 4, 'good'],
      ['sa-light', 'Softbox lights', 'av', 3, 'fair'],
      ['sa-b', 'Green screen', 'board', 1, 'good'],
      ['sa-ac', 'Quiet AC', 'climate', 1, 'good'],
      ['sa-f', 'Ceiling fans', 'climate', 2, 'good'],
    ]),
  },
  {
    id: 'studio-b',
    code: '1-SB',
    name: 'Studio B',
    floor: 'level-1',
    kind: 'studio',
    capacity: 16,
    occupiedSeats: 0,
    occupancy: 'maintenance',
    nowLabel: 'AV rack service',
    areaSqm: 34,
    currentSession: {
      title: 'AV rack service',
      trainer: 'Facilities · Ken Ito',
      startsAt: '08:30',
      endsAt: '12:00',
      durationLabel: '3h 30m',
    },
    nextSession: {
      title: 'Soft-skills film block',
      trainer: 'Amelia Crowe',
      cohort: 'GNPS Stage 1',
      startsAt: '13:30',
      endsAt: '15:30',
      durationLabel: '2h',
    },
    attendance: null,
    assets: assets([
      ['sb-s', 'Soft chairs', 'seating', 16, 'good'],
      ['sb-cam', 'Recording camera', 'av', 1, 'service', 'Sensor dirty'],
      ['sb-sw', 'AV switcher', 'av', 1, 'service'],
      ['sb-b', 'Whiteboard', 'board', 1, 'good'],
      ['sb-ac', 'Quiet AC', 'climate', 1, 'fair'],
      ['sb-f', 'Ceiling fans', 'climate', 2, 'good'],
    ]),
  },
  {
    id: 'hall2',
    code: '2-H2',
    name: 'Hall 2',
    floor: 'level-2',
    kind: 'hall',
    capacity: 120,
    occupiedSeats: 0,
    occupancy: 'free',
    nowLabel: 'Open for booking',
    areaSqm: 210,
    currentSession: null,
    nextSession: {
      title: 'Campus induction',
      trainer: 'David Park',
      cohort: 'New enrolments',
      startsAt: '15:00',
      endsAt: '16:30',
      durationLabel: '1h 30m',
    },
    attendance: null,
    assets: assets([
      ['h2-s', 'Stackable chairs', 'seating', 120, 'good'],
      ['h2-st', 'Foldable tables', 'furniture', 20, 'good'],
      ['h2-p', 'Ceiling projectors', 'av', 2, 'good'],
      ['h2-scr', 'Motorised screen', 'av', 1, 'good'],
      ['h2-mic', 'Handheld mics', 'av', 4, 'fair'],
      ['h2-f', 'Ceiling fans', 'climate', 12, 'good'],
      ['h2-ac', 'AHU climate', 'climate', 1, 'good'],
      ['h2-b', 'Stage whiteboard', 'board', 1, 'good'],
      ['h2-ex', 'Fire extinguishers', 'safety', 4, 'good'],
      ['h2-exi', 'Exit lights', 'safety', 6, 'good'],
    ]),
  },
  {
    id: 'c201',
    code: '2-01',
    name: 'Classroom 201',
    floor: 'level-2',
    kind: 'classroom',
    capacity: 36,
    occupiedSeats: 12,
    occupancy: 'occupied',
    nowLabel: 'GNPS Stage 1 · until 12:15',
    areaSqm: 52,
    currentSession: {
      title: 'GNPS communication skills',
      trainer: 'Priya Nambiar',
      cohort: 'GNPS Stage 1',
      startsAt: '10:15',
      endsAt: '12:15',
      durationLabel: '2h',
    },
    nextSession: {
      title: 'IELTS listening drill',
      trainer: 'James Whitfield',
      cohort: 'IELTS Bridge',
      startsAt: '13:00',
      endsAt: '14:30',
      durationLabel: '1h 30m',
    },
    attendance: attendance(
      [
        ['g1', 'Anika Bose', 'ST-501'],
        ['g2', 'Bruno Silva', 'ST-505'],
        ['g3', 'Celia Hart', 'ST-509'],
        ['g4', 'Dinesh Rao', 'ST-513'],
        ['g5', 'Ella Frost', 'ST-517'],
        ['g6', 'Farid Noor', 'ST-521'],
        ['g7', 'Gina Lopez', 'ST-525'],
        ['g8', 'Henry Adeyemi', 'ST-529'],
        ['g9', 'Ines Moreau', 'ST-533'],
        ['g10', 'Jules Kim', 'ST-537'],
        ['g11', 'Kara Singh', 'ST-541'],
        ['g12', 'Luis Ortega', 'ST-545'],
      ],
      [
        ['gm1', 'Mei Tan', 'ST-549'],
        ['gm2', 'Nate Brooks', 'ST-553'],
        ['gm3', 'Omar Farouk', 'ST-557'],
      ]
    ),
    assets: assets([
      ['c201-s', 'Student desks', 'seating', 36, 'good'],
      ['c201-b', 'Dual whiteboard', 'board', 2, 'good'],
      ['c201-p', 'Projector', 'av', 1, 'fair', 'Lamp hours high'],
      ['c201-f', 'Ceiling fans', 'climate', 5, 'good'],
      ['c201-ac', 'Split AC', 'climate', 2, 'good'],
      ['c201-pod', 'Trainer podium', 'furniture', 1, 'good'],
      ['c201-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'c202',
    code: '2-02',
    name: 'Classroom 202',
    floor: 'level-2',
    kind: 'classroom',
    capacity: 30,
    occupiedSeats: 0,
    occupancy: 'free',
    nowLabel: 'Available · PM booked',
    areaSqm: 44,
    currentSession: null,
    nextSession: {
      title: 'Cert III care planning',
      trainer: 'Amelia Crowe',
      cohort: 'Cert III Individual Support',
      startsAt: '14:00',
      endsAt: '16:00',
      durationLabel: '2h',
    },
    attendance: null,
    assets: assets([
      ['c202-s', 'Student desks', 'seating', 30, 'good'],
      ['c202-b', 'Chalkboard', 'board', 1, 'fair'],
      ['c202-wb', 'Whiteboard', 'board', 1, 'good'],
      ['c202-tv', 'Wall display 65"', 'av', 1, 'good'],
      ['c202-f', 'Ceiling fans', 'climate', 4, 'fair'],
      ['c202-ac', 'Split AC', 'climate', 1, 'service', 'Not cooling bay A'],
      ['c202-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'annex-lab',
    code: 'A-L1',
    name: 'Annex Skills Lab',
    floor: 'annex',
    kind: 'lab',
    capacity: 20,
    occupiedSeats: 8,
    occupancy: 'occupied',
    nowLabel: 'OSCE practice',
    areaSqm: 48,
    currentSession: {
      title: 'OSCE practice stations',
      trainer: 'Hassan Rahman',
      cohort: 'DoN · Year 2',
      startsAt: '09:30',
      endsAt: '12:00',
      durationLabel: '2h 30m',
    },
    nextSession: null,
    attendance: attendance(
      [
        ['a1', 'Nina Volkov', 'ST-601'],
        ['a2', 'Owen Blake', 'ST-605'],
        ['a3', 'Pia Santos', 'ST-609'],
        ['a4', 'Quinn Hale', 'ST-613'],
        ['a5', 'Rosa Diaz', 'ST-617'],
        ['a6', 'Sean Murphy', 'ST-621'],
        ['a7', 'Tara Lee', 'ST-625'],
        ['a8', 'Umar Khan', 'ST-629'],
      ],
      [
        ['am1', 'Violet Ng', 'ST-633'],
        ['am2', 'Wade Cooper', 'ST-637'],
      ]
    ),
    assets: assets([
      ['al-s', 'Lab stools', 'seating', 20, 'good'],
      ['al-bed', 'Hospital beds', 'lab', 4, 'good'],
      ['al-man', 'CPR manikins', 'lab', 8, 'good'],
      ['al-b', 'Whiteboard', 'board', 1, 'good'],
      ['al-f', 'Ceiling fans', 'climate', 3, 'good'],
      ['al-ac', 'Split AC', 'climate', 2, 'good'],
      ['al-fa', 'First-aid kit', 'safety', 2, 'good'],
      ['al-ex', 'Fire extinguisher', 'safety', 2, 'good'],
    ]),
  },
  {
    id: 'annex-off',
    code: 'A-O1',
    name: 'Facilities Office',
    floor: 'annex',
    kind: 'office',
    capacity: 6,
    occupiedSeats: 3,
    occupancy: 'occupied',
    nowLabel: 'Staff on duty',
    areaSqm: 22,
    currentSession: {
      title: 'Facilities duty desk',
      trainer: 'Ken Ito · Maya Fox · Rina Sol',
      startsAt: '08:00',
      endsAt: '17:00',
      durationLabel: 'All day',
    },
    nextSession: null,
    attendance: null,
    assets: assets([
      ['ao-s', 'Workstations', 'seating', 6, 'good'],
      ['ao-pc', 'Desktop PCs', 'av', 4, 'good'],
      ['ao-print', 'Multifunction printer', 'av', 1, 'fair'],
      ['ao-f', 'Pedestal fan', 'climate', 1, 'good'],
      ['ao-ac', 'Split AC', 'climate', 1, 'good'],
      ['ao-cab', 'Asset lockers', 'furniture', 8, 'good'],
      ['ao-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
  {
    id: 'g-office',
    code: 'G-AD',
    name: 'Admin Bay',
    floor: 'ground',
    kind: 'office',
    capacity: 10,
    occupiedSeats: 7,
    occupancy: 'occupied',
    nowLabel: 'Enrolment desk open',
    areaSqm: 38,
    currentSession: {
      title: 'Enrolment & front desk',
      trainer: 'Admin team · Lila West',
      startsAt: '08:30',
      endsAt: '16:30',
      durationLabel: 'All day',
    },
    nextSession: {
      title: 'Partner walk-in clinic',
      trainer: 'Lila West',
      startsAt: '16:30',
      endsAt: '18:00',
      durationLabel: '1h 30m',
    },
    attendance: null,
    assets: assets([
      ['ga-s', 'Office chairs', 'seating', 10, 'good'],
      ['ga-d', 'Desks', 'furniture', 8, 'good'],
      ['ga-pc', 'Desktop PCs', 'av', 8, 'good'],
      ['ga-f', 'Ceiling fans', 'climate', 3, 'good'],
      ['ga-ac', 'Cassette AC', 'climate', 1, 'good'],
      ['ga-ex', 'Fire extinguisher', 'safety', 1, 'good'],
    ]),
  },
]

export function computeResourceKpis(rooms: CampusRoom[] = CAMPUS_ROOMS): ResourceKpis {
  const roomsFree = rooms.filter((r) => r.occupancy === 'free').length
  const seatsTotal = rooms.reduce((n, r) => n + r.capacity, 0)
  const seatsUsed = rooms.reduce((n, r) => n + r.occupiedSeats, 0)
  const allAssets = rooms.flatMap((r) => r.assets)
  const assetsService = allAssets.filter((a) => a.condition === 'service').length
  const assetsOk = allAssets.filter((a) => a.condition === 'good').length
  const occupiedOrReserved = rooms.filter(
    (r) => r.occupancy === 'occupied' || r.occupancy === 'reserved'
  ).length

  return {
    roomsTotal: rooms.length,
    roomsFree,
    seatsTotal,
    seatsFree: seatsTotal - seatsUsed,
    assetsOk,
    assetsService,
    occupancyPct: Math.round((occupiedOrReserved / Math.max(rooms.length, 1)) * 100),
  }
}

export function roomKindLabel(kind: RoomKind): string {
  switch (kind) {
    case 'classroom':
      return 'Classroom'
    case 'lab':
      return 'Lab'
    case 'studio':
      return 'Studio'
    case 'hall':
      return 'Hall'
    case 'library':
      return 'Library'
    case 'office':
      return 'Office'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function assetCategoryLabel(category: AssetCategory): string {
  switch (category) {
    case 'seating':
      return 'Seating'
    case 'board':
      return 'Boards'
    case 'av':
      return 'AV'
    case 'climate':
      return 'Climate'
    case 'furniture':
      return 'Furniture'
    case 'lab':
      return 'Lab gear'
    case 'safety':
      return 'Safety'
    default: {
      const _exhaustive: never = category
      return _exhaustive
    }
  }
}

export function conditionLabel(condition: AssetCondition): string {
  switch (condition) {
    case 'good':
      return 'Good'
    case 'fair':
      return 'Fair'
    case 'service':
      return 'Needs service'
    default: {
      const _exhaustive: never = condition
      return _exhaustive
    }
  }
}

export function seatFillPct(room: CampusRoom): number {
  if (room.capacity <= 0) return 0
  return Math.round((room.occupiedSeats / room.capacity) * 100)
}

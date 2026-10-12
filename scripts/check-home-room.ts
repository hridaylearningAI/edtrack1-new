import assert from 'node:assert/strict'
import { getRoomJourney, getRoomCamera, ROOM_VIEWS, ROOM_CHAPTERS } from '../components/home-room-story'

// Conservative floor footprints, including stools and the opening records drawer.
const furniture = [
  ...[-2.5, 0, 2.5].map(x => ({ name: `desk ${x}`, x0: x - 1.025, x1: x + 1.025, z0: -2.675, z1: -1.625 })),
  ...[-2.5, 0, 2.5].map(x => ({ name: `stool ${x}`, x0: x - .23, x1: x + .33, z0: -1.69, z1: -1.21 })),
  { name: 'portal', x0: 2.9, x1: 4.4, z0: .7, z1: 1.5 },
  { name: 'records with drawer open', x0: -3.85, x1: -2.87, z0: .3, z1: 2.1 },
  { name: 'entry bench', x0: -.85, x1: 1.15, z0: 2.4, z1: 2.9 },
]
const radius = .17
for (let i = 0; i <= 6950; i++) {
  const p = getRoomJourney(i / 1000)
  assert(p.x - radius > -4.15 && p.x + radius < 4.15 && p.z - radius > -3.1 && p.z + radius < 3.1, 'Guide leaves the room')
  for (const object of furniture) {
    const intersects = p.x + radius > object.x0 && p.x - radius < object.x1 && p.z + radius > object.z0 && p.z - radius < object.z1
    assert(!intersects, `Guide intersects ${object.name} at progress ${i / 1000}`)
  }
}
for (let chapter = 1; chapter < ROOM_CHAPTERS.length; chapter++) {
  const arrived = getRoomJourney(chapter + .8)
  assert(Math.abs(arrived.x - ROOM_CHAPTERS[chapter].point[0]) < 1e-8)
  assert(Math.abs(arrived.z - ROOM_CHAPTERS[chapter].point[1]) < 1e-8)
  // A boundary must not teleport the character when either scroll direction crosses it.
  const before = getRoomJourney(chapter - .000001), after = getRoomJourney(chapter + .000001)
  assert(Math.hypot(before.x - after.x, before.z - after.z) < .0001)
}
console.log('Room path: 6,951 samples clear of furniture; all arrivals and chapter boundaries continuous.')

for (let i = 0; i <= 6950; i++) {
  const progress = i / 1000, camera = getRoomCamera(progress)
  assert(camera.eye.every(Number.isFinite) && camera.target.every(Number.isFinite))
  assert(Math.hypot(...camera.eye.map((v, index) => v - camera.target[index])) > .5, 'Camera look direction collapses')
  if (progress >= 1.38 && progress <= 6) {
    assert(camera.eye[1] >= 1.65 && camera.eye[1] <= 1.7, 'Eye height is unstable')
    for (const object of furniture) {
      const [x, , z] = camera.eye
      const intersects = x + radius > object.x0 && x - radius < object.x1 && z + radius > object.z0 && z - radius < object.z1
      assert(!intersects, `Camera intersects ${object.name} at ${progress}`)
    }
  }
  if (i > 0) {
    const before = getRoomCamera(progress - .001)
    assert(Math.hypot(...camera.eye.map((v, index) => v - before.eye[index])) < .1, 'Camera teleports')
  }
}
for (let chapter = 1; chapter <= 5; chapter++) {
  const view = getRoomCamera(chapter + .8)
  assert(view.eye.every((value, axis) => Math.abs(value - ROOM_VIEWS[chapter].eye[axis]) < 1e-8), 'Reading stop is not settled')
  assert.equal(view.immersion, 1)
}
assert.equal(getRoomCamera(0).immersion, 0)
assert.equal(getRoomCamera(6.53).immersion, 0)
assert.equal(getRoomCamera(6.94).roof, 1)
console.log('Camera: 6,951 continuous poses, stable eye height, clear walking paths, all five settled screen views, roof after exit.')

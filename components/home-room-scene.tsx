'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ROOM_CHAPTERS, getRoomJourney, getRoomCamera, type RoomDriver } from './home-room-story'

type Props = { driver: MutableRefObject<RoomDriver>; onError: () => void; onScreenOpen: () => void }
const smooth = (t: number) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t) }

/** Furniture, guide and camera share a world and depth buffer. Scroll is the clock. */
export function HomeRoomScene({ driver, onError, onScreenOpen }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const errorCallback = useRef(onError)
  errorCallback.current = onError
  const openCallback = useRef(onScreenOpen)
  openCallback.current = onScreenOpen
  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) }
    catch { errorCallback.current(); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearColor(0x000000, 0)
    element.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const world = new THREE.Group()
    scene.add(world)
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100)
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
    let disposed = false
    let raf = 0
    let mobile = false

    const mat = (color: string, roughness = .6, metalness = 0) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness })
      materials.add(material); return material
    }
    const plaster = mat('#eeeae0', .86), white = mat('#fcfaf5', .58), edge = mat('#d4cfc4', .8)
    const oak = mat('#b68d61', .66), dark = mat('#242c31', .4, .2), metal = mat('#a8b0b3', .3, .75)
    const blue = mat('#2257ad', .4), green = mat('#3d7c65', .7), red = mat('#b94a39', .6)
    const screen = mat('#e7edf0', .32), paper = mat('#f8f4e9', .85)
    const lightMaterial = new THREE.MeshBasicMaterial({ color: '#fff7db' }); materials.add(lightMaterial)
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      geometries.add(geometry)
      const object = new THREE.Mesh(geometry, material)
      object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object
    }
    const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, radius = .025) => mesh(parent, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), material, x, y, z)
    const cylinder = (parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, h: number, material: THREE.Material) => mesh(parent, new THREE.CylinderGeometry(top, bottom, h, 24), material, x, y, z)
    const group = (x = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g); return g }
    function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return undefined
      draw(context)
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture); return texture
    }
    // Fine wood grain is deliberately quiet: one material palette, one light direction.
    oak.map = canvasTexture(256, 512, ctx => {
      ctx.fillStyle = '#bca17d'; ctx.fillRect(0, 0, 256, 512)
      for (let n = 0; n < 160; n++) {
        ctx.strokeStyle = `rgba(88,61,38,${.025 + (n % 5) * .008})`; ctx.lineWidth = .4 + n % 3
        ctx.beginPath(); ctx.moveTo(n * 1.7, 0); ctx.bezierCurveTo(n * 1.7 + 3, 140, n * 1.7 - 5, 340, n * 1.7, 512); ctx.stroke()
      }
    }) ?? null
    scene.add(new THREE.HemisphereLight('#eef5ff', '#b5a68c', 2.4))
    const sun = new THREE.DirectionalLight('#fff2dd', 4.5)
    sun.position.set(-3, 10, 6); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7
    sun.shadow.normalBias = .025; sun.shadow.bias = -.0003; sun.shadow.radius = 4
    scene.add(sun)
    const fill = new THREE.DirectionalLight('#d5e5ff', 1.2); fill.position.set(7, 5, -3); scene.add(fill)

    // Open architectural shell: the front and right stay open throughout the tour.
    box(world, 0, -.2, 0, 8.7, .4, 6.6, edge, .09)
    box(world, 0, .025, 0, 8.5, .05, 6.4, plaster, .025)
    for (let n = 0; n < 17; n++) box(world, -4 + n * .5, .057, 0, .008, .003, 6.3, edge, .001)
    box(world, 0, 1.7, -3.2, 8.65, 3.4, .16, white, .025)
    box(world, -4.25, 1.7, 0, .16, 3.4, 6.45, white, .025)
    box(world, 0, .12, -3.08, 8.4, .17, .045, oak)
    box(world, -4.13, .12, 0, .045, .17, 6.3, oak)
    // A deep-set window and slim mullions make the room read as architecture.
    box(world, -4.14, 2, -.75, .06, 1.9, 2.65, metal)
    const windowMat = mat('#d9e8ec', .22, .15)
    box(world, -4.095, 2, -.75, .025, 1.72, 2.46, windowMat)
    for (const z of [-1.55, -.75, .05]) box(world, -4.06, 2, z, .035, 1.75, .025, white, .005)
    box(world, -4.04, 1.08, -.75, .25, .08, 2.8, oak)
    // Slatted feature wall with discreet EdTrack-colored objects.
    for (let i = 0; i < 19; i++) box(world, 1.3 + i * .14, 2.25, -3.09, .045, 1.85, .065, oak, .008)
    box(world, -1.45, 2.75, -3.08, 3.2, .025, .035, lightMaterial, .006)
    // Wall typography is a texture, not tiny HTML projected over furniture.
    const titleTexture = canvasTexture(1024, 256, ctx => {
      ctx.fillStyle = '#fcfaf5'; ctx.fillRect(0, 0, 1024, 256); ctx.fillStyle = '#303b42'; ctx.font = '500 72px Arial'; ctx.fillText('Room to do more.', 28, 102)
      ctx.fillStyle = '#6b767b'; ctx.font = '28px Arial'; ctx.fillText('PEOPLE  /  LEARNING  /  OPERATIONS', 30, 171)
    })
    if (titleTexture) { const material = new THREE.MeshBasicMaterial({ map: titleTexture }); materials.add(material); mesh(world, new THREE.PlaneGeometry(2.9, .725), material, -1.5, 2.2, -3.105) }

    function plant(x: number, z: number, size = 1) {
      const p = group(x, z); p.scale.setScalar(size)
      cylinder(p, 0, .25, 0, .2, .16, .5, paper)
      cylinder(p, 0, .505, 0, .18, .18, .015, mat('#493d2d'))
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4; const height = .65 + i % 3 * .2
        const stem = cylinder(p, Math.sin(angle) * .08, .5 + height / 2, Math.cos(angle) * .08, .012, .012, height, green); stem.rotation.z = Math.sin(angle) * .2
        const leaf = mesh(p, new THREE.SphereGeometry(.16, 12, 8), green, Math.sin(angle) * .2, .5 + height, Math.cos(angle) * .2)
        leaf.scale.set(.65, 1.9, .22); leaf.rotation.set(.4, angle, Math.sin(angle) * .7)
      }
    }
    plant(-3.65, -2.4, .85); plant(3.65, -2.45, .8); plant(-3.6, 2.5, .7)

    const highlights: THREE.MeshStandardMaterial[] = []
    const screenFaces: THREE.Mesh[] = []
    const loader = new THREE.TextureLoader()
    function productTexture(face: THREE.Mesh, material: THREE.MeshBasicMaterial, preview: string) {
      loader.load(`/images/landing/product/${preview}.jpg`, texture => {
        if (disposed) { texture.dispose(); return }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        textures.add(texture); material.map = texture; material.needsUpdate = true
        const aspect = texture.image.width / texture.image.height
        const geometry = (face.geometry as THREE.PlaneGeometry).parameters as { width: number; height: number }
        const frameAspect = geometry.width / geometry.height
        face.scale.set(Math.min(1, aspect / frameAspect), Math.min(1, frameAspect / aspect), 1)
        requestRender()
      }, undefined, () => {})
    }
    function monitor(parent: THREE.Object3D, x: number, y: number, z: number, accent: THREE.MeshStandardMaterial, preview: string) {
      cylinder(parent, x, y + .1, z, .025, .035, .22, metal)
      box(parent, x, y, z + .01, .4, .035, .24, metal)
      box(parent, x, y + .61, z, 1.45, 1.05, .055, dark, .035)
      const material = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }); materials.add(material)
      const face = mesh(parent, new THREE.PlaneGeometry(1.36, .94), material, x, y + .61, z + .033); face.castShadow = false
      screenFaces.push(face)
      productTexture(face, material, preview)
      const ledMat = accent.clone(); ledMat.emissive.copy(accent.color); ledMat.emissiveIntensity = .1; materials.add(ledMat); highlights.push(ledMat)
      box(parent, x + .48, y + .13, z + .034, .025, .012, .01, ledMat, .004)
      return face
    }
    function desk(x: number, color: THREE.MeshStandardMaterial, preview: string) {
      const d = group(x, -2.15)
      box(d, 0, .96, 0, 2.05, .1, 1.05, oak, .055)
      for (const lx of [-.86, .86]) for (const lz of [-.37, .37]) box(d, lx, .46, lz, .055, .92, .055, metal, .012)
      box(d, -.7, .53, -.12, .5, .74, .65, white, .045)
      for (const yy of [.31, .55, .78]) { box(d, -.7, yy, .213, .43, .19, .025, plaster); box(d, -.7, yy + .04, .235, .14, .012, .022, metal, .004) }
      monitor(d, .13, 1.04, -.17, color, preview)
      box(d, .14, 1.025, .28, .62, .025, .22, metal)
      for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) box(d, -.12 + k * .057, 1.044, .21 + r * .053, .043, .008, .035, white, .002)
      mesh(d, new THREE.SphereGeometry(.065, 12, 8), white, .64, 1.04, .29).scale.set(.8, .3, 1.25)
      cylinder(d, -.73, 1.12, .28, .065, .06, .17, color)
      // Low upholstered stool stays tucked beneath the desk and out of the aisle.
      box(d, .05, .51, .7, .56, .12, .48, color, .06)
      for (const lx of [-.18, .18]) box(d, lx + .05, .24, .7, .035, .48, .035, metal)
      return d
    }
    desk(-2.5, blue, 'students'); desk(0, green, 'learning'); desk(2.5, red, 'fees')
    // Shared portal terminal on the open right edge; it faces into the room.
    const portal = group(3.65, 1.1)
    portal.rotation.y = -Math.PI / 4
    box(portal, 0, .06, 0, 1.25, .1, .65, metal, .06)
    box(portal, 0, .6, -.06, .12, 1.15, .12, metal)
    box(portal, 0, 1.7, 0, 1.5, .9, .09, dark, .055)
    const portalMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }); materials.add(portalMaterial)
    const portalFace = mesh(portal, new THREE.PlaneGeometry(1.36, .765), portalMaterial, 0, 1.7, .05)
    portalFace.castShadow = false; screenFaces.push(portalFace); productTexture(portalFace, portalMaterial, 'workspace')
    // Records credenza: open shelves, binders and one moving drawer.
    const records = group(-3.48, 1.2); records.rotation.y = Math.PI / 2
    box(records, 0, .55, 0, 1.8, 1.05, .62, oak, .04)
    box(records, 0, .62, .32, 1.67, .72, .025, dark)
    for (const yy of [.28, .67, 1.05]) box(records, 0, yy, .35, 1.8, .045, .72, oak)
    for (let n = 0; n < 9; n++) { box(records, -.72 + n * .17, .48, .4, .13, .32, .28, [blue, paper, green, paper, red][n % 5]); box(records, -.72 + n * .17, .51, .549, .07, .06, .005, paper, .001) }
    const drawer = new THREE.Group(); records.add(drawer)
    box(drawer, 0, .85, .37, 1.65, .28, .045, white); box(drawer, 0, .85, .407, .35, .02, .025, metal)
    monitor(records, 0, 1.04, -.08, green, 'records')
    // A small entry bench marks the edge without blocking any walking route.
    const bench = group(.15, 2.65)
    box(bench, 0, .4, 0, 2, .16, .5, oak, .07)
    for (const x of [-.8, .8]) box(bench, x, .2, 0, .06, .4, .35, dark)
    box(bench, -.45, .5, 0, .7, .06, .45, green, .045)

    // The continuous floor inlay is a physical architectural detail, not a floating trail.
    const routePoints = [[-2.5, -.8], [0, -.8], [2.5, -.8], [2.5, 1.25], [-2.5, 1.25]]
    const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints.map(([x, z]) => new THREE.Vector3(x, .065, z)))
    geometries.add(routeGeometry)
    const routeMaterial = new THREE.LineBasicMaterial({ color: '#9aada6', transparent: true, opacity: .45 }); materials.add(routeMaterial)
    world.add(new THREE.Line(routeGeometry, routeMaterial))
    const nodes: THREE.Mesh[] = []
    ROOM_CHAPTERS.slice(1, 6).forEach(ch => {
      const m = mat('#c9d2ca', .35, .25); highlights.push(m)
      const node = cylinder(world, ch.point[0], .073, ch.point[1], .085, .085, .012, m); nodes.push(node)
    })

    // Articulated guide. All limbs are part of the room, so occlusion is automatic.
    const guide = new THREE.Group(); world.add(guide); guide.scale.setScalar(.9)
    const skin = mat('#b98b6a', .85), clothing = mat('#334755', .88), trousers = mat('#33383c', .95), hair = mat('#292723', .95)
    const pelvis = new THREE.Group(); pelvis.position.y = .83; guide.add(pelvis)
    const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 5, 12)
    const body = mesh(pelvis, capsule(.2, .29), clothing, 0, .31, 0); body.scale.z = .64
    cylinder(pelvis, 0, .65, 0, .07, .07, .12, skin)
    const head = mesh(pelvis, new THREE.SphereGeometry(.205, 20, 16), skin, 0, .86, .01); head.scale.set(.85, 1.12, .9)
    const hairMesh = mesh(pelvis, new THREE.SphereGeometry(.21, 20, 12), hair, 0, .965, -.018); hairMesh.scale.set(.89, .7, .94)
    mesh(pelvis, new THREE.SphereGeometry(.035, 8, 8), skin, 0, .85, .19)
    for (const side of [-1, 1]) mesh(pelvis, new THREE.SphereGeometry(.011, 8, 8), hair, side * .065, .89, .18)
    function limb(side: number, arm: boolean) {
      const joint = new THREE.Group(); joint.position.set(side * (arm ? .235 : .11), arm ? .49 : -.03, 0); pelvis.add(joint)
      mesh(joint, capsule(arm ? .065 : .078, arm ? .18 : .21), arm ? clothing : trousers, 0, -.14, 0)
      const lower = new THREE.Group(); lower.position.y = -.29; joint.add(lower)
      mesh(lower, capsule(arm ? .045 : .065, .21), arm ? skin : trousers, 0, -.14, 0)
      if (arm) mesh(lower, new THREE.SphereGeometry(.055, 12, 8), skin, 0, -.28, 0)
      else box(lower, 0, -.35, .045, .14, .095, .28, paper, .04)
      return { joint, lower }
    }
    const legL = limb(-1, false), legR = limb(1, false), armL = limb(-1, true), armR = limb(1, true)
    const floorHalo = cylinder(world, -2.5, .074, -.8, .2, .2, .008, mat('#e3e0d6'))

    // The final roof settles into place; the logo belongs to its surface.
    const roof = new THREE.Group(); world.add(roof)
    box(roof, 0, 3.5, 0, 8.7, .22, 6.6, white, .08)
    box(roof, 0, 3.38, 0, 8.45, .035, 6.35, oak)
    new THREE.TextureLoader().load('/images/EdTrack1 logo.png', texture => {
      if (disposed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture)
      const logoMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false, blending: THREE.MultiplyBlending }); materials.add(logoMaterial)
      const logo = mesh(roof, new THREE.PlaneGeometry(4.1, 4.1 * texture.image.height / texture.image.width), logoMaterial, 0, 3.62, .15); logo.rotation.x = -Math.PI / 2; logo.castShadow = false; requestRender()
    })
    roof.visible = false

    let width = 1, height = 1
    const cameraTarget = new THREE.Vector3()
    const guideMaterials: THREE.Material[] = []
    guide.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const material = (object.material as THREE.Material).clone()
      material.transparent = true; object.material = material; materials.add(material); guideMaterials.push(material)
    })
    function render() {
      raf = 0
      if (disposed) return
      const { chapter, local, current, travel, dx, dz, x: px, z: pz } = getRoomJourney(driver.current.progress)
      guide.position.set(px, -.03, pz)
      floorHalo.position.set(px, .071, pz)
      const moving = chapter > 0 && local < .48
      const walkYaw = Math.atan2(dx, dz)
      const stopYaw = Math.atan2(current.look[0] - px, current.look[1] - pz)
      const previous = ROOM_CHAPTERS[Math.max(0, chapter - 1)]
      const startYaw = chapter === 1 ? -.3 : Math.atan2(previous.look[0] - previous.point[0], previous.look[1] - previous.point[1])
      const departure = Math.atan2(Math.sin(walkYaw - startYaw), Math.cos(walkYaw - startYaw))
      const heading = startYaw + departure * smooth(local / .12)
      const turnBlend = smooth((local - .38) / .16)
      const angle = Math.atan2(Math.sin(stopYaw - heading), Math.cos(stopYaw - heading))
      guide.rotation.y = chapter === 0 ? -.3 : heading + angle * turnBlend
      const distance = Math.hypot(dx, dz)
      const phase = travel * distance * 12
      const stride = moving ? Math.sin(Math.PI * THREE.MathUtils.clamp(local / .48, 0, 1)) : 0
      const swing = Math.sin(phase) * stride
      pelvis.position.y = .83 + Math.abs(Math.sin(phase)) * .018 * stride
      legL.joint.rotation.x = swing * .5; legR.joint.rotation.x = -swing * .5
      legL.lower.rotation.x = Math.max(0, -Math.sin(phase)) * .62 * stride
      legR.lower.rotation.x = Math.max(0, Math.sin(phase)) * .62 * stride
      armL.joint.rotation.x = -swing * .3; armR.joint.rotation.x = swing * .3
      armL.lower.rotation.x = -.12; armR.lower.rotation.x = -.12
      const interact = smooth((local - .51) / .1) * (1 - smooth((local - .85) / .12))
      if (chapter > 0 && chapter < 6) { armR.joint.rotation.x -= interact * .85; armR.lower.rotation.x -= interact * .55 }
      drawer.position.z = chapter === 5 ? interact * .22 : 0
      const view = getRoomCamera(driver.current.progress)
      const immersion = view.immersion
      roof.visible = view.roof > 0
      roof.position.y = (1 - view.roof) * 5
      const guideOpacity = 1 - smooth(immersion / .42)
      guide.visible = guideOpacity > .005 && view.roof < .95
      guideMaterials.forEach(material => { material.opacity = guideOpacity })
      floorHalo.visible = immersion < .1 && view.roof < .95
      camera.position.fromArray(view.eye)
      cameraTarget.fromArray(view.target)
      const overviewFov = mobile ? 36 : width / height < 1.1 ? 39 : 32
      // Portrait screens use a wider lens rather than backing through furniture.
      const insideFov = mobile ? Math.max(44, THREE.MathUtils.radToDeg(2 * Math.atan(1.48 / (2 * 1.487 * camera.aspect * .88)))) : 48
      camera.fov = THREE.MathUtils.lerp(overviewFov, insideFov, immersion)
      const shift = mobile ? 0 : THREE.MathUtils.lerp(.17, .15, immersion)
      camera.setViewOffset(width, height, -width * shift, 0, width, height)
      camera.updateProjectionMatrix()
      camera.lookAt(cameraTarget)
      for (let index = 0; index < 3; index++) highlights[index].emissiveIntensity = chapter === index + 1 ? .7 : .05
      nodes.forEach((node, index) => { const material = node.material as THREE.MeshStandardMaterial; material.color.set(chapter > index ? ROOM_CHAPTERS[index + 1].color : '#b8c2ba'); material.emissive.copy(material.color); material.emissiveIntensity = chapter === index + 1 ? .45 : 0 })
      renderer.render(scene, camera)
    }
    function requestRender() { if (!disposed && !raf) raf = requestAnimationFrame(render) }
    function resize() {
      width = element!.clientWidth; height = element!.clientHeight
      mobile = window.innerWidth < 760
      renderer.setSize(width, height)
      camera.aspect = width / Math.max(1, height)
      // Wider vertical field on portrait layouts keeps the entire shell visible.
      camera.fov = mobile ? 36 : width / height < 1.1 ? 39 : 32
      camera.updateProjectionMatrix(); requestRender()
    }
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
    const activeScreen = (event: PointerEvent | MouseEvent) => {
      const progress = driver.current.progress, chapter = Math.floor(progress)
      if (chapter < 1 || chapter > 5 || progress - chapter < .55) return false
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObject(screenFaces[chapter - 1]).length > 0
    }
    const screenClick = (event: MouseEvent) => { if (activeScreen(event)) openCallback.current() }
    const screenHover = (event: PointerEvent) => { renderer.domElement.style.cursor = activeScreen(event) ? 'zoom-in' : 'default' }
    renderer.domElement.addEventListener('click', screenClick)
    renderer.domElement.addEventListener('pointermove', screenHover)
    const observer = new ResizeObserver(resize); observer.observe(element)
    driver.current.render = requestRender
    const contextLost = (event: Event) => { event.preventDefault(); errorCallback.current() }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    resize()
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect()
      renderer.domElement.removeEventListener('click', screenClick)
      renderer.domElement.removeEventListener('pointermove', screenHover)
      if (driver.current.render === requestRender) driver.current.render = undefined
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose())
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [driver])
  return <div ref={host} style={{ width: '100%', height: '100%' }} />
}

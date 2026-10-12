'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

export type LearnerPose = { phase: number; stride: number; yaw: number; diploma: number; direction: number; depth: number; reach: number; inspect: number; wave: number; render?: () => void }

/** A small, demand-rendered 3D character. The room's scroll timeline owns its pose. */
export function HomeLearner3D({ pose }: { pose: MutableRefObject<LearnerPose> }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) }
    catch { return }
    renderer.setSize(120, 150)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    element.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.5, -1.5, .1, 30)
    camera.position.set(5, 4.1, 5)
    camera.lookAt(0, 1.04, 0)
    scene.add(new THREE.HemisphereLight(0xf3f7ff, 0x5a677c, 2.7))
    const key = new THREE.DirectionalLight(0xfff2dc, 3.1)
    key.position.set(-3, 6, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xbad8ff, 1.5)
    rim.position.set(3, 2, -4)
    scene.add(rim)
    const materials = {
      skin: new THREE.MeshStandardMaterial({ color: '#dcaa84', roughness: .68 }),
      jacket: new THREE.MeshStandardMaterial({ color: '#2b72bd', roughness: .48 }),
      trousers: new THREE.MeshStandardMaterial({ color: '#263d58', roughness: .8 }),
      shoe: new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: .5 }),
      hair: new THREE.MeshStandardMaterial({ color: '#242e3d', roughness: .9 }),
      bag: new THREE.MeshStandardMaterial({ color: '#bf5148', roughness: .65 }),
      paper: new THREE.MeshStandardMaterial({ color: '#fff7e4', roughness: .7 }),
    }
    const geometries: THREE.BufferGeometry[] = []
    function shape(parent: THREE.Object3D, material: THREE.Material, geometry: THREE.BufferGeometry, x: number, y: number, z: number) {
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x,y,z)
      parent.add(mesh)
      return mesh
    }
    const capsule = (radius: number, length: number) => new THREE.CapsuleGeometry(radius, length, 5, 12)
    const sphere = (radius: number) => new THREE.SphereGeometry(radius, 20, 16)
    const character = new THREE.Group()
    scene.add(character)
    const hips = new THREE.Group()
    hips.position.y = .85
    character.add(hips)
    const torso = shape(hips, materials.jacket, capsule(.23,.3), 0,.32,0)
    torso.scale.z = .67
    shape(hips, materials.bag, capsule(.18,.18),0,.3,-.21).scale.z = .55
    // Neck, face and sculpted hair retain volume from every walking direction.
    shape(hips, materials.skin, capsule(.075,.07),0,.68,0)
    const head = shape(hips, materials.skin, sphere(.23),0,.93,.015)
    head.scale.set(.87,1.13,.88)
    const hair = shape(hips, materials.hair, sphere(.235),0,1.035,-.025)
    hair.scale.set(.91,.77,.91)
    shape(hips, materials.skin, sphere(.047),0,.925,.207).scale.set(.8,.8,1)
    for (const side of [-1,1]) {
      shape(hips, materials.skin, sphere(.05),side*.205,.93,.0).scale.z=.65
      shape(hips, materials.hair, sphere(.016),side*.075,.975,.199)
    }
    function leg(side: number) {
      const thigh = new THREE.Group()
      thigh.position.set(side*.12,-.02,0)
      hips.add(thigh)
      shape(thigh, materials.trousers, capsule(.085,.23),0,-.17,0)
      const knee = new THREE.Group()
      knee.position.y=-.34
      thigh.add(knee)
      shape(knee, materials.trousers, capsule(.07,.23),0,-.16,0)
      shape(knee, materials.shoe, capsule(.085,.13),0,-.34,.06).rotation.x=Math.PI/2
      return { thigh, knee }
    }
    function arm(side: number) {
      const shoulder = new THREE.Group()
      shoulder.position.set(side*.255,.5,0)
      hips.add(shoulder)
      shape(shoulder, materials.jacket, capsule(.077,.19),0,-.14,0)
      const elbow = new THREE.Group()
      elbow.position.y=-.27
      shoulder.add(elbow)
      shape(elbow, materials.skin, capsule(.052,.18),0,-.12,0)
      shape(elbow, materials.skin, sphere(.064),0,-.25,0)
      return { shoulder, elbow }
    }
    const left = leg(-1), right = leg(1), leftArm=arm(-1), rightArm=arm(1)
    const diploma = shape(rightArm.elbow, materials.paper, new THREE.CylinderGeometry(.04,.04,.32,16),.02,-.24,.07)
    diploma.rotation.z=Math.PI/2
    const ribbon = shape(diploma, materials.bag, new THREE.CylinderGeometry(.044,.044,.045,16),0,0,0)
    ribbon.rotation.y=.1
    const render = () => {
      const {phase,stride,yaw} = pose.current
      const swing = Math.sin(phase) * stride
      const heading = yaw + (pose.current.direction < 0 && stride > .05 ? Math.PI : 0)
      const turn = Math.atan2(Math.sin(heading-character.rotation.y),Math.cos(heading-character.rotation.y))
      character.rotation.y += turn * .4
      hips.position.y = .85 + Math.sin(phase * 2) * .017 * stride
      hips.rotation.x = pose.current.inspect * .28
      hips.rotation.z = Math.sin(phase) * .035 * stride
      left.thigh.rotation.x = swing*.48
      right.thigh.rotation.x = -swing*.48
      left.knee.rotation.x = Math.max(0,-Math.sin(phase))*.7*stride
      right.knee.rotation.x = Math.max(0,Math.sin(phase))*.7*stride
      leftArm.shoulder.rotation.x = -swing*.38
      rightArm.shoulder.rotation.x = swing*.38
      leftArm.elbow.rotation.x = -.14-Math.max(0,swing)*.2
      rightArm.elbow.rotation.x = pose.current.diploma > .5 ? -.7 : -.14-Math.max(0,-swing)*.2
      rightArm.shoulder.rotation.x -= pose.current.reach * 1.05 + pose.current.wave * 1.8
      rightArm.shoulder.rotation.z = -pose.current.wave * .35
      rightArm.elbow.rotation.x -= pose.current.reach * .35 + pose.current.wave * .7
      leftArm.shoulder.rotation.x -= pose.current.inspect * 1.4
      head.rotation.x = pose.current.inspect * .35
      diploma.visible = pose.current.diploma > .5
      renderer.render(scene,camera)
    }
    pose.current.render = render
    render()
    return () => {
      if (pose.current.render === render) pose.current.render = undefined
      geometries.forEach(geometry=>geometry.dispose())
      Object.values(materials).forEach(material=>material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [pose])
  return <div ref={host} style={{width:120,height:150,pointerEvents:'none'}} />
}

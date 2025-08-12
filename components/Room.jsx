'use client'

import React, { Suspense, useLayoutEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ===== Floor Only ===== */
function FloorOnly({ scale = 1 }) {
  const floorMat = new THREE.MeshStandardMaterial({ color: '#a0a0a0' })
  return (
    <group scale={scale}>
      <mesh material={floorMat} position={[0, -0.025, 0]}>
        <boxGeometry args={[5, 0.05, 5]} />
      </mesh>
    </group>
  )
}

/* ===== Desk ===== */
function DeskGLB({ position, scale = 1, onClick }) {
  const { scene } = useGLTF('/models/desk.glb')
  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}

/* ===== PC: compute Screen anchor via raycast ===== */
function PCGLB({ position, scale = 1, onClick, onAnchor, rayFrom }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/PC.glb')

  useLayoutEffect(() => {
    if (!onAnchor) return
    const screen = scene.getObjectByName('Screen') // 
    if (!screen) return

    // world matrices are valid
    groupRef.current?.updateWorldMatrix(true, true)
    scene.updateMatrixWorld(true)
    screen.updateMatrixWorld(true)

    // World-space center & height from bounding box
    const bbox = new THREE.Box3().setFromObject(screen)
    const center = bbox.getCenter(new THREE.Vector3())
    const size = bbox.getSize(new THREE.Vector3())
    const height = Math.max(size.y, size.x) // bigger in-plane dimension for safe fit
    // Raycast from 'rayFrom'  *toward* the screen center
    const raycaster = new THREE.Raycaster()
    const origin = rayFrom ? rayFrom.clone() : new THREE.Vector3(0, 1, 0.8)
    const dir = center.clone().sub(origin).normalize()
    raycaster.set(origin, dir)

    // screen geometry to get the hit normal
    const hits = raycaster.intersectObject(screen, true)
    let normal
    if (hits.length) {
      //  transform to world using the normal matrix
      normal = hits[0].face.normal.clone()
      const nmat = new THREE.Matrix3().getNormalMatrix(hits[0].object.matrixWorld)
      normal.applyMatrix3(nmat).normalize()
    } else {
      // Fallback if no triangle hit 
      // Use matrixWorld axes, pick the smallest thickness axis as normal
      const m = screen.matrixWorld.elements
      const xAxis = new THREE.Vector3(m[0], m[1], m[2]).normalize()
      const yAxis = new THREE.Vector3(m[4], m[5], m[6]).normalize()
      const zAxis = new THREE.Vector3(m[8], m[9], m[10]).normalize()
      const extents = { x: size.x, y: size.y, z: size.z }
      const smallestKey = ['x','y','z'].sort((a,b)=>extents[a]-extents[b])[0]
      normal = ({ x: xAxis, y: yAxis, z: zAxis }[smallestKey]).clone()
      // Make sure normal faces from screen toward the origin (deskGroup side)
      const toOrigin = origin.clone().sub(center)
      if (normal.dot(toOrigin) < 0) normal.multiplyScalar(-1)
    }

    onAnchor({ center, normal, height })
  }, [scene, onAnchor, rayFrom])

  return (
    <group ref={groupRef} position={position} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}

/* ===== Photo Frame ===== */
function PhotoFrameGLB({ position, rotation = [0,0,0], scale = 1, onClick }) {
  const { scene } = useGLTF('/models/photo_frame.glb')
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}
function PhotoFrameFallback({ position, rotation = [0,0,0], scale = 1, onClick }) {
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh>
        <boxGeometry args={[0.18, 0.12, 0.015]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 0, -0.0075]}>
        <planeGeometry args={[0.16, 0.10]} />
        <meshStandardMaterial color="#666" />
      </mesh>
    </group>
  )
}

/* ===== Snowboard ===== */
function SnowboardGLB({ onClick, position, scale = 1 }) {
  const { scene } = useGLTF('/models/snowboard.glb')
  return (
    <group onClick={onClick} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
function SnowboardFallback({ onClick, position, scale = 1 }) {
  return (
    <mesh onClick={onClick} position={position} rotation={[0,0,Math.PI/2]} scale={scale}>
      <boxGeometry args={[0.1,1.4,0.05]} />
      <meshStandardMaterial color="#7dd3fc" />
    </mesh>
  )
}

/* ===== Soccer Ball ===== */
function SoccerBallGLB({ onClick, position, scale = 1 }) {
  const { scene } = useGLTF('/models/soccer_ball.glb')
  return (
    <group onClick={onClick} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
function SoccerBallFallback({ onClick, position, scale = 1 }) {
  return (
    <mesh onClick={onClick} position={position} castShadow scale={scale}>
      <sphereGeometry args={[0.12, 24, 24]} />
      <meshStandardMaterial color="#f5f5f5" />
    </mesh>
  )
}

/* ===== Palm Tree ===== */
function PalmTreeGLB({ onClick, position, scale = 1 }) {
  const { scene } = useGLTF('/models/palm_tree.glb')
  return (
    <group onClick={onClick} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
function PalmTreeFallback({ onClick, position, scale = 1 }) {
  return (
    <group onClick={onClick} position={position} scale={scale}>
      <mesh position={[0,0.1,0]}>
        <cylinderGeometry args={[0.02,0.05,0.6,12]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh position={[0,0.45,0]}>
        <coneGeometry args={[0.35, 0.6, 6]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  )
}

/* ===== Main Export ===== */
export default function Room({
  onDeskAreaClick,
  onComputerClick,
  onFrameClick,
  onSnowboardClick,
  onSoccerClick,
  onBeachClick,
  onPCAnchor,  // parent receives screen center/normal/height
  rayFrom,     // where to raycast from (deskGroup cam pos)
}) {
  return (
    <group>
      <FloorOnly scale={1} />

      {/* Desk + PC + Frame */}
      <Suspense fallback={null}>
        <DeskGLB position={[0, 0, 0.07]} scale={0.7} onClick={onDeskAreaClick} />

        <PCGLB
          position={[0, 0.58, 0.000000001]}
          scale={0.04}
          onClick={onComputerClick}
          onAnchor={onPCAnchor}
          rayFrom={rayFrom}
        />

        <Suspense fallback={
          <PhotoFrameFallback
            position={[-0.4, 0.57, 0.17]}
            rotation={[0, Math.PI * 0.08, 0]}
            scale={0.06}
            onClick={onFrameClick}
          />
        }>
          <PhotoFrameGLB
            position={[-0.4, 0.57, 0.17]}
            rotation={[0, Math.PI * 0.08, 0]}
            scale={0.06}
            onClick={onFrameClick}
          />
        </Suspense>
      </Suspense>

      {/* Other props unchanged */}
      <Suspense fallback={<SnowboardFallback onClick={onSnowboardClick} position={[1.5, 0.7, -0.6]} scale={0.9} />}>
        <SnowboardGLB onClick={onSnowboardClick} position={[1.5, 0, -0.6]} scale={0.9} />
      </Suspense>

      <Suspense fallback={<SoccerBallFallback onClick={onSoccerClick} position={[-0.9, 0.12, 0.4]} scale={0.2} />}>
        <SoccerBallGLB onClick={onSoccerClick} position={[-0.9, 0.3, 0.4]} scale={0.2} />
      </Suspense>

      <Suspense fallback={<PalmTreeFallback onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />}>
        <PalmTreeGLB onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
      </Suspense>
    </group>
  )
}

/* Preload */
useGLTF.preload('/models/desk.glb')
useGLTF.preload('/models/PC.glb')
useGLTF.preload('/models/photo_frame.glb')
useGLTF.preload('/models/snowboard.glb')
useGLTF.preload('/models/soccer_ball.glb')
useGLTF.preload('/models/palm_tree.glb')
useGLTF.preload('/models/PC.glb') // preload PC model for raycasting
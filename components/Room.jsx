'use client'

import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ===== Floor Only ===== */
function FloorOnly({ scale = 1 }) {
  const floorMat = new THREE.MeshStandardMaterial({ color: '#a0a0a0' }) // gray

  return (
    <group scale={scale}>
      <mesh material={floorMat} position={[0, -0.025, 0]}>
        <boxGeometry args={[5, 0.05, 5]} />
      </mesh>
    </group>
  )
}

/* ===== Desk & PC ===== */
function DeskGLB({ position, scale = 1, onClick }) {
  const { scene } = useGLTF('/models/desk.glb')
  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}

function PCGLB({ position, scale = 1, onClick }) {
  const { scene } = useGLTF('/models/PC.glb')
  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}

/* ===== Photo Frame (NEW) ===== */
function PhotoFrameGLB({ position, rotation = [0, 0, 0], scale = 1, onClick }) {
  const { scene } = useGLTF('/models/photo_frame.glb')
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}
function PhotoFrameFallback({ position, rotation = [0, 0, 0], scale = 1, onClick }) {
  // simple placeholder: black frame + gray "photo"
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
    <mesh onClick={onClick} position={position} rotation={[0, 0, Math.PI / 2]} scale={scale}>
      <boxGeometry args={[0.1, 1.4, 0.05]} />
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
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.05, 0.6, 12]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.35, 0.6, 6]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  )
}

/* ===== Main Export ===== */
export default function Room({
  onComputerClick,
  onSnowboardClick,
  onSoccerClick,
  onBeachClick,
  onFrameClick, // optional: click handler for photo frame
}) {
  return (
    <group>
      {/* Floor */}
      <FloorOnly scale={1} />

      {/* Desk + PC + Photo Frame */}
      <Suspense fallback={null}>
        <DeskGLB position={[0, 0, 0.07]} scale={0.7} />
        <PCGLB   position={[0, 0.58, 0.000000001]} scale={0.04} onClick={onComputerClick} />

        {/* Photo frame near the PC — tweak to taste */}
        <Suspense fallback={
          <PhotoFrameFallback
            position={[0.22, 0.34, 0.12]}
            rotation={[0, Math.PI * -0.08, 0]}
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

      {/* Snowboard */}
      <Suspense fallback={
        <SnowboardFallback onClick={onSnowboardClick} position={[1.5, 0.7, -0.6]} scale={0.9} />
      }>
        <SnowboardGLB onClick={onSnowboardClick} position={[1.5, 0, -0.6]} scale={0.9} />
      </Suspense>

      {/* Soccer ball */}
      <Suspense fallback={
        <SoccerBallFallback onClick={onSoccerClick} position={[-0.9, 0.12, 0.4]} scale={0.2} />
      }>
        <SoccerBallGLB onClick={onSoccerClick} position={[-0.9, 0.3, 0.4]} scale={0.2} />
      </Suspense>

      {/* Palm tree */}
      <Suspense fallback={
        <PalmTreeFallback onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
      }>
        <PalmTreeGLB onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
      </Suspense>
    </group>
  )
}

/* ===== Preload models ===== */
useGLTF.preload('/models/desk.glb')
useGLTF.preload('/models/PC.glb')
useGLTF.preload('/models/photo_frame.glb')
useGLTF.preload('/models/snowboard.glb')
useGLTF.preload('/models/soccer_ball.glb')
useGLTF.preload('/models/palm_tree.glb')

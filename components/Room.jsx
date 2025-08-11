'use client'

import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ===== Gray Room (walls, floor, ceiling) ===== */
function GrayRoom({ scale = 1 }) {
  const wallMat = new THREE.MeshStandardMaterial({ color: '#b0b0b0' }) // light gray
  const floorMat = new THREE.MeshStandardMaterial({ color: '#a0a0a0' }) // slightly darker gray
  const ceilingMat = new THREE.MeshStandardMaterial({ color: '#b0b0b0' })

  return (
    <group scale={scale}>
      {/* Floor */}
      <mesh material={floorMat} position={[0, -0.025, 0]}>
        <boxGeometry args={[5, 0.05, 5]} />
      </mesh>

      {/* Ceiling */}
      <mesh material={ceilingMat} position={[0, 2.5, 0]}>
        <boxGeometry args={[5, 0.05, 5]} />
      </mesh>

      {/* Back wall */}
      <mesh material={wallMat} position={[0, 1.25, -2.475]}>
        <boxGeometry args={[5, 2.5, 0.05]} />
      </mesh>

      {/* Front wall */}
      <mesh material={wallMat} position={[0, 1.25, 2.475]}>
        <boxGeometry args={[5, 2.5, 0.05]} />
      </mesh>

      {/* Left wall */}
      <mesh material={wallMat} position={[-2.475, 1.25, 0]}>
        <boxGeometry args={[0.05, 2.5, 5]} />
      </mesh>

      {/* Right wall */}
      <mesh material={wallMat} position={[2.475, 1.25, 0]}>
        <boxGeometry args={[0.05, 2.5, 5]} />
      </mesh>
    </group>
  )
}

/* ===== Desk & PC Models ===== */
function DeskGLB({ position, scale = 1 }) {
  const { scene } = useGLTF('/models/desk.glb')
  return <primitive object={scene} position={position} scale={scale} />
}

function PCGLB({ position, scale = 1 }) {
  const { scene } = useGLTF('/models/PC.glb')
  return <primitive object={scene} position={position} scale={scale} />
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
        <coneGeometry args={[0.35,0.6,6]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  )
}

/* ===== Main Export ===== */
export default function Room({ onComputerClick, onSnowboardClick, onSoccerClick, onBeachClick }) {
  return (
    <group>
      {/* Gray Room */}
      <GrayRoom scale={1} />

      {/* Desk & PC */}
      <Suspense fallback={null}>
        <DeskGLB position={[0, 0, 0]} scale={0.7} />
        <PCGLB position={[0, 0.52, 0.22]} scale={0.03} onClick={onComputerClick} />
      </Suspense>

      {/* Snowboard */}
      <Suspense fallback={<SnowboardFallback onClick={onSnowboardClick} position={[1.5,0.7,-0.6]} scale={0.9} />}>
        <SnowboardGLB onClick={onSnowboardClick} position={[1.5, 0, -0.6]} scale={0.9} />
      </Suspense>

      {/* Soccer ball */}
      <Suspense fallback={<SoccerBallFallback onClick={onSoccerClick} position={[-0.9,0.12,0.4]} scale={0.2} />}>
        <SoccerBallGLB onClick={onSoccerClick} position={[-0.9, 0.30, 0.4]} scale={0.2} />
      </Suspense>

      {/* Palm tree */}
      <Suspense fallback={<PalmTreeFallback onClick={onBeachClick} position={[0.9,0,-1.6]} scale={0.2} />}>
        <PalmTreeGLB onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
      </Suspense>
    </group>
  )
}

/* Preload models */
useGLTF.preload('/models/desk.glb')
useGLTF.preload('/models/PC.glb')
useGLTF.preload('/models/snowboard.glb')
useGLTF.preload('/models/soccer_ball.glb')
useGLTF.preload('/models/palm_tree.glb')

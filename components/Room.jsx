'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Room component
 * - Tries to load /models/room.glb
 * - If missing, shows a placeholder desk + a "computer" box you can click
 */
export default function Room({ onComputerClick }) {
  // Try loading a GLB, fallback if not found
  let gltf = null
  try {
    gltf = useGLTF('/models/room.glb')
  } catch (e) {
    // ignored; we'll render placeholder
  }

  if (gltf) {
    return <primitive object={gltf.scene} />
  }

  // Placeholder scene
  const compRef = useRef()
  useFrame((_, dt) => {
    if (compRef.current) compRef.current.rotation.y += dt * 0.4
  })

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#888' }), [])
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#B58863' }), [])
  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f2937', emissive: '#111', emissiveIntensity: 0.2 }), [])

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]}>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* desk */}
      <mesh position={[0,0.4,0]}>
        <boxGeometry args={[1.2, 0.05, 0.6]} />
        <primitive object={woodMat} attach="material" />
      </mesh>

      {/* computer (clickable) */}
      <group position={[0,0.65,0]}>
        <mesh ref={compRef} onClick={onComputerClick} castShadow>
          <boxGeometry args={[0.5,0.3,0.05]} />
          <primitive object={screenMat} attach="material" />
        </mesh>
        <mesh position={[0,-0.2,0]}>
          <boxGeometry args={[0.3,0.02,0.2]} />
          <primitive object={woodMat} attach="material" />
        </mesh>
      </group>

      {/* sign */}
      <mesh position={[0,0.2,-1]}>
        <boxGeometry args={[1.6,0.8,0.05]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}
'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import dynamic from 'next/dynamic'

const Room = dynamic(() => import('../components/Room'), { ssr: false })

/* Critically damped easing */
function dampVec3(cur, target, lambda, dt) {
  cur.x = THREE.MathUtils.damp(cur.x, target.x, lambda, dt)
  cur.y = THREE.MathUtils.damp(cur.y, target.y, lambda, dt)
  cur.z = THREE.MathUtils.damp(cur.z, target.z, lambda, dt)
}

/* Camera driver with silky motion */
function CameraRig({ mode, pcShot }) {
  const { camera } = useThree()
  const lookRef = useRef(new THREE.Vector3())

  const shots = useMemo(
    () => ({
      wide:      { pos: new THREE.Vector3(-1.8, 1.4, 2.6), look: new THREE.Vector3(0, 0.7, 0.1) },
      deskGroup: { pos: new THREE.Vector3( 0.0, 1.0, 0.8),  look: new THREE.Vector3(0, 0.60, 0.10) },
      frameClose:{ pos: new THREE.Vector3(-0.18, 0.93, 0.86), look: new THREE.Vector3(-0.40, 0.57, 0.17) },
    }),
    []
  )

  useFrame((_, dt) => {
    const target = (mode === 'pcClose' && pcShot) ? pcShot : (shots[mode] ?? shots.wide)
    dampVec3(camera.position, target.pos, 5.0, dt)
    dampVec3(lookRef.current, target.look, 5.0, dt)
    camera.lookAt(lookRef.current)
  })

  return null
}

export default function Page() {
  // modes: 'wide' | 'deskGroup' | 'pcClose' | 'frameClose'
  const [mode, setMode] = useState('wide')
  const [pcShot, setPcShot] = useState(null) // { pos: Vector3, look: Vector3 }

  // This is where the deskGroup camera sits 
  const DESK_GROUP_POS = new THREE.Vector3(0.0, 1.0, 0.8)

  /** Build a perfect pcClose shot:
   * - 'center', 'normal', 'height' come from the actual Screen ray hit
   * - compute distance from FOV so bezel is visible (fill < 1)
   */
  const handlePCAnchor = useCallback(({ center, normal, height }) => {
    const fovDeg = 50
    const fov = THREE.MathUtils.degToRad(fovDeg)

    //  margin so the white frame shows
    const fill = .90 // 80% of view height
    const distance = (height / 2) / Math.tan(fov / 2) / fill

    // Optional micro offsets
    const upOffset = 0.00
    const lateralOffset = 0.00

    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(normal, up).normalize()

    const pos = center.clone()
      .addScaledVector(normal, distance)
      .addScaledVector(up, upOffset)
      .addScaledVector(right, lateralOffset)

    const look = center.clone()
    setPcShot({ pos, look })
  }, [])

  // Click flow
  const onDeskAreaClick = useCallback(() => {
    if (mode === 'wide') setMode('deskGroup')
  }, [mode])

  const onComputerClick = useCallback(() => {
    if (mode === 'wide') setMode('deskGroup')
    else if (mode === 'deskGroup') setMode('pcClose')
  }, [mode])

  const onFrameClick = useCallback(() => {
    if (mode === 'wide') setMode('deskGroup')
    else if (mode === 'deskGroup') setMode('frameClose')
  }, [mode])

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Canvas camera={{ position: [-1.8, 1.4, 2.6], fov: 50 }}>
        <color attach="background" args={['#0b0f16']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5,5,5]} intensity={1.2} />

        <Suspense fallback={null}>
          <Room
            onDeskAreaClick={onDeskAreaClick}
            onComputerClick={onComputerClick}
            onFrameClick={onFrameClick}
            onPCAnchor={handlePCAnchor}                 // receive computed screen anchor
            rayFrom={DESK_GROUP_POS}                    // pass deskGroup pos for raycast
          />
        </Suspense>

        <CameraRig mode={mode} pcShot={pcShot} />
      </Canvas>

      {/* dev buttons (remove later) */}
      <div style={{position:'fixed', top:16, left:16, display:'flex', gap:8, zIndex:10}}>
        <button onClick={()=>setMode('wide')}>Wide</button>
        <button onClick={()=>setMode('deskGroup')}>Desk</button>
        <button onClick={()=>setMode('pcClose')}>PC</button>
        <button onClick={()=>setMode('frameClose')}>Frame</button>
      </div>
    </div>
  )
}

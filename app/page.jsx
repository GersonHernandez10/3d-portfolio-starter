'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import dynamic from 'next/dynamic'
import IntroLoader from '../components/IntroLoader'
import DeviceGate from '../components/DeviceGate'

const Room = dynamic(() => import('../components/Room'), { ssr: false })

/* Critically damped easing */
function dampVec3(cur, target, lambda, dt) {
  cur.x = THREE.MathUtils.damp(cur.x, target.x, lambda, dt)
  cur.y = THREE.MathUtils.damp(cur.y, target.y, lambda, dt)
  cur.z = THREE.MathUtils.damp(cur.z, target.z, lambda, dt)
}

/* Smooth camera driver */
function CameraRig({ mode, pcShot }) {
  const { camera } = useThree()
  const lookRef = useRef(new THREE.Vector3())

  const shots = useMemo(
    () => ({
      wide:      { pos: new THREE.Vector3(-1.8, 1.4, 2.6), look: new THREE.Vector3(0, 0.7, 0.1) },
      deskGroup: { pos: new THREE.Vector3( 0.0, 1.0, 0.8),  look: new THREE.Vector3(0, 0.60, 0.10) },
      frameClose:{ pos: new THREE.Vector3(-0.28, 0.7, 0.5), look: new THREE.Vector3(-0.40, 0.57, 0.17) },
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

/* Back Arrow overlay */
function BackArrow({ show, onClick }) {
  if (!show) return null

  const styles = {
    wrap: {
      position: 'fixed',
      top: 16,
      left: 16,
      zIndex: 10,
      cursor: 'pointer',
      userSelect: 'none',
      filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
      transform: 'translateZ(0)',
      transition: 'transform 120ms ease',
    },
    badge: {
      width: 60,
      height: 60,
      borderRadius: 999,
      background: '#d2a679',
      border: '4px solid #8b5e34',
      display: 'grid',
      placeItems: 'center',
    }
  }

  const onEnter = e => (e.currentTarget.style.transform = 'scale(1.05)')
  const onLeave = e => (e.currentTarget.style.transform = 'scale(1.0)')

  return (
    <div
      style={styles.wrap}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label="Back"
      title="Back"
    >
      <div style={styles.badge}>
        <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.5 5.2L4 11.7l6.5 6.5"
            fill="none"
            stroke="#3b2b1f"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 11.7H5.2"
            fill="none"
            stroke="#3b2b1f"
            strokeWidth="3.25"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

export default function Page() {
  const [mode, setMode] = useState('wide')
  const [pcShot, setPcShot] = useState(null)
  const [history, setHistory] = useState([])

  const [showIntro, setShowIntro] = useState(true)

  const goTo = useCallback((nextMode) => {
    setHistory((h) => h.concat(mode))
    setMode(nextMode)
  }, [mode])

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setMode(prev)
      return h.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') goBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  const handlePCAnchor = useCallback(({ center, normal, height }) => {
    const fovDeg = 46
    const fov = THREE.MathUtils.degToRad(fovDeg)
    const fill = 0.80
    const distance = (height / 2) / Math.tan(fov / 2) / fill

    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(normal, up).normalize()

    const pos = center.clone()
      .addScaledVector(normal, distance)
      .addScaledVector(up, 0.00)
      .addScaledVector(right, 0.00)

    setPcShot({ pos, look: center.clone() })
  }, [])

  const onDeskAreaClick = useCallback(() => {
    if (mode === 'wide') goTo('deskGroup')
  }, [mode, goTo])

  const onComputerClick = useCallback(() => {
    if (mode === 'wide') goTo('deskGroup')
    else if (mode === 'deskGroup') goTo('pcClose')
  }, [mode, goTo])

  const onFrameClick = useCallback(() => {
    if (mode === 'wide') goTo('deskGroup')
    else if (mode === 'deskGroup') goTo('frameClose')
  }, [mode, goTo])

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [-1.8, 1.4, 2.6], fov: 50 }}
        gl={{ toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={['#8f8f8f']} />
        <fog attach="fog" args={['#8f8f8f', 6, 18]} />
        <ambientLight intensity={0.25} />
        <hemisphereLight skyColor={'#dfe7ff'} groundColor={'#2b241f'} intensity={0.35} />
        <directionalLight
          position={[5, 6.5, 4]}
          intensity={1.0}
          color={'#fff1e0'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-4, 3.5, -2]} intensity={0.55} color={'#e6f0ff'} />
        <directionalLight position={[-6, 2.5, 3]} intensity={0.8} color={'#ffffff'} />
        <spotLight position={[0, 4.5, 2.5]} angle={0.6} penumbra={0.6} intensity={0.35} castShadow />

        <Suspense fallback={null}>
          <Room
            onDeskAreaClick={onDeskAreaClick}
            onComputerClick={onComputerClick}
            onFrameClick={onFrameClick}
            onPCAnchor={handlePCAnchor}
            pcActive={mode === 'pcClose'}
          />
        </Suspense>

        <CameraRig mode={mode} pcShot={pcShot} />
      </Canvas>

      {/* Back arrow */}
      <BackArrow show={history.length > 0} onClick={goBack} />

      {/* Intro loader overlay */}
      <IntroLoader show={showIntro} onContinue={() => setShowIntro(false)} />

      {/* HARD MOBILE BLOCK — full-screen overlay on phones/small screens */}
      <DeviceGate minWidth={900} />
    </div>
  )
}

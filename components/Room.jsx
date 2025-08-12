'use client'

import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ================= Floor ================= */
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

/* ================= Desk ================= */
function DeskGLB({ position, scale = 1, onClick }) {
  const { scene } = useGLTF('/models/desk.glb')
  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={scene} />
    </group>
  )
}

/* ========== In-monitor UI ========== */
function ScreenDesktopUI() {
  const [tab, setTab] = useState('about')
  const stopBubble = (e) => {
    e.stopPropagation()
    e.nativeEvent?.stopImmediatePropagation?.()
  }

  const Tab = ({ id, children }) => (
    <button
      onPointerDown={stopBubble}
      onClick={(e) => { stopBubble(e); setTab(id) }}
      style={{
        background: tab === id ? '#374151' : 'transparent',
        color: '#e5e7eb',
        border: '1px solid #374151',
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {children}
    </button>
  )
  const A = (props) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      onPointerDown={stopBubble}
      onClick={stopBubble}
      style={{ color: '#60a5fa', ...props.style }}
    />
  )

  return (
    <div
      onWheel={stopBubble}
      style={{
        width: '100%',
        height: '100%',
        color: '#e5e7eb',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b1220',
        pointerEvents: 'auto',
      }}
    >
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'8px 10px',background:'#111',borderBottom:'1px solid #222'}}>
        <strong style={{ fontSize: 16 }}>GersonOS</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <Tab id="about">About</Tab>
          <Tab id="resume">Resume</Tab>
          <Tab id="socials">Socials</Tab>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12, fontSize: 14, lineHeight: 1.55 }}>
        {tab === 'about' && (
          <div>
            <h3 style={{ margin: '6px 0 8px 0', fontSize: 16 }}>About Me</h3>
            <p>Hello I’m Gerson Hernandez and I built this interactive 3D Portfolio.</p>
            <p>I love snowboarding, soccer, and clean interactive UI.</p>
          </div>
        )}
        {tab === 'resume' && (
          <div style={{ height: '100%' }}>
            <iframe
              src="/resume.pdf"
              title="Resume"
              style={{ width: '100%', height: '100%', border: 'none', background: '#0b0f16' }}
            />
          </div>
        )}
        {tab === 'socials' && (
          <div>
            <h3 style={{ margin: '6px 0 8px 0', fontSize: 16 }}>Connect</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              <li><A href="https://github.com/GersonHernandez10">GitHub</A></li>
              <li><A href="https://linkedin.com/in/gerson-hernandez-lima-0408212b6">LinkedIn</A></li>
              <li><A href="mailto:gersonhernandez950@gmail.com">Email</A></li>
              <li><A href="https://www.instagram.com/813.gerson/">Instagram</A></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/* ======= PC with axis-corrected overlay & proper DOM fitting ======= */
function PCInteractive({
  position, scale = 1,
  onClick, onAnchor,
  pcActive = false,
  uiScale = 44,
  bezelMargin = 0.965,   // tweak 1.00–1.03 to kiss the bezel
}) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/PC.glb')

  const [info, setInfo] = useState(null) // { localCenter, localEuler, widthLocal, heightLocal }
  const coverRef = useRef()

  // Axis correction for a mesh authored Z-up and Y-back
  const FIX_EULER = useMemo(() => new THREE.Euler(-Math.PI / 2, Math.PI, 0), [])
  const FIX_Q = useMemo(() => new THREE.Quaternion().setFromEuler(FIX_EULER), [FIX_EULER])

  // Fade black cover (1 -> 0 when pcActive)
  useFrame((_, dt) => {
    const mat = coverRef.current?.material
    if (!mat) return
    mat.transparent = true
    const target = pcActive ? 0 : 1
    mat.opacity = THREE.MathUtils.damp(mat.opacity ?? target, target, 5, dt)
  })

  useLayoutEffect(() => {
    const screen = scene.getObjectByName('Screen')
    if (!screen || !screen.geometry) {
      console.warn('PCInteractive: Mesh named "Screen" with geometry not found.')
      return
    }

    // Bounds in mesh-local space
    screen.geometry.computeBoundingBox()
    const gbox = screen.geometry.boundingBox.clone()
    const gsize = gbox.getSize(new THREE.Vector3())

    // Transform of Screen relative to PC group (for DOM placement)
    groupRef.current?.updateWorldMatrix(true, true)
    screen.updateMatrixWorld(true)
    const parentInv = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert()
    const localMatrix = new THREE.Matrix4().multiplyMatrices(parentInv, screen.matrixWorld)

    const localPos = new THREE.Vector3()
    const localQuat = new THREE.Quaternion()
    const localScale = new THREE.Vector3()
    localMatrix.decompose(localPos, localQuat, localScale)

    // Apply axis-fix to the DOM plane orientation
    const fixedLocalQuat = localQuat.clone().multiply(FIX_Q)
    const fixedLocalEuler = new THREE.Euler().setFromQuaternion(fixedLocalQuat)

    // WORLD center & normal (for camera anchors)
    const geomCenterLocal = gbox.getCenter(new THREE.Vector3())
    const worldCenter = geomCenterLocal.applyMatrix4(screen.matrixWorld)
    const worldQuat = screen.getWorldQuaternion(new THREE.Quaternion()).multiply(FIX_Q)
    const worldScale = screen.getWorldScale(new THREE.Vector3())

    let worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize()
    const wideCam = new THREE.Vector3(-1.8, 1.4, 2.6)
    if (worldNormal.dot(wideCam.clone().sub(worldCenter)) < 0) worldNormal.multiplyScalar(-1)

    // Choose width/height from the two largest local dimensions (ignore depth)
    const localDims = [
      gsize.x * localScale.x,
      gsize.y * localScale.y,
      gsize.z * localScale.z,
    ].sort((a, b) => b - a)
    const widthLocal = localDims[0]
    const heightLocal = localDims[1]

    // World height for FOV distance math
    const worldDims = [
      gsize.x * worldScale.x,
      gsize.y * worldScale.y,
      gsize.z * worldScale.z,
    ].sort((a, b) => b - a)
    const worldHeight = worldDims[1]

    setInfo({ localCenter: localPos, localEuler: fixedLocalEuler, widthLocal, heightLocal })
    onAnchor?.({ center: worldCenter, normal: worldNormal, height: worldHeight })
  }, [scene, onAnchor, FIX_Q])

  // Pretend pixel size for the DOM plane (keeps aspect consistent)
  const cssSize = useMemo(() => {
    if (!info) return { w: 1200, h: 675 } // default ~16:9
    const aspect = info.widthLocal / info.heightLocal
    const w = 1200
    const h = Math.round(w / aspect)
    return { w, h }
  }, [info])

  // Fit by BOTH width and height; choose limiting scale
  const htmlScaleLocal = useMemo(() => {
    if (!info) return 1
    const sW = (info.widthLocal * bezelMargin) / cssSize.w
    const sH = (info.heightLocal * bezelMargin) / cssSize.h
    return Math.min(sW, sH)
  }, [info, cssSize.w, cssSize.h, bezelMargin])

  // Slight offset in front of the glass (in local units)
  const localZ = useMemo(() => {
    if (!info) return 0.02
    const s = groupRef.current?.getWorldScale(new THREE.Vector3()).x ?? 1
    return 0.02 / s
  }, [info])

  const safeOnClick = pcActive ? undefined : onClick

  return (
    <group ref={groupRef} position={position} scale={scale} onClick={safeOnClick}>
      <primitive object={scene} />

      {info && (
        <group position={info.localCenter} rotation={info.localEuler}>
          {/* Black cover – fill the glass exactly */}
          <mesh ref={coverRef} position={[0, 0, localZ * 0.3]} raycast={() => null}>
            <planeGeometry args={[info.widthLocal * 1.0, info.heightLocal * 1.0]} />
            <meshStandardMaterial color="#090c12" opacity={1} />
          </mesh>

          {/* DOM overlay – give it explicit pixel size so it fills the plane */}
          <Html
            transform
            portal={{}}
            zIndexRange={[100, 0]}
            pointerEvents="auto"
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e)=>{ e.stopPropagation() }}
            onWheel={(e)=>{ e.stopPropagation() }}
            position={[0, 0, localZ]}
            rotation={[0, Math.PI, 0]}     // your chosen un-mirror
            scale={htmlScaleLocal * uiScale}
          >
            <div style={{ width: `${cssSize.w}px`, height: `${cssSize.h}px` }}>
              <ScreenDesktopUI />
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

/* ================= Photo Frame ================= */
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

/* ================= Other models ================= */
function GamingChairGLB({ onClick, position, rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF('/models/gaming_chair.glb')
  return (
    <group onClick={onClick} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
function GamingChairFallback({ onClick, position, rotation = [0, 0, 0], scale = 1 }) {
  return (
    <mesh onClick={onClick} position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[0.4, 1.0, 0.4]} />
      <meshStandardMaterial color="#444" />
    </mesh>
  )
}

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

/* ================= Main Export ================= */
export default function Room({
  onDeskAreaClick,
  onComputerClick,
  onFrameClick,
  onSnowboardClick,
  onSoccerClick,
  onBeachClick,
  onPCAnchor,
  pcActive = false,
}) {
  useEffect(() => {
    useGLTF.preload('/models/desk.glb')
    useGLTF.preload('/models/PC.glb')
    useGLTF.preload('/models/photo_frame.glb')
    useGLTF.preload('/models/gaming_chair.glb')
    useGLTF.preload('/models/snowboard.glb')
    useGLTF.preload('/models/soccer_ball.glb')
    useGLTF.preload('/models/palm_tree.glb')
  }, [])

  return (
    <group>
      <FloorOnly scale={1} />

      {/* Desk + PC + Frame */}
      <Suspense fallback={null}>
        <DeskGLB position={[0, 0, 0.07]} scale={0.7} onClick={onDeskAreaClick} />

        <PCInteractive
          position={[0, 0.58, 0.000000001]}
          scale={0.04}
          onClick={onComputerClick}
          onAnchor={onPCAnchor}
          pcActive={pcActive}
          uiScale={44}
          bezelMargin={0.98}  // try 1.00–1.02 for tighter fit
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

      {/* Gaming Chair */}
      <Suspense fallback={<GamingChairFallback position={[-0.6, 0, 0.5]} rotation={[0, Math.PI / 2, 0]} scale={0.5} />}>
        <GamingChairGLB position={[-0.5, 0, 0.8]} rotation={[0, Math.PI / 1.9, 0]} scale={0.4} />
      </Suspense>

      {/* Others */}
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

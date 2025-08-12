// components/Room.jsx
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

/* ========== In-monitor UI (About/Resume/Socials) ========== */
function ScreenDesktopUI() {
  const [tab, setTab] = useState('about')

  // Only stop propagation on interactive elements (do NOT prevent default)
  const stopBubble = (e) => {
    e.stopPropagation()
    e.nativeEvent?.stopImmediatePropagation?.()
  }

  const Tab = ({ id, children }) => (
    <button
      onPointerDown={stopBubble}
      onClick={(e) => {
        stopBubble(e)
        setTab(id)
      }}
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
      onClick={stopBubble} // allow default nav
      style={{ color: '#60a5fa', ...props.style }}
    />
  )

  return (
    <div
      // Let clicks bubble inside; only specific controls stop it.
      onWheel={stopBubble} // block orbit scrolling
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
        <strong style={{ fontSize: 12 }}>GersonOS</strong>
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
            {/* Ensure /public/resume.pdf exists */}
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
              <li><A href="https://github.com/yourhandle">GitHub</A></li>
              <li><A href="https://linkedin.com/in/yourhandle">LinkedIn</A></li>
              <li><A href="mailto:you@example.com">Email</A></li>
              <li><A href="https://twitter.com/yourhandle">X / Twitter</A></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/* ======= PC with aligned overlay + power-on fade ======= */
function PCInteractive({
  position, scale = 1,
  onClick, onAnchor,
  pcActive = false,
  uiScale = 44,        // your boost
  bezelMargin = 0.965, // show a touch of the bezel
}) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/PC.glb')

  const [info, setInfo] = useState(null) // { localCenter, localEuler, localSize }
  const coverRef = useRef()

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
    if (!screen) {
      console.warn('PCInteractive: name the monitor glass mesh exactly "Screen" in PC.glb.')
      return
    }

    groupRef.current?.updateWorldMatrix(true, true)
    scene.updateMatrixWorld(true)
    screen.updateMatrixWorld(true)

    // WORLD bbox + center/size
    const bbox = new THREE.Box3().setFromObject(screen)
    const worldCenter = bbox.getCenter(new THREE.Vector3())
    const worldSize   = bbox.getSize(new THREE.Vector3())

    // Robust outward normal from the screen's world matrix (no ray guesses)
    const m = screen.matrixWorld
    const ax = new THREE.Vector3().setFromMatrixColumn(m, 0).normalize()
    const ay = new THREE.Vector3().setFromMatrixColumn(m, 1).normalize()
    const az = new THREE.Vector3().setFromMatrixColumn(m, 2).normalize()
    // choose the axis with the smallest extent as the face normal
    const smallest = ['x','y','z'].sort((a,b)=>worldSize[a]-worldSize[b])[0]
    let worldNormal = ({x:ax,y:ay,z:az}[smallest]).clone()
    // face the camera (assume camera near +Z looking toward origin)
    const cameraGuess = new THREE.Vector3(0, 1.2, 2.2)
    if (worldNormal.dot(cameraGuess.clone().sub(worldCenter)) < 0) {
      worldNormal.multiplyScalar(-1)
    }

    // Orient an object so +Z points out of the glass
    const orientWorld = new THREE.Object3D()
    orientWorld.position.copy(worldCenter)
    orientWorld.lookAt(worldCenter.clone().sub(worldNormal)) // +Z outward

    const parent = groupRef.current
    const parentInv = new THREE.Matrix4().copy(parent.matrixWorld).invert()

    const localCenter = worldCenter.clone().applyMatrix4(parentInv)

    const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion())
    const localQuat = orientWorld.quaternion.clone().premultiply(parentWorldQuat.invert())
    const localEuler = new THREE.Euler().setFromQuaternion(localQuat)

    // Convert world size → local units (uniform-ish scale assumption)
    const parentScale = parent.getWorldScale(new THREE.Vector3())
    const uniform = (parentScale.x + parentScale.y + parentScale.z) / 3
    const localSize = worldSize.clone().divideScalar(uniform)

    setInfo({ localCenter, localEuler, localSize })
    onAnchor?.({ center: worldCenter, normal: worldNormal, height: Math.max(worldSize.y, worldSize.x) })
  }, [scene, onAnchor])

  // CSS render size for DOM (resolution only)
  const cssSize = useMemo(() => {
    if (!info) return { w: 1000, h: 600 }
    const aspect = info.localSize.x / info.localSize.y
    const w = 1200
    const h = Math.round(w / aspect)
    return { w, h }
  }, [info])

  // Fit DOM plane to glass width with bezel margin
  const htmlScaleLocal = useMemo(() => {
    if (!info) return 1
    return (info.localSize.x * bezelMargin) / cssSize.w
  }, [info, cssSize.w, bezelMargin])

  // Slight offset in front of glass, but in local units (ignore parent scaling)
  const localZ = useMemo(() => {
    if (!info) return 0.02
    const s = groupRef.current?.getWorldScale(new THREE.Vector3()).x ?? 1
    return 0.02 / s
  }, [info])

  // While UI is active, don't let clicks collapse the PC
  const safeOnClick = pcActive ? undefined : onClick

  return (
    <group ref={groupRef} position={position} scale={scale} onClick={safeOnClick}>
      <primitive object={scene} />

      {info && (
        <group position={info.localCenter} rotation={info.localEuler}>
          {/* Black screen cover — does NOT catch pointer/raycast */}
          <mesh
            ref={coverRef}
            position={[0, 0, localZ * 0.3]}
            // Make sure it never blocks clicks/rays
            raycast={() => null}
          >
            <planeGeometry args={[info.localSize.x * 0.995, info.localSize.y * 0.995]} />
            <meshStandardMaterial color="#090c12" opacity={1} />
          </mesh>

          {/* UI overlay — auto-fit * your boost */}
          <Html
            transform
            portal={{}}
            zIndexRange={[100, 0]}
            // most important to make the DOM clickable
            pointerEvents="auto"
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e)=>{ e.stopPropagation() }}
            onWheel={(e)=>{ e.stopPropagation() }}
            position={[0, 0, localZ]}
            rotation={[0, Math.PI, 0]}           // flip if text appears mirrored
            scale={htmlScaleLocal * uiScale}     // <— your requested scaling behavior
            >
            <ScreenDesktopUI />
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
  // client-only preloads (avoid SSR URL errors)
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
          bezelMargin={0.965}
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

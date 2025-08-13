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

/* ========== In-monitor UI  ========== */
function ScreenDesktopUI({ power = 1 }) {
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
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: 25,
        fontFamily: "'VT323', monospace",
        WebkitFontSmoothing: 'none',
        textShadow: '0 0 2px rgba(255,255,255,0.2)',
        opacity: power,
        transition: 'opacity .15s linear',
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
      style={{
        color: '#60a5fa',
        ...(props.style || {}),
        opacity: power,
        transition: 'opacity .15s linear',
      }}
    />
  )

  const TextMediaRow = ({ children, imgSrc, imgAlt, reverse = false }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: reverse ? '1fr 1.2fr' : '1.2fr 1fr',
        gap: 12,
        alignItems: 'center',
        marginTop: 12,
        opacity: power,
        transition: 'opacity .15s linear',
      }}
    >
      {!reverse && <div style={{ lineHeight: 1 }}>{children}</div>}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <img
          src={imgSrc}
          alt={imgAlt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {reverse && <div style={{ lineHeight: 1 }}>{children}</div>}
    </div>
  )

  return (
    <>
      {/* load pixel font just for this subtree */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
      />
      <div
        onWheel={stopBubble}
        style={{
          width: '100%',
          height: '100%',
          color: '#e5e7eb',
          fontFamily: "'VT323', monospace",
          fontSize: 30,
          lineHeight: 1,
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'grayscale',
          textShadow: '0 0 2px rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'column',
          background: '#434549ff',
          pointerEvents: power > 0.25 ? 'auto' : 'none',
          opacity: power,
          transition: 'opacity .18s linear',
          filter: `brightness(${0.4 + 0.6 * power}) contrast(${0.9 + 0.2 * power})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 10px',
            background: '#111',
            borderBottom: '1px solid #222',
          }}
        >
          <strong style={{ fontSize: 30, opacity: power }}>GersonOS</strong>
          <div style={{ display: 'flex', gap: 10 }}>
            <Tab id="about">About</Tab>
            <Tab id="resume">Resume</Tab>
            <Tab id="socials">Socials</Tab>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 'about' && (
            <div>
              <h3 style={{ margin: '6px 0 8px 0', fontSize: 50, opacity: power }}>
                About Me
              </h3>

              <p style={{ margin: '6px 0 10px 0', opacity: power }}>
                Hi, I’m <span style={{ color: '#a7f3d0' }}>Gerson Hernandez Lima</span>. I'm a junior at Middlebury College pursuing a degree in <span style={{ color: '#fcd34d' }}>Computer Science</span>. 
                I’m an aspiring Software Engineer with a strong passion for <span style={{ color: '#34d399' }}>data analysis</span> and building impactful, <span style={{ color: '#c084fc' }}>user-centered technology</span>. 
                I am of <span style={{ color: '#f59e0b' }}>hispanic</span> origins and I was raised in <span style={{ color: '#f59e0b' }}>Tampa</span>, <span style={{ color: '#60a5fa' }}>Florida</span> (thats why there is a palm tree in the background lol) .
              </p>

              <p style={{ margin: '6px 0 10px 0', opacity: power }}>
                I’ve worked on projects that blend technical problem-solving with real-world applications—from streamlining donation processing for <span style={{ color: '#fca5a5' }}>Patagonia Education</span> with a 
                custom multi-step platform using <span style={{ color: '#93c5fd' }}>Stripe</span> and automated email workflows, to improving admin dashboards and payments for 
                <span style={{ color: '#86efac' }}> MiddDash</span>, Middlebury’s student-run food delivery service. My technical toolkit includes Java, Python, C, TypeScript, HTML, and R, and I’m comfortable with 
                <span style={{ color: '#60a5fa' }}> API integrations</span>, <span style={{ color: '#f59e0b' }}>database management</span>, and building <span style={{ color: '#34d399' }}>responsive web apps</span>. I thrive in collaborative spaces where I can ship polished, reliable features.
              </p>

              <TextMediaRow imgSrc="/snowboarding.jpg" imgAlt="Snowboarding at Middlebury Snow Bowl">
                <p style={{ margin: 0 }}>
                  Outside of tech, I’m a lifelong athlete and a big soccer fan (BIG <span style={{ color: '#004D98' }}>FC</span> <span style={{ color: '#A50044' }}>Barcelona</span> fan). My favorite hobby is <span style={{ color: '#67e8f9' }}>Snowboarding</span>. Middlebury <span style={{ color: '#60a5fa' }}>Snow Bowl</span> was my first mountain and the place that hooked me. 
                  I even created a <span style={{ color: '#fbbf24' }}>3D model</span> of my exact board so you can see it <em>outside</em> the computer in this scene (look around the room, the board is modeled right there).
                </p>
              </TextMediaRow>

              <TextMediaRow imgSrc="/bass_guitar.jpeg" imgAlt="Playing bass guitar" reverse>
                <p style={{ margin: 0 }}>
                  I’m also a musician and have been playing <span style={{ color: '#f472b6' }}>bass guitar</span> for over seven years. Whether I’m learning a new riff or exploring a new framework, 
                  I’m driven by curiosity, discipline, and the urge to keep growing.
                </p>
              </TextMediaRow>

              <div style={{ marginTop: 16, opacity: power }}>
                <h4 style={{ fontSize: 36, margin: '10px 0 6px 0' }}>Let’s Connect</h4>
                <p style={{ margin: 0 }}>
                  I’m always open to collaborating on thoughtful projects and exploring new challenges in
                  software engineering and data-driven solutions.
                </p>
              </div>
            </div>
          )}

          {tab === 'resume' && (
            <div style={{ height: '100%', opacity: power }}>
              <iframe
                src="/resume.pdf"
                title="Resume"
                style={{ width: '100%', height: '100%', border: 'none', background: '#0b0f16' }}
              />
            </div>
          )}

          {tab === 'socials' && (
            <div style={{ opacity: power }}>
              <h3 style={{ margin: '6px 0 8px 0', fontSize: 22 }}>Connect</h3>
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
    </>
  )
}

/* ======= PC with DOM CRT overlay (slower shutter + proper white-streak fade) ======= */
function PCInteractive({
  position, scale = 1,
  onClick, onAnchor,
  pcActive = false,
  uiScale = 44,
  bezelMargin = 0.98,
  powerOnDelayMs = 450,
}) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/PC.glb')

  const [info, setInfo] = useState(null) // { localCenter, localEuler, widthLocal, heightLocal }
  const coverRef = useRef()

  // Smooth values (0..1)
  const powerRef = useRef(0)
  const shutterRef = useRef(0)
  const [power, setPower] = useState(0)
  const [shutter, setShutter] = useState(0)

  // White streak driver (0..1)
  const [streak, setStreak] = useState(0)
  const streakRef = useRef(0)
  const lastEffectiveRef = useRef(false)
  const streakHoldRef = useRef(0)
  const STREAK_HOLD_MS = 260 // hold briefly after power-off

  // Delay gate for "effective" on-state
  const activatedAtRef = useRef(null)

  // Axis correction for a mesh authored Z-up and Y-back
  const FIX_EULER = useMemo(() => new THREE.Euler(-Math.PI / 2, Math.PI, 0), [])
  const FIX_Q = useMemo(() => new THREE.Quaternion().setFromEuler(FIX_EULER), [FIX_EULER])

  useFrame((_, dt) => {
    const now = performance.now()

    // Track when pcActive became true; only allow "effectiveActive" after delay
    if (pcActive) {
      if (activatedAtRef.current == null) activatedAtRef.current = now
    } else {
      activatedAtRef.current = null
    }
    const effectiveActive = pcActive && (now - (activatedAtRef.current ?? 0) >= powerOnDelayMs)

    // Falling edge -> start short hold for the streak
    if (lastEffectiveRef.current && !effectiveActive) {
      streakHoldRef.current = now
    }
    lastEffectiveRef.current = effectiveActive

    // --- Slower shutter for emphasis ---
    const shutterTarget = effectiveActive ? 1 : 0
    shutterRef.current = THREE.MathUtils.damp(shutterRef.current, shutterTarget, 6.5, dt) // was 10

    // Power/brightness behind the shutter
    const powerTarget = effectiveActive ? 1 : 0
    powerRef.current = THREE.MathUtils.damp(powerRef.current, powerTarget, 4.0, dt)

    if (Math.abs(powerRef.current - power) > 0.002) setPower(powerRef.current)
    if (Math.abs(shutterRef.current - shutter) > 0.002) setShutter(shutterRef.current)

    // Fade the black cover inversely to power
    const mat = coverRef.current?.material
    if (mat) {
      mat.transparent = true
      const coverTarget = 1 - powerRef.current
      mat.opacity = THREE.MathUtils.damp(mat.opacity ?? coverTarget, coverTarget, 10, dt)
    }

    // ------- White streak logic (fixed) -------
    // Shape peaks mid-close and is zero when fully open or fully closed.
    // s in [0,1] where 1=open; 0=closed
    const s = shutterRef.current
    const closingShape = (1 - s) * s * 4 // normalized parabola, 0 at s=0 or 1, peaks ≈1 at s=0.5
    const shaped = THREE.MathUtils.clamp(closingShape, 0, 1)

    // Linger a bit after OFF
    const hold = Math.max(0, 1 - (now - (streakHoldRef.current || 0)) / STREAK_HOLD_MS)

    // Only show when turning off; never while turning on
    const targetStreak = !effectiveActive ? Math.max(shaped, hold) : 0

    streakRef.current = THREE.MathUtils.damp(streakRef.current, targetStreak, 8.0, dt)
    if (Math.abs(streakRef.current - streak) > 0.003) setStreak(streakRef.current)
  })

  useLayoutEffect(() => {
    const screen = scene.getObjectByName('Screen')
    if (!screen || !screen.geometry) {
      console.warn('PCInteractive: Mesh named "Screen" with geometry not found.')
      return
    }

    screen.geometry.computeBoundingBox()
    const gbox = screen.geometry.boundingBox.clone()
    const gsize = gbox.getSize(new THREE.Vector3())

    groupRef.current?.updateWorldMatrix(true, true)
    screen.updateMatrixWorld(true)
    const parentInv = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert()
    const localMatrix = new THREE.Matrix4().multiplyMatrices(parentInv, screen.matrixWorld)

    const localPos = new THREE.Vector3()
    const localQuat = new THREE.Quaternion()
    const localScale = new THREE.Vector3()
    localMatrix.decompose(localPos, localQuat, localScale)

    const fixedLocalQuat = localQuat.clone().multiply(FIX_Q)
    const fixedLocalEuler = new THREE.Euler().setFromQuaternion(fixedLocalQuat)

    const geomCenterLocal = gbox.getCenter(new THREE.Vector3())
    const worldCenter = geomCenterLocal.applyMatrix4(screen.matrixWorld)
    const worldQuat = screen.getWorldQuaternion(new THREE.Quaternion()).multiply(FIX_Q)
    const worldScale = screen.getWorldScale(new THREE.Vector3())

    let worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize()
    const wideCam = new THREE.Vector3(-1.8, 1.4, 2.6)
    if (worldNormal.dot(wideCam.clone().sub(worldCenter)) < 0) worldNormal.multiplyScalar(-1)

    const localDims = [
      gsize.x * localScale.x,
      gsize.y * localScale.y,
      gsize.z * localScale.z,
    ].sort((a, b) => b - a)
    const widthLocal = localDims[0]
    const heightLocal = localDims[1]

    const worldDims = [
      gsize.x * worldScale.x,
      gsize.y * worldScale.y,
      gsize.z * worldScale.z,
    ].sort((a, b) => b - a)
    const worldHeight = worldDims[1]

    setInfo({ localCenter: localPos, localEuler: fixedLocalEuler, widthLocal, heightLocal })
    onAnchor?.({ center: worldCenter, normal: worldNormal, height: worldHeight })
  }, [scene, onAnchor, FIX_Q])

  const cssSize = useMemo(() => {
    if (!info) return { w: 1200, h: 675 }
    const aspect = info.widthLocal / info.heightLocal
    const w = 1200
    const h = Math.round(w / aspect)
    return { w, h }
  }, [info])

  const htmlScaleLocal = useMemo(() => {
    if (!info) return 1
    const sW = (info.widthLocal * bezelMargin) / cssSize.w
    const sH = (info.heightLocal * bezelMargin) / cssSize.h
    return Math.min(sW, sH)
  }, [info, cssSize.w, cssSize.h, bezelMargin])

  const localZ = useMemo(() => {
    if (!info) return 0.01
    const s = groupRef.current?.getWorldScale(new THREE.Vector3()).x ?? 1
    return 0.01 / s
  }, [info])

  const safeOnClick = pcActive ? undefined : onClick

  return (
    <group ref={groupRef} position={position} scale={scale} onClick={safeOnClick}>
      <primitive object={scene} />

      {info && (
        <group position={info.localCenter} rotation={info.localEuler}>
          {/* Black cover just behind the DOM (fades out as power ↑) */}
          <mesh ref={coverRef} position={[0, 0, localZ * 0.3]} raycast={() => null}>
            <planeGeometry args={[info.widthLocal * 1.0, info.heightLocal * 1.0]} />
            <meshStandardMaterial color="#090c12" opacity={1} />
          </mesh>

          {/* DOM overlay with CRT stack */}
          <Html
            transform
            portal={{}}
            zIndexRange={[100, 0]}
            pointerEvents="auto"
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e)=>{ e.stopPropagation() }}
            onWheel={(e)=>{ e.stopPropagation() }}
            position={[0, 0.07, localZ]}             // slightly higher
            rotation={[0, Math.PI, 0]}
            scale={htmlScaleLocal * uiScale}
          >
            {(() => {
              const R = 21;                       // corner radius (px)
              const W = cssSize.w * 0.93;         // slightly smaller than measured screen
              const H = cssSize.h * 0.90;

              // --------- Shutter (both ways) ----------
              const topBottomPct = (1 - shutter) * 50;

              // --------- Off-only width narrow ----------
              const OFF_NARROW_MAX_PCT = 3;
              const closingOrOff = shutter < 0.999 && power < 0.999 && shutter <= power + 0.001;
              const sidePct = closingOrOff ? (1 - shutter) * OFF_NARROW_MAX_PCT : 0;

              const shutterClip = `inset(${topBottomPct}% ${sidePct}% ${topBottomPct}% ${sidePct}% round ${R}px)`;

              // --------- White streak visuals ----------
              const bandH = Math.max(2, H * (0.015 + 0.06 * Math.max(0, shutter)))
              const bandGlow = Math.max(6, bandH * 2.6)
              const streakOpacity = 0.9 * streak

              return (
                <div
                  style={{
                    position: 'relative',
                    width: `${W}px`,
                    height: `${H}px`,
                    borderRadius: `${R}px`,
                    overflow: 'hidden',
                    filter: 'contrast(1.12) saturate(0.92) hue-rotate(-5deg)',
                    transform: 'translateZ(0)',
                    background: '#02040a',
                  }}
                >
                  {/* MASK: everything inside respects rounded corners + shutter */}
                  <div style={{
                    position:'absolute', inset:0,
                    borderRadius:'inherit',
                    clipPath: shutterClip,
                    overflow:'hidden',
                  }}>
                    {/* UI */}
                    <div style={{ width:'100%', height:'100%' }}>
                      <ScreenDesktopUI power={power} />
                    </div>

                    {/* scanlines */}
                    <div
                      className="crt-scan"
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        mixBlendMode:'multiply',
                        backgroundImage:
                          'repeating-linear-gradient(to bottom, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, rgba(0,0,0,0.0) 2px)',
                        backgroundSize: '100% 2px',
                        opacity: power,
                      }}
                    />

                    {/* dot-pitch */}
                    <div
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        mixBlendMode:'multiply',
                        backgroundImage:
                          'repeating-linear-gradient(to right, rgba(0,0,0,0.08) 0 1px, rgba(0,0,0,0) 1px 3px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0 1px, rgba(0,0,0,0) 1px 3px)',
                        backgroundSize: '3px 3px, 3px 3px',
                        opacity: power,
                      }}
                    />

                    {/* vignette */}
                    <div
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        background:
                          'radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.16) 100%)',
                        opacity: power,
                      }}
                    />

                    {/* grain */}
                    <div
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        mixBlendMode:'multiply',
                        backgroundImage: `url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>\
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>\
<rect width='100%' height='100%' filter='url(%23n)' opacity='0.05'/></svg>")`,
                        backgroundSize: '128px 128px',
                        animation: 'grainMove 2.4s steps(30) infinite',
                        opacity: power,
                      }}
                    />

                    {/* dual flicker */}
                    <div
                      className="crt-flicker-bright"
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        background: 'rgba(255,255,255,0.04)',
                        mixBlendMode:'screen',
                        animation: 'crtFlickerBright 1s steps(60) infinite',
                        opacity: power,
                      }}
                    />
                    <div
                      className="crt-flicker-dark"
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        background: 'rgba(0,0,0,0.06)',
                        mixBlendMode:'multiply',
                        animation: 'crtFlickerDark 1s steps(60) infinite',
                        opacity: power,
                      }}
                    />

                    {/* chroma fringe */}
                    <div
                      style={{
                        pointerEvents:'none',
                        position:'absolute', inset:0,
                        mixBlendMode:'screen',
                        background: `
                          radial-gradient(80% 80% at 50% 50%, rgba(255,0,0,0.00) 55%, rgba(255,0,0,0.05) 100%),
                          radial-gradient(80% 80% at 50% 50%, rgba(0,255,255,0.00) 55%, rgba(0,255,255,0.04) 100%)
                        `,
                        opacity: power,
                      }}
                    />
                  </div>

                  {/* ===== White streak of light (appears on power-down) ===== */}
                  {streak > 0.001 && (
                    <div
                      style={{
                        pointerEvents: 'none',
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.9 * streak,
                        mixBlendMode: 'screen',
                      }}
                    >
                      {/* Core bright line */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `calc(50% - ${bandH / 2}px)`,
                          height: `${bandH}px`,
                          background:
                            'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0) 100%)',
                        }}
                      />
                      {/* Soft glow */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `calc(50% - ${bandGlow / 2}px)`,
                          height: `${bandGlow}px`,
                          background:
                            'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)',
                          filter: 'blur(1.2px)',
                        }}
                      />
                    </div>
                  )}

                  <style>{`
                    @keyframes crtFlickerBright { 0%{opacity:.02}50%{opacity:.06}100%{opacity:.02} }
                    @keyframes crtFlickerDark   { 0%{opacity:.02}50%{opacity:.05}100%{opacity:.02} }
                    @keyframes scanDrift        { 0%{background-position-y:0px}100%{background-position-y:1px} }
                    .crt-scan { animation: scanDrift 6s linear infinite alternate; }
                    @keyframes grainMove        { 0%{background-position:0 0}100%{background-position:64px 64px} }
                  `}</style>
                </div>
              )
            })()}
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
          bezelMargin={0.98}
          powerOnDelayMs={450}
        />

        <Suspense
          fallback={
            <PhotoFrameFallback
              position={[-0.4, 0.57, 0.17]}
              rotation={[0, Math.PI * 0.08, 0]}
              scale={0.06}
              onClick={onFrameClick}
            />
          }
        >
          <PhotoFrameGLB
            position={[-0.4, 0.57, 0.17]}
            rotation={[0, Math.PI * 0.08, 0]}
            scale={0.06}
            onClick={onFrameClick}
          />
        </Suspense>
      </Suspense>

      {/* Gaming Chair */}
      <Suspense
        fallback={
          <GamingChairFallback
            position={[-0.6, 0, 0.5]}
            rotation={[0, Math.PI / 2, 0]}
            scale={0.5}
          />
        }
      >
        <GamingChairGLB
          position={[-0.5, 0, 0.8]}
          rotation={[0, Math.PI / 1.9, 0]}
          scale={0.4}
        />
      </Suspense>

      {/* Others */}
      <Suspense
        fallback={
          <SnowboardFallback
            onClick={onSnowboardClick}
            position={[1.5, 0.7, -0.6]}
            scale={0.9}
          />
        }
      >
        <SnowboardGLB onClick={onSnowboardClick} position={[1.5, 0, -0.6]} scale={0.9} />
      </Suspense>

      <Suspense
        fallback={
          <SoccerBallFallback
            onClick={onSoccerClick}
            position={[-0.9, 0.12, 0.4]}
            scale={0.2}
          />
        }
      >
        <SoccerBallGLB onClick={onSoccerClick} position={[-0.9, 0.3, 0.4]} scale={0.2} />
      </Suspense>

      <Suspense
        fallback={
          <PalmTreeFallback onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
        }
      >
        <PalmTreeGLB onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
      </Suspense>
    </group>
  )
}

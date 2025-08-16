'use client'

import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

export default function IntroLoader({
  show = true,
  onContinue = () => {},
  minVisibleMs = 900,   // keep it visible briefly so it doesn't flash
  postReadyHoldMs = 500 // tiny settle buffer after loading
}) {
  const { active, progress } = useProgress() // progress: 0..100, active: boolean
  const mountedAtRef = useRef(Date.now())
  const [canContinue, setCanContinue] = useState(false)

  // Reset when re-shown
  useEffect(() => {
    if (show) {
      mountedAtRef.current = Date.now()
      setCanContinue(false)
    }
  }, [show])

  // Safety fallback: unlock after 6s even if something stalls
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => setCanContinue(true), 6000)
    return () => clearTimeout(id)
  }, [show])

  // Unlock the button once loading is done AND our minimum visible time has passed
  useEffect(() => {
    if (!active && progress >= 99) {
      const elapsed = Date.now() - mountedAtRef.current
      const delay = Math.max(0, minVisibleMs - elapsed) + postReadyHoldMs
      const t = setTimeout(() => setCanContinue(true), delay)
      return () => clearTimeout(t)
    }
  }, [active, progress, minVisibleMs, postReadyHoldMs])

  if (!show) return null

  const pct = Math.min(100, Math.max(0, progress))
  const label = canContinue
    ? 'Ready'
    : active || pct < 99
    ? 'Preparing models…'
    : 'Finalizing…'

  const wrap = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(6,10,16,0.92)',
    backdropFilter: 'blur(2px)',
    zIndex: 9999,
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'VT323', monospace",
    color: '#e5e7eb',
  }
  const card = {
    width: 'min(520px, 92vw)',
    borderRadius: 14,
    border: '1px solid #1f2937',
    background: '#0b0f16',
    padding: '18px',
    boxShadow: '0 10px 35px rgba(0,0,0,0.45)',
  }
  const barWrap = {
    width: '100%',
    height: 16,
    background: '#0a1420',
    border: '1px solid #1f2a3a',
    borderRadius: 999,
    overflow: 'hidden',
  }
  const barFill = {
    width: `${pct}%`,
    height: '100%',
    background: 'linear-gradient(90deg,#3b82f6 0%,#22d3ee 50%,#34d399 100%)',
    transition: 'width 220ms ease',
  }

  return (
    <div
      style={wrap}
      role="dialog"
      aria-modal="true"
      aria-label="Loading overlay"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '2px 0 10px', fontSize: 42, lineHeight: 1 }}>Loading</h2>

        <div style={barWrap} aria-hidden>
          <div style={barFill} />
        </div>
        <div style={{ marginTop: 8, fontSize: 24, opacity: 0.9 }}>
          {Math.round(pct)}% <span style={{ opacity: 0.7 }}>• {label}</span>
        </div>

        <p style={{ marginTop: 14, fontSize: 22, lineHeight: 1.15, color: '#cbd5e1' }}>
          <strong>Heads up:</strong> this was designed for desktop/laptop. On phones, some controls
          and performance may not work as intended.
        </p>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={!canContinue}
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: 28,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: canContinue ? '#374151' : '#1f2937',
              color: '#e5e7eb',
              cursor: canContinue ? 'pointer' : 'not-allowed',
            }}
            onClick={onContinue}
          >
            {canContinue ? 'Continue' : 'Loading…'}
          </button>
        </div>
      </div>
    </div>
  )
}

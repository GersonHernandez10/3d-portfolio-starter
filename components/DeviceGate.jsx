'use client'

import { useEffect, useState } from 'react'

/**
 * Hard-blocks phones/small screens with a full-screen overlay.
 * - Detects via userAgent OR viewport width < minWidth (default 900px).
 * - Uses VT323 vibe + same overlay look as your loader.
 */
export default function DeviceGate({ minWidth = 900 }) {
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isHandheldUA = /Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry|webOS/i.test(ua)

    const evaluate = () => {
      const small = typeof window !== 'undefined' ? window.innerWidth < minWidth : false
      setIsBlocked(isHandheldUA || small)
    }

    evaluate()
    window.addEventListener('resize', evaluate)
    return () => window.removeEventListener('resize', evaluate)
  }, [minWidth])

  if (!isBlocked) return null

  const wrap = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(6,10,16,0.95)',
    backdropFilter: 'blur(2px)',
    zIndex: 10001, 
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'VT323', monospace",
    color: '#e5e7eb',
  }

  const card = {
    width: 'min(560px, 92vw)',
    borderRadius: 14,
    border: '1px solid #1f2937',
    background: '#0b0f16',
    padding: '20px',
    boxShadow: '0 10px 35px rgba(0,0,0,0.45)',
    textAlign: 'center',
  }

  const h = { margin: '2px 0 10px', fontSize: 42, lineHeight: 1 }
  const p = { margin: '10px 0 0', fontSize: 22, lineHeight: 1.2, color: '#cbd5e1' }

  const row = { marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }
  const btn = {
    fontFamily: "'VT323', monospace",
    fontSize: 26,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #374151',
    background: '#1f2937',
    color: '#e5e7eb',
    cursor: 'pointer',
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied — open it on your computer!')
    } catch {}
  }

  const emailLink = () => {
    const subject = encodeURIComponent('Portfolio link')
    const body = encodeURIComponent(`Open this on your computer:\n\n${window.location.href}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div
      style={wrap}
      role="dialog"
      aria-modal="true"
      aria-label="Desktop only"
      onPointerDown={(e)=>e.stopPropagation()}
      onWheel={(e)=>e.stopPropagation()}
    >
      <div style={card} onClick={(e)=>e.stopPropagation()}>
        <h2 style={h}>Desktop Only</h2>
        <p style={p}>
          This experience was designed for a desktop or laptop computer.
          Please visit on a larger screen to continue.
        </p>
        <div style={row}>
          <button type="button" style={btn} onClick={copyLink}>Copy Link</button>
        </div>
      </div>
    </div>
  )
}

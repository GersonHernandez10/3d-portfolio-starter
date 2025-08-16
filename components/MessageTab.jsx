'use client'

import { useState, useRef, useEffect } from 'react'

export default function MessageTab({ power = 1 }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // { ok:bool, msg:string }
  const formRef = useRef(null)

  // keep focus friendly when tab is opened
  useEffect(() => {
    if (power > 0.25) {
      const el = formRef.current?.querySelector('input,textarea,button')
      el?.focus()
    }
  }, [power])

  async function onSubmit(e) {
    e.preventDefault()
    setStatus(null)

    const trimmedName = name.trim()
    const trimmedMsg = message.trim()
    if (!trimmedName) {
      setStatus({ ok: false, msg: 'Name is required.' })
      return
    }
    if (!trimmedMsg) {
      setStatus({ ok: false, msg: 'Message is required.' })
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, subject: subject.trim(), message: trimmedMsg }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to send message.')
      setStatus({ ok: true, msg: 'Sent! Thanks — I’ll get back to you soon.' })
      setName('')
      setSubject('')
      setMessage('')
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Something went wrong.' })
    } finally {
      setSending(false)
    }
  }

  const baseInput = {
    width: '100%',
    fontSize: 24,
    fontFamily: "'VT323', monospace",
    color: '#e5e7eb',
    background: '#0b0f16',
    border: '1px solid #222',
    borderRadius: 8,
    padding: '10px 12px',
    outline: 'none',
  }

  return (
    <div style={{ opacity: power, transition: 'opacity .15s linear' }} onWheel={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()}>
      <h3 style={{ margin: '6px 0 12px 0', fontSize: 50 }}>Leave me a message</h3>

      <form ref={formRef} onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
        {/* Name (required) */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 26, color: '#a7f3d0' }}>Name *</span>
          <input
            type="text"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            placeholder="Your name"
            style={baseInput}
            aria-required="true"
          />
        </label>

        {/* Subject (optional) */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 26, color: '#fcd34d' }}>Subject (optional)</span>
          <input
            type="text"
            value={subject}
            onChange={(e)=>setSubject(e.target.value)}
            placeholder="What’s this about?"
            style={baseInput}
          />
        </label>

        {/* Message (required) */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 26, color: '#93c5fd' }}>Message *</span>
          <textarea
            value={message}
            onChange={(e)=>setMessage(e.target.value)}
            placeholder="leave a message, include your email if you want a reply"
            rows={8}
            style={{ ...baseInput, resize: 'vertical', lineHeight: 1.2 }}
            aria-required="true"
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: 28,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #374151',
              background: sending ? '#1f2937' : '#374151',
              color: '#e5e7eb',
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Submit'}
          </button>

          {status && (
            <span
              role="status"
              style={{
                fontSize: 24,
                color: status.ok ? '#34d399' : '#f87171',
                textShadow: '0 0 2px rgba(255,255,255,0.15)',
              }}
            >
              {status.msg}
            </span>
          )}
        </div>
      </form>

      <p style={{ marginTop: 12, fontSize: 20, opacity: 0.7 }}>
        * Name and Message are required. Subject is optional.
      </p>
    </div>
  )
}

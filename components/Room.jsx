'use client'

import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ===== Helpers ===== */
function enableShadows(scene, { cast = true, receive = false } = {}) {
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = !!cast
      obj.receiveShadow = !!receive
    }
  })
}

/* --- Fallback helper: one mesh, any geometry --- */
const GEOMS = {
  box: (props) => <boxGeometry {...props} />,
  plane: (props) => <planeGeometry {...props} />,
  sphere: (props) => <sphereGeometry {...props} />,
  cylinder: (props) => <cylinderGeometry {...props} />,
  cone: (props) => <coneGeometry {...props} />,
}
function FallbackMesh({
  type = 'box',
  args = [],
  color = '#777',
  position,
  rotation,
  scale = 1,
  onClick,
  castShadow = true,
  receiveShadow = false,
  raycast, // optional (e.g., () => null)
  materialProps = {},
}) {
  const Geometry = GEOMS[type]
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...(raycast ? { raycast } : {})}
    >
      <Geometry args={args} />
      <meshStandardMaterial color={color} {...materialProps} />
    </mesh>
  )
}

/* ===== Invisible shadow-catcher ===== */
function ShadowCatcher({ size = 10, y = -0.001, opacity = 0.42 }) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[size, size]} />
      <shadowMaterial transparent opacity={opacity} />
    </mesh>
  )
}

/* ===== Generic GLB wrapper to remove repetition ===== */
function GLBModel({
  path,
  position,
  rotation,
  scale = 1,
  onClick,
  cast = true,
  receive = true,
  raycast,
}) {
  const { scene } = useGLTF(path)
  useEffect(() => { enableShadows(scene, { cast, receive }) }, [scene, cast, receive])
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick} {...(raycast ? { raycast } : {})}>
      <primitive object={scene} />
    </group>
  )
}

/* ================= Desk ================= */
const DeskGLB = (props) => <GLBModel path="/models/desk.glb" cast receive {...props} />

/* ========== Tiny helpers for Terminal ========== */
const URL = (href) => ({ __url: href })
const isUrlFile = (node) => node && typeof node === 'object' && !!node.__url
const isFile = (node) => typeof node === 'string' || isUrlFile(node)
const isDir = (node) => node && typeof node === 'object' && !node.__url

function normalizePath(base, input) {
  if (!input || input.trim() === '') return base
  let parts
  if (input.startsWith('/')) parts = input.split('/')
  else parts = (base + '/' + input).split('/')
  const stack = []
  for (const p of parts) {
    if (!p || p === '.') continue
    if (p === '..') stack.pop()
    else stack.push(p)
  }
  return '/' + stack.join('/')
}

function tokenize(line) {
  if (!line) return []
  const re = /"([^"]*)"|'([^']*)'|[^\s]+/g
  const out = []
  let m
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[0])
  return out
}

/* ========= Top-level Terminal (stable identity; won't remount) ========= */
const Terminal = memo(function Terminal({ power, api, onOpenTab, visible, onRequestClose }) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const HEADER = 'GersonOS v0.9 — type "help" to get started. Press ESC to leave Terminal'

  // Controlled input & persistent state
  const [cmdInput, setCmdInput] = useState('')
  const [lines, setLines] = useState(() => ([
    HEADER,
    ''
  ]))
  const [history, setHistory] = useState([])
  const [histIndex, setHistIndex] = useState(-1)
  const [cwd, setCwd] = useState('/home/gerson')

  // ---- Classic typing sounds (WebAudio) ----
  const audioCtxRef = useRef(null)
  const noiseBufRef = useRef(null)
  const readyRef = useRef(false)

  function ensureAudio() {
    if (readyRef.current) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    audioCtxRef.current = ctx

    // Make 1s of white noise (we'll play tiny slices for key clicks)
    const seconds = 1
    const rate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, rate * seconds, rate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1)

    noiseBufRef.current = buffer
    // Try to resume immediately after user gesture
    ctx.resume().catch(()=>{})
    readyRef.current = true
  }

  function playKey(kind='char') {
    const ctx = audioCtxRef.current
    const noise = noiseBufRef.current
    if (!ctx || !noise || ctx.state !== 'running') return

    const now = ctx.currentTime
    // random short slice in the noise buffer
    const sliceDur = kind === 'enter' ? 0.07 : kind === 'backspace' ? 0.06 : 0.045
    const startOffset = Math.random() * (noise.duration - sliceDur - 0.01)

    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = false
    src.playbackRate.value = 1 + (Math.random() * 0.08 - 0.04) // slight variance

    // filter chain to shape the click (hi-pass + subtle bandpass thunk)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = kind === 'enter' ? 1200 : kind === 'backspace' ? 1400 : 1800

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = kind === 'enter' ? 300 : kind === 'backspace' ? 380 : 420
    bp.Q.value = 1.2

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    const peak = kind === 'enter' ? 0.08 : kind === 'backspace' ? 0.06 : 0.05
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sliceDur)

    src.connect(hp).connect(bp).connect(gain).connect(ctx.destination)
    src.start(now, startOffset, sliceDur + 0.02)
  }

  // Minimal virtual FS (expanded with your new items)
  const VFS = useMemo(() => ({
    '/': {
      home: {
        gerson: {
          'README.txt': 'Welcome to my room! Use `projects` or `help`.',
          projects: {
            'Patagonia.md': 'Patagonia Education donations platform — Stripe, multi-step flow, email automations.',
            'MiddDash.md': 'Student-run food delivery service — admin dashboard & payments improvements.',
            'MCG.md': 'Middlebury Consulting Group — CPI analytics in R: cleaning, categorization, visualizations.',
            'ShinyApp.url': URL('https://ghernandezlima.shinyapps.io/Final_projectAPP/'),
            'MiddDash.url': URL('https://midddash.com'),
            '3DPortfolio.md': '3D interactive portfolio (this site) — React, drei, fiber, CRT effects, terminal.',
          },
          socials: {
            'github.url': URL('https://github.com/GersonHernandez10'),
            'linkedin.url': URL('https://linkedin.com/in/gerson-hernandez-lima-0408212b6'),
            'instagram.url': URL('https://www.instagram.com/813.gerson/'),
            'email.txt': 'gersonhernandez950@gmail.com',
          },
          'resume.url': URL('/resume.pdf'),
        }
      }
    }
  }), [])

  function getNode(path) {
    const norm = normalizePath('/', path)
    const parts = norm.split('/').filter(Boolean)
    let node = VFS['/']
    for (const p of parts) {
      if (!node || typeof node !== 'object') return undefined
      node = node[p]
    }
    return node
  }

  function listDir(path) {
    const node = getNode(path)
    if (!isDir(node)) return null
    return Object.keys(node).sort()
  }

  function print(...newLines) {
    setLines((prev) => [...prev, ...newLines])
  }

  function prompt() {
    const rel = cwd.replace('/home/gerson', '~')
    return `gerson@room:${rel}$ `
  }

  function openLink(href) {
    try {
      window.open(href, '_blank', 'noopener,noreferrer')
      print(`opening ${href}`)
    } catch {
      print(`failed to open: ${href}`)
    }
  }

  function handleCmd(raw) {
    const cmdline = raw.trim()
    if (!cmdline) { print(''); return }
    const args = tokenize(cmdline)
    const cmd = args[0]
    const rest = args.slice(1)

    // record history
    setHistory((h) => [...h, cmdline])
    setHistIndex(-1)

    print(prompt() + cmdline)

    switch (cmd) {
      case 'help': {
        print(
          'Core: help, clear, history, whoami, date, echo, pwd, ls, cd, cat, open',
          'Portfolio: projects, project <name>, resume, contact',
          'Shortcuts: open midddash | shinyapp | github | linkedin | instagram',
          'CRT: degauss, static [ms], glitch on|off, glitch stutter <0..2>, glitch green <0..2>',
          ''
        )
        break
      }
      case 'clear': {
        setLines([HEADER, ''])
        break
      }
      case 'history': {
        if (history.length === 0) { print('(empty)'); break }
        history.forEach((h, i) => print(`${i + 1}  ${h}`))
        break
      }
      case 'whoami': { print('gerson'); break }
      case 'date':
      case 'time': { print(new Date().toLocaleString()); break }
      case 'echo': { print(rest.join(' ')); break }
      case 'pwd': { print(cwd); break }
      case 'ls': {
        const target = rest[0] ? normalizePath(cwd, rest[0]) : cwd
        const items = listDir(target)
        if (!items) { print(`ls: not a directory: ${target}`); break }
        print(items.join('  '))
        break
      }
      case 'cd': {
        const target = rest[0] ? normalizePath(cwd, rest[0]) : '/home/gerson'
        const node = getNode(target)
        if (!node) print(`cd: no such file or directory: ${target}`)
        else if (!isDir(node)) print(`cd: not a directory: ${target}`)
        else setCwd(target)
        break
      }
      case 'cat': {
        if (!rest[0]) { print('cat: missing file'); break }
        const target = normalizePath(cwd, rest[0])
        const node = getNode(target)
        if (!node) print(`cat: no such file: ${target}`)
        else if (isUrlFile(node)) print(`(url) ${node.__url} — try: open ${rest[0]}`)
        else if (typeof node === 'string') print(node)
        else print(`cat: ${rest[0]}: is a directory`)
        break
      }
      case 'open': {
        const target = (rest[0] || '').toLowerCase()
        if (!target) { print('open: missing target'); break }
        if (['resume', 'cv'].includes(target)) { onOpenTab('resume'); print('opening resume tab'); break }
        if (['about'].includes(target)) { onOpenTab('about'); print('opening about tab'); break }
        if (['socials', 'contact'].includes(target)) { onOpenTab('socials'); print('opening socials tab'); break }
        if (target === 'github') { openLink('https://github.com/GersonHernandez10'); break }
        if (target === 'linkedin') { openLink('https://linkedin.com/in/gerson-hernandez-lima-0408212b6'); break }
        if (target === 'instagram') { openLink('https://www.instagram.com/813.gerson/'); break }
        if (target === 'midddash') { openLink('https://midddash.com'); break }
        if (target === 'shiny' || target === 'shinyapp') { openLink('https://ghernandezlima.shinyapps.io/Final_projectAPP/'); break }
        const node = getNode(normalizePath(cwd, target))
        if (isUrlFile(node)) { openLink(node.__url); break }
        if (/^https?:\/\//i.test(rest[0])) { openLink(rest[0]); break }
        print(`open: unknown target "${rest[0]}"`)
        break
      }
      case 'projects': {
        print('Projects:',
              '  Patagonia — Stripe donation flow (project Patagonia)',
              '  MiddDash — delivery platform & admin (project MiddDash)',
              '  MCG — Middlebury Consulting Group (project MCG)',
              '  ShinyApp — R Shiny final project (project ShinyApp)',
              '  3DPortfolio — this site (project 3DPortfolio)',
              'Use: project <name>   e.g., project ShinyApp')
        break
      }
      case 'project': {
        const name = (rest[0] || '').toLowerCase()
        if (name === 'patagonia') {
          print('Patagonia Education — donation platform',
                '• Custom multi-step donations with Stripe; automated email workflows.',
                '• Emphasis on reliability, UX polish, and data integrity.',
                'Tip: open resume | open socials')
        } else if (name === 'midddash') {
          print('MiddDash — student-run delivery platform',
                '• Admin dashboard improvements, payments, operational tooling.',
                '• Partial-save forms, validation, and webhooks.',
                'Open site: open midddash')
        } else if (name === 'mcg' || name === 'middleburyconsultinggroup' || name === 'consulting') {
          print('Middlebury Consulting Group — Data Analytics',
                '• Cleaned CPI datasets; R scripts for categorization; built client-facing visualizations.')
        } else if (name === 'shinyapp' || name === 'shiny') {
          print('R Shiny Final Project — Interactive analytics app',
                '• R + Shiny dashboards, filters, and interactive plots.',
                'Open app: open shinyapp')
        } else if (name === '3dportfolio' || name === 'portfolio' || name === '3d') {
          print('3D Portfolio — React + drei/fiber',
                '• Interactive room, CRT effects, in-screen terminal.',
                '• Custom overlays for degauss, scanlines, stutter tuning.')
        } else {
          print('project: unknown. Try: Patagonia | MiddDash | MCG | ShinyApp | 3DPortfolio')
        }
        break
      }
      case 'resume': { onOpenTab('resume'); print('opening resume tab'); break }
      case 'contact': {
        print('Email: gersonhernandez950@gmail.com',
              'GitHub: github.com/GersonHernandez10',
              'LinkedIn: linkedin.com/in/gerson-hernandez-lima-0408212b6')
        break
      }

      // ---- CRT / glitch commands  ----
      case 'degauss': { api?.degauss?.(); print('bzzt… degauss pulse triggered'); break }
      case 'static': {
        const ms = parseInt(rest[0], 10)
        api?.staticBurst?.(Number.isFinite(ms) ? ms : undefined)
        print(`colored static burst${Number.isFinite(ms) ? ` (${ms}ms)` : ''}`)
        break
      }
      case 'glitch': {
        const sub = (rest[0] || '').toLowerCase()
        if (sub === 'on') {
          api?.setStutter?.(1)
          api?.setGreenStrength?.(1)
          print('glitches enabled')
        } else if (sub === 'off') {
          api?.setStutter?.(0)
          api?.setGreenStrength?.(0)
          print('glitches disabled')
        } else if (sub === 'stutter') {
          const v = Math.max(0, Math.min(2, parseFloat(rest[1])))
          if (Number.isFinite(v)) { api?.setStutter?.(v); print(`stutter strength = ${v}`) }
          else print('usage: glitch stutter <0..2>')
        } else if (sub === 'green') {
          const v = Math.max(0, Math.min(2, parseFloat(rest[1])))
          if (Number.isFinite(v)) { api?.setGreenStrength?.(v); print(`green glitch strength = ${v}`) }
          else print('usage: glitch green <0..2>')
        } else {
          print('usage: glitch on|off | glitch stutter <0..2> | glitch green <0..2>')
        }
        break
      }

      default: { print(`command not found: ${cmd}`) }
    }

    print('')
  }

  // Focus + autoscroll
  useEffect(() => {
    if (visible && power > 0.25) {
      inputRef.current?.focus()
      const el = inputRef.current
      if (el) {
        const end = el.value.length
        el.setSelectionRange(end, end)
      }
    }
  }, [visible, power])

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const onKeyDownCapture = (e) => {
    // Eat Escape so it can't bubble to any global handlers
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent?.stopImmediatePropagation?.()
      onRequestClose?.()
    }
  }

  const onInputKeyDown = (e) => {
    // Sounds
    if (!readyRef.current) ensureAudio()

    if (e.key === 'Enter') {
      e.preventDefault()
      playKey('enter')
      const value = cmdInput
      setCmdInput('')
      handleCmd(value)
      return
    }
    if (e.key === 'Backspace') {
      playKey('backspace')
      return
    }
    // printable characters
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playKey('char')
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const idx = histIndex < 0 ? history.length - 1 : Math.max(0, histIndex - 1)
      setHistIndex(idx)
      setCmdInput(history[idx] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (history.length === 0) return
      const idx = histIndex < 0 ? -1 : Math.min(history.length - 1, histIndex + 1)
      setHistIndex(idx)
      setCmdInput(idx === -1 ? '' : (history[idx] || ''))
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      print(prompt() + '^C', '')
    }
  }

  const disabled = power <= 0.25

  return (
    <div
      onKeyDownCapture={onKeyDownCapture}
      onPointerDown={(e)=>e.stopPropagation()}
      tabIndex={-1}
      style={{
        position: 'absolute',
        inset: 12,
        display: visible ? 'grid' : 'none', // stays mounted => state persists
        gridTemplateRows: '1fr auto',
        gap: 8,
        fontFamily: "'VT323', monospace",
        color: '#d1fae5',
        background: '#061014',
        border: '1px solid #0a1f27',
        borderRadius: 8,
        padding: 12,
        opacity: power,
        transition: 'opacity .15s linear',
        filter: `brightness(${0.5 + 0.5 * power})`,
        zIndex: 5, // below glitch overlays (zIndex:7)
      }}
    >
      <div
        ref={containerRef}
        style={{
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: 22,
          lineHeight: 1.2,
          textShadow: '0 0 2px rgba(0,255,180,0.1)',
        }}
      >
        {lines.map((ln, i) => <div key={i}>{ln}</div>)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 22, color: '#34d399' }}>{`gerson@room:${cwd.replace('/home/gerson','~')}$ `}</div>
        <input
          ref={inputRef}
          disabled={disabled}
          value={cmdInput}
          onChange={(e)=>setCmdInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={disabled ? 'power off' : 'type a command…'}
          style={{
            flex: 1,
            fontSize: 22,
            fontFamily: "'VT323', monospace",
            background: 'transparent',
            color: '#e5e7eb',
            border: 'none',
            outline: 'none',
            caretColor: '#34d399',
            textShadow: '0 0 2px rgba(255,255,255,0.1)',
          }}
        />
      </div>
    </div>
  )
})

/* ========== In-monitor UI  ========== */
function ScreenDesktopUI({ power = 1, terminalAPI }) {
  const [tab, setTab] = useState('about')

  // Terminal visibility (no tab; press T)
  const [showTerminal, setShowTerminal] = useState(false)

  // Toggle Terminal with keyboard , but do NOT power off on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const tag = (e.target?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if (e.code === 'KeyT' && power > 0.25) {
        if (!isTyping) {
          e.preventDefault()
          e.stopPropagation()
          setShowTerminal((v) => !v)
        }
      }
      // Esc is handled inside Terminal via capture to avoid bubbling to app
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [power])

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

  const Link = ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
      {children}
    </a>
  )

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&display=swap" />
      <div
        onWheel={(e)=>{ e.stopPropagation() }}
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
          position: 'relative', // for terminal overlay
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
            <Tab id="experience">Experience</Tab>
            <Tab id="resume">Resume</Tab>
            <Tab id="socials">Socials</Tab>
            {/* (no Terminal tab; press T to toggle) */}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, position: 'relative' }}>
          {tab === 'about' && (
            <div>
              <h3 style={{ margin: '6px 0 8px 0', fontSize: 50, opacity: power }}>About Me</h3>

              <p style={{ margin: '6px 0 10px 0', opacity: power }}>
                Hi, I’m <span style={{ color: '#a7f3d0' }}>Gerson Hernandez Lima</span>. I'm a junior at Middlebury College (<span style = {{color: '#030663ff'}}>Go Panthers</span>) pursuing a degree in <span style={{ color: '#fcd34d' }}>Computer Science</span>. 
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

          {tab === 'experience' && (
            <div style={{ opacity: power }}>
              <h3 style={{ margin: '6px 0 12px 0', fontSize: 50 }}>Experience</h3>

              <section style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 38, color: '#fca5a5', margin: '0 0 6px 0' }}>
                  Patagonia Education — Donations Platform
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 26, lineHeight: 1.15 }}>
                  <li>Designed and implemented a custom Stripe payment system to handle both one-time and recurring donations, with campaign-specific metadata tracking.</li>
                  <li>Built multi-step Wix Velo forms that progressively saved donor information to a database, ensuring data retention even if forms were not fully completed.</li>
                  <li>Implemented webhook-based event handling to synchronize Stripe events with the Wix database in real time.</li>
                  
                </ul>
              </section>

              <section style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 38, color: '#34d399', margin: '0 0 6px 0' }}>
                  MiddDash — Student-run Delivery Platform
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 26, lineHeight: 1.15 }}>
                  <li>mplemented admin-side updates and dashboards to manage orders, track drivers, and adjust delivery settings in real time.</li>
                  <li>Managed GitHub-based development workflow and coordinated version control across contributors.</li>
                  <li>Designed and implemented a custom email automation system that sent personalized, real-time order status updates to customers based on food preparation and delivery stage.</li>
                  <li>Built and deployed a paycheck automation system for delivery drivers, reducing manual payroll processing by over 80%.</li>
                  <li>Developed an automatic restaurant scheduling system that opened and closed online ordering for restaurants based on pre-set daily and time-specific schedules.</li>
                  <li>Managed and maintained database</li>
                  <li>Live site: <Link href="https://midddash.com">midddash.com</Link></li>
                </ul>
              </section>

              <section style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 38, color: '#f59e0b', margin: '0 0 6px 0' }}>
                  Middlebury Consulting Group — Data Analytics
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 26, lineHeight: 1.15 }}>
                  <li>Conducted an in-depth analysis of Consumer Price Index (CPI) data to evaluate economic trends and their impact on client decision-making.</li>
                  <li>Cleaned, transformed, and organized large datasets in R, ensuring accuracy and consistency across multiple data sources.</li>
                  <li>Developed custom R scripts to automate data categorization, statistical calculations, and summary reporting.</li>
                  <li>Created clear, visually engaging data visualizations using R to present findings to non-technical stakeholders.</li>
                </ul>
              </section>

              <section style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 38, color: '#22d3ee', margin: '0 0 6px 0' }}>
                  R Shiny Final Project — Interactive Analytics App
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 26, lineHeight: 1.15 }}>
                  <li>Designed and developed an interactive R Shiny web application to analyze the relationship between antenatal steroid use and NEC incidence/mortality in preterm infants.</li>
                  <li>Processed and visualized a dataset of ~80,000 NICU records, stratified by gestational age and clinical outcomes.</li>
                  <li>Implemented thousands of simulated permutation tests to assess statistical significance across multiple gestational age groups.</li>
                  <li>Integrated dynamic data visualizations and interactive controls, enabling users to explore NEC incidence and mortality trends by steroid exposure.</li>
                  <li>Interpreted statistical outputs and validated results across training and holdout datasets, highlighting potential confounding by indication in observed associations.</li>
                  <li>Deployed the application online using shinyapps.io, ensuring public accessibility for research and educational purposes.</li>
                  <li>Try it: <Link href="https://ghernandezlima.shinyapps.io/Final_projectAPP/">Shiny App</Link></li>
                </ul>
              </section>

              <section>
                <h4 style={{ fontSize: 38, color: '#a78bfa', margin: '0 0 6px 0' }}>
                  3D Portfolio — This Site
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 26, lineHeight: 1.15 }}>
                  <li>Designed and developed a fully interactive 3D personal portfolio using React, Three.js, and @react-three/fiber to showcase projects in a dynamic environment.</li>
                  <li>Created and optimized custom 3D models in Blender, exporting and integrating them into the web.</li>
                  <li>Managed the full development cycle, including GitHub version control, asset optimization, and deployment pipeline setup.</li>
                  <li>Deployed the application with optimized asset loading for smooth performance on desktop and mobile browsers.</li>
                </ul>
              </section>
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
                <li><a href="https://github.com/GersonHernandez10" target="_blank" rel="noreferrer" style={{ color:'#60a5fa', opacity: power }}>GitHub</a></li>
                <li><a href="https://linkedin.com/in/gerson-hernandez-lima-0408212b6" target="_blank" rel="noreferrer" style={{ color:'#60a5fa', opacity: power }}>LinkedIn</a></li>
                <li><a href="mailto:gersonhernandez950@gmail.com" target="_blank" rel="noreferrer" style={{ color:'#60a5fa', opacity: power }}>Email</a></li>
                <li><a href="https://www.instagram.com/813.gerson/" target="_blank" rel="noreferrer" style={{ color:'#60a5fa', opacity: power }}>Instagram</a></li>
              </ul>
            </div>
          )}

          {/* Terminal overlay */}
          <Terminal
            power={power}
            api={terminalAPI}
            onOpenTab={setTab}
            visible={showTerminal}
            onRequestClose={() => setShowTerminal(false)}
          />
        </div>
      </div>
    </>
  )
}

/* ======= PC with DOM CRT overlay  ======= */
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
  useEffect(() => { enableShadows(scene, { cast: true, receive: true }) }, [scene])

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
  const STREAK_HOLD_MS = 260

  // Degauss pulse
  const [degauss, setDegauss] = useState(false)
  const lastOnRef = useRef(false)

  // Ultra-rare colored static
  const [staticBurst, setStaticBurst] = useState(false)
  const [staticHue, setStaticHue] = useState(0)
  const HUES = [0, 60, 120, 180, 240, 300] // R,Y,G,C,B,M

  // Glitch tuning
  const [stutterStrength, setStutterStrength] = useState(1) // 0..2
  const [greenStrength, setGreenStrength] = useState(1)     // 0..2

  // Random green glitches
  const [greenLineOn, setGreenLineOn] = useState(false)  // horizontal line
  const [greenLineY, setGreenLineY] = useState(0.5)
  const [greenTearOn, setGreenTearOn] = useState(false)  // vertical tear
  const [greenTearX, setGreenTearX] = useState(0.5)
  const [greenTearW, setGreenTearW] = useState(2)        // px width

  // Vertical roll state
  const [rollY, setRollY] = useState(0)
  const rollRef = useRef(0)
  const rollingRef = useRef(false)
  const ROLL_ENABLED = true

  // Occasional vertical roll
  useEffect(() => {
    if (!ROLL_ENABLED) return
    let alive = true, t, raf

    const schedule = () => {
      if (!alive) return
      const delay = 20000 + Math.random() * 20000 // 20–40s
      t = setTimeout(start, delay)
    }

    const start = () => {
      if (!alive) return
      if (powerRef.current <= 0.6 || rollingRef.current) return schedule()

      rollingRef.current = true
      const durUp = 900 + Math.random() * 600
      const durDown = 500 + Math.random() * 500
      const maxShift = -(12 + Math.random() * 24)

      const t0 = performance.now()
      const animate = (now) => {
        if (!alive) return
        const dt = now - t0

        if (dt <= durUp) {
          const p = dt / durUp
          const ease = 1 - Math.pow(1 - p, 2)
          rollRef.current = maxShift * ease
        } else if (dt <= durUp + durDown) {
          const p = (dt - durUp) / durDown
          const ease = 1 - Math.pow(1 - p, 2)
          rollRef.current = maxShift * (1 - ease)
        } else {
          rollRef.current = 0
          setRollY(0)
          rollingRef.current = false
          return schedule()
        }

        if (Math.abs(rollRef.current - rollY) > 0.5) setRollY(rollRef.current)
        raf = requestAnimationFrame(animate)
      }

      raf = requestAnimationFrame(animate)
    }

    schedule()
    return () => { alive = false; clearTimeout(t); cancelAnimationFrame(raf) }
  }, [rollY])

  //  occasional green horizontal line
  useEffect(() => {
    let alive = true, t1, t2
    const loop = () => {
      const delay = 4000 + Math.random() * 8000 // 4–12s
      t1 = setTimeout(() => {
        if (!alive) return
        if (powerRef.current > 0.3) {
          setGreenLineY(Math.random())
          setGreenLineOn(true)
          t2 = setTimeout(() => { if (alive) setGreenLineOn(false) }, 120 + Math.random() * 220)
        }
        loop()
      }, delay)
    }
    loop()
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Schedule occasional green vertical tear
  useEffect(() => {
    let alive = true, t1, t2
    const loop = () => {
      const delay = 6000 + Math.random() * 10000 // 6–16s
      t1 = setTimeout(() => {
        if (!alive) return
        if (powerRef.current > 0.3) {
          setGreenTearX(Math.random())
          setGreenTearW(1 + Math.round(Math.random())) // 1 or 2 px
          setGreenTearOn(true)
          t2 = setTimeout(() => { if (alive) setGreenTearOn(false) }, 90 + Math.random() * 180)
        }
        loop()
      }, delay)
    }
    loop()
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2) }
  }, [])

  //  ULTRA-RARE supa cool colored static burst
  useEffect(() => {
    let alive = true, t1, t2
    const loop = () => {
      const delay = 45000 + Math.random() * 60000 // 45–105s
      t1 = setTimeout(() => {
        if (!alive) return
        if (powerRef.current > 0.6) {
          setStaticHue(HUES[(Math.random() * HUES.length) | 0])
          setStaticBurst(true)
          t2 = setTimeout(() => { if (alive) setStaticBurst(false) }, 160 + Math.random() * 220)
        }
        loop()
      }, delay)
    }
    loop()
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Delay gate for on-state
  const activatedAtRef = useRef(null)

  // Axis correction for a mesh authored Z-up and Y-back
  const FIX_EULER = useMemo(() => new THREE.Euler(-Math.PI / 2, Math.PI, 0), [])
  const FIX_Q = useMemo(() => new THREE.Quaternion().setFromEuler(FIX_EULER), [FIX_EULER])

  useFrame((_, dt) => {
    const now = performance.now()

    if (pcActive) {
      if (activatedAtRef.current == null) activatedAtRef.current = now
    } else {
      activatedAtRef.current = null
    }
    const effectiveActive = pcActive && (now - (activatedAtRef.current ?? 0) >= powerOnDelayMs)

    // trigger degauss once on rising edge of effectiveActive
    if (effectiveActive && !lastOnRef.current) {
      setDegauss(true)
      setTimeout(() => setDegauss(false), 900)
    }
    lastOnRef.current = effectiveActive

    if (lastEffectiveRef.current && !effectiveActive) {
      streakHoldRef.current = now
    }
    lastEffectiveRef.current = effectiveActive

    // Slower shutter for emphasis
    const shutterTarget = effectiveActive ? 1 : 0
    shutterRef.current = THREE.MathUtils.damp(shutterRef.current, shutterTarget, 6.5, dt)

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

    // White streak logic 
    const s = shutterRef.current
    const closingShape = (1 - s) * s * 4
    const shaped = THREE.MathUtils.clamp(closingShape, 0, 1)
    const hold = Math.max(0, 1 - (now - (streakHoldRef.current || 0)) / STREAK_HOLD_MS)
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

  // Expose small API to the Terminal
  const terminalAPI = useMemo(() => ({
    degauss: () => {
      setDegauss(true)
      setTimeout(() => setDegauss(false), 900)
    },
    staticBurst: (ms) => {
      setStaticHue(HUES[(Math.random() * HUES.length) | 0])
      setStaticBurst(true)
      setTimeout(() => setStaticBurst(false), Math.max(120, Math.min(1000, ms ?? 280)))
    },
    setStutter: (v) => setStutterStrength(Math.max(0, Math.min(2, v))),
    setGreenStrength: (v) => setGreenStrength(Math.max(0, Math.min(2, v))),
  }), [])

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
            position={[0, 0.07, localZ]}
            rotation={[0, Math.PI, 0]}
            scale={htmlScaleLocal * uiScale}
          >
            {(() => {
              const R = 21
              const W = cssSize.w * 0.93
              const H = cssSize.h * 0.90

              // --------- Shutter  ----------
              const topBottomPct = (1 - shutter) * 50

              // --------- Off-only width narrow ----------
              const OFF_NARROW_MAX_PCT = 3
              const closingOrOff = shutter < 0.999 && power < 0.999 && shutter <= power + 0.001
              const sidePct = closingOrOff ? (1 - shutter) * OFF_NARROW_MAX_PCT : 0

              const shutterClip = `inset(${topBottomPct}% ${sidePct}% ${topBottomPct}% ${sidePct}% round ${R}px)`

              // Subtle CRT curvature params
              const CURVE_RX = 0.6
              const CURVE_RY = -0.6

              return (
                <>
                  {/* Keyframes for degauss, static, stutter */}
                  <style>{`
@keyframes crtDegauss {
  0%   { transform: scale(1.00) rotate(0deg);    filter: none; }
  12%  { transform: scale(1.06) rotate(0.2deg);  filter: saturate(0.85) contrast(1.05); }
  28%  { transform: scale(0.98) rotate(-0.15deg); filter: saturate(1.1) contrast(0.95); }
  45%  { transform: scale(1.03) rotate(0.1deg);   }
  62%  { transform: scale(0.995) rotate(-0.05deg);}
  100% { transform: scale(1) rotate(0deg);        filter: none; }
}
.crt-degauss { animation: crtDegauss 900ms ease-out; }

@keyframes crtRGBShiver {
  0%, 100% { transform: translate(0,0); opacity: 0; }
  10% { transform: translate(0.6px, -0.4px); opacity: 0.18; }
  22% { transform: translate(-0.5px, 0.5px); opacity: 0.14; }
  36% { transform: translate(0.4px, 0.2px);  opacity: 0.10; }
  60% { transform: translate(-0.2px, -0.2px); opacity: 0.06; }
}

/* Rare static: jitter + scroll to fake animated noise */
@keyframes crtStaticShake {
  0% { transform: translate(0,0) }
  25% { transform: translate(-0.6px, 0.4px) }
  50% { transform: translate(0.7px, -0.5px) }
  75% { transform: translate(-0.3px, -0.6px) }
  100% { transform: translate(0,0) }
}
@keyframes crtStaticScroll {
  0% { background-position: 0 0; }
  100% { background-position: 100% 100%; }
}

/* Frame pacing stutter */
@keyframes crtStutter {
  0%, 20%, 23%, 50%, 53%, 80%, 83%, 100% { opacity: 1; }
  21%, 51%, 81% { opacity: ${1 - 0.06 * stutterStrength}; }
  22%, 52%, 82% { opacity: ${1 - 0.12 * stutterStrength}; }
}
                  `}</style>

                  <div
                    className={degauss ? 'crt-degauss' : undefined}
                    style={{
                      position: 'relative',
                      width: `${W}px`,
                      height: `${H}px`,
                      borderRadius: `${R}px`,
                      overflow: 'hidden',
                      transform: `perspective(1200px) rotateX(${CURVE_RX}deg) rotateY(${CURVE_RY}deg) translateZ(0)`,
                      filter: 'contrast(1.12) saturate(0.92) hue-rotate(-5deg)',
                      background: '#02040a',
                      boxShadow: 'inset 0 0 22px rgba(0,0,0,0.45), inset 0 0 60px rgba(0,0,0,0.25)',
                    }}
                  >
                    {/* MASK: everything inside respects rounded corners + shutter */}
                    <div style={{
                      position:'absolute', inset:0,
                      borderRadius:'inherit',
                      clipPath: shutterClip,
                      overflow:'hidden',
                    }}>
                      {/* UI with vertical roll */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: `translateY(${ROLL_ENABLED ? rollY : 0}px)`,
                          willChange: 'transform'
                        }}
                      >
                        <ScreenDesktopUI power={power} terminalAPI={terminalAPI} />
                      </div>

                      {/* Edge masks during roll to hide seams  */}
                      {ROLL_ENABLED && Math.abs(rollY) > 0.5 && (
                        <>
                          <div
                            style={{
                              pointerEvents:'none',
                              position:'absolute',
                              left:0, right:0, top:0, height:12,
                              background:'linear-gradient(to bottom, rgba(2,4,10,1), rgba(2,4,10,0))'
                            }}
                          />
                          <div
                            style={{
                              pointerEvents:'none',
                              position:'absolute',
                              left:0, right:0, bottom:0, height:12,
                              background:'linear-gradient(to top, rgba(2,4,10,1), rgba(2,4,10,0))'
                            }}
                          />
                        </>
                      )}

                      {/* --- RGB subpixel mask --- */}
                      <div
                        style={{
                          pointerEvents:'none',
                          position:'absolute', inset:0,
                          backgroundImage:
                            'repeating-linear-gradient(to right, rgba(255,0,0,0.06) 0 1px, rgba(0,255,0,0.06) 1px 2px, rgba(0,0,255,0.06) 2px 3px)',
                          backgroundSize: '3px 100%',
                          mixBlendMode: 'screen',
                          opacity: power * 0.4,
                        }}
                      />

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

                      {/* dot-pitch grid */}
                      <div
                        style={{
                          pointerEvents:'none',
                          position:'absolute', inset:0,
                          mixBlendMode:'multiply',
                          backgroundImage:
                            'repeating-linear-gradient(to right, rgba(0,0,0,0.08) 0 1px, rgba(0,0,0,0) 1px 3px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0 1px, rgba(0,0,0,0) 1px 3px)',
                          backgroundSize: '3px 3px, 3px 3px',
                          opacity: power * 0.9,
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

                      {/* frame pacing stutter  */}
                      <div
                        style={{
                          pointerEvents:'none',
                          position:'absolute', inset:0,
                          background:'rgba(255,255,255,0.035)',
                          mixBlendMode:'screen',
                          opacity: power * stutterStrength,
                          animation: 'crtStutter 2400ms steps(60) infinite',
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

                      {/* --- random green horizontal glitch line --- */}
                      {greenLineOn && (
                        <div style={{ pointerEvents:'none', position:'absolute', inset:0, zIndex: 6 }}>
                          <div
                            style={{
                              position:'absolute',
                              left:0, right:0,
                              top: `calc(${(greenLineY * 100).toFixed(2)}% - 1px)`,
                              height:'2px',
                              background: 'linear-gradient(to bottom, rgba(0,255,0,0) 0%, rgba(0,255,140,0.95) 50%, rgba(0,255,0,0) 100%)',
                              filter: 'blur(0.3px)',
                              opacity: Math.min(1, (power + 0.25) * greenStrength),
                              mixBlendMode:'screen',
                            }}
                          />
                          <div
                            style={{
                              position:'absolute',
                              left:0, right:0,
                              top: `calc(${(greenLineY * 100).toFixed(2)}% - 6px)`,
                              height:'12px',
                              background: 'linear-gradient(to bottom, rgba(0,255,100,0) 0%, rgba(0,255,100,0.28) 50%, rgba(0,255,100,0) 100%)',
                              filter: 'blur(1px)',
                              opacity: Math.min(1, (power + 0.15) * greenStrength),
                              mixBlendMode:'screen',
                            }}
                          />
                        </div>
                      )}

                      {/* --- random green vertical tear  --- */}
                      {greenTearOn && (
                        <div style={{ pointerEvents:'none', position:'absolute', inset:0, zIndex: 6 }}>
                          <div
                            style={{
                              position:'absolute',
                              top:0, bottom:0,
                              left: `calc(${(greenTearX * 100).toFixed(2)}% - ${greenTearW/2}px)`,
                              width: `${greenTearW}px`,
                              background: 'linear-gradient(to right, rgba(0,255,120,0), rgba(0,255,120,0.95), rgba(0,255,120,0))',
                              filter: 'blur(0.4px)',
                              opacity: Math.min(1, (power + 0.25) * greenStrength),
                              mixBlendMode:'screen',
                            }}
                          />
                          <div
                            style={{
                              position:'absolute',
                              top:0, bottom:0,
                              left: `calc(${(greenTearX * 100).toFixed(2)}% - 6px)`,
                              width:'12px',
                              background: 'linear-gradient(to right, rgba(0,255,120,0), rgba(0,255,120,0.26), rgba(0,255,120,0))',
                              filter: 'blur(1px)',
                              opacity: Math.min(1, (power + 0.15) * greenStrength),
                              mixBlendMode:'screen',
                            }}
                          />
                        </div>
                      )}

                      {/* RGB misalignment overlays during degauss */}
                      {degauss && (
                        <>
                          <div
                            style={{
                              pointerEvents:'none',
                              position:'absolute', inset:0,
                              mixBlendMode:'screen',
                              background:'rgba(255,0,0,0.08)',
                              filter:'blur(0.4px)',
                              animation:'crtRGBShiver 900ms ease-out',
                            }}
                          />
                          <div
                            style={{
                              pointerEvents:'none',
                              position:'absolute', inset:0,
                              mixBlendMode:'screen',
                              background:'rgba(0,255,255,0.06)',
                              filter:'blur(0.4px)',
                              animation:'crtRGBShiver 900ms ease-out',
                            }}
                          />
                        </>
                      )}

                      {/* ULTRA-RARE colored static burst */}
                      {staticBurst && (
                        <div style={{ pointerEvents:'none', position:'absolute', inset:0, zIndex:7 }}>
                          {/* high-frequency noise layer, tinted via hue-rotate */}
                          <div
                            style={{
                              position:'absolute', inset:0,
                              mixBlendMode:'screen',
                              backgroundImage: `url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>\
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='1' stitchTiles='stitch'/></filter>\
<rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
                              backgroundSize:'96px 96px',
                              animation: 'crtStaticShake 120ms steps(2) infinite, crtStaticScroll 140ms steps(2) infinite',
                              filter: `hue-rotate(${staticHue}deg) saturate(1.8) contrast(1.2)`,
                              opacity: Math.min(1, power + 0.15),
                            }}
                          />
                          {/* fine color stripes to sell analog interference */}
                          <div
                            style={{
                              position:'absolute', inset:0,
                              backgroundImage:
                                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0 1px, rgba(0,0,0,0) 1px 2px)',
                              mixBlendMode:'overlay',
                              opacity: Math.min(0.25, power * 0.3),
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* ===== White streak of light when shutting off ===== */}
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
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `calc(50% - ${Math.max(2, (H) * (0.015 + 0.06)) / 2}px)`,
                            height: `${Math.max(2, (H) * (0.015 + 0.06))}px`,
                            background:
                              'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0) 100%)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </Html>
        </group>
      )}
    </group>
  )
}

/* ================= Photo Frame ================= */
const PhotoFrameGLB = (props) => <GLBModel path="/models/photo_frame.glb" cast receive {...props} />
function PhotoFrameFallback({ position, rotation = [0,0,0], scale = 1, onClick }) {
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <FallbackMesh type="box" args={[0.18, 0.12, 0.015]} color="#111" />
      <FallbackMesh type="plane" args={[0.16, 0.10]} color="#666" position={[0, 0, -0.0075]} receiveShadow />
    </group>
  )
}

/* ================= Other models ================= */
const GamingChairGLB = (props) => <GLBModel path="/models/gaming_chair.glb" cast receive {...props} />
function GamingChairFallback({ onClick, position, rotation = [0, 0, 0], scale = 1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.4, 1.0, 0.4]}
      color="#444"
      onClick={onClick}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

const SnowboardGLB = (props) => <GLBModel path="/models/snowboard.glb" cast receive {...props} />
function SnowboardFallback({ onClick, position, scale = 1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.1, 1.4, 0.05]}
      color="#7dd3fc"
      onClick={onClick}
      position={position}
      rotation={[0, 0, Math.PI / 2]}
      scale={scale}
    />
  )
}

const SoccerBallGLB = (props) => <GLBModel path="/models/soccer_ball.glb" cast receive={false} {...props} />
function SoccerBallFallback({ onClick, position, scale = 1 }) {
  return (
    <FallbackMesh
      type="sphere"
      args={[0.12, 24, 24]}
      color="#f5f5f5"
      onClick={onClick}
      position={position}
      scale={scale}
    />
  )
}

const PalmTreeGLB = (props) => <GLBModel path="/models/palm_tree.glb" cast receive {...props} />
function PalmTreeFallback({ onClick, position, scale = 1 }) {
  return (
    <group onClick={onClick} position={position} scale={scale}>
      <FallbackMesh type="cylinder" args={[0.02, 0.02, 0.08, 12]} color="#8b5a2b" position={[0, 0.1, 0]} />
      <FallbackMesh type="cone" args={[0.35, 0.6, 6]} color="#22c55e" position={[0, 0.45, 0]} receiveShadow />
    </group>
  )
}

/* ==================== NEW: Desk-top props ==================== */
const BooksGLB = (props) => <GLBModel path="/models/books.glb" cast receive {...props} />
function BooksFallback({ position, rotation = [0,0,0], scale = 1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.18, 0.06, 0.24]}
      color="#8b5cf6"
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => null}
    />
  )
}

const PSPGLB = (props) => <GLBModel path="/models/psp.glb" cast receive {...props} />
function PSPFallback({ position, rotation = [0,0,0], scale = 1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.16, 0.02, 0.07]}
      color="#111"
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => null}
    />
  )
}

const RubixCubeGLB = (props) => <GLBModel path="/models/RubixCube.glb" cast receive {...props} />
function RubixCubeFallback({ position, rotation = [0,0,0], scale = 1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.06, 0.06, 0.06]}
      color="#22d3ee"
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => null}
    />
  )
}

const PencilsGLB = (props) => <GLBModel path="/models/pencils.glb" cast receive {...props} />
function PencilsFallback({ position, rotation = [0,0,0], scale = 1 }) {
  return (
    <FallbackMesh
      type="cylinder"
      args={[0.02, 0.02, 0.08, 12]}
      color="#9ca3af"
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => null}
    />
  )
}

/* ==================== NEW: Sticky Note ==================== */
const StickNoteGLB = (props) => <GLBModel path="/models/stickNote.glb" cast receive {...props} />
function StickNoteFallback({ position, rotation=[0,0,0], scale=1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.09, 0.002, 0.09]}
      color="#fde68a"
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => null}
      materialProps={{ roughness: 0.8, metalness: 0.0 }}
    />
  )
}

/* ==================== NEW: Barça corner  ==================== */
const GrassGLB = (props) => <GLBModel path="/models/grass.glb" cast={false} receive {...props} />
function GrassFallback({ position, rotation=[0,0,0], scale=1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[1.6, 0.02, 1.0]}
      color="#166534"
      position={position}
      rotation={rotation}
      scale={scale}
      receiveShadow
    />
  )
}

const GoalNetGLB = (props) => <GLBModel path="/models/NetFinal.glb" cast receive {...props} />
function GoalNetFallback({ position, rotation=[0,0,0], scale=1 }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <FallbackMesh type="box" args={[1.6, 0.05, 0.05]} color="#ddd" />
      <FallbackMesh type="box" args={[0.05, 0.8, 1.2]} color="#ddd" position={[-0.8, -0.4, -0.6]} />
      <FallbackMesh type="box" args={[0.05, 0.8, 1.2]} color="#ddd" position={[0.8, -0.4, -0.6]} />
    </group>
  )
}

const BarcaLogoGLB = (props) => <GLBModel path="/models/logos_barcelona.glb" cast receive={false} {...props} />
function BarcaLogoFallback({ position, rotation=[0,0,0], scale=1 }) {
  return (
    <FallbackMesh
      type="box"
      args={[0.4, 0.5, 0.02]}
      color="#A50044"
      position={position}
      rotation={rotation}
      scale={scale}
    />
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
    const PRELOAD = [
      '/models/desk.glb',
      '/models/PC.glb',
      '/models/photo_frame.glb',
      '/models/gaming_chair.glb',
      '/models/snowboard.glb',
      '/models/soccer_ball.glb',
      '/models/palm_tree.glb',
      '/models/books.glb',
      '/models/psp.glb',
      '/models/RubixCube.glb',
      '/models/pencils.glb',
      '/models/grass.glb',
      '/models/NetFinal.glb',
      '/models/logos_barcelona.glb',
      '/models/stickNote.glb', // NEW
    ]
    PRELOAD.forEach((p) => useGLTF.preload(p))
  }, [])

  const GOAL_POS = useMemo(() => [-1.2, 0, -1.2], [])
  const GOAL_SCALE = 0.6
  const BALL_POS = useMemo(() => [-.76, 0.2, -.9], [])
  const LOGO_POS = useMemo(() => [-1.13, 0.02, -1.4], [])
  const LOGO_ROT = useMemo(() => [0, Math.PI, 0], [])

  return (
    <group>
      {/* Invisible plane that only shows shadows */}
      <ShadowCatcher size={10} y={-0.001} opacity={0.42} />

      {/* Desk + PC + Frame */}
      <Suspense fallback={null}>
        <DeskGLB position={[-0.02, 0.053, 0.065]} scale={0.225} onClick={onDeskAreaClick} />

        <PCInteractive
          position={[0.06, 0.58, 0.000000001]}
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
            scale={0.09}
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
          position={[0.15, 0, 0.6]}
          rotation={[0, Math.PI / 3.2, 0]}
          scale={0.32}
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
        <SnowboardGLB onClick={onSnowboardClick} position={[0, .2, -2]} scale={0.76} />
      </Suspense>

      {/*  Soccer ball  */}
      <Suspense
        fallback={
          <SoccerBallFallback
            onClick={onSoccerClick}
            position={BALL_POS}
            scale={0.2}
          />
        }
      >
        <SoccerBallGLB onClick={onSoccerClick} position={BALL_POS} scale={0.16} />
      </Suspense>

      <Suspense
        fallback={
          <PalmTreeFallback onClick={onBeachClick} position={[0.9, 0, -1.6]} scale={0.2} />
        }
      >
        <PalmTreeGLB onClick={onBeachClick}  position={[0.9, 0, 0]} rotation={[0, Math.PI * 100, 0]} scale={0.1} />
      </Suspense>

      {/* Desk-top props */}
      <Suspense fallback={<BooksFallback position={[0.4, 0.585, 0.2]} scale={0.4} />}>
        <BooksGLB position={[0.4, 0.58, 0.3]} scale={0.4} />
      </Suspense>

      <Suspense fallback={<PSPFallback position={[0.4, 0.62, 0.2]} rotation={[0, Math.PI * 0.12, 0]} scale={1} />}>
        <PSPGLB position={[0.4, 0.619, 0.3]} rotation={[0, Math.PI * 0.12, 0]} scale={1} />
      </Suspense>

      <Suspense fallback={<RubixCubeFallback position={[-0.3, 0.585, 0.17]} scale={0.35} />}>
        <RubixCubeGLB position={[-0.5, 0.578, 0.2]} scale={0.35} />
      </Suspense>

      <Suspense fallback={<PencilsFallback position={[-0.3, 0.61, 0.02]} rotation={[0, Math.PI * 0.25, 0]} scale={0.02} />}>
        <PencilsGLB position={[-0.3, 0.605, 0.2]} rotation={[0, Math.PI * 0.25, 0]} scale={0.02} />
      </Suspense>

      {/* NEW: Sticky note on desk near keyboard */}
      <Suspense
        fallback={<StickNoteFallback position={[0.12, 0.585, 0.12]} rotation={[0, Math.PI * 0.03, 0]} scale={0.95} />}
      >
        <StickNoteGLB position={[-.1, 0.57, .2]} rotation={[0, Math.PI * 0.03, 0]} scale={0.1} />
      </Suspense>

      {/* Barça corner */}
      <Suspense fallback={<GrassFallback position={[-1.15, 0, -1.3]} rotation={[0,0,0]} scale={.7} />}>
        <GrassGLB position={[-1.15, 0, -1.3]} rotation={[0,0,0]} scale={.7} />
      </Suspense>

      <Suspense fallback={<GoalNetFallback position={[-1.2, 0, -1.2]} rotation={[0,Math.PI,0]} scale={0.6} />}>
        <GoalNetGLB position={[-1.2, 0, -1.2]} rotation={[0,Math.PI,0]} scale={0.5} />
      </Suspense>

      <Suspense fallback={<BarcaLogoFallback position={[-1.13, 0.02, -1.4]} rotation={[0, Math.PI, 0]} scale={0.5} />}>
        <BarcaLogoGLB position={[-1.13, 0.02, -1.4]} rotation={[0, Math.PI, 0]} scale={0.4} />
      </Suspense>
    </group>
  )
}

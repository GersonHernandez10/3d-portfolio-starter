'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, useProgress } from '@react-three/drei'
import dynamic from 'next/dynamic'
import { useState, Suspense } from 'react'

const Room = dynamic(() => import('../components/Room'), { ssr: false })
const ResumeModal = dynamic(() => import('../components/ResumeModal'), { ssr: false })

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{padding: 12, background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: 8}}>
        Loading {progress.toFixed(0)}%
      </div>
    </Html>
  )
}

export default function Page() {
  const [resumeOpen, setResumeOpen] = useState(false)

  return (
    <div style={{height: '100vh', width: '100vw', overflow: 'hidden'}}>
      <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5,5,5]} intensity={1.2} />
        <Suspense fallback={<Loader />}>
          <Room onComputerClick={() => setResumeOpen(true)} />
        </Suspense>
        <OrbitControls enablePan={true} enableDamping={true} />
      </Canvas>

      {/* UI overlay */}
      <div style={{position:'fixed', top:16, left:16, display:'flex', gap:12}}>
        <a href="/" style={{padding:'8px 12px', background:'#111', color:'#fff', borderRadius:8, textDecoration:'none'}}>Home</a>
        <button onClick={()=>setResumeOpen(true)} style={{padding:'8px 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer'}}>Open Resume</button>
        <a href="mailto:you@example.com" style={{padding:'8px 12px', background:'#111', color:'#fff', borderRadius:8, textDecoration:'none'}}>Contact</a>
      </div>

      <ResumeModal open={resumeOpen} onClose={()=>setResumeOpen(false)} />
    </div>
  )
}
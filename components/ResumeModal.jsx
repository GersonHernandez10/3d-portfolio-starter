'use client'

export default function ResumeModal({ open, onClose }) {
  if (!open) return null
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
    }} onClick={onClose}>
      <div style={{width:'min(900px, 92vw)', height:'min(80vh, 800px)', background:'#fff', borderRadius:12, overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#111', color:'#fff'}}>
          <strong>Resume</strong>
          <button onClick={onClose} style={{background:'transparent', color:'#fff', border:'1px solid #fff', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Close</button>
        </div>
        <div style={{height:'calc(100% - 42px)'}}>
          <iframe
            src="/resume.pdf"
            title="Resume"
            style={{width:'100%', height:'100%', border:'none'}}
          />
        </div>
      </div>
    </div>
  )
}
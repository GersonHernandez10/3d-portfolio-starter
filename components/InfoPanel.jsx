'use client'

const socials = [
  { label: 'LinkedIn', href: 'linkedin.com/in/gerson-hernandez-lima-0408212b6' },
  { label: 'GitHub', href: 'https://github.com/GersonHernandez10' },
  { label: 'Instagram', href: 'https://www.instagram.com/813.gerson/' },
  { label: 'Email', href: 'mailto:gersonhernandez950@gmail.com' },
]

export default function InfoPanel({ openKey, onClose }) {
  if (!openKey) return null

  const isResume = openKey === 'resume'
  const isSocials = openKey === 'socials'
  const titleMap = {
    resume: 'Resume',
    socials: 'Connect with me',
    snowboard: 'Snowboarding',
    soccer: 'Soccer',
    beach: 'Florida Roots',
  }
  const title = titleMap[openKey] ?? 'Info'

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
    }} onClick={onClose}>
      <div style={{width:'min(960px, 94vw)', height:'min(82vh, 820px)', background:'#fff', borderRadius:12, overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#111', color:'#fff'}}>
          <strong>{title}</strong>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>location.assign('/resume.pdf')} style={{display: isResume? 'inline-flex':'none', background:'#2563eb', color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Download</button>
            <button onClick={onClose} style={{background:'transparent', color:'#fff', border:'1px solid #fff', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Close</button>
          </div>
        </div>

        {/* Content */}
        <div style={{height:'calc(100% - 42px)', overflow:'auto'}}>
          {isResume && (
            <iframe src="/resume.pdf" title="Resume" style={{width:'100%', height:'100%', border:'none'}} />
          )}

          {isSocials && (
            <div style={{padding:16, display:'grid', gap:12}}>
              <p>Find me here:</p>
              <ul style={{display:'grid', gap:8, listStyle:'none', padding:0, margin:0}}>
                {socials.map(s => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer" style={{textDecoration:'none', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, display:'inline-block'}}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {openKey === 'snowboard' && (
            <div style={{padding:16, lineHeight:1.6}}>
              <h3 style={{marginTop:0}}>Snowboarding</h3>
              <p>I picked up snowboarding at school in Vermont and it’s my favorite winter hobby. I love carving groomers and am working on switch riding and small park features this season.</p>
            </div>
          )}

          {openKey === 'soccer' && (
            <div style={{padding:16, lineHeight:1.6}}>
              <h3 style={{marginTop:0}}>Soccer</h3>
              <p>Soccer’s been my favorite sport since forever — I play pickup as a winger/attacking mid. Big focus on quick passing and off-ball runs.</p>
            </div>
          )}

          {openKey === 'beach' && (
            <div style={{padding:16, lineHeight:1.6}}>
              <h3 style={{marginTop:0}}>Florida / Beach Vibes</h3>
              <p>I grew up in Florida, so I’m naturally drawn to ocean views, palm trees, and warm-weather energy. This part of the room is a nod to home.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

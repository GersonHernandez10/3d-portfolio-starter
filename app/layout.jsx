export const metadata = {
  title: '3D Portfolio',
  description: 'Interactive 3D room portfolio',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{margin:0, fontFamily: 'ui-sans-serif, system-ui'}}>{children}</body>
    </html>
  )
}
import { useEffect, useState } from 'react'

// Renders a photo thumbnail from a stored Blob/File. Uses a data URL
// (FileReader) instead of a blob: object URL, because object URLs don't render
// reliably for <img> inside an installed iOS PWA. The reader is tied to this
// component's lifetime, so there are no URL-revoke races.
export default function Thumb({ file, className, children }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!file) { setSrc(''); return }
    let active = true
    const reader = new FileReader()
    reader.onload = () => { if (active) setSrc(reader.result) }
    reader.readAsDataURL(file)
    return () => { active = false }
  }, [file])

  return (
    <div className={className}>
      {src && <img src={src} alt="" />}
      {children}
    </div>
  )
}

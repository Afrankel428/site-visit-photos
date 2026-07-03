import { useRegisterSW } from 'virtual:pwa-register/react'

// Watches for a newly deployed version and shows a tap-to-update bar, so the
// app updates itself without the manual redeploy/hard-refresh dance. Checks
// for a new version on load and once a minute after.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => { registration.update() }, 60 * 1000)
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-banner">
      <span>🔄 A new version is available.</span>
      <button className="update-btn" onClick={() => updateServiceWorker(true)}>
        Update now
      </button>
    </div>
  )
}

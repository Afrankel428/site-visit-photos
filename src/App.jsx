import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './screens/SignIn'
import PropertyUnit from './screens/PropertyUnit'
import VisitType from './screens/VisitType'
import Camera from './screens/Camera'
import Summary from './screens/Summary'
import UpdatePrompt from './UpdatePrompt'
import { initAuth, signIn, authConfigured } from './auth'
import './App.css'

export default function App() {
  const [account, setAccount] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initAuth()
      .then(acc => setAccount(acc))
      .catch(() => setAccount(null))
      .finally(() => setReady(true))
  }, [])

  let content
  if (!ready) {
    content = (
      <div className="screen">
        <div className="screen-content centered"><p>Loading…</p></div>
      </div>
    )
  } else if (!account) {
    content = <SignIn configured={authConfigured} onSignIn={signIn} />
  } else {
    content = (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PropertyUnit />} />
          <Route path="/visit-type" element={<VisitType />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <>
      <UpdatePrompt />
      {content}
    </>
  )
}

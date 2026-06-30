import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './screens/SignIn'
import PropertyUnit from './screens/PropertyUnit'
import VisitType from './screens/VisitType'
import Camera from './screens/Camera'
import Summary from './screens/Summary'
import './App.css'

export default function App() {
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) {
    return <SignIn onSignIn={() => setSignedIn(true)} />
  }

  return (
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

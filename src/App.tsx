import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import Home from './pages/Home'
import CreateRoom from './pages/CreateRoom'
import WaitingRoom from './pages/WaitingRoom'
import ChillGame from './pages/ChillGame'
import FreshGame from './pages/FreshGame'
import './App.css'

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/create/:gameType" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<WaitingRoom />} />
        <Route path="/game/chill/:roomId" element={<ChillGame />} />
        <Route path="/game/fresh/:roomId" element={<FreshGame />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  useEffect(() => {
    // 기본 모바일 최적화만
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100vh'
    document.body.style.height = '100dvh'
    document.body.style.backgroundColor = '#ffffff'
    
    // iOS 특정 설정
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.body.style.height = '-webkit-fill-available'
    }
    
    // 터치 최적화
    document.body.style.touchAction = 'manipulation'
    document.body.style.userSelect = 'none'
    ;(document.body.style as any).webkitUserSelect = 'none'
    ;(document.body.style as any).webkitTouchCallout = 'none'
    ;(document.body.style as any).webkitTapHighlightColor = 'transparent'
  }, [])

  return (
    <Router>
      <div 
        className="h-screen w-screen bg-white overflow-hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0
        }}
      >
        <AnimatedRoutes />
      </div>
    </Router>
  )
}

export default App
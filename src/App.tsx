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
    // 바우하우스 느낌을 위한 기본 스타일
    document.body.style.backgroundColor = '#f5f5f5'
    document.body.style.fontFamily = 'Helvetica, Arial, sans-serif'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    
    // 모바일 주소창 숨기기
    const metaViewport = document.querySelector('meta[name=viewport]')
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
    }
  }, [])
  
  return (
    <Router>
      <div className="h-screen w-screen bg-gray-100 overflow-hidden">
        <AnimatedRoutes />
      </div>
    </Router>
  )
}

export default App
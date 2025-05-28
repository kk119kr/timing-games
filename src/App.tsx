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
  }, [])
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <AnimatedRoutes />
      </div>
    </Router>
  )
}

export default App
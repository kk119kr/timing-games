import { useState, useRef } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef(null)
  
  // 슬라이더 위치에 따른 현재 게임 타입
  const currentGame = y.get() < -50 ? 'fresh' : y.get() > 50 ? 'chill' : null
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 80
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setIsTransitioning(true)
      
      setTimeout(() => {
        navigate(`/create/${game}`)
      }, 800)
    }
  }
  
  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`)
    }
  }
  
  return (
    <motion.div 
      className="h-screen w-screen relative overflow-hidden bg-white select-none"
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Fresh 영역 상단 반전 배경 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: '#000000',
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
        animate={{
          opacity: currentGame === 'fresh' ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      {/* Chill 영역 하단 반전 배경 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: '#000000',
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
        animate={{
          opacity: currentGame === 'chill' ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      {/* 중앙 분할선 */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          top: '50%',
          backgroundColor: '#000000',
        }}
        animate={{
          backgroundColor: currentGame ? '#ffffff' : '#000000',
          opacity: 0.8
        }}
      />
      
      {/* 상단 FRESH 영역 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
      >
        <motion.h1 
          className="text-8xl font-black tracking-[0.2em]"
          style={{
            color: currentGame === 'fresh' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          animate={{
            scale: currentGame === 'fresh' ? 1.1 : 1,
            y: currentGame === 'fresh' ? -20 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          FRESH
        </motion.h1>
      </motion.div>
      
      {/* 하단 CHILL 영역 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
      >
        <motion.h1 
          className="text-8xl font-black tracking-[0.2em]"
          style={{
            color: currentGame === 'chill' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          animate={{
            scale: currentGame === 'chill' ? 1.1 : 1,
            y: currentGame === 'chill' ? 20 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          CHILL
        </motion.h1>
      </motion.div>
      
      {/* 중앙 슬라이더 */}
      <motion.div
        ref={constraintRef}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: -120, bottom: 120 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="relative cursor-grab active:cursor-grabbing touch-none z-30"
          whileDrag={{ scale: 1.1 }}
        >
          <motion.div
            className="w-24 h-24 rounded-full relative"
            style={{
              backgroundColor: 'transparent',
              border: `2px solid ${currentGame ? '#ffffff' : '#000000'}`,
            }}
            animate={{
              borderColor: currentGame ? '#ffffff' : '#000000',
              scale: isTransitioning ? 3 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.div
              className="absolute inset-2 rounded-full"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000'
              }}
            >
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{
                  backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                                 currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  scale: currentGame ? [1, 1.2, 1] : 1,
                }}
                transition={{ 
                  duration: currentGame ? 1.5 : 0,
                  repeat: currentGame ? Infinity : 0,
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* JOIN 버튼 - 우상단 */}
      <motion.div
        className="absolute top-6 right-6 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              onClick={() => setShowJoinInput(true)}
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-light"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                borderColor: currentGame ? '#ffffff' : '#000000',
                backgroundColor: 'transparent',
              }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              +
            </motion.button>
          ) : (
            <motion.div
              key="join-input"
              className="flex space-x-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="ROOM"
                className="w-20 h-12 text-sm text-center bg-transparent border-2 rounded-full outline-none font-light"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? '#ffffff' : '#000000',
                  fontSize: '16px'
                }}
                autoFocus
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? '#ffffff' : '#000000'
                }}
              >
                →
              </button>
              <button
                onClick={() => {
                  setShowJoinInput(false)
                  setRoomId('')
                }}
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? '#ffffff' : '#000000'
                }}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 전환 애니메이션 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full border-2 border-white"
              animate={{
                scale: [1, 0.5, 20],
                rotate: [0, 180, 360],
                borderWidth: ['2px', '1px', '0px']
              }}
              transition={{ 
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
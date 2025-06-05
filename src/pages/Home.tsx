import { useState, useRef } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef<HTMLDivElement>(null)
  
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
      className="h-screen w-screen relative overflow-hidden select-none"
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: currentGame === 'fresh' ? '#000000' : 
                        currentGame === 'chill' ? '#000000' : '#ffffff'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 상단 FRESH 영역 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: 'calc(50vh - env(safe-area-inset-top, 0px))',
          paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))'
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.3em] px-4"
          style={{
            color: currentGame === 'fresh' ? '#ff0000' : 
                   currentGame === 'chill' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          animate={{
            scale: currentGame === 'fresh' ? 1.1 : 1,
            y: currentGame === 'fresh' ? -10 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          FRESH
        </motion.h1>
      </motion.div>
      
      {/* 하단 CHILL 영역 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: 'calc(50vh - env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))'
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.3em] px-4"
          style={{
            color: currentGame === 'chill' ? '#ffcc00' : 
                   currentGame === 'fresh' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          animate={{
            scale: currentGame === 'chill' ? 1.1 : 1,
            y: currentGame === 'chill' ? 10 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          CHILL
        </motion.h1>
      </motion.div>
      
      {/* 상단 곡선 인디케이터 */}
      <motion.div
        className="absolute left-1/2 transform -translate-x-1/2"
        style={{
          top: 'max(1.5rem, env(safe-area-inset-top, 0px))'
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <path 
            d="M3 17 C7 5, 17 5, 21 17" 
            stroke={currentGame ? '#ffffff' : '#000000'} 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M5 15 C8 8, 16 8, 19 15" 
            stroke={currentGame ? '#ffffff' : '#000000'} 
            strokeWidth="1.5" 
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </motion.div>
      
      {/* 하단 곡선 인디케이터 */}
      <motion.div
        className="absolute left-1/2 transform -translate-x-1/2"
        style={{
          bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))'
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="rotate-180">
          <path 
            d="M3 17 C7 5, 17 5, 21 17" 
            stroke={currentGame ? '#ffffff' : '#000000'} 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M5 15 C8 8, 16 8, 19 15" 
            stroke={currentGame ? '#ffffff' : '#000000'} 
            strokeWidth="1.5" 
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </motion.div>
      
      {/* 중앙 슬라이더 트랙 */}
      <motion.div
        ref={constraintRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
      >
        {/* 슬라이더 트랙 컨테이너 (iPhone 볼륨 스타일) */}
        <motion.div
          className="relative w-12 h-64 rounded-full"
          style={{
            backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            border: `1px solid ${currentGame ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          {/* 트랙 내부 음영 */}
          <motion.div
            className="absolute inset-1 rounded-full"
            style={{
              background: currentGame ? 
                'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)' :
                'linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.01) 100%)'
            }}
          />
          
          {/* 드래그 가능한 슬라이더 버튼 */}
          <motion.div
            drag="y"
            dragConstraints={{ top: -120, bottom: 120 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none"
            whileDrag={{ scale: 1.1 }}
          >
            <motion.div
              className="w-10 h-10 rounded-full relative"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                boxShadow: currentGame ? 
                  '0 4px 20px rgba(0, 0, 0, 0.3)' : 
                  '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
              animate={{
                scale: isTransitioning ? 3 : 1
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* 내부 인디케이터 */}
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{
                  backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                                 currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  scale: currentGame ? [1, 1.1, 1] : 1,
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
      
      {/* JOIN 버튼 - 우상단, 모바일 안전 영역 고려 */}
      <motion.div
        className="absolute z-30"
        style={{
          top: 'max(1.5rem, env(safe-area-inset-top, 0px))',
          right: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              onClick={() => setShowJoinInput(true)}
              className="w-12 h-12 rounded-full border flex items-center justify-center text-lg font-light backdrop-blur-sm"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)',
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
                className="w-20 h-12 text-sm text-center bg-transparent border rounded-full outline-none font-light backdrop-blur-sm"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                  fontSize: '16px'
                }}
                autoFocus
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="w-12 h-12 rounded-full border flex items-center justify-center text-sm backdrop-blur-sm"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)'
                }}
              >
                →
              </button>
              <button
                onClick={() => {
                  setShowJoinInput(false)
                  setRoomId('')
                }}
                className="w-12 h-12 rounded-full border flex items-center justify-center text-sm backdrop-blur-sm"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)'
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: currentGame === 'fresh' ? '#000000' : 
                              currentGame === 'chill' ? '#000000' : '#ffffff'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full border"
              style={{
                borderColor: currentGame === 'fresh' ? '#ff0000' : 
                            currentGame === 'chill' ? '#ffcc00' : '#000000'
              }}
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
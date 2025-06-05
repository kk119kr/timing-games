import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef<HTMLDivElement>(null)
  
  // 드래그 위치에 따른 실시간 색상 변화
  const backgroundOpacity = useTransform(y, [-120, -30, 30, 120], [1, 0.3, 0.3, 1])
  const freshScale = useTransform(y, [-120, -30, 0], [1.15, 1.05, 1])
  const chillScale = useTransform(y, [0, 30, 120], [1, 1.05, 1.15])
  
  // 현재 선택된 게임 (드래그 중 실시간 반응)
  const getCurrentGame = () => {
    const currentY = y.get()
    if (currentY < -30) return 'fresh'
    if (currentY > 30) return 'chill'
    return null
  }
  
  const currentGame = getCurrentGame()
  
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
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 동적 배경 오버레이 */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: '#000000',
          opacity: backgroundOpacity
        }}
      />
      
      {/* 상단 FRESH 영역 - 정확히 50% */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: '50vh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.2em]"
          style={{
            color: currentGame === 'fresh' ? '#ff0000' : 
                   currentGame === 'chill' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            scale: freshScale
          }}
        >
          FRESH
        </motion.h1>
      </motion.div>
      
      {/* 하단 CHILL 영역 - 정확히 50% */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: '50vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.2em]"
          style={{
            color: currentGame === 'chill' ? '#ffcc00' : 
                   currentGame === 'fresh' ? '#ffffff' : '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            scale: chillScale
          }}
        >
          CHILL
        </motion.h1>
      </motion.div>
      
      {/* 중앙 미니멀 슬라이더 */}
      <motion.div
        ref={constraintRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
      >
        {/* 슬라이더 트랙 - 더 미니멀하게 */}
        <motion.div
          className="relative w-2 h-48 mx-auto"
          style={{
            backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderRadius: '4px'
          }}
        >
          {/* 드래그 버튼 - 완전히 새로운 디자인 */}
          <motion.div
            drag="y"
            dragConstraints={{ top: -90, bottom: 90 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none"
            whileDrag={{ scale: 1.2 }}
          >
            <motion.div
              className="w-8 h-8 relative"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                borderRadius: '50%',
                boxShadow: currentGame ? 
                  '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)' : 
                  '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
              }}
              animate={{
                scale: isTransitioning ? 4 : 1
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* 중앙 인디케이터 점 */}
              <motion.div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{
                  backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                                 currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  scale: currentGame ? [1, 1.3, 1] : 1,
                }}
                transition={{ 
                  duration: currentGame ? 1 : 0,
                  repeat: currentGame ? Infinity : 0,
                  ease: "easeInOut" 
                }}
              />
              
              {/* 선택 시 링 효과 */}
              {currentGame && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2"
                  style={{
                    borderColor: currentGame === 'fresh' ? '#ff0000' : '#ffcc00'
                  }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ 
                    scale: [1, 1.8, 1],
                    opacity: [0.8, 0, 0.8]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* JOIN 버튼 - 우상단 */}
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
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-light backdrop-blur-md"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                border: `1px solid ${currentGame ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)'}`,
                boxShadow: currentGame ? 
                  '0 4px 16px rgba(0, 0, 0, 0.2)' : 
                  '0 4px 16px rgba(0, 0, 0, 0.1)'
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
                className="w-20 h-11 text-sm text-center bg-transparent border rounded-full outline-none font-light backdrop-blur-md"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                  fontSize: '16px'
                }}
                autoFocus
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="w-11 h-11 rounded-full border flex items-center justify-center text-sm backdrop-blur-md"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'
                }}
              >
                →
              </button>
              <button
                onClick={() => {
                  setShowJoinInput(false)
                  setRoomId('')
                }}
                className="w-11 h-11 rounded-full border flex items-center justify-center text-sm backdrop-blur-md"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'
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
              className="w-12 h-12 rounded-full border-2"
              style={{
                borderColor: currentGame === 'fresh' ? '#ff0000' : 
                            currentGame === 'chill' ? '#ffcc00' : '#000000'
              }}
              animate={{
                scale: [1, 0.5, 15],
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
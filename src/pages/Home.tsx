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
      {/* 배경 가이드 라인들 */}
      <motion.div
        className="absolute left-1/2 transform -translate-x-1/2 w-px opacity-20"
        style={{
          height: '100vh',
          backgroundColor: currentGame ? '#ffffff' : '#000000',
          top: 0
        }}
        animate={{
          opacity: currentGame ? 0.3 : 0.1
        }}
      />
      
      {/* 상하단 수평 가이드 라인 */}
      <motion.div
        className="absolute left-0 right-0 h-px opacity-10"
        style={{
          top: '25%',
          backgroundColor: currentGame ? '#ffffff' : '#000000'
        }}
        animate={{
          opacity: currentGame ? 0.2 : 0.05
        }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px opacity-10"
        style={{
          top: '75%',
          backgroundColor: currentGame ? '#ffffff' : '#000000'
        }}
        animate={{
          opacity: currentGame ? 0.2 : 0.05
        }}
      />
      
      {/* 상단 FRESH - 명확하게 분리 */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1/2 flex items-center justify-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-black tracking-[0.3em]"
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
      
      {/* 하단 CHILL - 명확하게 분리 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/2 flex items-center justify-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-black tracking-[0.3em]"
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
      
      {/* 상단 방향 표시 - 미니멀 */}
      <motion.div
        className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        animate={{
          opacity: [0.3, 1, 0.3],
          y: [-2, 0, -2]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <motion.div 
          className="w-4 h-4 border-l-2 border-t-2 rotate-45"
          style={{
            borderColor: currentGame ? '#ffffff' : '#000000'
          }}
        />
        <motion.div 
          className="w-px h-4 mt-1"
          style={{
            backgroundColor: currentGame ? '#ffffff' : '#000000'
          }}
        />
      </motion.div>
      
      {/* 하단 방향 표시 - 미니멀 */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        animate={{
          opacity: [0.3, 1, 0.3],
          y: [2, 0, 2]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <motion.div 
          className="w-px h-4 mb-1"
          style={{
            backgroundColor: currentGame ? '#ffffff' : '#000000'
          }}
        />
        <motion.div 
          className="w-4 h-4 border-l-2 border-b-2 rotate-45"
          style={{
            borderColor: currentGame ? '#ffffff' : '#000000'
          }}
        />
      </motion.div>
      
      {/* 중앙 슬라이더 - 에어리하고 깔끔하게 */}
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
          whileDrag={{ scale: 1.05 }}
        >
          {/* 슬라이더 트랙 배경 */}
          <motion.div
            className="absolute w-1 h-64 left-1/2 transform -translate-x-1/2 rounded-full opacity-20"
            style={{
              backgroundColor: currentGame ? '#ffffff' : '#000000',
              top: -128
            }}
          />
          
          {/* 메인 슬라이더 버튼 */}
          <motion.div
            className="w-16 h-16 rounded-full relative backdrop-blur-sm"
            style={{
              backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              border: `1px solid ${currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
              boxShadow: currentGame ? 
                '0 4px 20px rgba(0, 0, 0, 0.1)' : 
                '0 4px 20px rgba(0, 0, 0, 0.05)'
            }}
            animate={{
              scale: isTransitioning ? 3 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* 내부 인디케이터 */}
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{
                backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                               currentGame === 'chill' ? '#ffcc00' : '#000000'
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
              className="w-12 h-12 rounded-full border flex items-center justify-center text-sm font-light backdrop-blur-sm"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.02)',
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
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.02)',
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
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.02)'
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
                  borderColor: currentGame ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                  backgroundColor: currentGame ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.02)'
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
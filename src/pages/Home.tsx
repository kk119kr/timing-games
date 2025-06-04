import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedGame, setSelectedGame] = useState<'fresh' | 'chill' | null>(null)
  
  const y = useMotionValue(0)
  const constraintRef = useRef(null)
  
  // 슬라이더 위치에 따른 현재 게임 타입
  const currentGame = y.get() < -30 ? 'fresh' : y.get() > 30 ? 'chill' : null
  
  // 색상 반전 효과를 위한 transform
  const freshOpacity = useTransform(y, [-100, -30, 0], [1, 0.8, 0])
  const chillOpacity = useTransform(y, [0, 30, 100], [0, 0.8, 1])
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setSelectedGame(game)
      setIsTransitioning(true)
      
      // 부드러운 전환 효과
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
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: '#f5f5f5'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Fresh 색상 반전 오버레이 */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: '#000000',
          opacity: freshOpacity
        }}
      />
      
      {/* Chill 색상 반전 오버레이 */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: '#000000',
          opacity: chillOpacity
        }}
      />
      
      {/* 상단 FRESH 타이포그래피 */}
      <motion.div
        className="absolute top-20 left-1/2 transform -translate-x-1/2"
        style={{
          color: currentGame === 'fresh' ? '#f5f5f5' : '#000000'
        }}
      >
        <motion.h2 
          className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-center"
          animate={{
            opacity: currentGame === 'fresh' ? 1 : 0.4,
            scale: currentGame === 'fresh' ? 1.05 : 1,
            letterSpacing: currentGame === 'fresh' ? '0.3em' : '0.2em',
            fontWeight: currentGame === 'fresh' ? 900 : 700
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          FRESH
        </motion.h2>
      </motion.div>
      
      {/* 중앙 슬라이더 영역 */}
      <motion.div
        ref={constraintRef}
        className="relative"
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: -120, bottom: 120 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ y }}
          whileDrag={{ scale: 0.95 }}
          className="relative cursor-grab active:cursor-grabbing"
          layoutId="game-selector"
        >
          {/* 슬라이더 트랙 */}
          <div className="w-2 h-48 md:h-56 bg-gray-300 rounded-full relative mx-auto">
            {/* Fresh 활성 영역 */}
            <motion.div
              className="absolute left-0 right-0 rounded-full"
              style={{
                backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#666666',
                height: '80px',
                top: '20px',
                opacity: currentGame === 'fresh' ? 0.9 : 0.3
              }}
              animate={{
                backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#666666'
              }}
            />
            
            {/* Chill 활성 영역 */}
            <motion.div
              className="absolute left-0 right-0 rounded-full"
              style={{
                backgroundColor: currentGame === 'chill' ? '#ffffff' : '#666666',
                height: '80px',
                bottom: '20px',
                opacity: currentGame === 'chill' ? 0.9 : 0.3
              }}
              animate={{
                backgroundColor: currentGame === 'chill' ? '#ffffff' : '#666666'
              }}
            />
            
            {/* 슬라이더 핸들 */}
            <motion.div
              className="absolute w-8 h-8 md:w-10 md:h-10 rounded-full shadow-xl border-2"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                borderColor: currentGame ? '#000000' : '#ffffff',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '50%',
                marginTop: '-16px'
              }}
              animate={{
                boxShadow: currentGame 
                  ? '0 0 30px rgba(255,255,255,0.8), 0 8px 25px rgba(0,0,0,0.3)' 
                  : '0 8px 25px rgba(0,0,0,0.4)',
                scale: isTransitioning ? 1.2 : 1
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* 핸들 내부 인디케이터 */}
              <motion.div
                className="absolute inset-1 rounded-full"
                animate={{
                  backgroundColor: currentGame === 'fresh' ? '#ff4444' :
                                 currentGame === 'chill' ? '#ffcc00' : 
                                 '#666666'
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>
          
          {/* 가이드 텍스트 */}
          <motion.p 
            className="text-xs md:text-sm font-semibold tracking-[0.2em] text-center mt-6"
            style={{ 
              color: currentGame ? '#ffffff' : '#666666',
              opacity: isTransitioning ? 0 : 0.7
            }}
            animate={{ opacity: isTransitioning ? 0 : 0.7 }}
          >
            SLIDE TO SELECT
          </motion.p>
        </motion.div>
      </motion.div>
      
      {/* 하단 CHILL 타이포그래피 */}
      <motion.div
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
        style={{
          color: currentGame === 'chill' ? '#f5f5f5' : '#000000'
        }}
      >
        <motion.h2 
          className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-center"
          animate={{
            opacity: currentGame === 'chill' ? 1 : 0.4,
            scale: currentGame === 'chill' ? 1.05 : 1,
            letterSpacing: currentGame === 'chill' ? '0.3em' : '0.2em',
            fontWeight: currentGame === 'chill' ? 900 : 700
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          CHILL
        </motion.h2>
      </motion.div>
      
      {/* 전환 애니메이션 오버레이 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: selectedGame === 'fresh' ? '#000000' : '#000000'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-8 h-8 md:w-10 md:h-10 rounded-full"
              style={{
                backgroundColor: selectedGame === 'fresh' ? '#ff4444' : '#ffcc00'
              }}
              animate={{
                scale: [1, 50, 100],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 방 참가 인터페이스 */}
      <motion.div
        className="absolute top-6 right-6 md:top-8 md:right-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              onClick={() => setShowJoinInput(true)}
              className="text-xs md:text-sm font-semibold tracking-[0.15em]"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                opacity: 0.8
              }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
            >
              JOIN ROOM
            </motion.button>
          ) : (
            <motion.div
              key="join-input"
              className="flex flex-col gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="ROOM ID"
                className="w-24 md:w-32 h-8 md:h-10 text-xs md:text-sm font-bold tracking-wider text-center bg-transparent border-b-2 border-current outline-none"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  borderColor: currentGame ? '#ffffff' : '#000000'
                }}
                autoFocus
                maxLength={6}
              />
              <div className="flex justify-between">
                <button
                  onClick={handleJoinRoom}
                  className="text-xs font-semibold tracking-wide opacity-80 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  GO
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomId('')
                  }}
                  className="text-xs opacity-60 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
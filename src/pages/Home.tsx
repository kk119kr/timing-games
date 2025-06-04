import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState<'chill' | 'fresh' | null>(null)
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef(null)
  
  // 색상 반전을 위한 transform
  const backgroundOpacity = useTransform(y, [-80, 0, 80], [1, 0, 1])
  const textOpacity = useTransform(y, [-80, 0, 80], [0, 1, 0])
  
  // 게임 타입에 따른 색상 반전
  const currentGame = y.get() < -30 ? 'fresh' : y.get() > 30 ? 'chill' : null
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setSelectedGame(game)
      setIsTransitioning(true)
      
      // 부드러운 전환 효과
      setTimeout(() => {
        navigate(`/create/${game}`)
      }, 400)
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
        backgroundColor: currentGame === 'fresh' ? '#000000' : 
                       currentGame === 'chill' ? '#000000' : '#f5f5f5'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 배경 전환 효과 */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: currentGame ? '#000000' : 'transparent',
          opacity: backgroundOpacity
        }}
      />
      
      {/* 상단 FRESH 타이포그래피 */}
      <motion.div
        className="absolute top-16 left-1/2 transform -translate-x-1/2"
        style={{
          color: currentGame === 'fresh' ? '#f5f5f5' : '#cccccc'
        }}
      >
        <motion.h2 
          className="text-4xl md:text-6xl font-thin tracking-[0.2em] text-center"
          animate={{
            opacity: y.get() < -20 ? 1 : 0.3,
            scale: y.get() < -20 ? 1.1 : 1,
            letterSpacing: y.get() < -20 ? '0.3em' : '0.2em'
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          FRESH
        </motion.h2>
      </motion.div>
      
      {/* 중앙 TIMING 타이포그래피 */}
      <motion.div
        className="flex flex-col items-center"
        style={{
          color: currentGame ? '#f5f5f5' : '#000000'
        }}
      >
        <motion.h1 
          className="text-5xl md:text-7xl font-light tracking-[0.15em] mb-2"
          style={{ opacity: textOpacity }}
          animate={{
            scale: isTransitioning ? 0.9 : 1,
            opacity: isTransitioning ? 0 : textOpacity.get()
          }}
        >
          TIMING
        </motion.h1>
        
        {/* 가이드 텍스트 */}
        <motion.p 
          className="text-xs md:text-sm tracking-[0.2em] opacity-40 mt-4"
          style={{ opacity: textOpacity }}
        >
          SLIDE TO SELECT
        </motion.p>
      </motion.div>
      
      {/* 아이폰 볼륨 스타일 컨트롤러 */}
      <motion.div
        ref={constraintRef}
        className="relative mt-12 md:mt-16"
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: -100, bottom: 100 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          style={{ y }}
          whileDrag={{ scale: 0.95 }}
          className="relative cursor-grab active:cursor-grabbing"
          layoutId="game-selector"
        >
          {/* 볼륨 스타일 슬라이더 배경 */}
          <div className="w-1 h-32 md:h-40 bg-gray-300 rounded-full relative mx-auto">
            {/* 활성 영역 */}
            <motion.div
              className="absolute left-0 right-0 rounded-full"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                height: '60px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: currentGame ? 0.8 : 0.3
              }}
            />
            
            {/* 슬라이더 핸들 */}
            <motion.div
              className="absolute w-6 h-6 md:w-8 md:h-8 rounded-full shadow-lg"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '50%',
                marginTop: '-12px'
              }}
              animate={{
                boxShadow: currentGame 
                  ? '0 0 20px rgba(255,255,255,0.5)' 
                  : '0 4px 12px rgba(0,0,0,0.3)'
              }}
            />
            
            {/* 위쪽 인디케이터 */}
            <motion.div
              className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
              style={{
                backgroundColor: y.get() < -20 ? (currentGame === 'fresh' ? '#ffffff' : '#000000') : '#cccccc'
              }}
            />
            
            {/* 아래쪽 인디케이터 */}
            <motion.div
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
              style={{
                backgroundColor: y.get() > 20 ? (currentGame === 'chill' ? '#ffffff' : '#000000') : '#cccccc'
              }}
            />
          </div>
        </motion.div>
      </motion.div>
      
      {/* 하단 CHILL 타이포그래피 */}
      <motion.div
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2"
        style={{
          color: currentGame === 'chill' ? '#f5f5f5' : '#cccccc'
        }}
      >
        <motion.h2 
          className="text-4xl md:text-6xl font-thin tracking-[0.2em] text-center"
          animate={{
            opacity: y.get() > 20 ? 1 : 0.3,
            scale: y.get() > 20 ? 1.1 : 1,
            letterSpacing: y.get() > 20 ? '0.3em' : '0.2em'
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          CHILL
        </motion.h2>
      </motion.div>
      
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
              className="text-xs md:text-sm tracking-[0.15em] font-light"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                opacity: 0.7
              }}
              whileHover={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
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
                className="w-24 md:w-32 h-8 md:h-10 text-xs md:text-sm font-mono tracking-wider text-center bg-transparent border-b border-current outline-none"
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
                  className="text-xs tracking-wide opacity-70 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  GO
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomId('')
                  }}
                  className="text-xs opacity-50 hover:opacity-100"
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
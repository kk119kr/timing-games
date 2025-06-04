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
  const currentGame = y.get() < -50 ? 'fresh' : y.get() > 50 ? 'chill' : null
  
  // 부분적 반전 효과 - 위쪽만 검은색, 아래쪽만 노란색
  const topOverlayOpacity = useTransform(y, [-100, -50, 0], [0.95, 0.6, 0])
  const bottomOverlayOpacity = useTransform(y, [0, 50, 100], [0, 0.6, 0.95])
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 80
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setSelectedGame(game)
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
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Fresh 영역 부분 반전 오버레이 (상단만) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #000000 0%, #000000 40%, transparent 60%)',
          opacity: topOverlayOpacity
        }}
      />
      
      {/* Chill 영역 부분 반전 오버레이 (하단만) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, #000000 0%, #000000 40%, transparent 60%)',
          opacity: bottomOverlayOpacity
        }}
      />
      
      {/* 상단 FRESH 타이포그래피 */}
      <motion.div
        className="absolute top-20"
        style={{
          color: currentGame === 'fresh' ? '#ffffff' : '#000000'
        }}
      >
        <motion.h2 
          className="text-6xl md:text-8xl font-black tracking-[0.3em] text-center"
          animate={{
            opacity: currentGame === 'fresh' ? 1 : 0.3,
            scale: currentGame === 'fresh' ? 1.1 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          FRESH
        </motion.h2>
      </motion.div>
      
      {/* 중앙 슬라이더 - 전체 화면 높이의 슬라이스 */}
      <motion.div
        ref={constraintRef}
        className="relative w-full h-screen flex items-center justify-center"
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: -150, bottom: 150 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          style={{ y }}
          whileDrag={{ scale: 1.1 }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          {/* 메인 슬라이더 버튼 */}
          <motion.div
            className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-2xl border-4 border-gray-800"
            style={{
              backgroundColor: currentGame === 'fresh' ? '#ff4444' : 
                             currentGame === 'chill' ? '#ffcc00' : '#ffffff'
            }}
            animate={{
              boxShadow: currentGame 
                ? `0 0 40px ${currentGame === 'fresh' ? '#ff4444' : '#ffcc00'}80, 0 10px 30px rgba(0,0,0,0.3)` 
                : '0 10px 30px rgba(0,0,0,0.4)',
              scale: isTransitioning ? 1.5 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* 내부 인디케이터 */}
            <motion.div
              className="w-full h-full rounded-full flex items-center justify-center"
              animate={{
                backgroundColor: currentGame === 'fresh' ? '#ffffff' :
                               currentGame === 'chill' ? '#000000' : '#000000'
              }}
            >
              <motion.div
                className="text-xs md:text-sm font-black tracking-widest"
                style={{ 
                  color: currentGame === 'fresh' ? '#ff4444' : 
                         currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  opacity: currentGame ? 1 : 0.6
                }}
              >
                {currentGame ? currentGame.toUpperCase().slice(0, 3) : '●'}
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* 슬라이드 가이드 라인 */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-32 md:h-40 bg-gray-300 -top-20 md:-top-24" />
          <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-32 md:h-40 bg-gray-300 -bottom-20 md:-bottom-24" />
          
          {/* 가이드 텍스트 */}
          <motion.p 
            className="text-xs md:text-sm font-bold tracking-[0.2em] text-center mt-16 md:mt-20 absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap"
            style={{ 
              color: currentGame === 'fresh' ? '#ffffff' : 
                     currentGame === 'chill' ? '#ffffff' : '#666666'
            }}
            animate={{ opacity: isTransitioning ? 0 : 0.8 }}
          >
            SLIDE TO SELECT
          </motion.p>
        </motion.div>
      </motion.div>
      
      {/* 하단 CHILL 타이포그래피 */}
      <motion.div
        className="absolute bottom-20"
        style={{
          color: currentGame === 'chill' ? '#ffffff' : '#000000'
        }}
      >
        <motion.h2 
          className="text-6xl md:text-8xl font-black tracking-[0.3em] text-center"
          animate={{
            opacity: currentGame === 'chill' ? 1 : 0.3,
            scale: currentGame === 'chill' ? 1.1 : 1,
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-20 h-20 md:w-24 md:h-24 rounded-full"
              style={{
                backgroundColor: selectedGame === 'fresh' ? '#ff4444' : '#ffcc00'
              }}
              animate={{
                scale: [1, 100],
                rotate: [0, 360]
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
        className="absolute top-8 right-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              onClick={() => setShowJoinInput(true)}
              className="text-sm font-bold tracking-[0.2em] px-4 py-2 border-2 border-gray-800 rounded-lg hover:bg-gray-800 hover:text-white transition-all"
              style={{
                color: currentGame === 'fresh' ? '#ffffff' : 
                       currentGame === 'chill' ? '#ffffff' : '#000000',
                borderColor: currentGame === 'fresh' ? '#ffffff' : 
                            currentGame === 'chill' ? '#ffffff' : '#000000'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              JOIN
            </motion.button>
          ) : (
            <motion.div
              key="join-input"
              className="flex flex-col gap-3"
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
                className="w-28 h-10 text-sm font-bold tracking-wider text-center bg-transparent border-2 rounded-lg outline-none"
                style={{ 
                  color: currentGame === 'fresh' ? '#ffffff' : 
                         currentGame === 'chill' ? '#ffffff' : '#000000',
                  borderColor: currentGame === 'fresh' ? '#ffffff' : 
                              currentGame === 'chill' ? '#ffffff' : '#000000'
                }}
                autoFocus
                maxLength={6}
              />
              <div className="flex justify-between">
                <button
                  onClick={handleJoinRoom}
                  className="text-sm font-bold tracking-wide hover:opacity-100 transition-opacity"
                  style={{ 
                    color: currentGame === 'fresh' ? '#ffffff' : 
                           currentGame === 'chill' ? '#ffffff' : '#000000',
                    opacity: 0.8 
                  }}
                >
                  GO
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomId('')
                  }}
                  className="text-sm hover:opacity-100 transition-opacity"
                  style={{ 
                    color: currentGame === 'fresh' ? '#ffffff' : 
                           currentGame === 'chill' ? '#ffffff' : '#000000',
                    opacity: 0.6 
                  }}
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
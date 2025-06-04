import { useState, useRef } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedGame, setSelectedGame] = useState<'fresh' | 'chill' | null>(null)
  
  const y = useMotionValue(0)
  const constraintRef = useRef(null)
  
  // 슬라이더 위치에 따른 현재 게임 타입 - 더 민감하게 조정
  const currentGame = y.get() < -60 ? 'fresh' : y.get() > 60 ? 'chill' : null
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setSelectedGame(game)
      setIsTransitioning(true)
      
      setTimeout(() => {
        navigate(`/create/${game}`)
      }, 1200)
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Fresh 영역 상단 반전 배경 - 즉각적 모핑 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: '#000000',
          opacity: currentGame === 'fresh' ? 1 : 0,
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
        animate={{
          opacity: currentGame === 'fresh' ? 1 : 0
        }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      />
      
      {/* Chill 영역 하단 반전 배경 - 즉각적 모핑 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: '#000000',
          opacity: currentGame === 'chill' ? 1 : 0,
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
        animate={{
          opacity: currentGame === 'chill' ? 1 : 0
        }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      />
      
      {/* 중앙 분할선 - 서브스턴스 스타일의 기하학적 라인 */}
      <motion.div
        className="absolute left-0 right-0 h-0.5"
        style={{
          top: '50%',
          backgroundColor: currentGame ? '#ffffff' : '#000000',
          opacity: 1,
        }}
        animate={{
          scaleX: currentGame ? 1.2 : 1,
          opacity: currentGame ? 1 : 0.2
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* 상단 FRESH 영역 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            y: currentGame === 'fresh' ? -60 : -30,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.h1 
            className="text-8xl md:text-9xl font-black tracking-[0.15em] leading-none"
            style={{
              color: currentGame === 'fresh' ? '#ffffff' : '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            animate={{
              scale: currentGame === 'fresh' ? 1.15 : 1,
              letterSpacing: currentGame === 'fresh' ? '0.2em' : '0.15em',
              filter: currentGame === 'fresh' 
                ? 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' 
                : 'none'
            }}
            transition={{ duration: 0.2 }}
          >
            FRESH
          </motion.h1>
          <motion.div 
            className="w-16 h-0.5 mx-auto mt-6"
            style={{
              backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#000000',
            }}
            animate={{
              width: currentGame === 'fresh' ? 80 : 64,
              opacity: currentGame === 'fresh' ? 1 : 0.3
            }}
          />
          <motion.p 
            className="text-xs font-light tracking-[0.4em] mt-4 uppercase"
            style={{
              color: currentGame === 'fresh' ? '#ffffff' : '#666666',
            }}
            animate={{
              opacity: currentGame === 'fresh' ? 1 : 0.5
            }}
          >
            TIMING REACTION
          </motion.p>
        </motion.div>
      </motion.div>
      
      {/* 하단 CHILL 영역 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            y: currentGame === 'chill' ? 60 : 30,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.h1 
            className="text-8xl md:text-9xl font-black tracking-[0.15em] leading-none"
            style={{
              color: currentGame === 'chill' ? '#ffffff' : '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            animate={{
              scale: currentGame === 'chill' ? 1.15 : 1,
              letterSpacing: currentGame === 'chill' ? '0.2em' : '0.15em',
              filter: currentGame === 'chill' 
                ? 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' 
                : 'none'
            }}
            transition={{ duration: 0.2 }}
          >
            CHILL
          </motion.h1>
          <motion.div 
            className="w-16 h-0.5 mx-auto mt-6"
            style={{
              backgroundColor: currentGame === 'chill' ? '#ffffff' : '#000000',
            }}
            animate={{
              width: currentGame === 'chill' ? 80 : 64,
              opacity: currentGame === 'chill' ? 1 : 0.3
            }}
          />
          <motion.p 
            className="text-xs font-light tracking-[0.4em] mt-4 uppercase"
            style={{
              color: currentGame === 'chill' ? '#ffffff' : '#666666',
            }}
            animate={{
              opacity: currentGame === 'chill' ? 1 : 0.5
            }}
          >
            LOTTERY GAME
          </motion.p>
        </motion.div>
      </motion.div>
      
      {/* 중앙 인터랙션 영역 - 슬라이더 */}
      <motion.div
        ref={constraintRef}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: -200, bottom: 200 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="relative cursor-grab active:cursor-grabbing"
          whileDrag={{ scale: 1.1 }}
        >
          {/* 메인 슬라이더 버튼 - 서브스턴스 스타일 */}
          <motion.div
            className="w-20 h-20 md:w-24 md:h-24 relative"
            style={{
              backgroundColor: 'transparent',
              border: `3px solid ${currentGame ? '#ffffff' : '#000000'}`,
              borderRadius: '50%',
            }}
            animate={{
              borderColor: currentGame ? '#ffffff' : '#000000',
              boxShadow: currentGame 
                ? `0 0 30px ${currentGame === 'fresh' ? '#ff0000' : '#ffcc00'}40` 
                : '0 0 10px rgba(0,0,0,0.1)',
              scale: isTransitioning ? 3 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* 내부 코어 */}
            <motion.div
              className="absolute inset-3 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000'
              }}
              animate={{
                scale: currentGame ? 1 : 0.8,
              }}
            >
              {/* 중앙 인디케이터 도트 */}
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                                 currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  scale: currentGame ? [1, 1.5, 1] : 1,
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ 
                  duration: currentGame ? 1.5 : 0,
                  repeat: currentGame ? Infinity : 0,
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
          </motion.div>
          
          {/* 세로 가이드 라인 - 미니멀 */}
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 w-px"
            style={{
              height: '300px',
              top: '-150px',
              backgroundColor: currentGame ? '#ffffff' : '#000000',
            }}
            animate={{
              opacity: currentGame ? 0.8 : 0.2,
              scaleY: currentGame ? 1.2 : 1
            }}
          />
          
          {/* 상하 가이드 도트 */}
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ 
              top: '-80px',
              backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#cccccc',
            }}
            animate={{
              scale: currentGame === 'fresh' ? 1.5 : 1,
              opacity: currentGame === 'fresh' ? 1 : 0.3
            }}
          />
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ 
              top: '80px',
              backgroundColor: currentGame === 'chill' ? '#ffffff' : '#cccccc',
            }}
            animate={{
              scale: currentGame === 'chill' ? 1.5 : 1,
              opacity: currentGame === 'chill' ? 1 : 0.3
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* 방 참가 인터페이스 - 극도로 미니멀 */}
      <motion.div
        className="absolute top-4 right-4 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              onClick={() => setShowJoinInput(true)}
              className="text-xs font-light tracking-[0.3em] px-4 py-2 border border-current rounded-full transition-all duration-200"
              style={{
                color: currentGame ? '#ffffff' : '#000000',
                backgroundColor: 'transparent',
              }}
              whileHover={{ 
                backgroundColor: currentGame ? '#ffffff' : '#000000',
                color: currentGame ? '#000000' : '#ffffff'
              }}
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
              className="space-y-2"
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
                className="w-24 h-8 text-xs font-light tracking-wider text-center bg-transparent border border-current rounded-full outline-none"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                }}
                autoFocus
                maxLength={6}
              />
              <div className="flex justify-between text-xs">
                <button
                  onClick={handleJoinRoom}
                  className="opacity-70 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  →
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomId('')
                  }}
                  className="opacity-50 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 전환 애니메이션 - 서브스턴스 스타일 변형 효과 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 배경 */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            
            {/* 확장하는 중심점 */}
            <motion.div
              className="w-24 h-24 rounded-full border-2 border-white"
              animate={{
                scale: [1, 0.5, 50],
                rotate: [0, 180, 720],
                borderWidth: ['2px', '1px', '0px']
              }}
              transition={{ 
                duration: 1.2,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
            
            {/* 게임 타이틀 */}
            <motion.div
              className="absolute text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ 
                duration: 1.2,
                times: [0, 0.3, 0.7, 1]
              }}
            >
              <motion.h2 
                className="text-6xl md:text-8xl font-black tracking-[0.2em]"
                animate={{
                  scale: [0.8, 1, 1.2],
                  filter: [
                    'blur(10px)',
                    'blur(0px)', 
                    'blur(5px)'
                  ]
                }}
              >
                {selectedGame?.toUpperCase()}
              </motion.h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
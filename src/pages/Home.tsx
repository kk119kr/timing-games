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
  
  // 슬라이더 위치에 따른 현재 게임 타입 - 모바일에 맞게 조정
  const currentGame = y.get() < -40 ? 'fresh' : y.get() > 40 ? 'chill' : null
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 60 // 모바일에서 더 작은 threshold
    
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
      style={{
        height: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
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
          opacity: currentGame === 'fresh' ? 1 : 0,
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
        animate={{
          opacity: currentGame === 'fresh' ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
      
      {/* Chill 영역 하단 반전 배경 */}
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
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
      
      {/* 중앙 분할선 */}
      <motion.div
        className="absolute left-0 right-0 h-1"
        style={{
          top: '50%',
          backgroundColor: currentGame ? '#ffffff' : '#000000',
        }}
        animate={{
          scaleX: currentGame ? 1.2 : 1,
          opacity: currentGame ? 1 : 0.3
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* 상단 FRESH 영역 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            y: currentGame === 'fresh' ? -40 : -20,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.h1 
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-[0.15em] leading-none"
            style={{
              color: currentGame === 'fresh' ? '#ffffff' : '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            animate={{
              scale: currentGame === 'fresh' ? 1.1 : 1,
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
            className="w-20 h-1 mx-auto mt-4"
            style={{
              backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#000000',
            }}
            animate={{
              width: currentGame === 'fresh' ? 96 : 80,
              opacity: currentGame === 'fresh' ? 1 : 0.3
            }}
          />
          <motion.p 
            className="text-sm sm:text-base font-light tracking-[0.3em] mt-4 uppercase"
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
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{ 
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            y: currentGame === 'chill' ? 40 : 20,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.h1 
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-[0.15em] leading-none"
            style={{
              color: currentGame === 'chill' ? '#ffffff' : '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            animate={{
              scale: currentGame === 'chill' ? 1.1 : 1,
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
            className="w-20 h-1 mx-auto mt-4"
            style={{
              backgroundColor: currentGame === 'chill' ? '#ffffff' : '#000000',
            }}
            animate={{
              width: currentGame === 'chill' ? 96 : 80,
              opacity: currentGame === 'chill' ? 1 : 0.3
            }}
          />
          <motion.p 
            className="text-sm sm:text-base font-light tracking-[0.3em] mt-4 uppercase"
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
      
            {/* 중앙 인터랙션 영역 - 모바일 최적화 */}
      <motion.div
        ref={constraintRef}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        {/* 고정된 세로 가이드 라인 - 배경에 위치 */}
        <motion.div 
          className="absolute left-1/2 transform -translate-x-1/2 w-0.5 z-10"
          style={{
            height: '240px',
            top: '50%',
            marginTop: '-120px',
            backgroundColor: currentGame ? '#ffffff' : '#000000',
          }}
          animate={{
            opacity: currentGame ? 0.8 : 0.3,
            boxShadow: currentGame ? `0 0 10px ${currentGame === 'fresh' ? '#ff0000' : '#ffcc00'}30` : 'none'
          }}
        />
        
        {/* 상하 가이드 도트 - 고정 위치 */}
        <motion.div 
          className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full z-10"
          style={{ 
            top: 'calc(50% - 80px)',
            backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#cccccc',
          }}
          animate={{
            scale: currentGame === 'fresh' ? 1.5 : 1,
            opacity: currentGame === 'fresh' ? 1 : 0.4,
            boxShadow: currentGame === 'fresh' ? '0 0 15px #ff000080' : 'none'
          }}
        />
        <motion.div 
          className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full z-10"
          style={{ 
            top: 'calc(50% + 80px)',
            backgroundColor: currentGame === 'chill' ? '#ffffff' : '#cccccc',
          }}
          animate={{
            scale: currentGame === 'chill' ? 1.5 : 1,
            opacity: currentGame === 'chill' ? 1 : 0.4,
            boxShadow: currentGame === 'chill' ? '0 0 15px #ffcc0080' : 'none'
          }}
        />
        
        {/* 슬라이드 힌트 화살표들 */}
        <motion.div 
          className="absolute left-1/2 transform -translate-x-1/2 text-center z-10"
          style={{ top: 'calc(50% - 140px)' }}
          animate={{
            opacity: currentGame ? 0.8 : 0.6,
            y: currentGame === 'fresh' ? -10 : 0
          }}
        >
          <motion.div 
            className="text-xl"
            style={{ color: currentGame === 'fresh' ? '#ffffff' : '#666666' }}
            animate={{
              y: [0, -5, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ↑
          </motion.div>
          <motion.p 
            className="text-xs font-light tracking-[0.2em] mt-1 uppercase"
            style={{ color: currentGame === 'fresh' ? '#ffffff' : '#666666' }}
          >
            FRESH
          </motion.p>
        </motion.div>
        
        <motion.div 
          className="absolute left-1/2 transform -translate-x-1/2 text-center z-10"
          style={{ top: 'calc(50% + 120px)' }}
          animate={{
            opacity: currentGame ? 0.8 : 0.6,
            y: currentGame === 'chill' ? 10 : 0
          }}
        >
          <motion.p 
            className="text-xs font-light tracking-[0.2em] mb-1 uppercase"
            style={{ color: currentGame === 'chill' ? '#ffffff' : '#666666' }}
          >
            CHILL
          </motion.p>
          <motion.div 
            className="text-xl"
            style={{ color: currentGame === 'chill' ? '#ffffff' : '#666666' }}
            animate={{
              y: [0, 5, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ↓
          </motion.div>
        </motion.div>

        <motion.div
          drag="y"
          dragConstraints={{ top: -120, bottom: 120 }} // 제약 범위 축소
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="relative cursor-grab active:cursor-grabbing touch-none z-30"
          whileDrag={{ scale: 1.1 }}
        >
          {/* 메인 슬라이더 버튼 - 모바일에 맞게 크기 증가 */}
          <motion.div
            className="w-32 h-32 sm:w-36 sm:h-36 relative"
            style={{
              backgroundColor: 'transparent',
              border: `4px solid ${currentGame ? '#ffffff' : '#000000'}`,
              borderRadius: '50%',
            }}
            animate={{
              borderColor: currentGame ? '#ffffff' : '#000000',
              boxShadow: currentGame 
                ? `0 0 40px ${currentGame === 'fresh' ? '#ff0000' : '#ffcc00'}60` 
                : '0 0 15px rgba(0,0,0,0.15)',
              scale: isTransitioning ? 4 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* 내부 코어 */}
            <motion.div
              className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: currentGame ? '#ffffff' : '#000000'
              }}
              animate={{
                scale: currentGame ? 1 : 0.8,
              }}
            >
              {/* 중앙 인디케이터 도트 - 크기 증가 */}
              <motion.div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                style={{
                  backgroundColor: currentGame === 'fresh' ? '#ff0000' : 
                                 currentGame === 'chill' ? '#ffcc00' : '#ffffff'
                }}
                animate={{
                  scale: currentGame ? [1, 1.3, 1] : 1,
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ 
                  duration: currentGame ? 1.5 : 0,
                  repeat: currentGame ? Infinity : 0,
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
            
            {/* 드래그 힌트 링 */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-dashed"
              style={{
                borderColor: currentGame ? '#ffffff' : '#cccccc'
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: currentGame ? 0 : [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          {/* 세로 가이드 라인 */}
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0.5"
            style={{
              height: '200px',
              top: '-100px',
              backgroundColor: currentGame ? '#ffffff' : '#000000',
            }}
            animate={{
              opacity: currentGame ? 0.8 : 0.3,
              scaleY: currentGame ? 1.2 : 1
            }}
          />
          
          {/* 상하 가이드 도트 - 크기 증가 */}
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full"
            style={{ 
              top: '-60px',
              backgroundColor: currentGame === 'fresh' ? '#ffffff' : '#cccccc',
            }}
            animate={{
              scale: currentGame === 'fresh' ? 1.5 : 1,
              opacity: currentGame === 'fresh' ? 1 : 0.4
            }}
          />
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full"
            style={{ 
              top: '60px',
              backgroundColor: currentGame === 'chill' ? '#ffffff' : '#cccccc',
            }}
            animate={{
              scale: currentGame === 'chill' ? 1.5 : 1,
              opacity: currentGame === 'chill' ? 1 : 0.4
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* 방 참가 인터페이스 - 모바일 최적화 */}
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
              className="text-sm font-light tracking-[0.2em] px-6 py-3 border-2 border-current rounded-full transition-all duration-200 min-h-[48px]" // 터치 영역 증가
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
              className="space-y-3"
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
                className="w-32 h-12 text-sm font-light tracking-wider text-center bg-transparent border-2 border-current rounded-full outline-none"
                style={{ 
                  color: currentGame ? '#ffffff' : '#000000',
                  fontSize: '16px' // iOS 확대 방지
                }}
                autoFocus
                maxLength={6}
              />
              <div className="flex justify-between">
                <button
                  onClick={handleJoinRoom}
                  className="w-12 h-12 flex items-center justify-center rounded-full border border-current opacity-70 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  →
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomId('')
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-full border border-current opacity-50 hover:opacity-100"
                  style={{ color: currentGame ? '#ffffff' : '#000000' }}
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 전환 애니메이션 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            
            <motion.div
              className="w-32 h-32 rounded-full border-2 border-white"
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
                className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.2em]"
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
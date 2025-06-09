import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentGame, setCurrentGame] = useState<'fresh' | 'chill' | null>(null)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  
  const y = useMotionValue(0)
  const constraintRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  
  // y 값 변화 감지하여 실시간으로 currentGame 업데이트
  useEffect(() => {
    const unsubscribe = y.onChange((latest) => {
      if (latest < -15) {
        setCurrentGame('fresh')
      } else if (latest > 15) {
        setCurrentGame('chill')
      } else {
        setCurrentGame(null)
      }
    })
    
    return unsubscribe
  }, [y])
  
  // 버튼 위치 추적
  useEffect(() => {
    const updateButtonPosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setButtonPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        })
      }
    }
    
    updateButtonPosition()
    window.addEventListener('resize', updateButtonPosition)
    
    return () => window.removeEventListener('resize', updateButtonPosition)
  }, [])
  
  const createGameRoom = async (gameType: 'fresh' | 'chill'): Promise<string | null> => {
    try {
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const room = await createRoom(gameType, userId)
      return room.id
    } catch (error) {
      console.error('방 생성 실패:', error)
      return null
    }
  }
  
  const handleDragEnd = async (_: any, info: any) => {
    const threshold = 60
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      
      // 버튼의 최종 위치 업데이트
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setButtonPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        })
      }
      
      setIsTransitioning(true)
      
      // 방 생성
      const newRoomId = await createGameRoom(game)
      
      if (newRoomId) {
        setTimeout(() => {
          navigate(`/create/${game}`)
        }, 800) // 모핑 애니메이션 완료 후
      } else {
        setIsTransitioning(false)
      }
    }
  }
  
  const handleJoinRoom = () => {
    if (roomCode.trim() && roomCode.length === 4) {
      navigate(`/room/${roomCode.trim()}`)
    }
  }
  

  
  return (
    <motion.div 
      className="h-screen w-screen relative overflow-hidden select-none bg-white"
      style={{
        height: '100dvh',
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
      {/* 상단 JOIN 버튼 */}
      <motion.button
        onClick={() => setShowJoinModal(true)}
        className="absolute top-6 right-6 z-10 w-16 h-12 border-2 border-black rounded-full text-black hover:bg-black hover:text-white transition-all duration-300 text-sm font-light tracking-[0.1em]"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          fontWeight: 300,
          top: 'max(1.5rem, env(safe-area-inset-top))',
          right: 'max(1.5rem, env(safe-area-inset-right))'
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        JOIN
      </motion.button>
      
      {/* 상단 FRESH 영역 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center border-b border-gray-100"
        style={{
          height: '50dvh'
        }}
        animate={{
          backgroundColor: currentGame === 'fresh' ? '#000000' : '#ffffff',
          borderColor: currentGame === 'fresh' ? '#000000' : '#f3f4f6'
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h1 
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight px-4"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontWeight: 300
          }}
          animate={{
            color: currentGame === 'fresh' ? '#ffffff' : '#000000'
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          FRESH
        </motion.h1>
      </motion.div>
      
      {/* 하단 CHILL 영역 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center border-t border-gray-100"
        style={{
          height: '50dvh'
        }}
        animate={{
          backgroundColor: currentGame === 'chill' ? '#000000' : '#ffffff',
          borderColor: currentGame === 'chill' ? '#000000' : '#f3f4f6'
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h1 
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight px-4"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontWeight: 300
          }}
          animate={{
            color: currentGame === 'chill' ? '#ffffff' : '#000000'
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          CHILL
        </motion.h1>
      </motion.div>
      
      {/* 중앙 컨트롤 영역 */}
      <motion.div
        ref={constraintRef}
        className="absolute z-20"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* 상단 가이드 화살표 - 정확한 중앙 정렬 */}
        <motion.div
          className="absolute"
          style={{ 
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            y: [-2, 2, -2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="sm:w-4 sm:h-3">
            <path d="M6 0L10 6H2L6 0Z" fill="#9CA3AF" />
          </svg>
        </motion.div>
        
        {/* 하단 가이드 화살표 - 정확한 중앙 정렬 */}
        <motion.div
          className="absolute"
          style={{ 
            bottom: '-50px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            y: [2, -2, 2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="sm:w-4 sm:h-3">
            <path d="M6 8L2 2H10L6 8Z" fill="#9CA3AF" />
          </svg>
        </motion.div>
        
        {/* 원형 드래그 버튼 */}
        <motion.div
          ref={buttonRef}
          drag="y"
          dragConstraints={{ top: -80, bottom: 80 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="cursor-grab active:cursor-grabbing touch-none"
          whileDrag={{ scale: 1.05 }}
        >
          <motion.div
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white backdrop-blur-sm border-2 border-gray-200 rounded-full flex items-center justify-center"
            style={{
              boxShadow: currentGame ? 
                '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)' : 
                '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)'
            }}
            animate={{
              backgroundColor: currentGame ? '#000000' : '#ffffff',
              borderColor: currentGame ? '#000000' : '#e5e7eb',
              scale: isTransitioning ? 1.2 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Slide! 텍스트 */}
            <motion.span
              className="text-xs sm:text-sm font-light tracking-[0.1em]"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 300,
                color: currentGame ? '#ffffff' : '#000000'
              }}
              animate={{
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: currentGame ? 1 : 2.5,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              Slide!
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* 사각형 테두리로 모핑 트랜지션 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 배경 페이드 */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
            
            {/* 사각형 테두리로 모핑하는 버튼 */}
            <motion.div
              className="absolute bg-white border-2 border-black flex items-center justify-center overflow-hidden"
              style={{
                left: buttonPosition.x - 40, // 원형 버튼 크기의 절반 (80px/2)
                top: buttonPosition.y - 40,
              }}
              initial={{
                width: 80,
                height: 80,
                borderRadius: '50%',
              }}
              animate={{
                left: '50%',
                top: '50%',
                x: '-50%',
                y: '-96px', // CreateRoom의 QR 위치에 맞춤 (중앙에서 위로)
                width: window.innerWidth < 475 ? 160 : 192, // w-40 h-40 xs:w-48 xs:h-48
                height: window.innerWidth < 475 ? 160 : 192,
                borderRadius: 16, // rounded-2xl
              }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {/* 초기 텍스트 - 페이드 아웃 */}
              <motion.span
                className="text-xs sm:text-sm font-light tracking-[0.1em] text-black"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Slide!
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* JOIN 모달 */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 sm:p-8 w-80 max-w-sm mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 
                className="text-xl sm:text-2xl font-light tracking-[0.2em] text-center text-black mb-6"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
              >
                JOIN ROOM
              </h2>
              
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="방 코드 입력"
                maxLength={4}
                className="w-full h-14 px-4 text-center text-2xl font-light tracking-[0.3em] border-2 border-gray-200 rounded-xl focus:border-black transition-colors mb-6"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300,
                  fontVariantNumeric: 'tabular-nums'
                }}
                autoFocus
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 h-12 border-2 border-gray-300 rounded-full text-gray-600 font-light tracking-[0.1em] hover:bg-gray-50 transition-all duration-300"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 4}
                  className={`flex-1 h-12 rounded-full font-light tracking-[0.1em] transition-all duration-300 ${
                    roomCode.length === 4
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                >
                  입장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
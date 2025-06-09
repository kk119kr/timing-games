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
  const [showGameInfoModal, setShowGameInfoModal] = useState(false)
  
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
      {/* 상단 버튼들 */}
      <div className="absolute top-6 right-6 z-10 flex space-x-3">
        {/* INFO 버튼 */}
        <motion.button
          onClick={() => setShowGameInfoModal(true)}
          className="w-16 h-12 border-2 border-black rounded-full text-black hover:bg-black hover:text-white transition-all duration-300 text-sm font-light tracking-[0.1em]"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontWeight: 300,
            top: 'max(1.5rem, env(safe-area-inset-top))',
            right: 'max(1.5rem, env(safe-area-inset-right))'
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          INFO
        </motion.button>
        
        {/* JOIN 버튼 */}
        <motion.button
          onClick={() => setShowJoinModal(true)}
          className="w-16 h-12 border-2 border-black rounded-full text-black hover:bg-black hover:text-white transition-all duration-300 text-sm font-light tracking-[0.1em]"
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
      </div>
      
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
      
      {/* 게임 설명 모달 */}
      <AnimatePresence>
        {showGameInfoModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGameInfoModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 
                className="text-xl sm:text-2xl font-light tracking-[0.2em] text-center text-black mb-8"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
              >
                HOW TO PLAY
              </h2>
              
              {/* FRESH 게임 설명 */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: '#ff0000' }}
                  />
                  <h3 
                    className="text-lg font-light tracking-[0.1em] text-black"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    FRESH
                  </h3>
                </div>
                
                <div className="space-y-3 text-sm leading-relaxed text-gray-700 ml-9">
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • <strong>3라운드</strong>로 구성된 전략적 타이밍 게임
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 빨간 버튼이 <strong>폭발하기 전에</strong> 눌러야 함
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 버튼을 누른 <strong>순서</strong>에 따라 점수가 결정됨
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 가운데 순서일수록 <strong>좋은 점수</strong>, 양 끝은 나쁜 점수
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 아무도 안 누르면 <strong>폭발!</strong> 큰 마이너스 점수
                  </p>
                </div>
              </div>
              
              {/* CHILL 게임 설명 */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: '#ffcc00' }}
                  />
                  <h3 
                    className="text-lg font-light tracking-[0.1em] text-black"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    CHILL
                  </h3>
                </div>
                
                <div className="space-y-3 text-sm leading-relaxed text-gray-700 ml-9">
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 간단하고 <strong>편안한</strong> 룰렛 게임
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 참가자들 사이에서 <strong>빛이 돌아다님</strong>
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 무작위로 한 명이 <strong>선택</strong>됨
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 전략이나 기술이 필요 없는 <strong>순수한 운</strong> 게임
                  </p>
                  <p 
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    • 친구들과 함께 <strong>부담 없이</strong> 즐기기 좋음
                  </p>
                </div>
              </div>
              
              {/* 공통 설명 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 
                  className="text-sm font-light tracking-[0.1em] text-black mb-2"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 400
                  }}
                >
                  게임 시작하기
                </h4>
                <p 
                  className="text-xs leading-relaxed text-gray-600"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                >
                  위 또는 아래로 슬라이드하여 게임을 선택하고 방을 만드세요. 
                  QR코드나 방 번호를 공유하여 친구들을 초대할 수 있습니다.
                </p>
              </div>
              
              <button
                onClick={() => setShowGameInfoModal(false)}
                className="w-full h-12 bg-black text-white rounded-full font-light tracking-[0.1em] hover:bg-gray-800 transition-all duration-300"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
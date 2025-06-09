import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { createRoom } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentGame, setCurrentGame] = useState<'fresh' | 'chill' | null>(null)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQR, setShowQR] = useState(false)
  
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
  
  const createGameRoomAndQR = async (gameType: 'fresh' | 'chill'): Promise<string | null> => {
    try {
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const room = await createRoom(gameType, userId)
      
      const roomUrl = `${window.location.origin}/room/${room.id}`
      const qrUrl = await QRCode.toDataURL(roomUrl, {
        width: 160, // QR코드 실제 크기 (CreateRoom의 패딩 제외한 크기)
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
      
      setQrCodeUrl(qrUrl)
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
      
      // QR코드 미리 생성
      const newRoomId = await createGameRoomAndQR(game)
      
      if (newRoomId) {
        // QR 코드가 준비되면 보여주기
        setTimeout(() => {
          setShowQR(true)
        }, 600) // 모핑이 어느정도 진행된 후
        
        setTimeout(() => {
          navigate(`/create/${game}`)
        }, 1200) // QR이 완전히 나타난 후
      } else {
        setIsTransitioning(false)
      }
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
            top: '-32px',
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
            bottom: '-32px',
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
        
        {/* 드래그 버튼 - 애플 스타일 */}
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
            className="w-14 h-14 sm:w-12 sm:h-12 bg-white backdrop-blur-sm border border-gray-200 flex items-center justify-center"
            style={{
              borderRadius: '20px',
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
            {/* 중앙 인디케이터 - 미니멀 도트 */}
            <motion.div
              className="flex flex-col space-y-1"
              animate={{
                opacity: [0.4, 1, 0.4]
              }}
              transition={{ 
                duration: currentGame ? 1 : 2.5,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <motion.div 
                className="w-1 h-1 rounded-full mx-auto"
                style={{
                  backgroundColor: currentGame ? '#ffffff' : '#000000'
                }}
              />
              <motion.div 
                className="w-1 h-1 rounded-full mx-auto"
                style={{
                  backgroundColor: currentGame ? '#ffffff' : '#000000'
                }}
              />
              <motion.div 
                className="w-1 h-1 rounded-full mx-auto"
                style={{
                  backgroundColor: currentGame ? '#ffffff' : '#000000'
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* 실제 QR코드로 모핑 트랜지션 */}
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
            
            {/* 실제 QR코드로 모핑하는 버튼 */}
            <motion.div
              className="absolute bg-white border-2 border-black flex items-center justify-center overflow-hidden"
              style={{
                left: buttonPosition.x - 28, // 버튼 크기의 절반 (56px/2)
                top: buttonPosition.y - 28,
              }}
              initial={{
                width: 56,
                height: 56,
                borderRadius: 20,
              }}
              animate={{
                left: '50%',
                top: 'calc(50% - 80px)', // CreateRoom의 QR코드 위치에 맞춤
                x: '-50%',
                y: '-50%',
                width: 192, // CreateRoom QR 컨테이너 크기
                height: 192,
                borderRadius: 16, // CreateRoom의 rounded-2xl
              }}
              transition={{
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {/* 초기 도트들 - 페이드 아웃 */}
              <motion.div
                className="absolute flex flex-col space-y-1"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-1 h-1 rounded-full bg-black mx-auto" />
                <div className="w-1 h-1 rounded-full bg-black mx-auto" />
                <div className="w-1 h-1 rounded-full bg-black mx-auto" />
              </motion.div>
              
              {/* 실제 QR코드로 변환 */}
              <AnimatePresence>
                {showQR && qrCodeUrl && (
                  <motion.img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="absolute inset-4 w-auto h-auto object-contain"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
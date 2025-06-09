import { useState, useRef } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef<HTMLDivElement>(null)
  
  // 현재 선택된 게임 (드래그 중 실시간 반응)
  const getCurrentGame = () => {
    const currentY = y.get()
    if (currentY < -15) return 'fresh'
    if (currentY > 15) return 'chill'
    return null
  }
  
  const currentGame = getCurrentGame()
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 60
    
    if (Math.abs(info.offset.y) > threshold) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setIsTransitioning(true)
      
      setTimeout(() => {
        navigate(`/create/${game}`)
      }, 600)
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
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
      >
        {/* 상단 가이드 화살표 */}
        <motion.div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{ top: '-32px' }}
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
        
        {/* 하단 가이드 화살표 */}
        <motion.div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{ bottom: '-32px' }}
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
      
      {/* QR코드 모핑 트랜지션 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                rotate: [0, 90, 180, 270, 360]
              }}
              transition={{ 
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {/* QR코드 모핑 애니메이션 */}
              <motion.div
                className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-black bg-white flex items-center justify-center"
                style={{ borderRadius: '12px' }}
                animate={{
                  borderRadius: ['12px', '8px', '4px', '0px']
                }}
                transition={{ duration: 0.6 }}
              >
                {/* QR코드 패턴 */}
                <motion.div 
                  className="grid grid-cols-6 sm:grid-cols-8 gap-0.5 w-16 h-16 sm:w-24 sm:h-24"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {[...Array(64)].map((_, i) => {
                    // 모바일에서는 6x6 그리드만 표시
                    const isMobile = i >= 36
                    return (
                      <motion.div
                        key={i}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 bg-black ${isMobile ? 'hidden sm:block' : ''}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: Math.random() > 0.5 ? 1 : 0 }}
                        transition={{ 
                          delay: 0.3 + (i * 0.005),
                          duration: 0.1 
                        }}
                      />
                    )
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
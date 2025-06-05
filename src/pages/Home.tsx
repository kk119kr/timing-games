import { useState, useRef } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const y = useMotionValue(0)
  const constraintRef = useRef<HTMLDivElement>(null)
  
  // 현재 선택된 게임 (드래그 중 실시간 반응) - 더 민감하게
  const getCurrentGame = () => {
    const currentY = y.get()
    if (currentY < -10) return 'fresh'  // 임계값을 더 낮춤
    if (currentY > 10) return 'chill'   // 임계값을 더 낮춤
    return null
  }
  
  const currentGame = getCurrentGame()
  
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
  
  return (
    <motion.div
      className="h-screen-mobile w-screen relative overflow-hidden select-none bg-white"
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
      {/* 상단 FRESH 영역 배경 오버레이 */}
      <motion.div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '50vh',
        }}
        animate={{
          backgroundColor: currentGame === 'fresh' ? '#000000' : 'transparent'
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      {/* 하단 CHILL 영역 배경 오버레이 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '50vh',
        }}
        animate={{
          backgroundColor: currentGame === 'chill' ? '#000000' : 'transparent'
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      {/* 상단 FRESH 영역 - 정확히 50% */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: '50vh',
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] xl:text-[14rem] font-black tracking-[0.05em]"
          style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 900,
            lineHeight: 0.8
          }}
          animate={{
            color: currentGame === 'fresh' ? '#ffffff' : '#000000'
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          FRESH
        </motion.h1>
      </motion.div>
      
      {/* 하단 CHILL 영역 - 정확히 50% */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: '50vh',
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] xl:text-[14rem] font-black tracking-[0.05em]"
          style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 900,
            lineHeight: 0.8
          }}
          animate={{
            color: currentGame === 'chill' ? '#ffffff' : '#000000'
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          CHILL
        </motion.h1>
      </motion.div>
      
      {/* 중앙 미니멀 슬라이더 */}
      <motion.div
        ref={constraintRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
      >
        {/* 상단 방향 표시 화살표 */}
        <motion.div
          className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ top: '-60px' }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            y: [-3, 3, -3]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-black" />
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-black" />
          </div>
        </motion.div>
        
        {/* 하단 방향 표시 화살표 */}
        <motion.div
          className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ bottom: '-60px' }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            y: [3, -3, 3]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.25 }}
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-black" />
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-black" />
          </div>
        </motion.div>
        
        {/* 드래그 버튼 - 원형 미니멀 스타일 */}
        <motion.div
          drag="y"
          dragConstraints={{ top: -120, bottom: 120 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="cursor-grab active:cursor-grabbing touch-none"
          whileDrag={{ scale: 1.1 }}
        >
          <motion.div
            className="w-20 h-20 relative flex items-center justify-center"
            style={{
              backgroundColor: currentGame ? '#ffffff' : '#000000',
              borderRadius: '50%',
              boxShadow: currentGame ?
                '0 25px 80px rgba(0, 0, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.15)' :
                '0 25px 80px rgba(0, 0, 0, 0.12), 0 10px 30px rgba(0, 0, 0, 0.08)'
            }}
            animate={{
              scale: isTransitioning ? 6 : 1
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* 중앙 그립 인디케이터 */}
            <motion.div
              className="flex flex-col space-y-1.5"
              animate={{
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: currentGame ? 1.2 : 2,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <div
                className="w-10 h-0.5 rounded-full"
                style={{ backgroundColor: currentGame ? '#000000' : '#ffffff' }}
              />
              <div
                className="w-10 h-0.5 rounded-full"
                style={{ backgroundColor: currentGame ? '#000000' : '#ffffff' }}
              />
              <div
                className="w-10 h-0.5 rounded-full"
                style={{ backgroundColor: currentGame ? '#000000' : '#ffffff' }}
              />
            </motion.div>
            
            {/* 선택 시 외곽 링 효과 */}
            {currentGame && (
              <>
                <motion.div
                  className="absolute inset-0 border-2 rounded-full"
                  style={{
                    borderColor: '#000000'
                  }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.8, 0, 0.8]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 border rounded-full"
                  style={{
                    borderColor: '#000000'
                  }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ 
                    scale: [1, 1.8, 1],
                    opacity: [0.6, 0, 0.6]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.3
                  }}
                />
              </>
            )}
          </motion.div>
        </motion.div>
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
              className="w-16 h-16 rounded border-2"
              style={{
                borderColor: '#000000'
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
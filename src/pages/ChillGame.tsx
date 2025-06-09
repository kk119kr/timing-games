import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, updateGameState } from '../lib/supabase'
import type { GameRoom } from '../lib/supabase'
import { GamePeerManager } from '../lib/peer'

export default function ChillGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [myIndex, setMyIndex] = useState<number>(-1)
  const [isGlowing, setIsGlowing] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [showFireworks, setShowFireworks] = useState(false)
  const [showWinnerText, setShowWinnerText] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const peerManager = useRef<GamePeerManager | null>(null)
  const glowInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  
  // 버튼 위치 추적
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
    }
  }, [isGlowing])
  
  useEffect(() => {
    if (!roomId) return
    
    initializeGame()
    
    const subscription = subscribeToRoom(roomId, (payload) => {
      if (payload.new) {
        const newRoom = payload.new as GameRoom
        setRoom(newRoom)
        
        // 내 인덱스 확인
        const userId = localStorage.getItem('userId')
        const idx = newRoom.participants.findIndex(p => p.id === userId)
        setMyIndex(idx)
        
        // 발광 상태 업데이트
        if (newRoom.game_state.glowing_index === idx) {
          setIsGlowing(true)
        } else {
          setIsGlowing(false)
        }
        
        // 당첨자 확인
        if (newRoom.game_state.winner) {
          handleWinner(newRoom.game_state.winner)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
      if (glowInterval.current) {
        clearInterval(glowInterval.current)
        glowInterval.current = null
      }
      peerManager.current?.destroy()
    }
  }, [roomId])
  
  const initializeGame = async () => {
    if (!roomId) return
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
        
      if (error) throw error
      
      setRoom(data)
      
      // 사용자 확인
      const userId = localStorage.getItem('userId')
      if (!userId) {
        console.error('사용자 ID가 없습니다')
        navigate('/')
        return
      }
      
      const idx = data.participants.findIndex((p: any) => p.id === userId)
      setMyIndex(idx)
      
      // 호스트 확인 및 게임 시작
      if (data.host_id === userId && !data.game_state.winner) {
        startGlowSequence(data)
      }
    } catch (error) {
      console.error('게임 초기화 실패:', error)
      navigate('/')
    }
  }
  
  const startGlowSequence = async (roomData: GameRoom) => {
    if (!roomId) return
    
    let currentIndex = -1
    let speed = 600
    let rounds = 0
    let stepCount = 0
    const minRounds = 3
    const totalParticipants = roomData.participants.length
    
    if (totalParticipants === 0) return
    
    const runGlow = async () => {
      currentIndex = (currentIndex + 1) % totalParticipants
      stepCount++
      
      try {
        await updateGameState(roomId, { glowing_index: currentIndex })
        
        if (currentIndex === 0 && rounds > 0) {
          rounds++
        } else if (currentIndex === 0) {
          rounds = 1
        }
        
        const accelerationFactor = totalParticipants > 5 ? 0.92 : 0.94
        speed = Math.max(30, speed * accelerationFactor)
        
        if (rounds >= minRounds && stepCount > minRounds * totalParticipants) {
          const stopProbability = speed < 80 ? 0.25 : speed < 150 ? 0.15 : 0.03
          
          if (Math.random() < stopProbability) {
            if (glowInterval.current) {
              clearInterval(glowInterval.current)
              glowInterval.current = null
            }
            
            const winner = roomData.participants[currentIndex]
            await updateGameState(roomId, { 
              glowing_index: currentIndex,
              winner: winner.name 
            })
            return
          }
        }
        
        glowInterval.current = setTimeout(runGlow, speed)
      } catch (error) {
        console.error('게임 상태 업데이트 실패:', error)
        if (glowInterval.current) {
          clearInterval(glowInterval.current)
          glowInterval.current = null
        }
      }
    }
    
    glowInterval.current = setTimeout(runGlow, speed)
  }
  
  const handleWinner = (winnerName: string) => {
    setWinner(winnerName)
    setShowWinnerText(true)
    
    const isWinner = room?.participants[myIndex]?.name === winnerName
    
    if (isWinner) {
      setTimeout(() => {
        setShowFireworks(true)
        navigator.vibrate?.([200, 100, 200, 100, 300])
      }, 300)
      
      setTimeout(() => {
        setShowFireworks(false)
      }, 4000)
    }
  }
  
  const resetGame = async () => {
    if (!roomId || !room) return
    
    try {
      await updateGameState(roomId, { 
        glowing_index: -1,
        winner: undefined 
      })
      setWinner(null)
      setShowFireworks(false)
      setShowWinnerText(false)
      setIsGlowing(false)
    } catch (error) {
      console.error('게임 리셋 실패:', error)
    }
  }
  
  if (!room || myIndex === -1) {
    return (
      <div 
        className="h-screen-mobile w-screen flex items-center justify-center bg-white"
        style={{
          height: '100vh',
          height: '100dvh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0
        }}
      >
        <motion.div
          className="text-xl sm:text-2xl font-light tracking-[0.2em] text-gray-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontWeight: 300
          }}
        >
          LOADING
        </motion.div>
      </div>
    )
  }
  
  const isWinner = room.participants[myIndex]?.name === winner
  
  return (
    <motion.div 
      className="h-screen-mobile w-screen flex flex-col bg-white relative overflow-hidden touch-none"
      style={{
        height: '100vh',
        height: '100dvh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 미니멀 불꽃놀이 효과 */}
      <AnimatePresence>
        {showFireworks && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(20)].map((_, i) => {
              const angle = (Math.random() - 0.5) * 120
              const initialVelocityX = Math.sin(angle * Math.PI / 180) * (100 + Math.random() * 50)
              const initialVelocityY = -Math.abs(Math.cos(angle * Math.PI / 180)) * (80 + Math.random() * 40)
              const gravity = 200 + Math.random() * 100
              const delay = Math.random() * 0.2
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: buttonPosition.x,
                    top: buttonPosition.y,
                    backgroundColor: '#ffcc00',
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0,
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    x: [0, initialVelocityX * 0.3, initialVelocityX * 0.6, initialVelocityX],
                    y: [
                      0, 
                      initialVelocityY * 0.5, 
                      initialVelocityY * 0.3 + gravity * 0.1, 
                      initialVelocityY * 0.1 + gravity
                    ],
                    scale: [0, 1, 0.5, 0],
                    opacity: [1, 1, 0.5, 0],
                  }}
                  transition={{ 
                    duration: 1.5 + Math.random() * 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: delay
                  }}
                />
              )
            })}
          </div>
        )}
      </AnimatePresence>
      
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        {/* 뒤로가기 버튼 */}
        <motion.button
          onClick={() => navigate('/')}
          className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-black text-black hover:bg-black hover:text-white transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
          }}
        >
          ←
        </motion.button>
        
        {/* 게임 타입 인디케이터 */}
        <motion.div
          className="w-12 h-12 rounded-full"
          style={{ backgroundColor: '#ffcc00' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </div>
      
      {/* 중앙 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 당첨자 텍스트 */}
        <AnimatePresence>
          {showWinnerText && winner && (
            <motion.div
              className="text-center z-30 px-6 mb-8"
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 400,
                damping: 25,
                delay: 0.1 
              }}
            >
              <motion.p 
                className="text-sm sm:text-base font-light tracking-[0.3em] text-gray-600 mb-4"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                WINNER
              </motion.p>
              
              <motion.h2 
                className="text-2xl xs:text-3xl sm:text-4xl font-light text-black"
                style={{ 
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                transition={{ 
                  delay: 0.5, 
                  type: "spring",
                  stiffness: 300
                }}
              >
                {winner}
              </motion.h2>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 내 번호 */}
        <motion.div
          className="mb-8 sm:mb-12"
          animate={{ 
            scale: isGlowing ? 1.1 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.h2
            className={`text-5xl xs:text-6xl sm:text-7xl font-light transition-colors duration-300 ${
              isGlowing ? 'text-black' : 'text-gray-300'
            }`}
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontWeight: 300
            }}
            animate={{
              letterSpacing: isGlowing ? '0.15em' : '0.1em'
            }}
          >
            {myIndex + 1}
          </motion.h2>
        </motion.div>
        
        {/* 중앙 인터랙션 영역 */}
        <motion.div
          ref={buttonRef}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full relative border-2 flex items-center justify-center mb-8"
          animate={{ 
            scale: isGlowing ? 1.2 : 1,
            borderColor: isGlowing ? '#ffcc00' : '#e5e5e5',
            backgroundColor: isGlowing ? '#ffcc00' : '#f5f5f5'
          }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        >
          {/* 중앙 인디케이터 */}
          <motion.div
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
            style={{
              backgroundColor: isGlowing ? '#ffffff' : '#000000'
            }}
            animate={{
              scale: isGlowing ? [1, 1.3, 1] : 1,
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: isGlowing ? 0.8 : 2,
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
          
          {/* 발광 링 효과 */}
          <AnimatePresence>
            {isGlowing && (
              <>
                {[...Array(2)].map((_, i) => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: '#ffcc00' }}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ 
                      scale: [1, 1.5 + i * 0.3, 2 + i * 0.3],
                      opacity: [0.6, 0.2, 0]
                    }}
                    transition={{ 
                      duration: 1.2 + i * 0.2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.2
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* 하단 정보 */}
      <motion.div
        className="text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p 
          className="text-xs sm:text-sm font-light tracking-[0.2em] text-gray-500"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontWeight: 300
          }}
        >
          {room.participants.length} PLAYERS
        </p>
      </motion.div>
      
      {/* 게임 결과 오버레이 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50"
            style={{
              paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
              paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 3 }}
          >
            <motion.div 
              className="text-center max-w-sm w-full px-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200,
                damping: 20,
                delay: 3.2 
              }}
            >
              <motion.div
                className="flex flex-col gap-4 items-center justify-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.5 }}
              >
                {isWinner && (
                  <motion.button
                    onClick={resetGame}
                    className="w-full text-base sm:text-lg font-light tracking-[0.2em] px-6 py-4 sm:py-5 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 min-h-[56px]"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    PLAY AGAIN
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => navigate('/')}
                  className="w-full text-base sm:text-lg font-light tracking-[0.2em] px-6 py-4 sm:py-5 border-2 border-gray-600 text-gray-800 rounded-full hover:bg-gray-100 transition-all duration-300 min-h-[56px]"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  NEW GAME
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
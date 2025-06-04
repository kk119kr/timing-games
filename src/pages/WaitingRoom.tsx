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
        
        const userId = localStorage.getItem('userId')
        const idx = newRoom.participants.findIndex(p => p.id === userId)
        setMyIndex(idx)
        
        if (newRoom.game_state.glowing_index === idx) {
          setIsGlowing(true)
        } else {
          setIsGlowing(false)
        }
        
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
      
      const userId = localStorage.getItem('userId')
      if (!userId) {
        navigate('/')
        return
      }
      
      const idx = data.participants.findIndex((p: any) => p.id === userId)
      setMyIndex(idx)
      
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
    let speed = 500
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
        
        const accelerationFactor = totalParticipants > 5 ? 0.93 : 0.95
        speed = Math.max(40, speed * accelerationFactor)
        
        if (rounds >= minRounds && stepCount > minRounds * totalParticipants) {
          const stopProbability = speed < 100 ? 0.25 : speed < 200 ? 0.15 : 0.03
          
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          className="w-12 h-12 border-2 border-black rounded-full"
          style={{ borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }
  
  const isWinner = room.participants[myIndex]?.name === winner
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 폭죽 효과 - 서브스턴스 스타일 */}
      <AnimatePresence>
        {showFireworks && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(30)].map((_, i) => {
              const angle = (Math.random() - 0.5) * 120
              const initialVelocityX = Math.sin(angle * Math.PI / 180) * (150 + Math.random() * 100)
              const initialVelocityY = -Math.abs(Math.cos(angle * Math.PI / 180)) * (120 + Math.random() * 80)
              const gravity = 250 + Math.random() * 150
              const delay = Math.random() * 0.3
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-1 h-1 bg-black rounded-full"
                  style={{
                    left: buttonPosition.x,
                    top: buttonPosition.y,
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
                    scale: [0, 1.5, 1, 0.3],
                    opacity: [1, 1, 0.8, 0],
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: delay
                  }}
                />
              )
            })}
          </div>
        )}
      </AnimatePresence>
      
      {/* 뒤로가기 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 w-10 h-10 flex items-center justify-center border border-black rounded-full text-sm font-light hover:bg-black hover:text-white transition-colors z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 당첨자 텍스트 */}
      <AnimatePresence>
        {showWinnerText && winner && (
          <motion.div
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center z-30"
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
              className="text-sm font-light tracking-[0.4em] text-gray-600 mb-6 uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              WINNER
            </motion.p>
            
            <motion.h2 
              className="text-5xl md:text-6xl font-black text-black"
              style={{ 
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                filter: isWinner ? 'drop-shadow(0 0 20px rgba(255, 204, 0, 0.3))' : 'none'
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
            
            {/* 당첨자 하단 라인 */}
            <motion.div
              className="w-16 h-0.5 bg-yellow-500 mx-auto mt-4"
              initial={{ width: 0 }}
              animate={{ width: 64 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 내 번호 - 미니멀 타이포그래피 */}
      <motion.div
        className="mb-16"
        animate={{ 
          scale: isGlowing ? 1.1 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.h2
          className={`text-8xl md:text-9xl font-black transition-colors duration-200 ${
            isGlowing ? 'text-black' : 'text-gray-200'
          }`}
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            filter: isGlowing 
              ? 'drop-shadow(0 0 30px rgba(255, 204, 0, 0.4))' 
              : 'none',
          }}
          animate={{
            letterSpacing: isGlowing ? '0.1em' : '0.05em'
          }}
        >
          {myIndex + 1}
        </motion.h2>
      </motion.div>
      
      {/* 중앙 인터랙션 영역 - 서브스턴스 스타일 */}
      <motion.div
        ref={buttonRef}
        className="w-32 h-32 md:w-40 md:h-40 rounded-full relative border-2"
        animate={{ 
          scale: isGlowing ? 1.2 : 1
        }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        style={{
          backgroundColor: isGlowing ? '#ffcc00' : 'transparent',
          borderColor: isGlowing ? '#ffcc00' : '#e5e5e5',
          boxShadow: isGlowing 
            ? '0 0 60px rgba(255, 204, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)' 
            : '0 0 20px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* 발광 링 효과 */}
        <AnimatePresence>
          {isGlowing && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: '#ffcc00' }}
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ 
                    scale: [1, 1.5 + i * 0.3, 2 + i * 0.3],
                    opacity: [0.4, 0.2, 0]
                  }}
                  transition={{ 
                    duration: 1.2 + i * 0.2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.15
                  }}
                />
              ))}
              
              {/* 중앙 코어 */}
              <motion.div
                className="absolute inset-8 rounded-full bg-white"
                animate={{ 
                  opacity: [0.6, 1, 0.6],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 참가자 수 표시 */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs font-light tracking-[0.3em] text-gray-500 uppercase">
          {room.participants.length} PLAYERS
        </p>
      </motion.div>
      
      {/* 게임 결과 오버레이 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 3 }}
          >
            <motion.div 
              className="text-center max-w-sm w-full"
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
                className="flex flex-col gap-6 items-center justify-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.5 }}
              >
                {isWinner && (
                  <button
                    onClick={resetGame}
                    className="w-full text-lg font-light tracking-[0.2em] px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 uppercase"
                  >
                    PLAY AGAIN
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-lg font-light tracking-[0.2em] px-8 py-4 border border-black text-black rounded-lg hover:bg-black hover:text-white transition-all duration-300 uppercase"
                >
                  NEW GAME
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 배경 기하학적 요소들 */}
      <motion.div
        className="absolute top-1/4 left-8 w-px h-20 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: 80 }}
        transition={{ delay: 1, duration: 0.8 }}
      />
      <motion.div
        className="absolute bottom-1/4 right-8 w-px h-20 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: 80 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      />
    </motion.div>
  )
}
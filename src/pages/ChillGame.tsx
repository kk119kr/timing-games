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
    let speed = 800
    let rounds = 0
    let stepCount = 0
    const minRounds = 5
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
        
        speed = Math.max(60, speed * 0.97)
        
        if (rounds >= minRounds && stepCount > minRounds * totalParticipants) {
          const stopProbability = speed < 150 ? 0.15 : 0.05
          
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
    
    // 즉시 당첨자 텍스트 표시
    setShowWinnerText(true)
    
    const isWinner = room?.participants[myIndex]?.name === winnerName
    
    if (isWinner) {
      // 당첨자라면 불꽃놀이 효과 시작
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <motion.div
          className="text-2xl md:text-3xl font-black tracking-[0.2em] text-gray-600"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          LOADING
        </motion.div>
      </div>
    )
  }
  
  const isWinner = room.participants[myIndex]?.name === winner
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 버튼에서 시작하는 불꽃놀이 효과 */}
      <AnimatePresence>
        {showFireworks && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(60)].map((_, i) => {
              const angle = (i * 6) - 180
              const velocity = 80 + Math.random() * 150
              const hue = 45 + Math.random() * 30 // 노란색 계열
              const delay = Math.random() * 0.5
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full"
                  style={{
                    left: buttonPosition.x,
                    top: buttonPosition.y,
                    backgroundColor: `hsl(${hue}, 100%, 60%)`,
                    boxShadow: `0 0 15px hsl(${hue}, 100%, 60%)`
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0,
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    x: Math.cos(angle * Math.PI / 180) * velocity * 4,
                    y: [
                      0,
                      Math.sin(angle * Math.PI / 180) * velocity * 2.5,
                      Math.sin(angle * Math.PI / 180) * velocity * 2.5 + 300
                    ],
                    scale: [0, 2.5, 0],
                    opacity: [1, 1, 0],
                    rotate: [0, 720]
                  }}
                  transition={{ 
                    duration: 2.5 + Math.random() * 1.5,
                    ease: "easeOut",
                    delay: delay
                  }}
                />
              )
            })}
            
            {/* 추가 스파클 효과 */}
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-1 h-1 md:w-2 md:h-2 bg-yellow-300 rounded-full"
                style={{
                  left: buttonPosition.x,
                  top: buttonPosition.y,
                  boxShadow: '0 0 10px #ffd700'
                }}
                initial={{ scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 3,
                  delay: Math.random() * 1,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {/* 상단 게임 타입 */}
      <motion.div
        className="absolute top-8 md:top-12 left-1/2 transform -translate-x-1/2"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-4xl md:text-5xl font-black tracking-[0.4em] text-gray-800">
          CHILL
        </h1>
      </motion.div>
      
      {/* 당첨자 텍스트 - 버튼 상단에 표시 */}
      <AnimatePresence>
        {showWinnerText && winner && (
          <motion.div
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-full text-center"
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
              className="text-xl md:text-2xl font-black tracking-[0.4em] text-gray-600 mb-3"
              style={{ textShadow: '0 0 15px rgba(255, 204, 0, 0.3)' }}
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
                textShadow: '0 0 30px rgba(255, 204, 0, 0.8), 0 0 60px rgba(255, 204, 0, 0.4)'
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
      
      {/* 내 번호 - 큰 타이포그래피 */}
      <motion.div
        className="mb-16 md:mb-20"
        animate={{ 
          scale: isGlowing ? 1.15 : 1,
          filter: isGlowing ? 'brightness(1.3)' : 'brightness(1)'
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.h2
          className={`text-9xl md:text-10xl font-black transition-colors duration-300 ${
            isGlowing ? 'text-black' : 'text-gray-400'
          }`}
          style={{
            fontVariantNumeric: 'tabular-nums',
            textShadow: isGlowing 
              ? '0 0 50px rgba(255, 204, 0, 0.9), 0 0 100px rgba(255, 204, 0, 0.5)' 
              : 'none'
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
        className="w-40 h-40 md:w-48 md:h-48 rounded-full relative"
        animate={{ 
          scale: isGlowing ? 1.2 : 1
        }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        style={{
          backgroundColor: isGlowing ? '#ffcc00' : '#e5e7eb',
          boxShadow: isGlowing 
            ? '0 0 100px rgba(255, 204, 0, 0.9), 0 0 150px rgba(255, 204, 0, 0.6), inset 0 0 50px rgba(255, 255, 255, 0.3)' 
            : '0 15px 40px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* 발광 링 효과 - 더 강화 */}
        <AnimatePresence>
          {isGlowing && (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: '#ffcc00' }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ 
                    scale: [1, 2 + i * 0.5, 3.5 + i * 0.5],
                    opacity: [0.8, 0.4, 0]
                  }}
                  transition={{ 
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.3
                  }}
                />
              ))}
              
              {/* 추가 펄스 효과 */}
              <motion.div
                className="absolute -inset-4 rounded-full border border-yellow-300"
                animate={{ 
                  scale: [1, 1.5, 2],
                  opacity: [0.6, 0.3, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            </>
          )}
        </AnimatePresence>
        
        {/* 내부 발광 효과 - 더 강화 */}
        <AnimatePresence>
          {isGlowing && (
            <>
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ backgroundColor: '#fff3a0' }}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ 
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* 중앙 밝은 점 */}
              <motion.div
                className="absolute inset-8 rounded-full bg-white"
                animate={{ 
                  opacity: [0.8, 1, 0.8],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 참가자 정보 */}
      <motion.div
        className="absolute bottom-8 md:bottom-12 left-1/2 transform -translate-x-1/2 text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-lg md:text-xl font-black tracking-[0.2em] text-gray-600">
          {room.participants.length} PLAYERS
        </p>
      </motion.div>
      
      {/* 당첨 결과 - 전체 화면 오버레이 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 4 }} // 당첨자 텍스트와 불꽃놀이 후에 표시
          >
            <motion.div 
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200,
                damping: 20,
                delay: 4.2 
              }}
            >
              {/* 액션 버튼들 */}
              <motion.div
                className="flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4.5 }}
              >
                {isWinner && (
                  <button
                    onClick={resetGame}
                    className="text-lg md:text-xl font-black tracking-[0.2em] px-8 py-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all duration-300 border-2 border-black"
                    style={{ 
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                      textShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    PLAY AGAIN
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/')}
                  className="text-lg md:text-xl font-black tracking-[0.2em] px-8 py-4 border-4 border-gray-600 text-gray-800 rounded-2xl hover:bg-gray-100 transition-all duration-300"
                  style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)' }}
                >
                  NEW GAME
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 홈 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 text-sm md:text-base font-black tracking-[0.15em] opacity-70 hover:opacity-100 transition-opacity"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        whileTap={{ scale: 0.95 }}
      >
        HOME
      </motion.button>
    </motion.div>
  )
}
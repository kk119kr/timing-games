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
  const peerManager = useRef<GamePeerManager | null>(null)
  const glowInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  
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
    
    if (room?.participants[myIndex]?.name === winnerName) {
      setShowFireworks(true)
      navigator.vibrate?.([200, 100, 200, 100, 300])
      
      setTimeout(() => {
        setShowFireworks(false)
      }, 5000)
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
      setIsGlowing(false)
    } catch (error) {
      console.error('게임 리셋 실패:', error)
    }
  }
  
  if (!room || myIndex === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <motion.div
          className="text-xl md:text-2xl font-light tracking-[0.2em] text-gray-600"
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
      {/* 불꽃놀이 효과 */}
      <AnimatePresence>
        {showFireworks && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(30)].map((_, i) => {
              const angle = (i * 12) - 90
              const velocity = 80 + Math.random() * 100
              const hue = Math.random() * 60 + 20 // 따뜻한 색상
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: `hsl(${hue}, 100%, 60%)`
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
                      Math.sin(angle * Math.PI / 180) * velocity * 2,
                      Math.sin(angle * Math.PI / 180) * velocity * 2 + 500
                    ],
                    scale: [0, 1.5, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 0.5,
                    ease: "easeOut",
                    delay: i * 0.03
                  }}
                />
              )
            })}
          </div>
        )}
      </AnimatePresence>
      
      {/* 상단 게임 타입 */}
      <motion.div
        className="absolute top-8 md:top-12 left-1/2 transform -translate-x-1/2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-2xl md:text-3xl font-thin tracking-[0.3em] text-gray-800">
          CHILL
        </h1>
      </motion.div>
      
      {/* 내 번호 - 큰 타이포그래피 */}
      <motion.div
        className="mb-12 md:mb-16"
        animate={{ 
          scale: isGlowing ? 1.1 : 1,
          filter: isGlowing ? 'brightness(1.2)' : 'brightness(1)'
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.h2
          className={`text-8xl md:text-9xl font-thin transition-colors duration-300 ${
            isGlowing ? 'text-black' : 'text-gray-400'
          }`}
          style={{
            fontVariantNumeric: 'tabular-nums',
            textShadow: isGlowing 
              ? '0 0 40px rgba(0, 0, 0, 0.3)' 
              : 'none'
          }}
          animate={{
            letterSpacing: isGlowing ? '0.1em' : '0.05em'
          }}
        >
          {myIndex + 1}
        </motion.h2>
      </motion.div>
      
      {/* 중앙 인터랙션 영역 */}
      <motion.div
        className="w-32 h-32 md:w-40 md:h-40 rounded-full relative"
        animate={{ 
          scale: isGlowing ? 1.1 : 1,
          backgroundColor: isGlowing ? '#000000' : '#e5e7eb'
        }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: isGlowing 
            ? '0 0 80px rgba(0, 0, 0, 0.4)' 
            : '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* 발광 링 효과 */}
        <AnimatePresence>
          {isGlowing && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-black"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ 
                  scale: [1, 1.8, 2.5],
                  opacity: [0.6, 0.2, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-black"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ 
                  scale: [1, 2, 3],
                  opacity: [0.4, 0.1, 0]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 참가자 정보 */}
      <motion.div
        className="absolute bottom-8 md:bottom-12 left-1/2 transform -translate-x-1/2 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm md:text-base font-light tracking-[0.15em] text-gray-600">
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
          >
            <motion.div 
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200,
                damping: 20,
                delay: 0.2 
              }}
            >
              <motion.p 
                className="text-sm md:text-base tracking-[0.3em] text-gray-500 mb-4 md:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                WINNER
              </motion.p>
              
              <motion.h2 
                className="text-6xl md:text-8xl font-thin text-black mb-8 md:mb-12"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {winner}
              </motion.h2>
              
              {/* 액션 버튼들 */}
              <motion.div
                className="flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                {isWinner && (
                  <button
                    onClick={resetGame}
                    className="text-sm md:text-base tracking-[0.15em] font-light border-b border-black pb-1 hover:opacity-70 transition-opacity"
                  >
                    PLAY AGAIN
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/')}
                  className="text-sm md:text-base tracking-[0.15em] font-light border-b border-gray-400 pb-1 hover:opacity-70 transition-opacity text-gray-600"
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
        className="absolute top-6 right-6 md:top-8 md:right-8 text-sm tracking-[0.15em] font-light opacity-70 hover:opacity-100 transition-opacity"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        whileTap={{ scale: 0.95 }}
      >
        HOME
      </motion.button>
    </motion.div>
  )
}
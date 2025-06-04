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
      
      // PeerJS 초기화 (현재는 사용되지 않으므로 주석 처리)
      // peerManager.current = new GamePeerManager(userId, data.host_id === userId)
    } catch (error) {
      console.error('게임 초기화 실패:', error)
      navigate('/')
    }
  }
  
  const startGlowSequence = async (roomData: GameRoom) => {
    if (!roomId) return
    
    let currentIndex = -1 // -1부터 시작하여 첫 번째 실행에서 0이 됨
    let speed = 400 // 시작 속도 (ms)
    let rounds = 0
    const minRounds = 3
    const totalParticipants = roomData.participants.length
    
    if (totalParticipants === 0) return
    
    const runGlow = async () => {
      // 다음 참가자로 이동
      currentIndex = (currentIndex + 1) % totalParticipants
      
      try {
        // 상태 업데이트
        await updateGameState(roomId, { glowing_index: currentIndex })
        
        // 한 바퀴 돌았을 때 (0번 인덱스로 돌아왔을 때)
        if (currentIndex === 0 && rounds > 0) {
          rounds++
          
          // 속도 점진적 증가 (더 빨라짐)
          speed = Math.max(80, speed * 0.85)
          
          // 최소 3바퀴 이상 돌고 확률적으로 멈춤 (더 긴 확률로 조정)
          if (rounds >= minRounds && Math.random() < 0.2) {
            // 게임 종료! 현재 위치의 참가자가 승리
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
        } else if (currentIndex === 0) {
          rounds = 1 // 첫 바퀴 완료
        }
        
        // 다음 실행 예약
        glowInterval.current = setTimeout(runGlow, speed)
      } catch (error) {
        console.error('게임 상태 업데이트 실패:', error)
        if (glowInterval.current) {
          clearInterval(glowInterval.current)
          glowInterval.current = null
        }
      }
    }
    
    // 첫 실행
    glowInterval.current = setTimeout(runGlow, speed)
  }
  
  const handleWinner = (winnerName: string) => {
    setWinner(winnerName)
    
    // 당첨자인 경우 특별 효과
    if (room?.participants[myIndex]?.name === winnerName) {
      setShowFireworks(true)
      navigator.vibrate?.([200, 100, 200, 100, 300])
      
      // 5초 후 불꽃놀이 효과 종료
      setTimeout(() => setShowFireworks(false), 5000)
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
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-2xl font-medium text-gray-600">로딩 중...</div>
      </div>
    )
  }
  
  const isWinner = room.participants[myIndex]?.name === winner
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100 p-8 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 불꽃놀이 효과 - 포물선 애니메이션 */}
      <AnimatePresence>
        {showFireworks && (
          <>
            {[...Array(20)].map((_, i) => {
              const angle = (i * 18) - 90 // -90도부터 270도까지 분산
              const velocity = 50 + Math.random() * 100
              const gravity = 500
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-3 h-3 bg-yellow-400 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0,
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    x: Math.cos(angle * Math.PI / 180) * velocity * 2,
                    y: [
                      0,
                      Math.sin(angle * Math.PI / 180) * velocity,
                      Math.sin(angle * Math.PI / 180) * velocity + gravity
                    ],
                    scale: [0, 1, 0.5],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 2 + Math.random(),
                    ease: "easeOut",
                    delay: i * 0.1
                  }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>
      
      {/* 내 번호 표시 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <motion.p 
          className={`text-6xl font-bold transition-colors duration-300 ${
            isGlowing ? 'text-yellow-400' : 'text-gray-300'
          }`}
          animate={{ 
            opacity: isGlowing ? 1 : 0.4,
            textShadow: isGlowing 
              ? '0 0 20px rgba(255, 255, 0, 0.8), 0 0 40px rgba(255, 255, 0, 0.5)' 
              : 'none'
          }}
        >
          {myIndex + 1}
        </motion.p>
      </div>
      
      {/* 메인 버튼 */}
      <motion.div
        layoutId="game-button"
        className="relative"
        animate={{ scale: isGlowing ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div 
          className="w-64 h-64 rounded-full shadow-2xl bg-gray-300"
          animate={{
            backgroundColor: isGlowing ? '#fbbf24' : '#d1d5db', // 노란색 vs 회색
            boxShadow: isGlowing 
              ? '0 0 60px rgba(251, 191, 36, 0.8), 0 0 120px rgba(251, 191, 36, 0.4), 0 0 180px rgba(251, 191, 36, 0.2)' 
              : '0 25px 50px -12px rgba(0,0,0,0.25)',
            scale: isGlowing ? 1.05 : 1
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* 발광 링 효과 */}
        <AnimatePresence>
          {isGlowing && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-yellow-300"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ 
                scale: [1, 1.3, 1.6],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 바우하우스 스타일 당첨 팝업 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white border-8 border-black p-12 relative"
              style={{ fontFamily: 'Arial, sans-serif' }}
              initial={{ scale: 0, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200,
                damping: 15,
                delay: 0.2 
              }}
            >
              {/* 기하학적 장식 요소 */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-400" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-blue-500" />
              
              <div className="text-center">
                <motion.h2 
                  className="text-2xl font-black tracking-wider mb-6 uppercase"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  WINNER
                </motion.h2>
                <motion.p 
                  className="text-5xl font-black tracking-tight"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  {winner}
                </motion.p>
                
                {/* 리셋 버튼 (당첨자만 보임) */}
                {isWinner && (
                  <motion.button
                    onClick={resetGame}
                    className="mt-6 bg-black text-white px-6 py-2 font-bold tracking-wider uppercase pointer-events-auto hover:bg-gray-800 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    다시 시작
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 홈 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 right-8 w-12 h-12 bg-black rounded-full flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="w-5 h-0.5 bg-white group-hover:bg-gray-300 transition-colors" />
      </motion.button>
      
      {/* 참가자 수 표시 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <p className="text-lg font-medium text-gray-600">
          참가자: {room.participants.length}명
        </p>
      </div>
    </motion.div>
  )
}
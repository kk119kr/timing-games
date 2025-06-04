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
    let speed = 800 // 시작 속도 (느리게 시작)
    let rounds = 0
    let stepCount = 0 // 전체 스텝 카운트
    const minRounds = 5 // 최소 5바퀴
    const totalParticipants = roomData.participants.length
    
    if (totalParticipants === 0) return
    
    const runGlow = async () => {
      // 다음 참가자로 이동
      currentIndex = (currentIndex + 1) % totalParticipants
      stepCount++
      
      try {
        // 상태 업데이트
        await updateGameState(roomId, { glowing_index: currentIndex })
        
        // 한 바퀴 돌았을 때 (0번 인덱스로 돌아왔을 때)
        if (currentIndex === 0 && rounds > 0) {
          rounds++
        } else if (currentIndex === 0) {
          rounds = 1 // 첫 바퀴 완료
        }
        
        // 점진적 가속 (매 스텝마다 조금씩 빨라짐)
        speed = Math.max(60, speed * 0.97) // 더 부드러운 가속
        
        // 최소 5바퀴 이상 돌고 확률적으로 멈춤
        if (rounds >= minRounds && stepCount > minRounds * totalParticipants) {
          // 속도가 충분히 빨라진 후 멈출 확률 증가
          const stopProbability = speed < 150 ? 0.15 : 0.05
          
          if (Math.random() < stopProbability) {
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
      console.log('당첨! 불꽃놀이 시작') // 디버깅용
      setShowFireworks(true)
      navigator.vibrate?.([200, 100, 200, 100, 300])
      
      // 5초 후 불꽃놀이 효과 종료
      setTimeout(() => {
        console.log('불꽃놀이 종료') // 디버깅용
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
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(24)].map((_, i) => {
              const angle = (i * 15) - 90 // 더 조밀한 분산
              const velocity = 60 + Math.random() * 80
              const gravity = 400
              
              return (
                <motion.div
                  key={`firework-${i}`}
                  className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 12px rgba(255, 255, 0, 0.8)'
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0,
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    x: Math.cos(angle * Math.PI / 180) * velocity * 3,
                    y: [
                      0,
                      Math.sin(angle * Math.PI / 180) * velocity * 1.5,
                      Math.sin(angle * Math.PI / 180) * velocity * 1.5 + gravity
                    ],
                    scale: [0, 1.2, 0.3],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 2.5 + Math.random() * 0.5,
                    ease: "easeOut",
                    delay: i * 0.05
                  }}
                />
              )
            })}
          </div>
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
      
      {/* 미니멀 당첨 팝업 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white border-2 border-black p-16 relative"
              style={{ fontFamily: 'SF Pro Display, -apple-system, sans-serif' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 300,
                damping: 25,
                delay: 0.2 
              }}
            >
              <div className="text-center">
                <motion.h2 
                  className="text-xl font-medium tracking-wide mb-8 text-gray-600 uppercase"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Winner
                </motion.h2>
                <motion.p 
                  className="text-6xl font-light tracking-tight text-black"
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
                    className="mt-12 border border-black text-black px-8 py-3 font-medium tracking-wide pointer-events-auto hover:bg-black hover:text-white transition-all duration-200"
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
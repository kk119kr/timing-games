import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, GameRoom, updateGameState } from '../lib/supabase'
import { GamePeerManager } from '../lib/peer'

export default function ChillGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [myIndex, setMyIndex] = useState<number>(-1)
  const [isGlowing, setIsGlowing] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const peerManager = useRef<GamePeerManager | null>(null)
  const glowInterval = useRef<NodeJS.Timeout | null>(null)
  
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
      if (glowInterval.current) clearInterval(glowInterval.current)
      peerManager.current?.destroy()
    }
  }, [roomId])
  
  const initializeGame = async () => {
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
      const idx = data.participants.findIndex((p: any) => p.id === userId)
      setMyIndex(idx)
      
      // 호스트 확인
      if (data.host_id === userId) {
        setIsHost(true)
        startGlowSequence(data)
      }
      
      // PeerJS 초기화
      peerManager.current = new GamePeerManager(userId!, data.host_id === userId)
    } catch (error) {
      console.error('게임 초기화 실패:', error)
    }
  }
  
  const startGlowSequence = async (roomData: GameRoom) => {
    let currentIndex = 0
    let speed = 500 // 시작 속도 (ms)
    let rounds = 0
    const minRounds = 3
    const totalParticipants = roomData.participants.length
    
    glowInterval.current = setInterval(async () => {
      // 다음 참가자로 이동
      currentIndex = (currentIndex + 1) % totalParticipants
      
      // 상태 업데이트
      await updateGameState(roomId!, { glowing_index: currentIndex })
      
      // 한 바퀴 돌았을 때
      if (currentIndex === 0) {
        rounds++
        
        // 속도 증가
        speed = Math.max(50, speed * 0.8)
        
        // 최소 3바퀴 이상 돌고 랜덤하게 멈춤
        if (rounds >= minRounds && Math.random() < 0.1) {
          // 멈춤!
          if (glowInterval.current) clearInterval(glowInterval.current)
          
          // 랜덤 위치 선택
          const winnerIndex = Math.floor(Math.random() * totalParticipants)
          const winner = roomData.participants[winnerIndex]
          
          await updateGameState(roomId!, { 
            glowing_index: winnerIndex,
            winner: winner.name 
          })
        } else {
          // 속도 조정
          if (glowInterval.current) clearInterval(glowInterval.current)
          glowInterval.current = setInterval(arguments.callee, speed)
        }
      }
    }, speed)
  }
  
  const handleWinner = (winnerName: string) => {
    setWinner(winnerName)
    
    // 불꽃놀이 효과
    if (room?.participants[myIndex]?.name === winnerName) {
      // 당첨자 특별 효과
      navigator.vibrate?.([100, 50, 100, 50, 200])
    }
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 내 번호 표시 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <motion.p 
          className="text-6xl font-bold text-gray-300"
          animate={{ opacity: isGlowing ? 1 : 0.3 }}
        >
          {myIndex + 1}
        </motion.p>
      </div>
      
      {/* 메인 버튼 */}
      <motion.div
        layoutId="game-button"
        className="relative"
        animate={{ scale: isGlowing ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <motion.div 
          className={`w-64 h-64 rounded-full shadow-2xl ${
            winner ? 'bg-black' : 'bg-gray-800'
          }`}
          animate={{
            backgroundColor: isGlowing ? '#000000' : '#e5e7eb',
            boxShadow: isGlowing 
              ? '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(0,0,0,0.4)' 
              : '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}
          transition={{ duration: 0.2 }}
        />
        
        {/* 당첨 효과 */}
        <AnimatePresence>
          {winner && room?.participants[myIndex]?.name === winner && (
            <>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ 
                    scale: [0, 1.5, 2.5], 
                    rotate: i * 30,
                    opacity: [1, 1, 0] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    delay: i * 0.1,
                    ease: "easeOut" 
                  }}
                >
                  <div className="w-2 h-16 bg-black rounded-full" />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 당첨 메시지 */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-black text-white p-8 rounded-2xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              <h2 className="text-4xl font-bold mb-2">WINNER</h2>
              <p className="text-6xl font-bold">{winner}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 홈 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 right-8 w-10 h-10 bg-black rounded-full flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="w-4 h-0.5 bg-white" />
      </motion.button>
    </motion.div>
  )
}
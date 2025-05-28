import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, updateGameState } from '../lib/supabase'
import type { GameRoom } from '../lib/supabase'

interface RoundResult {
  participantId: string
  pressTime: number
  score: number
}

export default function FreshGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [buttonColor, setButtonColor] = useState(0) // 0-100 빨간색 농도
  const [hasPressed, setHasPressed] = useState(false)
  const [othersPressCount, setOthersPressCount] = useState(0)
  const [roundActive, setRoundActive] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResult[][]>([])
  const [showResults, setShowResults] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const colorInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundStartTime = useRef<number>(0)
  
  useEffect(() => {
    if (!roomId) return
    
    initializeGame()
    
    const subscription = subscribeToRoom(roomId, handleRoomUpdate)
    
    return () => {
      subscription.unsubscribe()
      if (colorInterval.current) clearInterval(colorInterval.current)
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
      
      const userId = localStorage.getItem('userId')
      if (data.host_id === userId) {
        setIsHost(true)
        // 호스트가 3초 후 카운트다운 시작
        setTimeout(() => {
          startCountdown()
        }, 1000)
      }
    } catch (error) {
      console.error('게임 초기화 실패:', error)
    }
  }
  
  const handleRoomUpdate = (payload: any) => {
    if (payload.new) {
      const newRoom = payload.new as GameRoom
      setRoom(newRoom)
      
      const gameState = newRoom.game_state
      
      // 라운드 시작
      if (gameState.round_start_time && !roundActive) {
        roundStartTime.current = gameState.round_start_time
        startRound()
      }
      
      // 다른 사람들이 누른 횟수 업데이트
      const userId = localStorage.getItem('userId')
      const pressedCount = newRoom.participants.filter(
        p => p.has_pressed && p.id !== userId
      ).length
      setOthersPressCount(pressedCount)
      
      // 라운드 종료
      if (gameState.current_round && gameState.current_round > currentRound) {
        endRound(newRoom)
      }
    }
  }
  
  const startCountdown = async () => {
    // 3, 2, 1 카운트다운
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(null)
    
    // 라운드 시작
    await updateGameState(roomId!, {
      round_start_time: Date.now(),
      current_round: 1
    })
  }
  
  const startRound = () => {
    console.log('Starting round...')
    setRoundActive(true)
    setHasPressed(false)
    setButtonColor(0)
    
    // 색상 변화 시작 (4초 동안 0 → 100)
    let startTime = Date.now()
    colorInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / 4000, 1) // 4초
      const colorValue = progress * 100
      
      setButtonColor(colorValue)
      console.log('Button color:', colorValue)
      
      // 4초 후 폭발
      if (progress >= 1) {
        if (!hasPressed) {
          handleExplosion()
        }
        if (colorInterval.current) {
          clearInterval(colorInterval.current)
          colorInterval.current = null
        }
        // 라운드 종료 처리
        setTimeout(() => {
          endRoundForAll()
        }, 1000)
      }
    }, 50) // 20fps로 업데이트
  }
  
  const handleButtonPress = async () => {
    if (!roundActive || hasPressed) return
    
    setHasPressed(true)
    const pressTime = Date.now() - roundStartTime.current
    
    // 서버에 프레스 시간 저장
    const userId = localStorage.getItem('userId')
    await supabase.rpc('update_participant_press', {
      room_id: roomId,
      user_id: userId,
      press_time: pressTime
    })
  }
  
  const handleExplosion = () => {
    // 폭발 효과
    navigator.vibrate?.([200])
    setButtonColor(100)
    console.log('Button exploded!')
    
    // 점수는 endRound에서 -5점으로 처리됨
  }
  
  const endRoundForAll = async () => {
    if (!room || !isHost) return
    
    // 호스트만 라운드 종료 처리
    await updateGameState(roomId!, {
      current_round: currentRound + 1
    })
  }
  
  const endRound = async (newRoom: GameRoom) => {
    setRoundActive(false)
    
    // 점수 계산
    const results = calculateScores(newRoom.participants)
    setRoundResults(prev => [...prev, results])
    
    // 다음 라운드 또는 게임 종료
    if (currentRound < 3) {
      setCurrentRound(prev => prev + 1)
      
      // 3초 후 다음 라운드
      setTimeout(() => {
        if (isHost) {
          startNextRound()
        }
      }, 3000)
    } else {
      // 게임 종료
      setShowResults(true)
    }
  }
  
  const calculateScores = (participants: any[]): RoundResult[] => {
    const pressed = participants
      .filter(p => p.has_pressed)
      .sort((a, b) => a.press_time - b.press_time)
    
    const notPressed = participants.filter(p => !p.has_pressed)
    
    const results: RoundResult[] = []
    const totalPressed = pressed.length
    
    // 누른 사람들 점수 계산
    pressed.forEach((p, index) => {
      let score = 0
      if (totalPressed % 2 === 0) {
        // 짝수
        const middle = totalPressed / 2
        score = index < middle ? -(middle - index) : (index - middle + 1)
      } else {
        // 홀수
        const middle = Math.floor(totalPressed / 2)
        if (index === middle) {
          score = 0
        } else if (index < middle) {
          score = -(middle - index)
        } else {
          score = index - middle
        }
      }
      
      results.push({
        participantId: p.id,
        pressTime: p.press_time,
        score: score
      })
    })
    
    // 못 누른 사람들 -5점
    notPressed.forEach(p => {
      results.push({
        participantId: p.id,
        pressTime: -1,
        score: -5
      })
    })
    
    return results
  }
  
  const startNextRound = async () => {
    // 참가자 상태 초기화
    await supabase.rpc('reset_participants_for_round', {
      room_id: roomId
    })
    
    // 카운트다운 시작
    startCountdown()
  }
  
  const getFinalScores = () => {
    const totalScores: Record<string, number> = {}
    
    room?.participants.forEach(p => {
      totalScores[p.id] = 0
    })
    
    roundResults.forEach(round => {
      round.forEach(result => {
        totalScores[result.participantId] += result.score
      })
    })
    
    return Object.entries(totalScores)
      .map(([id, score]) => ({
        participant: room?.participants.find(p => p.id === id),
        score
      }))
      .sort((a, b) => b.score - a.score)
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 라운드 인디케이터 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex space-x-2">
        {[1, 2, 3].map(round => (
          <div
            key={round}
            className={`w-3 h-3 rounded-full transition-colors ${
              round < currentRound ? 'bg-red-500' :
              round === currentRound ? 'bg-green-500' :
              'bg-gray-300'
            }`}
          />
        ))}
      </div>
      
      {/* 카운트다운 */}
      <AnimatePresence>
        {countdown && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              className="text-9xl font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 메인 버튼 */}
      <motion.div
        layoutId="game-button"
        className="relative"
        animate={{ scale: hasPressed ? 0.9 : 1 }}
      >
        <motion.button
          className="w-64 h-64 rounded-full shadow-2xl relative overflow-hidden transition-colors duration-100"
          style={{
            backgroundColor: roundActive 
              ? `rgb(${Math.round(255 * (buttonColor / 100))}, ${Math.round(255 * (1 - buttonColor / 100))}, ${Math.round(255 * (1 - buttonColor / 100))})` 
              : '#e5e7eb'
          }}
          onClick={handleButtonPress}
          disabled={!roundActive || hasPressed}
          whileHover={!hasPressed && roundActive ? { scale: 1.02 } : {}}
          whileTap={!hasPressed && roundActive ? { scale: 0.98 } : {}}
        >
          {/* 폭발 효과 */}
          <AnimatePresence>
            {buttonColor >= 100 && !hasPressed && (
              <motion.div
                className="absolute inset-0 bg-red-900"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.5, 2], opacity: [1, 0.5, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
        </motion.button>
        
        {/* 다른 사람들 프레스 표시 */}
        {othersPressCount > 0 && (
          <div className="absolute -right-4 -top-4">
            {[...Array(othersPressCount)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-4 bg-black rounded-full"
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  x: Math.cos(i * (Math.PI * 2 / othersPressCount)) * 40,
                  y: Math.sin(i * (Math.PI * 2 / othersPressCount)) * 40
                }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
        )}
      </motion.div>
      
      {/* 최종 결과 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            className="absolute inset-0 bg-gray-100 z-30 p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-4xl font-bold mb-8 text-center">FINAL SCORES</h2>
            
            <div className="max-w-md mx-auto">
              {getFinalScores().map((result, index) => (
                <motion.div
                  key={result.participant?.id}
                  className="flex items-center justify-between mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <p className="text-xl font-medium">{result.participant?.name}</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {result.score > 0 ? '+' : ''}{result.score}
                  </p>
                </motion.div>
              ))}
            </div>
            
            <motion.button
              onClick={() => navigate('/')}
              className="w-full mt-12 py-4 bg-black text-white rounded-xl font-bold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              NEW GAME
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 홈 버튼 */}
      {!showResults && (
        <motion.button
          onClick={() => navigate('/')}
          className="absolute top-8 right-8 w-10 h-10 bg-black rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="w-4 h-0.5 bg-white" />
        </motion.button>
      )}
    </motion.div>
  )
}
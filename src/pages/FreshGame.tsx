import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, updateGameState } from '../lib/supabase'
import type { GameRoom } from '../lib/supabase'
import { vibrate } from '../lib/native'


interface RoundResult {
  participantId: string
  pressTime: number
  score: number
}

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'round-end' | 'next-round' | 'final-results'

export default function FreshGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [buttonColor, setButtonColor] = useState(0)
  const [hasPressed, setHasPressed] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResult[][]>([])
  const [showResults, setShowResults] = useState(false)
  const [pressedOrder, setPressedOrder] = useState<string[]>([])
  const [roundEndMessage, setRoundEndMessage] = useState<string>('')
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting')
  const [explosionParticles, setExplosionParticles] = useState<any[]>([])
  const [totalScore, setTotalScore] = useState(0) // 추가: 개별 토탈 점수 상태
  
  const colorInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundStartTime = useRef<number>(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Refs for tracking state
  const gamePhaseRef = useRef<GamePhase>('waiting')
  const countdownStarted = useRef(false)
  const roundStarted = useRef(false)
  const allPressedHandled = useRef(false)
  const isExploded = useRef(false)
  const roomRef = useRef<GameRoom | null>(null)
  
  // Helper functions
  const setGamePhaseWithRef = (newPhase: GamePhase) => {
    gamePhaseRef.current = newPhase
    setGamePhase(newPhase)
  }
  
  const setRoomWithRef = (newRoom: GameRoom | null) => {
    roomRef.current = newRoom
    setRoom(newRoom)
  }

  const isCurrentUserHost = () => {
    const userId = localStorage.getItem('userId')
    return localStorage.getItem('isHost') === 'true' || roomRef.current?.host_id === userId
  }

  const resetGameFlags = () => {
    countdownStarted.current = false
    roundStarted.current = false
    allPressedHandled.current = false
    isExploded.current = false
  }

  const clearColorInterval = () => {
    if (colorInterval.current) {
      clearInterval(colorInterval.current)
      colorInterval.current = null
    }
  }

  const resetParticipantsState = (participants: any[]) => {
    return participants.map(p => ({
      ...p,
      has_pressed: false,
      press_time: null
    }))
  }

  // 개선된 점수 계산 로직
  const calculateScores = (participants: any[]): RoundResult[] => {
    const pressed = participants
      .filter(p => p.has_pressed === true)
      .sort((a, b) => (a.press_time || 0) - (b.press_time || 0))
    
    const notPressed = participants.filter(p => p.has_pressed !== true)
    const totalParticipants = participants.length
    
    const getLowestScore = (totalCount: number) => {
      if (totalCount % 2 === 0) {
        return -(totalCount / 2)
      } else {
        return -Math.floor(totalCount / 2)
      }
    }
    
    const lowestScore = getLowestScore(totalParticipants)
    const explosionScore = lowestScore * 2
    
    const results: RoundResult[] = []
    const totalPressed = pressed.length
    
    pressed.forEach((p: any, index: number) => {
      let score = 0
      
      if (totalPressed === 1) {
        score = lowestScore
      } else if (totalPressed === 2) {
        score = index === 0 ? lowestScore : -lowestScore
      } else {
        const middle = Math.floor(totalPressed / 2)
        
        if (totalPressed % 2 === 1) {
          if (index < middle) {
            score = -(middle - index)
          } else if (index === middle) {
            score = 0
          } else {
            score = index - middle
          }
        } else {
          if (index < middle) {
            score = -(middle - index)
          } else {
            score = index - middle + 1
          }
        }
      }
      
      results.push({
        participantId: p.id,
        pressTime: p.press_time || 0,
        score: score
      })
    })
    
    notPressed.forEach((p: any) => {
      results.push({
        participantId: p.id,
        pressTime: -1,
        score: explosionScore
      })
    })
    
    return results
  }

  // 개선된 실시간 점수 계산
  const calculatePressedScore = (index: number, totalPressed: number, totalParticipants: number) => {
    const getLowestScore = (totalCount: number) => {
      if (totalCount % 2 === 0) {
        return -(totalCount / 2)
      } else {
        return -Math.floor(totalCount / 2)
      }
    }
    
    const lowestScore = getLowestScore(totalParticipants)
    
    if (totalPressed === 1) {
      return lowestScore
    }
    if (totalPressed === 2) {
      return index === 0 ? lowestScore : -lowestScore
    }
    
    const middle = Math.floor(totalPressed / 2)
    
    if (totalPressed % 2 === 1) {
      if (index < middle) {
        return -(middle - index)
      } else if (index === middle) {
        return 0
      } else {
        return index - middle
      }
    } else {
      if (index < middle) {
        return -(middle - index)
      } else {
        return index - middle + 1
      }
    }
  }

  // 🔥 핵심 수정: 라운드 결과를 DB에서 로드하고 즉시 상태 동기화
  const loadRoundResultsFromDB = (gameState: any) => {
    console.log('🔍 Loading round results from DB:', gameState.round_scores)
    
    if (gameState.round_scores && Array.isArray(gameState.round_scores)) {
      // DB의 round_scores 형식을 RoundResult[] 형식으로 변환
      const convertedResults: RoundResult[][] = gameState.round_scores.map((roundScores: Record<string, number>) => {
        return Object.entries(roundScores).map(([participantId, score]) => ({
          participantId,
          pressTime: 0,
          score
        }))
      })
      
      console.log('✅ Converted round results:', convertedResults)
      setRoundResults(convertedResults)
      
      // 🔥 즉시 토탈 점수 업데이트
      const userId = localStorage.getItem('userId')
      let newTotalScore = 0
      
      gameState.round_scores.forEach((roundScores: Record<string, number>) => {
        if (roundScores[userId!] !== undefined) {
          newTotalScore += roundScores[userId!]
        }
      })
      
      console.log('💯 Updated total score for user:', userId, 'Score:', newTotalScore)
      setTotalScore(newTotalScore)
    }
  }

  // 🔥 수정된 토탈 점수 계산 - 상태 기반으로 변경
  const getCurrentUserTotalScore = () => {
    return totalScore
  }

  // 강화된 폭발 애니메이션
  const createExplosionParticles = () => {
    const particles = []
    const particleCount = 30
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 2 * Math.PI
      const velocity = 80 + Math.random() * 40
      const size = 2 + Math.random() * 3
      
      particles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: size,
        life: 1,
        color: `hsl(${Math.random() * 60}, 100%, ${50 + Math.random() * 30}%)`,
      })
    }
    
    setExplosionParticles(particles)
    
    setTimeout(() => {
      setExplosionParticles([])
    }, 2000)
  }

  // 메인 useEffect - 게임 초기화와 구독
  useEffect(() => {
    if (!roomId) return
    
    resetGameFlags()
    initializeGame()
    
    const subscription = subscribeToRoom(roomId, handleRoomUpdate)
    
    return () => {
      subscription.unsubscribe()
      clearColorInterval()
    }
  }, [roomId])
  
  const initializeGame = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
        
      if (fetchError) throw fetchError
      
      setRoomWithRef(data)
      
      const userId = localStorage.getItem('userId')
      const isHost = data.host_id === userId
      localStorage.setItem('isHost', isHost.toString())
      
      if (data.game_state?.current_round) {
        setCurrentRound(data.game_state.current_round)
      }
      
      // 🔥 초기 로드 시 DB에서 라운드 결과 동기화
      loadRoundResultsFromDB(data.game_state)
      
      if (isHost && !data.game_state?.countdown_started && !data.game_state?.round_start_time) {
        setTimeout(() => startCountdownAsHost(), 1000)
      } else if (data.game_state?.countdown_started) {
        startLocalCountdown()
      }
    } catch (error) {
      console.error('게임 초기화 실패:', error)
      navigate('/')
    }
  }
  
  // 🔥 핵심 수정: 실시간 업데이트 처리 강화
  const handleRoomUpdate = (payload: any) => {
    const newRoom = payload.new as GameRoom
    if (!newRoom) return
    
    console.log('🔄 Room update received:', newRoom.game_state)
    
    setRoomWithRef(newRoom)
    
    // 🔥 모든 업데이트에서 DB 라운드 결과 동기화
    loadRoundResultsFromDB(newRoom.game_state)
    
    const gameState = newRoom.game_state
    const currentGamePhase = gamePhaseRef.current
    
    if (gameState.countdown_started && !countdownStarted.current && currentGamePhase === 'waiting') {
      countdownStarted.current = true
      startLocalCountdown()
      return
    }
    
    if (gameState.round_start_time && !roundStarted.current && currentGamePhase !== 'playing') {
      roundStarted.current = true
      allPressedHandled.current = false
      isExploded.current = false
      roundStartTime.current = gameState.round_start_time
      
      if (gameState.current_round) {
        setCurrentRound(gameState.current_round)
      }
      
      startRound()
      return
    }
    
    if (currentGamePhase === 'playing' && !isExploded.current && !allPressedHandled.current) {
      handlePlayingPhaseUpdate(newRoom)
      return
    }
    
    // 🔥 라운드 종료 처리 개선
    if (gameState.round_end && !gameState.round_start_time) {
      console.log('🏁 Round ended, handling results...')
      handleRoundEnd(newRoom)
    }
  }

  const handlePlayingPhaseUpdate = (newRoom: GameRoom) => {
    const pressedParticipants = newRoom.participants
      .filter(p => p.has_pressed)
      .sort((a, b) => (a.press_time || 0) - (b.press_time || 0))
      .map(p => p.name)
    
    setPressedOrder(pressedParticipants)
    
    const allParticipants = newRoom.participants.length
    const pressedCount = newRoom.participants.filter(p => p.has_pressed).length
    
    if (pressedCount === allParticipants && !allPressedHandled.current) {
      allPressedHandled.current = true
      clearColorInterval()
      
      if (isCurrentUserHost()) {
        setTimeout(() => endRoundForAll(), 500)
      } else {
        isExploded.current = true
        setButtonColor(100)
      }
    }
  }
  
  const startCountdownAsHost = async () => {
    if (!isCurrentUserHost() || !roomId || countdownStarted.current) return
    
    countdownStarted.current = true
    
    try {
      await updateGameState(roomId, {
        countdown_started: true,
        countdown_start_time: Date.now(),
        current_round: 1
      })
      
      startLocalCountdown()
    } catch (error) {
      console.error('Failed to start countdown:', error)
    }
  }
  
  const startLocalCountdown = async () => {
    setGamePhaseWithRef('countdown')
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(null)
    
    if (isCurrentUserHost()) {
      try {
        const { data: currentRoom, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()
        
        if (fetchError) throw fetchError
        
        const currentRoundFromDB = currentRoom.game_state?.current_round || 1
        const startTime = Date.now()
        
        await updateGameState(roomId!, {
          round_start_time: startTime,
          current_round: currentRoundFromDB,
          countdown_started: false,
          round_end: false
        })
      } catch (error) {
        console.error('Failed to start round:', error)
      }
    } else {
      setGamePhaseWithRef('waiting')
    }
  }
  
  const startRound = () => {
    if (gamePhaseRef.current === 'playing') return
    
    setGamePhaseWithRef('playing')
    setHasPressed(false)
    setButtonColor(0)
    setPressedOrder([])
    isExploded.current = false
    
    clearColorInterval()
    
    const startTime = Date.now()
    
    colorInterval.current = setInterval(() => {
      if (isExploded.current || gamePhaseRef.current !== 'playing') {
        clearColorInterval()
        return
      }
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / 4000, 1)
      const colorValue = progress * 100
      
      setButtonColor(colorValue)
      
      if (progress >= 1 && !isExploded.current) {
        isExploded.current = true
        handleExplosion()
        clearColorInterval()
        
        if (isCurrentUserHost()) {
          setTimeout(() => endRoundForAll(), 1500)
        }
      }
    }, 50)
  }
  
  const handleButtonPress = async () => {
    if (gamePhaseRef.current !== 'playing' || hasPressed || buttonColor >= 100) return
    
    setHasPressed(true)
    
    const pressTime = Date.now() - roundStartTime.current
    const userId = localStorage.getItem('userId')
    
    if (roomRef.current) {
      const updatedParticipants = roomRef.current.participants.map(p => 
        p.id === userId 
          ? { ...p, has_pressed: true, press_time: pressTime }
          : p
      )
      
      try {
        await supabase
          .from('rooms')
          .update({ participants: updatedParticipants })
          .eq('id', roomId)
      } catch (error) {
        console.error('Failed to record button press:', error)
      }
    }
  }
  
  const handleExplosion = () => {
    vibrate.heavy() // 기존: navigator.vibrate?.([100, 50, 200, 50, 300])
  createExplosionParticles()
    navigator.vibrate?.([100, 50, 200, 50, 300])
    createExplosionParticles()
    setButtonColor(100)
    setRoundEndMessage('BOOM')
    
    setTimeout(() => setRoundEndMessage(''), 1500)
  }
  
  const endRoundForAll = async () => {
    if (!isCurrentUserHost() || !roomId) return
    
    if (gamePhaseRef.current === 'round-end' || gamePhaseRef.current === 'next-round') return
    
    setGamePhaseWithRef('round-end')
    clearColorInterval()
    
    try {
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      if (fetchError) throw fetchError
      
      const results = calculateScores(currentRoom.participants)
      
      console.log('🏆 Round results calculated:', results)
      
      // 로컬 상태 업데이트
      setRoundResults(prev => [...prev, results])
      
      // DB에 라운드 점수 저장
      const existingRoundScores = currentRoom.game_state?.round_scores || []
      const roundScoreRecord: Record<string, number> = {}
      
      results.forEach(result => {
        roundScoreRecord[result.participantId] = result.score
      })
      
      const updatedRoundScores = [...existingRoundScores, roundScoreRecord]
      
      console.log('💾 Saving round scores to DB:', updatedRoundScores)
      
      const resetParticipants = resetParticipantsState(currentRoom.participants)
      const currentRoundNumber = currentRoom.game_state?.current_round || currentRound
      
      const newGameState = {
        ...currentRoom.game_state,
        current_round: currentRoundNumber,
        round_end: true,
        round_start_time: null,
        countdown_started: false,
        round_scores: updatedRoundScores
      }
      
      await supabase
        .from('rooms')
        .update({ 
          participants: resetParticipants,
          game_state: newGameState
        })
        .eq('id', roomId)
      
      console.log('✅ Round end data saved to DB')
      
    } catch (error) {
      console.error('Failed to end round:', error)
    }
  }
  
  // 🔥 라운드 종료 처리 개선
  const handleRoundEnd = async (newRoom: GameRoom) => {
    const gameState = newRoom.game_state
    const endedRound = gameState.current_round || currentRound
    
    console.log('🏁 Handling round end for round:', endedRound)
    
    setGamePhaseWithRef('round-end')
    setRoundEndMessage(`ROUND ${endedRound}`)
    
    resetGameFlags()
    clearColorInterval()
    
    // 🔥 라운드 종료 시 점수 다시 동기화
    loadRoundResultsFromDB(gameState)
    
    setTimeout(() => setRoundEndMessage(''), 2000)
    
    if (endedRound < 3) {
      const nextRoundNumber = endedRound + 1
      setCurrentRound(nextRoundNumber)
      setPressedOrder([])
      setGamePhaseWithRef('next-round')
      
      setRoundEndMessage(`ROUND ${nextRoundNumber}`)
      setTimeout(() => setRoundEndMessage(''), 1500)
      
      setTimeout(() => {
        if (isCurrentUserHost()) {
          startNextRound(nextRoundNumber)
        } else {
          setGamePhaseWithRef('waiting')
        }
      }, 2500)
    } else {
      setTimeout(() => {
        setGamePhaseWithRef('final-results')
        setShowResults(true)
      }, 2000)
    }
  }
  
  const startNextRound = async (roundNumber: number) => {
    if (!isCurrentUserHost()) return
    
    setGamePhaseWithRef('waiting')
    resetGameFlags()
    
    try {
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      if (fetchError) throw fetchError
      
      const resetParticipants = resetParticipantsState(currentRoom.participants)
      
      const newGameState = {
        ...currentRoom.game_state,
        round_end: false,
        countdown_started: true,
        countdown_start_time: Date.now(),
        current_round: roundNumber,
        round_start_time: null
      }
      
      await supabase
        .from('rooms')
        .update({ 
          participants: resetParticipants,
          game_state: newGameState
        })
        .eq('id', roomId)
      
    } catch (error) {
      console.error('Failed to start next round:', error)
    }
  }
  
  // 🔥 수정된 getFinalScores 함수 - FreshGame.tsx에서 교체
const getFinalScores = () => {
  const totalScores: Record<string, number> = {}
  
  room?.participants.forEach((p: any) => {
    totalScores[p.id] = 0
  })
  
  // roundResults 상태에서 점수 계산 (메인 소스)
  roundResults.forEach((roundResult) => {
    roundResult.forEach((result) => {
      if (totalScores[result.participantId] !== undefined) {
        totalScores[result.participantId] += result.score
      }
    })
  })
  
  // 🔥 DB 백업은 roundResults가 비어있을 때만 사용
  if (roundResults.length === 0 && room?.game_state?.round_scores && Array.isArray(room.game_state.round_scores)) {
    console.log('🔄 Using DB scores as fallback')
    
    room.game_state.round_scores.forEach((roundScores: Record<string, number>) => {
      Object.entries(roundScores).forEach(([participantId, score]) => {
        if (totalScores[participantId] !== undefined) {
          totalScores[participantId] += score
        }
      })
    })
  }
  
  console.log('🏆 Final scores calculated:', totalScores)
  
  return Object.entries(totalScores)
    .map(([id, score]) => ({
      participant: room?.participants.find((p: any) => p.id === id),
      score
    }))
    .sort((a, b) => b.score - a.score)
}
  
  return (
    <motion.div 
      className="h-screen-mobile w-screen flex flex-col bg-white relative overflow-hidden touch-none"
      style={{
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
      {/* 강화된 폭발 파티클 효과 */}
      <AnimatePresence>
        {explosionParticles.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {explosionParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  left: '50%',
                  top: '50%',
                }}
                initial={{ 
                  x: 0, 
                  y: 0,
                  scale: 1,
                  opacity: 1
                }}
                animate={{ 
                  x: particle.vx * 2,
                  y: particle.vy * 2,
                  scale: [1, 1.5, 0],
                  opacity: [1, 0.8, 0],
                }}
                transition={{ 
                  duration: 1.5,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              />
            ))}
            
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`ring-${i}`}
                className="absolute border-4 border-red-500 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ 
                  width: 0,
                  height: 0,
                  opacity: 0.8
                }}
                animate={{ 
                  width: [0, 120 + i * 40, 200 + i * 60],
                  height: [0, 120 + i * 40, 200 + i * 60],
                  opacity: [0.8, 0.4, 0],
                  borderWidth: ['4px', '2px', '1px']
                }}
                transition={{ 
                  duration: 1.2 + i * 0.2,
                  ease: "easeOut",
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
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
        
        {/* 🔥 수정된 누적 점수 표시 */}
        {roundResults.length > 0 && !showResults && (
          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span 
              className="text-sm font-light text-gray-600"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 300
              }}
            >
              TOTAL
            </span>
            <span 
              className={`text-lg font-light tabular-nums ${
                getCurrentUserTotalScore() > 0 ? 'text-green-600' : 
                getCurrentUserTotalScore() < 0 ? 'text-red-600' : 
                'text-gray-600'
              }`}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 300
              }}
            >
              {getCurrentUserTotalScore() > 0 ? '+' : ''}{getCurrentUserTotalScore()}
            </span>
          </motion.div>
        )}
        
        <motion.div
          className="w-12 h-12 rounded-full"
          style={{ backgroundColor: '#ff0000' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </div>
      
      {/* 라운드 인디케이터 */}
      <motion.div
        className="flex items-center justify-center space-x-3 sm:space-x-4 mb-6 sm:mb-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {[1, 2, 3].map((round: number) => (
          <motion.div
            key={round}
            className="flex flex-col items-center"
            animate={{
              scale: round === currentRound ? 1.1 : 1,
            }}
          >
            <motion.div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 ${
                round < currentRound ? 'bg-black border-black' :
                round === currentRound ? 'bg-transparent border-black' :
                'bg-transparent border-gray-300'
              }`}
              animate={{
                borderColor: round <= currentRound ? '#000000' : '#d1d5db'
              }}
            />
            <motion.p 
              className={`text-xs mt-1.5 sm:mt-2 font-light tracking-[0.1em] ${
                round <= currentRound ? 'text-black' : 'text-gray-300'
              }`}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 300
              }}
            >
              {round}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>
      
      {/* 중앙 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 중앙 상태 메시지 */}
        <AnimatePresence mode="wait">
          {countdown && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              key="countdown"
            >
              <motion.h2
                className="text-6xl xs:text-7xl sm:text-8xl font-light text-black"
                animate={{ 
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.6 }}
                style={{ 
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
              >
                {countdown}
              </motion.h2>
            </motion.div>
          )}
          
          {roundEndMessage && (
            <motion.div
              className="mb-8 px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              key="roundEnd"
            >
              <motion.h2 
                className="text-xl xs:text-2xl sm:text-3xl font-light tracking-[0.3em] text-center text-black"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
                animate={{
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {roundEndMessage}
              </motion.h2>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 메인 버튼 */}
        <motion.div className="relative mb-8">
          <motion.button
            ref={buttonRef}
            className="w-28 h-28 xs:w-32 xs:h-32 sm:w-36 sm:h-36 rounded-full relative overflow-hidden border-2 flex items-center justify-center"
            style={{
              borderColor: gamePhase === 'playing' && buttonColor > 60 ? '#ff0000' : '#000000',
              backgroundColor: gamePhase === 'playing' && buttonColor > 0
                ? `hsl(0, 100%, ${Math.max(20, 100 - buttonColor * 0.8)}%)`
                : '#f5f5f5'
            }}
            onClick={handleButtonPress}
            disabled={gamePhase !== 'playing' || hasPressed}
            whileHover={!hasPressed && gamePhase === 'playing' ? { scale: 1.05 } : {}}
            whileTap={!hasPressed && gamePhase === 'playing' ? { scale: 0.95 } : {}}
            animate={{
              scale: gamePhase === 'playing' && buttonColor > 80 ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: buttonColor > 80 ? 0.3 : 0 }}
          >
            <motion.div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              style={{
                backgroundColor: gamePhase === 'playing' && buttonColor > 60 ? '#ffffff' : '#000000'
              }}
              animate={{
                scale: gamePhase === 'playing' && buttonColor > 80 ? [1, 1.5, 1] : 1,
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ 
                duration: gamePhase === 'playing' && buttonColor > 60 ? 0.5 : 2,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            />
            
            <AnimatePresence>
              {buttonColor >= 100 && (
                <>
                  <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [1, 3, 6], 
                      opacity: [1, 0.3, 0] 
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  
                  <motion.div
                    className="absolute inset-0 border-4 border-red-500 rounded-full"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      scale: [1, 4],
                      opacity: [1, 0],
                      borderWidth: ['4px', '1px']
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
      
      {/* 하단 순서 표시 */}
      <AnimatePresence>
        {pressedOrder.length > 0 && (
          <motion.div
            className="flex flex-wrap justify-center gap-2 max-w-full px-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            {pressedOrder.slice(0, 6).map((name: string, index: number) => {
              const totalParticipants = room ? room.participants.length : 0
              const score = calculatePressedScore(index, pressedOrder.length, totalParticipants)
              
              return (
                <motion.div
                  key={name}
                  className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1 border border-gray-200"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <motion.div 
                    className="w-3 h-3 rounded-full border flex items-center justify-center text-xs font-light"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300,
                      fontSize: '10px'
                    }}
                    animate={{
                      backgroundColor: index === 0 ? '#000000' : 'transparent',
                      color: index === 0 ? '#ffffff' : '#000000',
                      borderColor: '#000000'
                    }}
                  >
                    {index + 1}
                  </motion.div>
                  <span 
                    className="text-xs font-light tracking-wide text-black"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    {name}
                  </span>
                  <span 
                    className={`text-xs font-light tabular-nums ${
                      score < 0 ? 'text-red-600' : 
                      score > 0 ? 'text-green-600' : 
                      'text-gray-600'
                    }`}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                      fontWeight: 300
                    }}
                  >
                    {score > 0 ? '+' : ''}{score}
                  </span>
                </motion.div>
              )
            })}
            
            {(() => {
              const totalParticipants = room ? room.participants.length : 0
              const notPressedCount = totalParticipants - pressedOrder.length
              return notPressedCount > 0 && gamePhase === 'playing' ? (
                <motion.div 
                  className="text-xs text-gray-500 tracking-[0.2em] font-light px-2.5 py-1"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {notPressedCount} LEFT
                </motion.div>
              ) : null
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 최종 결과 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            className="fixed inset-0 bg-white z-30 flex flex-col"
            style={{
              paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
              paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-6 sm:mb-8">
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
              
              <motion.h2 
                className="text-xl xs:text-2xl sm:text-3xl font-light tracking-[0.3em] text-black"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 300
                }}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                FINAL SCORES
              </motion.h2>
              
              <div className="w-12" />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-sm mx-auto">
                {getFinalScores().map((result: any, index: number) => (
                  <motion.div
                    key={result.participant?.id}
                    className="flex items-center justify-between mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                    style={{
                      backgroundColor: index === 0 ? '#000000' : '#f9fafb',
                      borderColor: index === 0 ? '#000000' : '#e5e7eb',
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-light border-2"
                        style={{
                          backgroundColor: index === 0 ? '#ffffff' : 'transparent',
                          color: index === 0 ? '#000000' : '#000000',
                          borderColor: index === 0 ? '#ffffff' : '#000000',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                          fontWeight: 300
                        }}
                      >
                        {index + 1}
                      </motion.div>
                      <p 
                        className={`text-sm sm:text-base font-light tracking-[0.1em] ${
                          index === 0 ? 'text-white' : 'text-black'
                        }`}
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                          fontWeight: 300
                        }}
                      >
                        {result.participant?.name}
                      </p>
                    </div>
                    <p 
                      className={`text-base sm:text-lg font-light tabular-nums ${
                        index === 0 ? 'text-white' : 'text-black'
                      }`}
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                        fontWeight: 300
                      }}
                    >
                      {result.score > 0 ? '+' : ''}{result.score}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <motion.button
              onClick={() => navigate('/')}
              className="w-full max-w-sm mx-auto py-4 sm:py-5 text-base sm:text-lg font-light tracking-[0.2em] border-2 border-black text-black hover:bg-black hover:text-white transition-all duration-300 rounded-full min-h-[56px]"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 300
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              NEW GAME
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
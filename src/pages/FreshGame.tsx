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

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'round-end' | 'next-round' | 'final-results'

export default function FreshGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [buttonColor, setButtonColor] = useState(0)
  const [hasPressed, setHasPressed] = useState(false)
  const [roundActive, setRoundActive] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResult[][]>([])
  const [showResults, setShowResults] = useState(false)
  const [pressedOrder, setPressedOrder] = useState<string[]>([])
  const [roundEndMessage, setRoundEndMessage] = useState<string>('')
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting')
  
  const colorInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundStartTime = useRef<number>(0)
  
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

  // 메인 useEffect - 게임 초기화와 구독
  useEffect(() => {
    if (!roomId) return
    
    console.log('FreshGame mounted with roomId:', roomId)
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
      
      // 게임 상태 복원
      if (data.game_state?.current_round) {
        setCurrentRound(data.game_state.current_round)
      }
      
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
  
  const handleRoomUpdate = (payload: any) => {
    const newRoom = payload.new as GameRoom
    if (!newRoom) return
    
    setRoomWithRef(newRoom)
    
    const gameState = newRoom.game_state
    const currentGamePhase = gamePhaseRef.current
    
    // 카운트다운 시작 감지
    if (gameState.countdown_started && !countdownStarted.current && currentGamePhase === 'waiting') {
      countdownStarted.current = true
      startLocalCountdown()
      return
    }
    
    // 라운드 시작 감지
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
    
    // playing 상태에서의 처리
    if (currentGamePhase === 'playing' && !isExploded.current && !allPressedHandled.current) {
      handlePlayingPhaseUpdate(newRoom)
      return
    }
    
    // 라운드 종료 감지
    if (gameState.round_end && !gameState.round_start_time) {
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
    
    // 3, 2, 1 카운트다운
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
    setRoundActive(true)
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
    navigator.vibrate?.(200)
    setButtonColor(100)
    setRoundEndMessage('💥 EXPLOSION!')
    
    setTimeout(() => setRoundEndMessage(''), 1500)
  }
  
  const endRoundForAll = async () => {
    if (!isCurrentUserHost() || !roomId) return
    
    if (gamePhaseRef.current === 'round-end' || gamePhaseRef.current === 'next-round') return
    
    setGamePhaseWithRef('round-end')
    setRoundActive(false)
    clearColorInterval()
    
    try {
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      if (fetchError) throw fetchError
      
      const resetParticipants = resetParticipantsState(currentRoom.participants)
      const currentRoundNumber = currentRoom.game_state?.current_round || currentRound
      
      const newGameState = {
        ...currentRoom.game_state,
        current_round: currentRoundNumber,
        round_end: true,
        round_start_time: null,
        countdown_started: false
      }
      
      await supabase
        .from('rooms')
        .update({ 
          participants: resetParticipants,
          game_state: newGameState
        })
        .eq('id', roomId)
      
    } catch (error) {
      console.error('Failed to end round:', error)
    }
  }
  
  const handleRoundEnd = async (newRoom: GameRoom) => {
    const gameState = newRoom.game_state
    const endedRound = gameState.current_round || currentRound
    
    setGamePhaseWithRef('round-end')
    setRoundActive(false)
    setRoundEndMessage(`ROUND ${endedRound} END`)
    
    resetGameFlags()
    clearColorInterval()
    
    const results = calculateScores(newRoom.participants)
    setRoundResults(prev => [...prev, results])
    
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
  
  const calculateScores = (participants: any[]): RoundResult[] => {
    const pressed = participants
      .filter(p => p.has_pressed === true)
      .sort((a, b) => (a.press_time || 0) - (b.press_time || 0))
    
    const notPressed = participants.filter(p => p.has_pressed !== true)
    const results: RoundResult[] = []
    const totalPressed = pressed.length
    
    // 누른 사람들 점수 계산
    pressed.forEach((p, index) => {
      let score = 0
      if (totalPressed === 1) {
        score = 1
      } else if (totalPressed % 2 === 0) {
        const middle = totalPressed / 2
        score = index < middle ? -(middle - index) : (index - middle + 1)
      } else {
        const middle = Math.floor(totalPressed / 2)
        score = index === middle ? 0 : 
               index < middle ? -(middle - index) : 
               index - middle
      }
      
      results.push({
        participantId: p.id,
        pressTime: p.press_time || 0,
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

  // 점수 계산 로직을 분리한 함수
  const calculatePressedScore = (index: number, totalPressed: number) => {
    if (totalPressed === 1) return 1
    
    if (totalPressed % 2 === 0) {
      const middle = totalPressed / 2
      return index < middle ? -(middle - index) : (index - middle + 1)
    } else {
      const middle = Math.floor(totalPressed / 2)
      return index === middle ? 0 : 
             index < middle ? -(middle - index) : 
             index - middle
    }
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 디버그 정보 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black text-white p-3 rounded-lg text-sm z-50 font-mono">
          <div className="text-yellow-300 font-bold mb-2">🎮 DEBUG INFO</div>
          <div>Phase: <span className="text-green-300">{gamePhase}</span></div>
          <div>Round: <span className="text-green-300">{currentRound}</span></div>
          <div>Active: <span className="text-green-300">{roundActive ? 'YES' : 'NO'}</span></div>
          <div>Countdown: <span className="text-green-300">{countdown || 'NULL'}</span></div>
          <div>Color: <span className="text-green-300">{buttonColor.toFixed(0)}%</span></div>
          <div>Pressed: <span className="text-green-300">{hasPressed ? 'YES' : 'NO'}</span></div>
          <div>Host: <span className="text-green-300">{isCurrentUserHost() ? 'YES' : 'NO'}</span></div>
          <div>Participants: <span className="text-green-300">{room?.participants.length || 0}</span></div>
          <div>Pressed Count: <span className="text-green-300">{room?.participants.filter(p => p.has_pressed).length || 0}</span></div>
        </div>
      )}

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
      
      {/* 카운트다운 / 라운드 종료 메시지 */}
      <AnimatePresence mode="wait">
        {countdown && (
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            key="countdown"
          >
            <motion.div
              className="text-8xl font-bold text-black"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
        
        {roundEndMessage && (
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="roundEnd"
          >
            <div className="text-3xl font-bold text-center text-black bg-white/80 px-6 py-3 rounded-xl">
              {roundEndMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 메인 버튼 */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
        <motion.div
          layoutId="game-button"
          animate={{ scale: hasPressed ? 0.9 : 1 }}
        >
          <motion.button
            className="w-64 h-64 rounded-full shadow-2xl relative overflow-hidden transition-colors duration-100"
            style={{
              backgroundColor: gamePhase === 'playing'
                ? `rgb(${255 - Math.floor(buttonColor * 2.55)}, ${255 - Math.floor(buttonColor * 2.55)}, ${255 - Math.floor(buttonColor * 2.55)})`
                : '#e5e7eb'
            }}
            onClick={handleButtonPress}
            disabled={gamePhase !== 'playing' || hasPressed}
            whileHover={!hasPressed && gamePhase === 'playing' ? { scale: 1.02 } : {}}
            whileTap={!hasPressed && gamePhase === 'playing' ? { scale: 0.98 } : {}}
          >
            {/* 폭발 효과 */}
            <AnimatePresence>
              {buttonColor >= 100 && !hasPressed && (
                <motion.div
                  className="absolute inset-0 bg-black"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.5, 2], opacity: [1, 0.5, 0] }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
        
        {/* 누른 순서 표시 */}
        {pressedOrder.length > 0 && (
          <motion.div
            className="flex flex-col gap-1 md:gap-2 mt-4 md:mt-0 max-h-60 overflow-y-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {pressedOrder.map((name, index) => {
              const score = calculatePressedScore(index, pressedOrder.length)
              
              return (
                <motion.div
                  key={name}
                  className="flex items-center gap-1 md:gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="text-xs text-gray-500">{index + 1}</span>
                  <span 
                    className={`font-mono text-xs md:text-sm ${
                      score < 0 ? 'text-red-500 font-bold' : 
                      score > 0 ? 'text-green-600' : 
                      'text-gray-600'
                    }`}
                  >
                    {name}
                  </span>
                  <span className={`text-xs ${
                    score < 0 ? 'text-red-500' : 
                    score > 0 ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    ({score > 0 ? '+' : ''}{score})
                  </span>
                </motion.div>
              )
            })}
            
            {(() => {
              const totalParticipants = room ? room.participants.length : 0
              const notPressedCount = totalParticipants - pressedOrder.length
              return notPressedCount > 0 && gamePhase === 'playing' ? (
                <motion.div 
                  className="text-xs text-gray-400 mt-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {notPressedCount}명 남음
                </motion.div>
              ) : null
            })()}
          </motion.div>
        )}
      </div>
      
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
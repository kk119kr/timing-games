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
    navigator.vibrate?.(200)
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
      setRoundResults(prev => [...prev, results])
      
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
    setRoundEndMessage(`ROUND ${endedRound}`)
    
    resetGameFlags()
    clearColorInterval()
    
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
    
    pressed.forEach((p: any, index: number) => {
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
    
    notPressed.forEach((p: any) => {
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
    
    room?.participants.forEach((p: any) => {
      totalScores[p.id] = 0
    })
    
    roundResults.forEach((round: RoundResult[]) => {
      round.forEach((result: RoundResult) => {
        totalScores[result.participantId] += result.score
      })
    })
    
    return Object.entries(totalScores)
      .map(([id, score]) => ({
        participant: room?.participants.find((p: any) => p.id === id),
        score
      }))
      .sort((a, b) => b.score - a.score)
  }

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
      className="min-h-screen flex flex-col items-center justify-center bg-black p-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 화살표 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 text-2xl text-white hover:text-gray-300 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 라운드 인디케이터 - 상단 중앙 */}
      <motion.div
        className="absolute top-8 left-1/2 transform -translate-x-1/2 flex space-x-3 justify-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {[1, 2, 3].map((round: number) => (
          <motion.div
            key={round}
            className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 transition-all ${
              round < currentRound ? 'bg-white border-white' :
              round === currentRound ? 'bg-white border-white' :
              'bg-transparent border-gray-600'
            }`}
            animate={{
              scale: round === currentRound ? 1.3 : 1,
              boxShadow: round === currentRound ? '0 0 15px #ffffff60' : 'none'
            }}
          />
        ))}
      </motion.div>
      
      {/* 중앙 상태 메시지 */}
      <AnimatePresence mode="wait">
        {countdown && (
          <motion.div
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            key="countdown"
          >
            <motion.h2
              className="text-8xl md:text-9xl font-black text-white"
              animate={{ 
                scale: [1, 1.2, 1],
                textShadow: [
                  '0 0 20px #ffffff40',
                  '0 0 40px #ffffff80',
                  '0 0 20px #ffffff40'
                ]
              }}
              transition={{ duration: 0.6 }}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {countdown}
            </motion.h2>
          </motion.div>
        )}
        
        {roundEndMessage && (
          <motion.div
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            key="roundEnd"
          >
            <motion.h2 
              className="text-3xl md:text-4xl font-black tracking-[0.3em] text-center text-white"
              style={{ 
                textShadow: '0 0 30px #ffffff80'
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              {roundEndMessage}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 메인 인터랙션 영역 */}
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* 메인 버튼 */}
        <motion.div
          animate={{ scale: hasPressed ? 0.9 : 1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.button
            className="w-40 h-40 md:w-48 md:h-48 rounded-full relative overflow-hidden transition-all duration-75 border-4 border-white"
            style={{
              backgroundColor: gamePhase === 'playing' && buttonColor > 0
                ? `hsl(0, 100%, ${Math.max(10, 100 - buttonColor * 0.6)}%)`
                : '#333333',
              boxShadow: gamePhase === 'playing' && buttonColor > 60
                ? `0 0 60px hsla(0, 100%, 50%, 0.8), inset 0 0 30px hsla(0, 100%, 50%, 0.3)`
                : '0 10px 30px rgba(255, 255, 255, 0.1)'
            }}
            onClick={handleButtonPress}
            disabled={gamePhase !== 'playing' || hasPressed}
            whileHover={!hasPressed && gamePhase === 'playing' ? { scale: 1.05 } : {}}
            whileTap={!hasPressed && gamePhase === 'playing' ? { scale: 0.95 } : {}}
          >
            {/* 폭발 효과 */}
            <AnimatePresence>
              {buttonColor >= 100 && (
                <>
                  <motion.div
                    className="absolute inset-0 bg-white"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [1, 3, 6], 
                      opacity: [1, 0.8, 0] 
                    }}
                    transition={{ duration: 0.8 }}
                  />
                  {/* 폭발 파티클 */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: Math.cos(i * 18 * Math.PI / 180) * 120,
                        y: Math.sin(i * 18 * Math.PI / 180) * 120,
                        opacity: [1, 1, 0]
                      }}
                      transition={{ 
                        duration: 1,
                        delay: i * 0.02,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
        
        {/* 순서 표시 */}
        {pressedOrder.length > 0 && (
          <motion.div
            className="flex flex-col gap-2 max-h-56 overflow-y-auto bg-gray-900 rounded-xl p-4 border border-gray-700 min-w-32"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)'
            }}
          >
            {pressedOrder.map((name: string, index: number) => {
              const score = calculatePressedScore(index, pressedOrder.length)
              
              return (
                <motion.div
                  key={name}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <span 
                    className="text-xs text-gray-400 w-4 text-center font-black"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm md:text-base font-black tracking-wide text-white">
                    {name}
                  </span>
                  <span 
                    className={`text-sm md:text-base font-black ${
                      score < 0 ? 'text-red-400' : 
                      score > 0 ? 'text-green-400' : 
                      'text-gray-400'
                    }`} 
                    style={{ fontVariantNumeric: 'tabular-nums' }}
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
                  className="text-xs text-gray-500 mt-2 tracking-[0.2em] font-bold"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {notPressedCount} LEFT
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
            className="fixed inset-0 bg-black z-30 p-6 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* 뒤로가기 화살표 */}
            <motion.button
              onClick={() => navigate('/')}
              className="absolute top-8 left-8 text-2xl text-white hover:text-gray-300 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.9 }}
            >
              ←
            </motion.button>
            
            <motion.h2 
              className="text-3xl md:text-4xl font-black tracking-[0.3em] text-center text-white mb-8 md:mb-12 mt-8"
              style={{ 
                textShadow: '0 0 30px #ffffff40'
              }}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              FINAL SCORES
            </motion.h2>
            
            <div className="flex-1 max-w-md mx-auto w-full">
              {getFinalScores().map((result: any, index: number) => (
                <motion.div
                  key={result.participant?.id}
                  className="flex items-center justify-between mb-6 md:mb-8 p-4 rounded-xl border"
                  style={{
                    backgroundColor: index === 0 ? '#1a1a1a' : 'transparent',
                    borderColor: index === 0 ? '#ffffff' : '#333333',
                    boxShadow: index === 0 ? '0 0 20px #ffffff20' : 'none'
                  }}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg font-black border-2"
                      style={{
                        backgroundColor: index === 0 ? '#ffffff' : '#333333',
                        color: index === 0 ? '#000000' : '#ffffff',
                        borderColor: index === 0 ? '#ffffff' : '#666666'
                      }}
                    >
                      {index + 1}
                    </div>
                    <p className="text-lg md:text-xl font-black tracking-[0.1em] text-white">
                      {result.participant?.name}
                    </p>
                  </div>
                  <p 
                    className={`text-xl md:text-2xl font-black ${
                      index === 0 ? 'text-white' : 'text-gray-400'
                    }`}
                    style={{ 
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {result.score > 0 ? '+' : ''}{result.score}
                  </p>
                </motion.div>
              ))}
            </div>
            
            <motion.button
              onClick={() => navigate('/')}
              className="w-full py-6 md:py-8 text-xl md:text-2xl font-black tracking-[0.2em] border-4 border-white text-white hover:bg-white hover:text-black transition-all duration-300 rounded-xl"
              style={{ 
                boxShadow: '0 0 20px #ffffff20'
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: '0 0 30px #ffffff40'
              }}
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
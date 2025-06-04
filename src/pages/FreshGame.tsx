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
      className="h-screen w-screen flex flex-col items-center justify-center bg-black relative overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 버튼 - 모바일 안전 영역 고려 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full text-sm font-light text-white hover:bg-white hover:text-black transition-colors border border-white z-50"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          left: 'max(1rem, env(safe-area-inset-left))'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 라운드 인디케이터 - 기하학적 미니멀 스타일 */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 md:space-x-6"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))'
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {[1, 2, 3].map((round: number) => (
          <motion.div
            key={round}
            className="flex flex-col items-center"
            animate={{
              scale: round === currentRound ? 1.2 : 1,
            }}
          >
            <motion.div
              className={`w-2 h-2 rounded-full transition-all ${
                round < currentRound ? 'bg-white' :
                round === currentRound ? 'bg-white' :
                'bg-gray-600'
              }`}
              animate={{
                boxShadow: round === currentRound ? '0 0 15px #ffffff80' : 'none'
              }}
            />
            <motion.div
              className="w-px mt-2"
              style={{
                height: round === currentRound ? '16px' : '8px',
                backgroundColor: round <= currentRound ? '#ffffff' : '#666666'
              }}
              initial={{ height: 0 }}
              animate={{ 
                height: round === currentRound ? '16px' : '8px'
              }}
              transition={{ delay: 0.3 }}
            />
          </motion.div>
        ))}
      </motion.div>
      
      {/* 중앙 상태 메시지 - 미니멀 타이포그래피 */}
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
              className="text-7xl md:text-9xl font-black text-white"
              animate={{ 
                scale: [1, 1.1, 1],
                filter: [
                  'drop-shadow(0 0 20px #ffffff40)',
                  'drop-shadow(0 0 40px #ffffff80)',
                  'drop-shadow(0 0 20px #ffffff40)'
                ]
              }}
              transition={{ duration: 0.6 }}
              style={{ 
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {countdown}
            </motion.h2>
          </motion.div>
        )}
        
        {roundEndMessage && (
          <motion.div
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            key="roundEnd"
          >
            <motion.h2 
              className="text-2xl md:text-4xl font-light tracking-[0.3em] text-center text-white"
              style={{ 
                filter: 'drop-shadow(0 0 30px #ffffff80)'
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
      
      {/* 메인 인터랙션 영역 */}
      <div className="flex flex-col items-center gap-12 md:gap-16">
        {/* 메인 버튼 - 홈화면 슬라이드 버튼과 연결된 디자인 */}
        <motion.div className="relative">
          <motion.button
            ref={buttonRef}
            className="w-32 h-32 md:w-48 md:h-48 rounded-full relative overflow-hidden border-2"
            style={{
              backgroundColor: gamePhase === 'playing' && buttonColor > 0
                ? 'transparent'
                : 'transparent',
              borderColor: '#ffffff',
              boxShadow: gamePhase === 'playing' && buttonColor > 0
                ? `0 0 ${Math.min(buttonColor * 2, 100)}px hsl(0, 100%, 50%)`
                : '0 0 20px rgba(255, 255, 255, 0.3)'
            }}
            onClick={handleButtonPress}
            disabled={gamePhase !== 'playing' || hasPressed}
            whileHover={!hasPressed && gamePhase === 'playing' ? { scale: 1.05 } : {}}
            whileTap={!hasPressed && gamePhase === 'playing' ? { scale: 0.95 } : {}}
            animate={{
              borderColor: gamePhase === 'playing' && buttonColor > 60 ? '#ff0000' : '#ffffff'
            }}
          >
            {/* 내부 코어 - 홈화면 버튼과 같은 구조 */}
            <motion.div
              className="absolute inset-3 md:inset-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: gamePhase === 'playing' && buttonColor > 0
                  ? `hsl(0, 100%, ${Math.max(10, 100 - buttonColor * 0.8)}%)`
                  : '#ffffff'
              }}
              animate={{
                scale: gamePhase === 'playing' && buttonColor > 80 ? [1, 1.1, 1] : 1,
                boxShadow: gamePhase === 'playing' && buttonColor > 60
                  ? [
                    '0 0 30px hsl(0, 100%, 50%)',
                    '0 0 50px hsl(0, 100%, 50%)',
                    '0 0 30px hsl(0, 100%, 50%)'
                  ]
                  : 'inset 0 0 20px rgba(0, 0, 0, 0.1)'
              }}
              transition={{ duration: buttonColor > 80 ? 0.3 : 0 }}
            >
              {/* 중앙 인디케이터 */}
              <motion.div
                className="w-3 h-3 md:w-4 md:h-4 rounded-full"
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
            </motion.div>
            
            {/* 진행 링 효과 */}
            {gamePhase === 'playing' && buttonColor > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{
                  borderColor: '#ff0000',
                  borderTopColor: 'transparent',
                  transform: `rotate(${buttonColor * 3.6}deg)`
                }}
                animate={{
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
            
            {/* 네온 아우라 효과 */}
            {gamePhase === 'playing' && buttonColor > 40 && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`aura-${i}`}
                    className="absolute inset-0 rounded-full border"
                    style={{ 
                      borderColor: `hsl(0, 100%, 50%)`,
                      opacity: 0.3 - i * 0.1
                    }}
                    animate={{ 
                      scale: [1, 1.5 + i * 0.3, 2 + i * 0.5],
                      opacity: [0.3 - i * 0.1, 0.1, 0]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.2
                    }}
                  />
                ))}
              </>
            )}
            
            {/* 폭발 효과 - 서브스턴스 스타일 */}
            <AnimatePresence>
              {buttonColor >= 100 && (
                <>
                  {/* 메인 폭발 플래시 */}
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [1, 4, 8], 
                      opacity: [1, 0.5, 0] 
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                  
                  {/* 기하학적 파편들 */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={`fragment-${i}`}
                      className="absolute w-1 h-6 md:h-8 bg-white"
                      style={{
                        left: '50%',
                        top: '50%',
                        transformOrigin: 'bottom center',
                        transform: `translate(-50%, -100%) rotate(${i * 30}deg)`
                      }}
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{
                        scale: [0, 1, 0],
                        scaleY: [0, 3, 0],
                        opacity: [1, 1, 0]
                      }}
                      transition={{ 
                        duration: 0.8,
                        delay: i * 0.03,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                  
                  {/* 확산되는 링 */}
                  <motion.div
                    className="absolute inset-0 border-4 border-white rounded-full"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      scale: [1, 6],
                      opacity: [1, 0],
                      borderWidth: ['4px', '1px']
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
        
        {/* 순서 표시 - 미니멀 세로 리스트 */}
        <AnimatePresence>
          {pressedOrder.length > 0 && (
            <motion.div
              className="absolute right-2 md:right-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 md:gap-3 max-w-xs"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
            >
              {pressedOrder.map((name: string, index: number) => {
                const score = calculatePressedScore(index, pressedOrder.length)
                
                return (
                  <motion.div
                    key={name}
                    className="flex items-center gap-2 md:gap-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-2 md:px-4 py-1 md:py-2 border border-white border-opacity-20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <motion.div 
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-white flex items-center justify-center text-xs font-light text-white"
                      animate={{
                        backgroundColor: index === 0 ? '#ffffff' : 'transparent',
                        color: index === 0 ? '#000000' : '#ffffff'
                      }}
                    >
                      {index + 1}
                    </motion.div>
                    <span className="text-xs md:text-sm font-light tracking-wide text-white min-w-8 md:min-w-12">
                      {name}
                    </span>
                    <span 
                      className={`text-xs md:text-sm font-light tabular-nums ${
                        score < 0 ? 'text-red-400' : 
                        score > 0 ? 'text-green-400' : 
                        'text-gray-400'
                      }`}
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
                    className="text-xs text-gray-400 tracking-[0.2em] font-light mt-1 md:mt-2 px-2 md:px-4"
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
      </div>
      
      {/* 최종 결과 - 서브스턴스 스타일 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            className="fixed inset-0 bg-black z-30 p-4 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* 뒤로가기 버튼 */}
            <motion.button
              onClick={() => navigate('/')}
              className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full text-sm font-light text-white hover:bg-white hover:text-black transition-colors border border-white z-50"
              style={{
                top: 'max(1rem, env(safe-area-inset-top))',
                left: 'max(1rem, env(safe-area-inset-left))'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.9 }}
            >
              ←
            </motion.button>
            
            <motion.h2 
              className="text-2xl md:text-4xl font-light tracking-[0.4em] text-center text-white mb-8 mt-16 uppercase"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              FINAL SCORES
            </motion.h2>
            
            <div className="flex-1 max-w-md mx-auto w-full">
              {getFinalScores().map((result: any, index: number) => (
                <motion.div
                  key={result.participant?.id}
                  className="flex items-center justify-between mb-4 md:mb-6 p-3 md:p-4 bg-white bg-opacity-5 backdrop-blur-sm rounded-lg border border-white border-opacity-10"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  style={{
                    backgroundColor: index === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: index === 0 ? '#ffffff40' : '#ffffff20',
                  }}
                >
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <motion.div 
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-light border"
                      style={{
                        backgroundColor: index === 0 ? '#ffffff' : 'transparent',
                        color: index === 0 ? '#000000' : '#ffffff',
                        borderColor: index === 0 ? '#ffffff' : '#ffffff40'
                      }}
                      animate={{
                        boxShadow: index === 0 ? '0 0 20px #ffffff40' : 'none'
                      }}
                    >
                      {index + 1}
                    </motion.div>
                    <p className="text-base md:text-lg font-light tracking-[0.1em] text-white">
                      {result.participant?.name}
                    </p>
                  </div>
                  <p 
                    className={`text-lg md:text-xl font-light tabular-nums ${
                      index === 0 ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {result.score > 0 ? '+' : ''}{result.score}
                  </p>
                </motion.div>
              ))}
            </div>
            
            <motion.button
              onClick={() => navigate('/')}
              className="w-full py-4 md:py-6 text-lg md:text-xl font-light tracking-[0.3em] border border-white text-white hover:bg-white hover:text-black transition-all duration-300 rounded-lg uppercase"
              style={{
                marginBottom: 'max(1rem, env(safe-area-inset-bottom))'
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
      
      {/* 배경 기하학적 요소들 - 서브스턴스 스타일 */}
      <motion.div
        className="absolute top-1/4 left-4 md:left-12 w-px h-16 md:h-24 bg-white bg-opacity-20"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 768 ? 64 : 96 }}
        transition={{ delay: 1, duration: 1 }}
      />
      <motion.div
        className="absolute bottom-1/4 right-4 md:right-12 w-px h-16 md:h-24 bg-white bg-opacity-20"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 768 ? 64 : 96 }}
        transition={{ delay: 1.2, duration: 1 }}
      />
      
      {/* 미세한 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </motion.div>
  )
}
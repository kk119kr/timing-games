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
  const [buttonColor, setButtonColor] = useState(0)
  const [hasPressed, setHasPressed] = useState(false)
  const [roundActive, setRoundActive] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResult[][]>([])
  const [showResults, setShowResults] = useState(false)
  const [pressedOrder, setPressedOrder] = useState<string[]>([])
  const [roundEndMessage, setRoundEndMessage] = useState<string>('')
  const [gamePhase, setGamePhase] = useState<'waiting' | 'countdown' | 'playing' | 'round-end' | 'next-round' | 'final-results'>('waiting')
  const colorInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundStartTime = useRef<number>(0)
  
  // 메인 useEffect - 게임 초기화와 구독
  useEffect(() => {
    if (!roomId) return
    
    console.log('FreshGame mounted with roomId:', roomId)
    initializeGame()
    
    // 실시간 구독 설정
    const subscription = subscribeToRoom(roomId, (payload) => {
      console.log('Game room update:', payload)
      handleRoomUpdate(payload)
    })
    
    return () => {
      subscription.unsubscribe()
      if (colorInterval.current) clearInterval(colorInterval.current)
    }
  }, [roomId])
  
  const initializeGame = async () => {
    try {
      console.log('Initializing game...')
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
        
      if (error) {
        console.error('Failed to fetch room:', error)
        throw error
      }
      
      console.log('Game state:', data.game_state)
      setRoom(data)
      
      const userId = localStorage.getItem('userId')
      console.log('User ID:', userId, 'Host ID:', data.host_id)
      
      if (data.host_id === userId) {
  console.log('Host detected, starting countdown in 1 second...')

  setTimeout(() => {
    const userId = localStorage.getItem('userId')

    // ✅ room이 최신 상태인지 확인
    const currentHostId = room?.host_id
    if (!room || !roomId || currentHostId !== userId) {
      console.log('room not ready at timeout', {
        userId,
        roomId,
        currentHostId
      })
      return
    }

    console.log('Timer fired, calling startCountdown')
    startCountdownAsHost()
  }, 1000)
} else {
        console.log('Participant detected')
        
        // 참가자는 이미 카운트다운이 시작되었는지 확인
        if (data.game_state?.countdown_started) {
          console.log('Countdown detected, starting local countdown...')
          startLocalCountdown()
        }
      }
    } catch (error) {
      console.error('게임 초기화 실패:', error)
      navigate('/')
    }
  }
  
  const handleRoomUpdate = (payload: any) => {
    let newRoom: GameRoom | null = null
    
    if (payload.new) {
      newRoom = payload.new as GameRoom
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      newRoom = payload.new as GameRoom
    }
    
    if (!newRoom) return
    
    const oldRoom = room
    setRoom(newRoom)
    
    const gameState = newRoom.game_state
    console.log('Game state:', gameState)
    
    // 카운트다운 시작 감지
    if (gameState.countdown_started && !countdown && gamePhase === 'waiting') {
      console.log('Countdown detected, starting local countdown...')
      startLocalCountdown()
    }
    
    // 라운드 시작 감지
    if (gameState.round_start_time && 
        gamePhase !== 'playing' && 
        gameState.current_round === currentRound &&
        !gameState.round_end) {
      console.log('Round start detected')
      console.log('Starting round', currentRound)
      roundStartTime.current = gameState.round_start_time
      startRound()
    }
    
    // 다른 참가자들의 버튼 프레스 상태 업데이트
    const pressedParticipants = newRoom.participants
      .filter(p => p.has_pressed)
      .sort((a, b) => (a.press_time || 0) - (b.press_time || 0))
      .map(p => p.name)
    
    setPressedOrder(pressedParticipants)
    
    // 모든 참가자가 버튼을 누른 경우 체크 (호스트만)
    const userId = localStorage.getItem('userId')
    const isCurrentUserHost = newRoom.host_id === userId
    
    if (isCurrentUserHost && gamePhase === 'playing' && oldRoom) {
      const allParticipants = newRoom.participants.length
      const pressedCount = newRoom.participants.filter(p => p.has_pressed).length
      
      console.log(`Pressed: ${pressedCount}/${allParticipants}`)
      
      if (pressedCount === allParticipants && pressedCount > 0) {
        console.log('All participants pressed, ending round')
        setTimeout(() => {
          endRoundForAll()
        }, 500) // 약간의 지연을 줘서 UI 업데이트가 반영되도록
      }
    }
    
    // 라운드 종료 처리
    if (gameState.current_round && gameState.current_round > currentRound) {
      endRound(newRoom)
    }
  }
  
  const startCountdownAsHost = async () => {
    const userId = localStorage.getItem('userId')
    const isCurrentUserHost = room?.host_id === userId
    
    if (!isCurrentUserHost || !roomId) {
      console.log('Not host or no roomId:', { isCurrentUserHost, roomId })
      return
    }
    
    console.log('Host starting countdown broadcast...')
    
    try {
      await updateGameState(roomId, {
        countdown_started: true,
        countdown_start_time: Date.now(),
        current_round: 1
      })
      console.log('Countdown broadcast sent successfully')
      
      // 호스트도 로컬 카운트다운 시작
      startLocalCountdown()
    } catch (error) {
      console.error('Failed to start countdown:', error)
    }
  }
  
  const startLocalCountdown = async () => {
    console.log('Starting local countdown...')
    setGamePhase('countdown')
    
    // 3, 2, 1 카운트다운
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      console.log('Countdown:', i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(null)
    console.log('Countdown finished')
    
    // 호스트만 라운드 시작 신호 보냄
    const userId = localStorage.getItem('userId')
    const isCurrentUserHost = room?.host_id === userId
    
    if (isCurrentUserHost) {
      console.log('Host starting round...')
      try {
        await updateGameState(roomId!, {
          round_start_time: Date.now(),
          current_round: currentRound,
          countdown_started: false
        })
        console.log('Round start broadcast sent')
      } catch (error) {
        console.error('Failed to start round:', error)
      }
    }
  }
  
  const startRound = () => {
    console.log('Starting round', currentRound)
    setGamePhase('playing')
    setRoundActive(true)
    setHasPressed(false)
    setButtonColor(0)
    setPressedOrder([])
    
    // 이전 인터벌 정리
    if (colorInterval.current) {
      clearInterval(colorInterval.current)
      colorInterval.current = null
    }
    
    // 색상 변화 시작 (4초 동안 흰색에서 검정으로)
    const startTime = Date.now()
    let isExploded = false
    
    colorInterval.current = setInterval(() => {
      if (isExploded || gamePhase !== 'playing') return
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / 4000, 1) // 4초
      const colorValue = progress * 100
      
      setButtonColor(colorValue)
      
      // 4초 후 폭발
      if (progress >= 1 && !isExploded) {
        isExploded = true
        console.log('4 seconds reached - EXPLOSION!')
        handleExplosion()
        
        if (colorInterval.current) {
          clearInterval(colorInterval.current)
          colorInterval.current = null
        }
        
        // 라운드 종료 처리 (호스트만)
        const userId = localStorage.getItem('userId')
        const isCurrentUserHost = room?.host_id === userId
        
        if (isCurrentUserHost) {
          setTimeout(() => {
            endRoundForAll()
          }, 1500) // 폭발 효과를 보여준 후 종료
        }
      }
    }, 50)
  }
  
  const handleButtonPress = async () => {
    if (gamePhase !== 'playing' || hasPressed || buttonColor >= 100) return
    
    console.log('Button pressed!')
    setHasPressed(true)
    const pressTime = Date.now() - roundStartTime.current
    
    const userId = localStorage.getItem('userId')
    
    if (room) {
      const updatedParticipants = room.participants.map(p => 
        p.id === userId 
          ? { ...p, has_pressed: true, press_time: pressTime }
          : p
      )
      
      try {
        await supabase
          .from('rooms')
          .update({ participants: updatedParticipants })
          .eq('id', roomId)
        console.log('Button press recorded')
      } catch (error) {
        console.error('Failed to record button press:', error)
      }
    }
  }
  
  const handleExplosion = () => {
    navigator.vibrate?.(200)
    setButtonColor(100)
    setRoundEndMessage('💥 EXPLOSION!')
    console.log('Button exploded!')
    
    setTimeout(() => {
      setRoundEndMessage('')
    }, 1500)
  }
  
  const endRoundForAll = async () => {
    const userId = localStorage.getItem('userId')
    const isCurrentUserHost = room?.host_id === userId
    
    if (!room || !isCurrentUserHost) return
    
    console.log('Host ending round...')
    setGamePhase('round-end')
    setRoundActive(false)
    
    try {
      await updateGameState(roomId!, {
        current_round: currentRound + 1,
        round_end: true
      })
      console.log('Round end broadcast sent')
    } catch (error) {
      console.error('Failed to end round:', error)
    }
  }
  
  const endRound = async (newRoom: GameRoom) => {
    console.log('Ending round', currentRound)
    setGamePhase('round-end')
    setRoundActive(false)
    setRoundEndMessage(`ROUND ${currentRound} END`)
    
    // 점수 계산
    const results = calculateScores(newRoom.participants)
    setRoundResults(prev => [...prev, results])
    
    setTimeout(() => {
      setRoundEndMessage('')
    }, 2000)
    
    // 다음 라운드 또는 게임 종료
    if (currentRound < 3) {
      setCurrentRound(prev => prev + 1)
      setPressedOrder([])
      setGamePhase('next-round')
      
      // "Next Round" 메시지 표시
      setRoundEndMessage('NEXT ROUND')
      setTimeout(() => {
        setRoundEndMessage('')
      }, 1500)
      
      setTimeout(() => {
        const userId = localStorage.getItem('userId')
        const isCurrentUserHost = room?.host_id === userId
        
        if (isCurrentUserHost) {
          startNextRound()
        }
      }, 2000)
    } else {
      setTimeout(() => {
        setGamePhase('final-results')
        setShowResults(true)
      }, 2000)
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
        const middle = totalPressed / 2
        score = index < middle ? -(middle - index) : (index - middle + 1)
      } else {
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
    const userId = localStorage.getItem('userId')
    const isCurrentUserHost = room?.host_id === userId
    
    if (!isCurrentUserHost) return
    
    console.log('Starting next round...')
    setGamePhase('waiting')
    
    // 참가자 상태 초기화
    const resetParticipants = room!.participants.map(p => ({
      ...p,
      has_pressed: false,
      press_time: null
    }))
    
    try {
      await supabase
        .from('rooms')
        .update({ 
          participants: resetParticipants,
          game_state: {
            ...room!.game_state,
            round_end: false,
            countdown_started: true,
            countdown_start_time: Date.now(),
            current_round: currentRound
          }
        })
        .eq('id', roomId)
      console.log('Next round setup sent')
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
      
      {/* 카운트다운 / 라운드 종료 메시지 - z-index 추가 */}
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
                ? buttonColor >= 100 ? '#000000' : '#ffffff'
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
              const totalPressed = pressedOrder.length
              let score = 0
              
              if (totalPressed % 2 === 0) {
                const middle = totalPressed / 2
                score = index < middle ? -(middle - index) : (index - middle + 1)
              } else {
                const middle = Math.floor(totalPressed / 2)
                if (index === middle) {
                  score = 0
                } else if (index < middle) {
                  score = -(middle - index)
                } else {
                  score = index - middle
                }
              }
              
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
      
      {/* 디버그 정보 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white p-2 rounded">
          <div>Host: {(() => {
            const userId = localStorage.getItem('userId')
            return room?.host_id === userId ? 'Yes' : 'No'
          })()}</div>
          <div>Round: {currentRound}</div>
          <div>Phase: {gamePhase}</div>
          <div>Countdown: {countdown}</div>
          <div>Round Active: {roundActive ? 'Yes' : 'No'}</div>
          <div>Button Color: {buttonColor.toFixed(0)}%</div>
        </div>
      )}
      
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
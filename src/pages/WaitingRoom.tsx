import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, joinRoom } from '../lib/supabase'
import type { GameRoom } from '../lib/supabase'

export default function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [canStart, setCanStart] = useState(false)
  
  useEffect(() => {
    if (!roomId) return
    
    fetchRoom()
    
    const subscription = subscribeToRoom(roomId, (payload) => {
      console.log('Room update received:', payload)
      
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedRoom = payload.new as GameRoom
        setRoom(updatedRoom)
        setCanStart(updatedRoom.participants.length >= 2)
        
        if (updatedRoom.status === 'playing') {
          console.log('Game started, navigating to:', `/game/${updatedRoom.game_type}/${roomId}`)
          navigate(`/game/${updatedRoom.game_type}/${roomId}`)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, navigate])
  
  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
        
      if (error) throw error
      if (!data) throw new Error('Room not found')
      
      setRoom(data)
      setCanStart(data.participants.length >= 2)
      
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const isAlreadyJoined = data.participants.some((p: any) => p.id === userId)
      
      if (data.host_id === userId) {
        setIsHost(true)
        console.log('You are the host')
      } else if (!isAlreadyJoined) {
        console.log('Joining room as participant...')
        const updatedRoom = await joinRoom(roomId!, userId)
        setRoom(updatedRoom)
        setCanStart(updatedRoom.participants.length >= 2)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('방 정보 가져오기 실패:', error)
      navigate('/')
    }
  }
  
  const startGame = async () => {
    if (!isHost || !room || !canStart) return
    
    console.log('Starting game...', room.game_type)
    
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
      
      if (error) {
        console.error('게임 시작 실패:', error)
      } else {
        console.log('Game started successfully')
        navigate(`/game/${room.game_type}/${roomId}`)
      }
    } catch (error) {
      console.error('게임 시작 실패:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <motion.div
          className="text-2xl md:text-3xl font-black tracking-[0.2em] text-gray-600"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          LOADING
        </motion.div>
      </div>
    )
  }
  
  const gameColor = room?.game_type === 'fresh' ? '#ff4444' : '#ffcc00'
  const bgColor = room?.game_type === 'fresh' ? '#000000' : '#ffffff'
  const textColor = room?.game_type === 'fresh' ? '#ffffff' : '#000000'
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col p-6 relative"
      style={{ backgroundColor: bgColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 상단 헤더 */}
      <motion.div
        className="flex justify-between items-start mb-16 md:mb-20"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div>
          <motion.h1 
            className="text-6xl md:text-8xl font-black tracking-[0.25em] uppercase mb-4"
            style={{ color: textColor }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {room?.game_type}
          </motion.h1>
          <motion.p 
            className="text-sm md:text-lg font-bold tracking-[0.2em]"
            style={{ color: `${textColor}80` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ROOM {roomId}
          </motion.p>
        </div>
        
        {/* 홈 버튼 */}
        <motion.button
          onClick={() => navigate('/')}
          className="text-sm md:text-base font-bold tracking-[0.15em] opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: textColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          whileTap={{ scale: 0.95 }}
        >
          HOME
        </motion.button>
      </motion.div>
      
      {/* 참가자 섹션 */}
      <div className="flex-1">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p 
            className="text-lg md:text-xl font-bold tracking-[0.2em] mb-8"
            style={{ color: `${textColor}90` }}
          >
            PLAYERS ({room?.participants.length})
          </p>
        </motion.div>
        
        {/* 참가자 리스트 */}
        <div className="space-y-6 md:space-y-8">
          <AnimatePresence mode="popLayout">
            {room?.participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                className="flex items-center space-x-6 md:space-x-8"
              >
                {/* 번호 */}
                <motion.div 
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg md:text-xl font-black border-2"
                  style={{
                    backgroundColor: gameColor,
                    color: room?.game_type === 'fresh' ? '#000000' : '#ffffff',
                    borderColor: gameColor,
                    boxShadow: `0 0 20px ${gameColor}40`,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    boxShadow: `0 0 30px ${gameColor}60`
                  }}
                >
                  {index + 1}
                </motion.div>
                
                {/* 참가자 정보 */}
                <div>
                  <motion.p 
                    className="text-xl md:text-2xl font-black tracking-[0.1em]"
                    style={{ color: textColor }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    {participant.name}
                  </motion.p>
                  {participant.id === room.host_id && (
                    <motion.p 
                      className="text-sm md:text-base tracking-[0.15em] font-bold mt-1"
                      style={{ color: gameColor }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.4 }}
                    >
                      HOST
                    </motion.p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* 하단 액션 영역 */}
      <div className="mt-16 md:mt-20">
        {/* 시작 버튼 (호스트만) */}
        {isHost && (
          <AnimatePresence>
            {canStart ? (
              <motion.button
                key="start-button"
                onClick={startGame}
                className="w-full py-6 md:py-8 text-xl md:text-2xl font-black tracking-[0.2em] border-4 transition-all duration-300 rounded-2xl"
                style={{
                  color: textColor,
                  borderColor: gameColor,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = gameColor
                  e.currentTarget.style.color = room?.game_type === 'fresh' ? '#000000' : '#ffffff'
                  e.currentTarget.style.boxShadow = `0 0 40px ${gameColor}60`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = textColor
                  e.currentTarget.style.boxShadow = 'none'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                START GAME
              </motion.button>
            ) : (
              <motion.div
                key="waiting-message"
                className="w-full py-6 md:py-8 text-center border-4 rounded-2xl"
                style={{ borderColor: `${gameColor}40` }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
              >
                <p 
                  className="text-lg md:text-xl font-bold tracking-[0.2em]"
                  style={{ color: `${textColor}60` }}
                >
                  NEED AT LEAST 2 PLAYERS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {/* 대기 메시지 (참가자) */}
        {!isHost && (
          <motion.div
            className="w-full py-6 md:py-8 text-center border-4 rounded-2xl"
            style={{ borderColor: `${gameColor}40` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.p 
              className="text-lg md:text-xl font-bold tracking-[0.2em]"
              style={{ color: `${textColor}80` }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              WAITING FOR HOST
            </motion.p>
          </motion.div>
        )}
      </div>
      
      {/* 추가 정보 - 참가 인원이 적을 때만 표시 */}
      {room && room.participants.length < 4 && (
        <motion.div
          className="absolute right-8 md:right-12 top-1/2 transform -translate-y-1/2"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.4, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          <div className="transform rotate-90">
            <p 
              className="text-xs md:text-sm tracking-[0.3em] font-bold whitespace-nowrap"
              style={{ color: `${textColor}60` }}
            >
              SCAN QR TO JOIN
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
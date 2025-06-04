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
          className="text-xl md:text-2xl font-light tracking-[0.2em] text-gray-600"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          LOADING
        </motion.div>
      </div>
    )
  }
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col bg-gray-100 p-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 상단 헤더 */}
      <motion.div
        className="flex justify-between items-start mb-12 md:mb-16"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div>
          <h1 className="text-4xl md:text-6xl font-thin tracking-[0.2em] text-black uppercase mb-2">
            {room?.game_type}
          </h1>
          <p className="text-sm md:text-base font-light tracking-[0.15em] text-gray-500">
            ROOM {roomId}
          </p>
        </div>
        
        {/* 홈 버튼 */}
        <motion.button
          onClick={() => navigate('/')}
          className="text-sm tracking-[0.15em] font-light opacity-70 hover:opacity-100 transition-opacity"
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
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm md:text-base font-light tracking-[0.15em] text-gray-500 mb-6">
            PLAYERS ({room?.participants.length})
          </p>
        </motion.div>
        
        {/* 참가자 리스트 */}
        <div className="space-y-4 md:space-y-6">
          <AnimatePresence mode="popLayout">
            {room?.participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className="flex items-center space-x-4 md:space-x-6"
              >
                {/* 번호 */}
                <motion.div 
                  className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-full flex items-center justify-center text-sm md:text-base font-light"
                  whileHover={{ scale: 1.05 }}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {index + 1}
                </motion.div>
                
                {/* 참가자 정보 */}
                <div>
                  <p className="text-lg md:text-xl font-light tracking-wide text-black">
                    {participant.name}
                  </p>
                  {participant.id === room.host_id && (
                    <motion.p 
                      className="text-xs md:text-sm tracking-[0.1em] text-gray-500 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
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
      <div className="mt-12 md:mt-16">
        {/* 시작 버튼 (호스트만) */}
        {isHost && (
          <AnimatePresence>
            {canStart ? (
              <motion.button
                key="start-button"
                onClick={startGame}
                className="w-full py-4 md:py-6 text-lg md:text-xl font-light tracking-[0.15em] border-t border-black hover:bg-black hover:text-white transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                START GAME
              </motion.button>
            ) : (
              <motion.div
                key="waiting-message"
                className="w-full py-4 md:py-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <p className="text-sm md:text-base font-light tracking-[0.15em] text-gray-500">
                  NEED AT LEAST 2 PLAYERS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {/* 대기 메시지 (참가자) */}
        {!isHost && (
          <motion.div
            className="w-full py-4 md:py-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.p 
              className="text-sm md:text-base font-light tracking-[0.15em] text-gray-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
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
          className="absolute top-1/2 right-6 md:right-8 transform -translate-y-1/2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.3, x: 0 }}
          transition={{ delay: 1 }}
        >
          <p className="text-xs tracking-[0.2em] text-gray-400 writing-mode-vertical transform rotate-180">
            SCAN QR TO JOIN
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
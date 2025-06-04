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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          className="text-2xl md:text-3xl font-black tracking-[0.2em] text-gray-400"
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
      className="min-h-screen flex flex-col p-6 relative bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 화살표 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 text-2xl text-black hover:text-gray-600 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 상단 방 정보 */}
      <motion.div
        className="text-center mb-12 md:mb-16 mt-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.h1 
          className="text-5xl md:text-6xl font-black tracking-[0.3em] text-black mb-3"
          style={{ fontVariantNumeric: 'tabular-nums' }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {roomId}
        </motion.h1>
        <motion.p 
          className="text-sm md:text-base font-bold tracking-[0.2em] text-gray-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          ROOM
        </motion.p>
      </motion.div>
      
      {/* 참가자 섹션 */}
      <div className="flex-1 max-w-md mx-auto w-full">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-base md:text-lg font-bold tracking-[0.2em] mb-6 text-gray-600 text-center">
            PLAYERS ({room?.participants.length})
          </p>
        </motion.div>
        
        {/* 참가자 리스트 */}
        <div className="space-y-4 md:space-y-6">
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
                className="flex items-center space-x-4 md:space-x-6 p-4 rounded-xl bg-gray-50 border border-gray-200"
              >
                {/* 번호 */}
                <motion.div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg font-black border-2 border-black bg-white"
                  style={{
                    fontVariantNumeric: 'tabular-nums'
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {index + 1}
                </motion.div>
                
                {/* 참가자 정보 */}
                <div className="flex-1">
                  <motion.p 
                    className="text-lg md:text-xl font-black tracking-[0.1em] text-black"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    {participant.name}
                  </motion.p>
                  {participant.id === room.host_id && (
                    <motion.p 
                      className="text-xs md:text-sm tracking-[0.15em] font-bold mt-1 text-gray-500"
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
      <div className="mt-12 md:mt-16 max-w-md mx-auto w-full">
        {/* 시작 버튼 (호스트만) */}
        {isHost && (
          <AnimatePresence>
            {canStart ? (
              <motion.button
                key="start-button"
                onClick={startGame}
                className="w-full py-6 md:py-8 text-xl font-black tracking-[0.2em] border-2 border-black text-black bg-transparent hover:bg-black hover:text-white transition-all duration-300 rounded-xl"
                style={{
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)'
                }}
                whileTap={{ scale: 0.98 }}
              >
                START GAME
              </motion.button>
            ) : (
              <motion.div
                key="waiting-message"
                className="w-full py-6 md:py-8 text-center border-2 border-gray-300 rounded-xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
              >
                <p className="text-lg font-bold tracking-[0.2em] text-gray-400">
                  NEED AT LEAST 2 PLAYERS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {/* 대기 메시지 (참가자) */}
        {!isHost && (
          <motion.div
            className="w-full py-6 md:py-8 text-center border-2 border-gray-300 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.p 
              className="text-lg font-bold tracking-[0.2em] text-gray-500"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              WAITING FOR HOST
            </motion.p>
          </motion.div>
        )}
      </div>
      
      {/* QR 스캔 안내 */}
      {room && room.participants.length < 4 && (
        <motion.div
          className="absolute bottom-8 right-8 transform rotate-90"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.3, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-xs tracking-[0.3em] font-bold whitespace-nowrap text-gray-400">
            SCAN QR TO JOIN
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
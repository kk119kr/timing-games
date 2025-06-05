import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, subscribeToRoom, joinRoom } from '../lib/supabase'
import type { GameRoom } from '../lib/supabase'

export default function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [myParticipantIndex, setMyParticipantIndex] = useState<number>(-1)
  const [error, setError] = useState<string>('')
  const subscription = useRef<any>(null)
  
  useEffect(() => {
    if (!roomId) {
      navigate('/')
      return
    }
    
    initializeWaitingRoom()
    
    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe()
      }
    }
  }, [roomId])
  
  const initializeWaitingRoom = async () => {
    try {
      let userId = localStorage.getItem('userId')
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('userId', userId)
      }
      
      const joinedRoom = await joinRoom(roomId!, userId)
      setRoom(joinedRoom)
      
      const myIndex = joinedRoom.participants.findIndex(p => p.id === userId)
      setMyParticipantIndex(myIndex)
      
      setLoading(false)
      
      subscription.current = subscribeToRoom(roomId!, (payload) => {
        if (payload.new) {
          const newRoom = payload.new as GameRoom
          setRoom(newRoom)
          
          if (newRoom.status === 'playing') {
            const gameType = newRoom.game_type
            navigate(`/game/${gameType}/${roomId}`)
          }
        }
      })
      
    } catch (error: any) {
      console.error('대기실 초기화 실패:', error)
      setError(error.message || '방을 찾을 수 없습니다')
      setLoading(false)
    }
  }
  
  const startGame = async () => {
    if (!room || !roomId) return
    
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
      
      if (error) throw error
      
      navigate(`/game/${room.game_type}/${roomId}`)
      
    } catch (error) {
      console.error('게임 시작 실패:', error)
    }
  }
  
  // 로딩 상태
  if (loading) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center bg-white"
        style={{
          height: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }}
      >
        <motion.div
          className="w-12 h-12 border-2 border-black rounded-full"
          style={{ borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }
  
  // 에러 상태
  if (error) {
    return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center bg-white"
        style={{
          height: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-black tracking-[0.2em] text-black mb-4">ERROR</h2>
          <p className="text-base font-light text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-48 h-12 border-2 border-black rounded-full text-black font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300"
          >
            HOME
          </button>
        </motion.div>
      </div>
    )
  }
  
  if (!room) return null
  
  const isHost = room.host_id === localStorage.getItem('userId')
  const canStartGame = room.participants.length >= 2
  const gameColor = room.game_type === 'fresh' ? '#ff0000' : '#ffcc00'
  
  return (
    <motion.div 
      className="h-screen w-screen flex flex-col items-center justify-center bg-white relative overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 w-12 h-12 flex items-center justify-center rounded-full border-2 border-black text-black hover:bg-black hover:text-white transition-colors z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 게임 타입 인디케이터 */}
      <motion.div
        className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: gameColor }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      />
      
      {/* 상단 방 ID */}
      <motion.div
        className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h1 
          className="text-6xl font-black tracking-[0.3em] text-black"
          style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {room.id}
        </motion.h1>
        
        <motion.div
          className="w-16 h-1 mx-auto mt-4"
          style={{ backgroundColor: gameColor }}
          initial={{ width: 0 }}
          animate={{ width: 64 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
      </motion.div>
      
      {/* 중앙 참가자 목록 */}
      <motion.div 
        className="flex flex-col items-center justify-center space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <AnimatePresence>
          {room.participants.map((participant, index) => (
            <motion.div
              key={participant.id}
              className="flex items-center justify-center w-16 h-16 rounded-full border-2"
              style={{
                backgroundColor: index === myParticipantIndex ? '#000000' : 'transparent',
                borderColor: '#000000'
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ delay: index * 0.1 + 0.6 }}
            >
              <span 
                className="text-xl font-light"
                style={{
                  color: index === myParticipantIndex ? '#ffffff' : '#000000'
                }}
              >
                {index + 1}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 액션 */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {isHost ? (
          <motion.button
            onClick={startGame}
            disabled={!canStartGame}
            className={`w-64 h-12 rounded-full font-light tracking-[0.3em] transition-all duration-300 ${
              canStartGame
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            whileHover={canStartGame ? { scale: 1.02 } : {}}
            whileTap={canStartGame ? { scale: 0.98 } : {}}
          >
            START
          </motion.button>
        ) : (
          <motion.div 
            className="text-center text-gray-600 font-light tracking-[0.2em]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            WAITING
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
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
        className="h-screen-mobile w-screen flex items-center justify-center bg-white"
        style={{
          
          height: '100dvh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0
        }}
      >
        <motion.div
          className="text-xl sm:text-2xl font-light tracking-[0.2em] text-gray-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
          }}
        >
          LOADING
        </motion.div>
      </div>
    )
  }
  
  // 에러 상태
  if (error) {
    return (
      <div 
        className="h-screen-mobile w-screen flex flex-col items-center justify-center bg-white px-6"
        style={{
          
          height: '100dvh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          margin: 0,
          padding: '0 1.5rem',
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right))'
        }}
      >
        <motion.div
          className="text-center max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 
            className="text-xl sm:text-2xl font-light tracking-[0.2em] text-black mb-6"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
            }}
          >
            ERROR
          </h2>
          <p 
            className="text-sm sm:text-base font-light text-gray-600 mb-8 leading-relaxed"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
            }}
          >
            {error}
          </p>
          <motion.button
            onClick={() => navigate('/')}
            className="w-full h-12 sm:h-14 border-2 border-black rounded-full text-black font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300 min-h-[48px]"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            HOME
          </motion.button>
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
      className="h-screen-mobile w-screen flex flex-col bg-white relative overflow-hidden"
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
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        {/* 뒤로가기 버튼 */}
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
        
        {/* 게임 타입 인디케이터 */}
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: gameColor }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </div>
      
      {/* 중앙 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 방 ID */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h1 
            className="text-4xl xs:text-5xl sm:text-6xl font-light tracking-[0.3em] text-black mb-4"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 300
            }}
          >
            {room.id}
          </motion.h1>
          
          <motion.div
            className="w-12 sm:w-16 h-1 mx-auto"
            style={{ backgroundColor: gameColor }}
            initial={{ width: 0 }}
            animate={{ width: window.innerWidth < 640 ? 48 : 64 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
        </motion.div>
        
        {/* 참가자 목록 */}
        <motion.div 
          className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <AnimatePresence>
            {room.participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2"
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
                  className="text-lg sm:text-xl font-light"
                  style={{
                    color: index === myParticipantIndex ? '#ffffff' : '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 300
                  }}
                >
                  {index + 1}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* 참가자 수 표시 */}
          <motion.p 
            className="text-xs sm:text-sm font-light tracking-[0.2em] text-gray-500 mt-4"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {room.participants.length} PLAYERS
          </motion.p>
        </motion.div>
      </div>
      
      {/* 하단 액션 버튼 */}
      <motion.div 
        className="w-full max-w-sm mx-auto"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {isHost ? (
          <motion.button
            onClick={startGame}
            disabled={!canStartGame}
            className={`w-full h-12 sm:h-14 rounded-full font-light tracking-[0.3em] transition-all duration-300 min-h-[48px] ${
              canStartGame
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontWeight: 300
            }}
            whileHover={canStartGame ? { scale: 1.02 } : {}}
            whileTap={canStartGame ? { scale: 0.98 } : {}}
          >
            START
          </motion.button>
        ) : (
          <motion.div 
            className="w-full h-12 sm:h-14 flex items-center justify-center text-gray-600 font-light tracking-[0.2em]"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontWeight: 300
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            WAITING FOR HOST
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
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
      // 사용자 ID 생성 또는 가져오기
      let userId = localStorage.getItem('userId')
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('userId', userId)
      }
      
      // 방 참가
      const joinedRoom = await joinRoom(roomId!, userId)
      setRoom(joinedRoom)
      
      // 내 참가자 인덱스 찾기
      const myIndex = joinedRoom.participants.findIndex(p => p.id === userId)
      setMyParticipantIndex(myIndex)
      
      setLoading(false)
      
      // 실시간 구독 설정
      subscription.current = subscribeToRoom(roomId!, (payload) => {
        if (payload.new) {
          const newRoom = payload.new as GameRoom
          setRoom(newRoom)
          
          // 게임 시작 시 게임 페이지로 이동
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
      // 게임 상태를 'playing'으로 업데이트
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
      
      if (error) throw error
      
      // 게임 페이지로 이동
      navigate(`/game/${room.game_type}/${roomId}`)
      
    } catch (error) {
      console.error('게임 시작 실패:', error)
    }
  }
  
  // 로딩 상태
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-black tracking-[0.2em] text-gray-800 mb-4">ERROR</h2>
          <p className="text-sm font-light text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-black rounded-full text-sm font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300 uppercase"
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
  
  return (
    <motion.div 
      className="h-screen w-screen flex flex-col bg-white relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 버튼 - 모바일 안전 영역 고려 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center border border-black rounded-full text-sm font-light hover:bg-black hover:text-white transition-colors z-50"
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
      
      {/* 게임 타입 인디케이터 - 모바일 안전 영역 고려 */}
      <motion.div
        className="absolute top-4 right-4"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))'
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <motion.div
          className="px-4 py-2 border border-black rounded-full"
          whileHover={{ 
            backgroundColor: '#000000',
            color: '#ffffff'
          }}
        >
          <span className="text-xs font-light tracking-[0.3em] uppercase">
            {room.game_type}
          </span>
        </motion.div>
      </motion.div>
      
      {/* 상단 방 정보 */}
      <motion.div
        className="flex-shrink-0 text-center px-4 pt-20 pb-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.p 
          className="text-xs font-light tracking-[0.4em] mb-4 text-gray-500 uppercase"
        >
          ROOM
        </motion.p>
        <motion.h1 
          className="text-5xl md:text-6xl font-black tracking-[0.3em] text-black mb-6"
          style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {room.id}
        </motion.h1>
        
        {/* 게임 타입별 색상 인디케이터 라인 */}
        <motion.div
          className="w-16 h-0.5 mx-auto"
          style={{ 
            backgroundColor: room.game_type === 'fresh' ? '#ff0000' : '#ffcc00' 
          }}
          initial={{ width: 0 }}
          animate={{ width: 64 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
      </motion.div>
      
      {/* 중앙 참가자 목록 */}
      <motion.div 
        className="flex-1 flex flex-col justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div className="max-w-sm mx-auto w-full">
          <motion.h2 
            className="text-sm font-light tracking-[0.3em] text-center text-gray-600 mb-8 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            PLAYERS ({room.participants.length})
          </motion.h2>
          
          <div className="space-y-4">
            <AnimatePresence>
              {room.participants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 + 0.8 }}
                  style={{
                    backgroundColor: index === myParticipantIndex ? '#f8f8f8' : '#f5f5f5',
                    borderColor: index === myParticipantIndex ? '#000000' : '#e5e5e5'
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <motion.div 
                      className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-light"
                      style={{
                        backgroundColor: index === myParticipantIndex ? '#000000' : 'transparent',
                        color: index === myParticipantIndex ? '#ffffff' : '#000000',
                        borderColor: '#000000'
                      }}
                    >
                      {index + 1}
                    </motion.div>
                    <div>
                      <p className="text-lg font-light tracking-[0.1em] text-black">
                        {participant.name}
                      </p>
                      {participant.id === room.host_id && (
                        <p className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">
                          HOST
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {index === myParticipantIndex && (
                    <motion.div 
                      className="w-2 h-2 rounded-full bg-green-500"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity 
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
      
      {/* 하단 액션 영역 - 모바일 안전 영역 고려 */}
      <motion.div 
        className="flex-shrink-0 px-4 pb-4"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {isHost ? (
          <motion.div className="max-w-sm mx-auto w-full">
            {!canStartGame && (
              <motion.p 
                className="text-xs font-light tracking-[0.2em] text-center text-gray-500 mb-4 uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                WAITING FOR PLAYERS
              </motion.p>
            )}
            
            <motion.button
              onClick={startGame}
              disabled={!canStartGame}
              className={`w-full py-4 text-lg font-light tracking-[0.3em] rounded-lg transition-all duration-300 uppercase ${
                canStartGame
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              whileHover={canStartGame ? { scale: 1.02 } : {}}
              whileTap={canStartGame ? { scale: 0.98 } : {}}
              animate={{
                boxShadow: canStartGame 
                  ? '0 10px 30px rgba(0, 0, 0, 0.2)' 
                  : '0 5px 15px rgba(0, 0, 0, 0.1)'
              }}
            >
              START GAME
            </motion.button>
          </motion.div>
        ) : (
          <motion.div className="max-w-sm mx-auto w-full text-center">
            <motion.p 
              className="text-sm font-light tracking-[0.2em] text-gray-600 uppercase"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              WAITING FOR HOST
            </motion.p>
          </motion.div>
        )}
      </motion.div>
      
      {/* 배경 기하학적 요소들 */}
      <motion.div
        className="absolute top-1/3 left-4 w-px h-16 md:h-20 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 768 ? 64 : 80 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      />
      <motion.div
        className="absolute bottom-1/3 right-4 w-px h-16 md:h-20 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 768 ? 64 : 80 }}
        transition={{ delay: 1.7, duration: 0.8 }}
      />
      
      {/* 미세한 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </motion.div>
  )
}
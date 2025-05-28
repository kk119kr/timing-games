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
  
  useEffect(() => {
    if (!roomId) return
    
    // 방 정보 가져오기
    fetchRoom()
    
    // 실시간 구독
    const subscription = subscribeToRoom(roomId, (payload) => {
      if (payload.new) {
        setRoom(payload.new as GameRoom)
        
        // 게임 시작 감지
        if (payload.new.status === 'playing') {
          navigate(`/game/${payload.new.game_type}/${roomId}`)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId])
  
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
      
      // 현재 사용자 ID 확인
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      // 이미 참가자인지 확인
      const isAlreadyJoined = data.participants.some((p: any) => p.id === userId)
      
      // 호스트인지 확인
      if (data.host_id === userId) {
        setIsHost(true)
        console.log('You are the host')
      } else if (!isAlreadyJoined) {
        // 참가자로 추가 (호스트가 아니고 아직 참가하지 않은 경우)
        console.log('Joining room as participant...')
        const updatedRoom = await joinRoom(roomId!, userId)
        setRoom(updatedRoom)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('방 정보 가져오기 실패:', error)
      navigate('/')
    }
  }
  
  const startGame = async () => {
    if (!isHost || !room) return
    
    try {
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
    } catch (error) {
      console.error('게임 시작 실패:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <motion.div 
          className="w-16 h-16 bg-black rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col bg-gray-100 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">{room?.game_type}</h1>
          <p className="text-sm text-gray-500 mt-2">ROOM {roomId}</p>
        </div>
        
        {/* 홈 버튼 */}
        <motion.button
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-black rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="w-4 h-0.5 bg-white" />
        </motion.button>
      </div>
      
      {/* 참가자 리스트 */}
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-4">PARTICIPANTS ({room?.participants.length})</p>
        
        <AnimatePresence mode="popLayout">
          {room?.participants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="mb-4"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-xl font-medium">{participant.name}</p>
                  {participant.id === room.host_id && (
                    <p className="text-xs text-gray-500">HOST</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* 시작 버튼 (호스트만) */}
      {isHost && room && room.participants.length >= 2 && (
        <motion.button
          onClick={startGame}
          className="w-full py-6 bg-black text-white text-xl font-bold rounded-2xl shadow-2xl"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          START GAME
        </motion.button>
      )}
      
      {/* 대기 메시지 (참가자) */}
      {!isHost && (
        <motion.p 
          className="text-center text-gray-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          WAITING FOR HOST TO START
        </motion.p>
      )}
      
      {/* 최소 인원 안내 */}
      {isHost && room && room.participants.length < 2 && (
        <p className="text-center text-gray-500">
          NEED AT LEAST 2 PLAYERS
        </p>
      )}
    </motion.div>
  )
}
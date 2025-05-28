import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { createRoom } from '../lib/supabase'

export default function CreateRoom() {
  const { gameType } = useParams<{ gameType: 'chill' | 'fresh' }>()
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    createGameRoom()
  }, [])
  
  const createGameRoom = async () => {
    try {
      // 임시 사용자 ID 생성
      const userId = `user_${Date.now()}`
      
      // 방 생성
      const room = await createRoom(gameType as 'chill' | 'fresh', userId)
      setRoomId(room.id)
      
      // QR 코드 생성
      const roomUrl = `${window.location.origin}/room/${room.id}`
      const qrUrl = await QRCode.toDataURL(roomUrl, {
        width: 300,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#f5f5f5'
        }
      })
      setQrCodeUrl(qrUrl)
      setLoading(false)
      
      // 호스트를 대기실로 이동
      setTimeout(() => {
        navigate(`/room/${room.id}`)
      }, 2000)
    } catch (error) {
      console.error('방 생성 실패:', error)
    }
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 게임 타입 표시 */}
      <motion.h1 
        className="text-5xl font-bold mb-12 tracking-tight uppercase"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
      >
        {gameType}
      </motion.h1>
      
      {/* QR 코드 컨테이너 */}
      <motion.div
        layoutId="game-button"
        className="relative"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {loading ? (
          <div className="w-64 h-64 bg-black rounded-3xl flex items-center justify-center">
            <motion.div 
              className="w-16 h-16 bg-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div className="relative">
            {/* QR 코드 배경 */}
            <motion.div 
              className="w-64 h-64 bg-white rounded-3xl shadow-2xl overflow-hidden"
              whileHover={{ scale: 1.02 }}
            >
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-full h-full"
              />
            </motion.div>
            
            {/* 중앙 로고 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 bg-black rounded-full" />
            </div>
          </div>
        )}
      </motion.div>
      
      {/* 방 ID 표시 */}
      {roomId && (
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-gray-500 mb-2">ROOM ID</p>
          <p className="text-2xl font-mono font-bold tracking-wider">{roomId}</p>
        </motion.div>
      )}
      
      {/* 안내 텍스트 */}
      <motion.p 
        className="absolute bottom-10 text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        SCAN TO JOIN
      </motion.p>
    </motion.div>
  )
}
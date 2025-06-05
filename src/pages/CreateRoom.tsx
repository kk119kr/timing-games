import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
      if (!gameType || (gameType !== 'chill' && gameType !== 'fresh')) {
        console.error('Invalid game type:', gameType)
        navigate('/')
        return
      }

      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const room = await createRoom(gameType, userId)
      setRoomId(room.id)
      
      const roomUrl = `${window.location.origin}/room/${room.id}`
      const qrUrl = await QRCode.toDataURL(roomUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
      
      setQrCodeUrl(qrUrl)
      setLoading(false)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      setLoading(false)
      navigate('/')
    }
  }
  
  const handleGoToRoom = () => {
    navigate(`/room/${roomId}`)
  }
  
  const isGameType = (type: string | undefined): type is 'chill' | 'fresh' => {
    return type === 'chill' || type === 'fresh'
  }
  
  const gameColor = isGameType(gameType) && gameType === 'fresh' ? '#ff0000' : '#ffcc00'
  
  return (
    <motion.div 
      className="h-screen w-screen flex flex-col items-center justify-center bg-white relative overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
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
      
      {/* 게임 타입 표시 */}
      <motion.div
        className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: gameColor }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      />
      
      {/* 중앙 컨텐츠 */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="w-48 h-48 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-12 h-12 border-2 border-black rounded-full"
                style={{ borderTopColor: 'transparent' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* QR 코드 */}
              <motion.div
                className="w-48 h-48 bg-white border-2 border-black rounded-2xl p-4 mb-8 flex items-center justify-center"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {qrCodeUrl && (
                  <motion.img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />
                )}
              </motion.div>
              
              {/* 방 ID */}
              <motion.div
                className="text-center mb-12"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.h1 
                  className="text-6xl font-black tracking-[0.3em] text-black mb-4"
                  style={{ 
                    fontFamily: 'Libre Baskerville, serif',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {roomId}
                </motion.h1>
                
                <motion.div
                  className="w-16 h-1 mx-auto"
                  style={{ backgroundColor: gameColor }}
                  initial={{ width: 0 }}
                  animate={{ width: 64 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 버튼 */}
      {roomId && (
        <motion.button
          onClick={handleGoToRoom}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-64 h-12 border-2 border-black rounded-full text-black font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ENTER ROOM
        </motion.button>
      )}
    </motion.div>
  )
}

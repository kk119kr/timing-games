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
  const [showQR, setShowQR] = useState(false)
  
  useEffect(() => {
    createGameRoom()
  }, [])
  
  const createGameRoom = async () => {
    try {
      console.log('Creating room...', gameType)
      
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const room = await createRoom(gameType as 'chill' | 'fresh', userId)
      console.log('Room created:', room)
      
      setRoomId(room.id)
      
      // QR 코드 생성
      const roomUrl = `${window.location.origin}/room/${room.id}`
      console.log('Room URL:', roomUrl)
      
      const qrUrl = await QRCode.toDataURL(roomUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
      
      setQrCodeUrl(qrUrl)
      setLoading(false)
      
      // QR 코드 애니메이션 시작
      setTimeout(() => {
        setShowQR(true)
      }, 500)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      setLoading(false)
    }
  }
  
  const handleGoToRoom = () => {
    navigate(`/room/${roomId}`)
  }
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden"
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
      
      {/* 중앙 QR 코드 영역 */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center rounded-2xl bg-gray-100 border-2 border-gray-200"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              <motion.div
                className="w-6 h-6 bg-gray-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="qr-container"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              {/* QR 코드 */}
              <motion.div
                className="relative mb-8 bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200"
                animate={showQR ? {
                  scale: [0.8, 1.05, 1],
                } : {}}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.23, 1, 0.320, 1],
                  delay: 0.2
                }}
                style={{
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                }}
              >
                <motion.div
                  className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center overflow-hidden rounded-xl"
                >
                  <AnimatePresence>
                    {showQR && qrCodeUrl ? (
                      <motion.img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                      />
                    ) : (
                      <motion.div
                        className="w-4 h-4 bg-gray-400 rounded-full"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.6, 1, 0.6]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
              
              {/* 방 ID */}
              <motion.div
                className="text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <motion.p 
                  className="text-sm font-bold tracking-[0.3em] mb-3 text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  ROOM
                </motion.p>
                <motion.p 
                  className="text-5xl md:text-6xl font-black tracking-[0.4em] text-black"
                  style={{ 
                    fontVariantNumeric: 'tabular-nums'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                >
                  {roomId}
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 액션 영역 */}
      <div className="absolute bottom-12 md:bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-6">
        {/* 스캔 안내 */}
        <motion.p
          className="text-sm font-semibold tracking-[0.2em] text-center text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: showQR ? 1 : 0 }}
          transition={{ delay: 1.5 }}
        >
          SCAN TO JOIN
        </motion.p>
        
        {/* 대기실 이동 버튼 */}
        {roomId && (
          <motion.button
            onClick={handleGoToRoom}
            className="text-base font-bold tracking-[0.15em] px-8 py-4 rounded-xl border-2 border-black text-black bg-transparent hover:bg-black hover:text-white transition-all duration-300"
            style={{
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            WAITING ROOM
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
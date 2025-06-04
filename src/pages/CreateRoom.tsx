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
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: 'transparent'
        },
        errorCorrectionLevel: 'M'
      })
      
      setQrCodeUrl(qrUrl)
      setLoading(false)
      
      // QR 코드 모핑 애니메이션 시작
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
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 게임 타입 타이포그래피 */}
      <motion.div
        className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-6xl md:text-8xl font-thin tracking-[0.2em] text-black text-center uppercase">
          {gameType}
        </h1>
      </motion.div>
      
      {/* 중앙 QR 코드 영역 */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              layoutId="game-selector"
              className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              {/* 로딩 인디케이터 - 볼륨 스타일 */}
              <div className="relative">
                <motion.div
                  className="w-1 h-24 bg-black rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-6 h-6 bg-black rounded-full left-1/2 transform -translate-x-1/2"
                  animate={{ y: [-40, 40, -40] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ top: '50%', marginTop: '-12px' }}
                />
              </div>
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
              {/* QR 코드 모핑 효과 */}
              <motion.div
                layoutId="game-selector"
                className="relative mb-8"
                animate={showQR ? {
                  borderRadius: ["50%", "25%", "8px"],
                  width: [40, 120, 200],
                  height: [40, 120, 200]
                } : {}}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.23, 1, 0.320, 1],
                  delay: 0.2
                }}
              >
                <motion.div
                  className="w-full h-full bg-white flex items-center justify-center overflow-hidden"
                  style={{ 
                    borderRadius: showQR ? '8px' : '50%',
                    border: '1px solid #000'
                  }}
                  animate={{
                    borderRadius: showQR ? '8px' : '50%'
                  }}
                  transition={{ duration: 1.2, ease: [0.23, 1, 0.320, 1] }}
                >
                  <AnimatePresence>
                    {showQR && qrCodeUrl && (
                      <motion.img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain p-2"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* 초기 중앙 점 */}
                  {!showQR && (
                    <motion.div
                      className="w-2 h-2 bg-black rounded-full"
                      animate={{ opacity: [1, 0] }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    />
                  )}
                </motion.div>
              </motion.div>
              
              {/* 방 ID 타이포그래피 */}
              <motion.div
                className="text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <motion.p 
                  className="text-xs md:text-sm tracking-[0.3em] text-gray-500 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  ROOM
                </motion.p>
                <motion.p 
                  className="text-4xl md:text-5xl font-light tracking-[0.4em] text-black"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                >
                  {roomId}
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 안내 및 버튼 */}
      <div className="absolute bottom-12 md:bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-6">
        {/* 스캔 안내 */}
        <motion.p
          className="text-xs md:text-sm tracking-[0.2em] text-gray-500 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: showQR ? 1 : 0 }}
          transition={{ delay: 2 }}
        >
          SCAN TO JOIN
        </motion.p>
        
        {/* 대기실 이동 버튼 */}
        {roomId && (
          <motion.button
            onClick={handleGoToRoom}
            className="text-sm md:text-base tracking-[0.15em] font-light border-b border-black pb-1 hover:opacity-70 transition-opacity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            whileTap={{ scale: 0.95 }}
          >
            WAITING ROOM
          </motion.button>
        )}
      </div>
      
      {/* 홈 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 text-sm tracking-[0.15em] font-light opacity-70 hover:opacity-100 transition-opacity"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
      >
        HOME
      </motion.button>
    </motion.div>
  )
}
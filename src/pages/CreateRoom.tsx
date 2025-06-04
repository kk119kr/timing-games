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
      
      // QR 코드 생성 - 더 높은 해상도와 명확한 설정
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
      
      // QR 코드 모핑 애니메이션 시작
      setTimeout(() => {
        setShowQR(true)
      }, 800)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      setLoading(false)
    }
  }
  
  const handleGoToRoom = () => {
    navigate(`/room/${roomId}`)
  }
  
  const gameColor = gameType === 'fresh' ? '#ff4444' : '#ffcc00'
  const textColor = gameType === 'fresh' ? '#ffffff' : '#000000'
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: gameType === 'fresh' ? '#000000' : '#ffffff' }}
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
        <h1 
          className="text-6xl md:text-8xl font-black tracking-[0.2em] text-center uppercase"
          style={{ color: textColor }}
        >
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
              className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center rounded-2xl"
              style={{ backgroundColor: gameColor }}
              initial={{ borderRadius: '50%' }}
              animate={{ 
                borderRadius: ['50%', '25%', '1rem'],
                rotate: [0, 180, 360]
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* 로딩 인디케이터 */}
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-2 h-16 bg-white rounded-full opacity-80" />
                <motion.div
                  className="absolute w-6 h-6 bg-white rounded-full left-1/2 transform -translate-x-1/2"
                  animate={{ y: [-30, 30, -30] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ top: '50%', marginTop: '-12px' }}
                />
              </motion.div>
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
                className="relative mb-8 bg-white rounded-2xl p-4 shadow-2xl"
                animate={showQR ? {
                  borderRadius: ['50%', '25%', '1rem'],
                  width: [60, 160, 240],
                  height: [60, 160, 240],
                  padding: [24, 16, 16]
                } : {}}
                transition={{ 
                  duration: 1.5, 
                  ease: [0.23, 1, 0.320, 1],
                  delay: 0.2
                }}
                style={{
                  boxShadow: `0 25px 50px -12px ${gameColor}40`
                }}
              >
                <motion.div
                  className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl"
                  animate={{
                    borderRadius: showQR ? '0.75rem' : '50%'
                  }}
                  transition={{ duration: 1.2, ease: [0.23, 1, 0.320, 1] }}
                >
                  <AnimatePresence>
                    {showQR && qrCodeUrl ? (
                      <motion.img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.6 }}
                      />
                    ) : (
                      <motion.div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: gameColor }}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.8, 1, 0.8]
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
              
              {/* 방 ID 타이포그래피 */}
              <motion.div
                className="text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.8 }}
              >
                <motion.p 
                  className="text-xs md:text-sm font-bold tracking-[0.3em] mb-2"
                  style={{ color: `${textColor}80` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.9 }}
                >
                  ROOM
                </motion.p>
                <motion.p 
                  className="text-4xl md:text-5xl font-black tracking-[0.4em]"
                  style={{ 
                    color: textColor,
                    textShadow: gameType === 'fresh' ? '0 0 20px rgba(255,255,255,0.3)' : 'none'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.1 }}
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
          className="text-xs md:text-sm font-semibold tracking-[0.2em] text-center"
          style={{ color: `${textColor}80` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: showQR ? 1 : 0 }}
          transition={{ delay: 2.3 }}
        >
          SCAN TO JOIN
        </motion.p>
        
        {/* 대기실 이동 버튼 */}
        {roomId && (
          <motion.button
            onClick={handleGoToRoom}
            className="text-sm md:text-base font-bold tracking-[0.15em] px-6 py-3 rounded-xl border-2 transition-all duration-300"
            style={{
              color: textColor,
              borderColor: gameColor,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = gameColor
              e.currentTarget.style.color = gameType === 'fresh' ? '#000000' : '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = textColor
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            WAITING ROOM
          </motion.button>
        )}
      </div>
      
      {/* 홈 버튼 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 text-sm font-semibold tracking-[0.15em] opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: textColor }}
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
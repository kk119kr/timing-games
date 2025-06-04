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
      // gameType 타입 가드 추가
      if (!gameType || (gameType !== 'chill' && gameType !== 'fresh')) {
        console.error('Invalid game type:', gameType)
        navigate('/')
        return
      }

      const userId = localStorage.getItem('userId') || `user_${Date.now()}`
      localStorage.setItem('userId', userId)
      
      const room = await createRoom(gameType, userId)
      setRoomId(room.id)
      
      // QR 코드 생성 - 미니멀 스타일
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
      
      setTimeout(() => setShowQR(true), 300)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      setLoading(false)
      navigate('/') // 에러 시 홈으로 이동
    }
  }
  
  const handleGoToRoom = () => {
    navigate(`/room/${roomId}`)
  }
  
  const isGameType = (type: string | undefined): type is 'chill' | 'fresh' => {
    return type === 'chill' || type === 'fresh'
  }
  
  const gameTypeColor = isGameType(gameType) && gameType === 'fresh' ? '#ff0000' : '#ffcc00'
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 버튼 - 미니멀 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 w-10 h-10 flex items-center justify-center border border-black rounded-full text-sm font-light hover:bg-black hover:text-white transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 게임 타입 인디케이터 */}
      <motion.div
        className="absolute top-8 right-8"
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
            {gameType || 'GAME'}
          </span>
        </motion.div>
      </motion.div>
      
      {/* 중앙 컨텐츠 */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="w-48 h-48 flex items-center justify-center border border-gray-300 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 로딩 애니메이션 - 서브스턴스 스타일 */}
              <motion.div
                className="w-12 h-12 border-2 border-black rounded-full"
                style={{
                  borderTopColor: 'transparent',
                }}
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
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
              {/* QR 코드 컨테이너 */}
              <motion.div
                className="relative mb-8 bg-white border border-black rounded-lg p-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: showQR ? 1 : 0.8 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 25 
                }}
              >
                <motion.div className="w-48 h-48 flex items-center justify-center">
                  <AnimatePresence>
                    {showQR && qrCodeUrl ? (
                      <motion.img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      />
                    ) : (
                      <motion.div
                        className="w-3 h-3 bg-gray-400 rounded-full"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
              
              {/* 방 ID 표시 */}
              <motion.div
                className="text-center mb-12"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.p 
                  className="text-xs font-light tracking-[0.4em] mb-4 text-gray-500 uppercase"
                >
                  ROOM
                </motion.p>
                <motion.p 
                  className="text-6xl md:text-7xl font-black tracking-[0.3em] text-black"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                  animate={{
                    textShadow: showQR ? `0 0 20px ${gameTypeColor}20` : 'none'
                  }}
                >
                  {roomId}
                </motion.p>
                
                {/* 게임 타입별 색상 인디케이터 라인 */}
                <motion.div
                  className="w-16 h-0.5 mx-auto mt-4"
                  style={{ backgroundColor: gameTypeColor }}
                  initial={{ width: 0 }}
                  animate={{ width: 64 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 액션 영역 */}
      <motion.div
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-6"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {/* 스캔 안내 */}
        <motion.p
          className="text-xs font-light tracking-[0.4em] text-gray-500 uppercase"
          animate={{ opacity: showQR ? 1 : 0 }}
        >
          SCAN TO JOIN
        </motion.p>
        
        {/* 대기실 이동 버튼 */}
        {roomId && (
          <motion.button
            onClick={handleGoToRoom}
            className="px-8 py-3 border border-black rounded-full text-sm font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300 uppercase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            WAITING ROOM
          </motion.button>
        )}
      </motion.div>
      
      {/* 배경 기하학적 요소들 - 서브스턴스 스타일 */}
      <motion.div
        className="absolute top-1/4 left-8 w-px h-24 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: 96 }}
        transition={{ delay: 2, duration: 1 }}
      />
      <motion.div
        className="absolute bottom-1/4 right-8 w-px h-24 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: 96 }}
        transition={{ delay: 2.2, duration: 1 }}
      />
      
      {/* 미세한 그리드 패턴 - 매우 미묘하게 */}
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
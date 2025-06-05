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
      
      // QR 코드 생성 - 모바일에 최적화된 크기
      const roomUrl = `${window.location.origin}/room/${room.id}`
      const qrUrl = await QRCode.toDataURL(roomUrl, {
        width: 300, // 모바일에서 더 잘 보이도록 크기 증가
        margin: 2,
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
      className="h-screen-mobile w-screen flex flex-col items-center justify-center bg-white relative overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 뒤로가기 버튼 - 모바일 터치 영역 증가 */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center border-2 border-black rounded-full text-base font-light hover:bg-black hover:text-white transition-colors z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        ←
      </motion.button>
      
      {/* 게임 타입 인디케이터 */}
      <motion.div
        className="absolute top-4 right-4"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <motion.div
          className="px-4 py-3 border-2 border-black rounded-full"
          whileHover={{ 
            backgroundColor: '#000000',
            color: '#ffffff'
          }}
        >
          <span className="text-sm font-light tracking-[0.3em] uppercase">
            {gameType || 'GAME'}
          </span>
        </motion.div>
      </motion.div>
      
      {/* 중앙 컨텐츠 */}
      <motion.div
        className="flex flex-col items-center px-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center border-2 border-gray-300 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 로딩 애니메이션 */}
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
              {/* QR 코드 컨테이너 - 모바일에 맞게 크기 조정 */}
              <motion.div
                className="relative mb-6 bg-white border-2 border-black rounded-xl p-4 sm:p-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: showQR ? 1 : 0.8 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 25 
                }}
              >
                <motion.div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                  <AnimatePresence>
                    {showQR && qrCodeUrl ? (
                      <motion.img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain rounded-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      />
                    ) : (
                      <motion.div
                        className="w-4 h-4 bg-gray-400 rounded-full"
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
                className="text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.p 
                  className="text-sm font-light tracking-[0.4em] mb-4 text-gray-500 uppercase"
                >
                  ROOM
                </motion.p>
                <motion.p 
                  className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.3em] text-black"
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
                  className="w-20 h-1 mx-auto mt-4"
                  style={{ backgroundColor: gameTypeColor }}
                  initial={{ width: 0 }}
                  animate={{ width: 80 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 하단 액션 영역 */}
      <motion.div
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4 px-6 w-full max-w-sm"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {/* 스캔 안내 */}
        <motion.p
          className="text-sm font-light tracking-[0.4em] text-gray-500 uppercase"
          animate={{ opacity: showQR ? 1 : 0 }}
        >
          SCAN TO JOIN
        </motion.p>
        
        {/* 대기실 이동 버튼 - 모바일 터치 영역 증가 */}
        {roomId && (
          <motion.button
            onClick={handleGoToRoom}
            className="w-full px-6 py-4 border-2 border-black rounded-full text-base font-light tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300 uppercase min-h-[56px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            WAITING ROOM
          </motion.button>
        )}
        
        {/* 방 ID 복사 버튼 (모바일에서 유용) */}
        {roomId && (
          <motion.button
            onClick={() => {
              navigator.clipboard?.writeText(roomId).then(() => {
                // 햅틱 피드백
                navigator.vibrate?.(50)
                // 간단한 피드백 표시
                const button = document.activeElement as HTMLButtonElement
                if (button) {
                  const originalText = button.textContent
                  button.textContent = 'COPIED!'
                  setTimeout(() => {
                    button.textContent = originalText
                  }, 1000)
                }
              }).catch(() => {
                // 복사 실패 시 선택 가능하도록
                const input = document.createElement('input')
                input.value = roomId
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                document.body.removeChild(input)
              })
            }}
            className="text-sm font-light tracking-[0.2em] text-gray-500 hover:text-black transition-colors uppercase px-4 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            COPY CODE
          </motion.button>
        )}
      </motion.div>
      
      {/* 배경 기하학적 요소들 - 모바일에서는 더 미묘하게 */}
      <motion.div
        className="absolute top-1/4 left-4 w-px h-12 sm:h-16 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 640 ? 48 : 64 }}
        transition={{ delay: 2, duration: 1 }}
      />
      <motion.div
        className="absolute bottom-1/4 right-4 w-px h-12 sm:h-16 bg-gray-200"
        initial={{ height: 0 }}
        animate={{ height: window.innerWidth < 640 ? 48 : 64 }}
        transition={{ delay: 2.2, duration: 1 }}
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
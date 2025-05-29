import { useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState<'chill' | 'fresh' | null>(null)
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [roomId, setRoomId] = useState('')
  
  const y = useMotionValue(0)
  const opacity = useTransform(y, [-100, 0, 100], [0, 1, 0])
  
  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.y) > 50) {
      const game = info.offset.y < 0 ? 'fresh' : 'chill'
      setSelectedGame(game)
      
      // 애니메이션 후 페이지 전환
      setTimeout(() => {
        navigate(`/create/${game}`)
      }, 300)
    }
  }
  
  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`)
    }
  }
  
  return (
    <motion.div 
      className="h-screen flex flex-col items-center justify-center bg-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 타이틀 */}
      <motion.h1 
        className="text-6xl font-bold mb-20 tracking-tight"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        TIMING
      </motion.h1>
      
      {/* 게임 선택 인디케이터 */}
      <div className="absolute top-1/4 text-center">
        <motion.p 
          className="text-2xl font-light text-gray-400"
          animate={{ opacity: y.get() < -20 ? 1 : 0.3 }}
        >
          FRESHHH
        </motion.p>
      </div>
      
      <div className="absolute bottom-1/4 text-center">
        <motion.p 
          className="text-2xl font-light text-gray-400"
          animate={{ opacity: y.get() > 20 ? 1 : 0.3 }}
        >
          CHILL
        </motion.p>
      </div>
      
      {/* 드래그 가능한 버튼 */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -150, bottom: 150 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y, opacity }}
        whileDrag={{ scale: 0.95 }}
        className="relative"
        layoutId="game-button"
      >
        <motion.div 
          className="w-24 h-24 bg-black rounded-full cursor-grab active:cursor-grabbing shadow-2xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: selectedGame 
              ? '0 0 60px rgba(0,0,0,0.8)' 
              : '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <motion.div 
              className="w-2 h-8 bg-white rounded-full"
              animate={{ 
                rotate: y.get() !== 0 ? y.get() * 2 : 0 
              }}
            />
          </div>
        </motion.div>
      </motion.div>
      
      {/* 설명 텍스트 */}
      <motion.p 
        className="absolute bottom-10 text-sm text-gray-500 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        SLIDE TO SELECT
      </motion.p>
      
      {/* 방 참가 버튼/입력 */}
      <motion.div
        className="absolute top-10 right-10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        {!showJoinInput ? (
          <motion.button
            onClick={() => setShowJoinInput(true)}
            className="px-4 py-2 bg-black text-white rounded-full text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            JOIN ROOM
          </motion.button>
        ) : (
          <motion.div
            className="flex space-x-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="ROOM ID"
              className="px-4 py-2 bg-white border-2 border-black rounded-full text-sm w-32 font-mono"
              autoFocus
              maxLength={6}
            />
            <motion.button
              onClick={handleJoinRoom}
              className="px-4 py-2 bg-black text-white rounded-full text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              GO
            </motion.button>
            <motion.button
              onClick={() => {
                setShowJoinInput(false)
                setRoomId('')
              }}
              className="px-3 py-2 bg-gray-400 text-white rounded-full text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ✕
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
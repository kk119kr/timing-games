import { createClient } from '@supabase/supabase-js'

// Supabase 프로젝트 생성 후 여기에 URL과 Key 입력
const supabaseUrl = 'https://supabase.com/dashboard/project/qjobdiwxzhhncuynwcrpYOUR_SUPABASE_URL'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2JkaXd4emhobmN1eW53Y3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzOTUyOTgsImV4cCI6MjA2Mzk3MTI5OH0.iHiIgq-5DaEelg8CM6iZoaq3eVwl-8lzQn-49jP0zQg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 게임 룸 타입 정의
export interface GameRoom {
  id: string
  game_type: 'chill' | 'fresh'
  host_id: string
  participants: Participant[]
  game_state: GameState
  created_at: string
  status: 'waiting' | 'playing' | 'finished'
}

export interface Participant {
  id: string
  name: string
  peer_id?: string
  score?: number
  has_pressed?: boolean
  press_order?: number
}

export interface GameState {
  current_round?: number
  round_scores?: Record<string, number>[]
  winner?: string
  glowing_index?: number
  button_color?: number // 0-100 빨간색 농도
  round_start_time?: number
}

// 방 생성
export async function createRoom(gameType: 'chill' | 'fresh', hostId: string) {
  const roomId = generateRoomId()
  
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      id: roomId,
      game_type: gameType,
      host_id: hostId,
      participants: [{
        id: hostId,
        name: 'PT-1'
      }],
      game_state: {},
      status: 'waiting'
    })
    .single()
    
  if (error) throw error
  return data
}

// 방 참가
export async function joinRoom(roomId: string, userId: string) {
  // 현재 참가자 수 확인
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('participants')
    .eq('id', roomId)
    .single()
    
  if (fetchError) throw fetchError
  
  const participantNumber = room.participants.length + 1
  const newParticipant = {
    id: userId,
    name: `PT-${participantNumber}`
  }
  
  const { data, error } = await supabase
    .from('rooms')
    .update({
      participants: [...room.participants, newParticipant]
    })
    .eq('id', roomId)
    .single()
    
  if (error) throw error
  return data
}

// 실시간 구독
export function subscribeToRoom(roomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      callback
    )
    .subscribe()
}

// 게임 상태 업데이트
export async function updateGameState(roomId: string, gameState: Partial<GameState>) {
  const { error } = await supabase
    .from('rooms')
    .update({ game_state: gameState })
    .eq('id', roomId)
    
  if (error) throw error
}

// 방 ID 생성 (6자리 영숫자 또는 4자리 숫자)
function generateRoomId(): string {
  const useNumbers = Math.random() > 0.5
  
  if (useNumbers) {
    return Math.floor(1000 + Math.random() * 9000).toString()
  } else {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let roomId = ''
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return roomId
  }
}
import { createClient } from '@supabase/supabase-js'

// Supabase 프로젝트 설정 - 환경 변수 사용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qjobdiwxzhhncuynwcrp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2JkaXd4emhobmN1eW53Y3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzOTUyOTgsImV4cCI6MjA2Mzk3MTI5OH0.iHiIgq-5DaEelg8CM6iZoaq3eVwl-8lzQn-49jP0zQg'

// 임시 테스트를 위한 체크
const isTestMode = false  // 실제 Supabase 사용

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
  press_time?: number
}

export interface GameState {
  current_round?: number
  round_scores?: Record<string, number>[]
  winner?: string
  glowing_index?: number
  button_color?: number
  round_start_time?: number
  round_end?: boolean
  countdown_started?: boolean
  countdown_start_time?: number
}

// 타입 가드 함수들
export function isGameRoom(data: unknown): data is GameRoom {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'game_type' in data &&
         'participants' in data &&
         'game_state' in data
}

export function isValidGameType(type: string): type is 'chill' | 'fresh' {
  return type === 'chill' || type === 'fresh'
}

export function isParticipant(data: unknown): data is Participant {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'name' in data
}

// Supabase 응답 타입은 제거 - 내장 타입 사용

interface RoomUpdatePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: GameRoom
  old?: GameRoom
}

// 방 생성
export async function createRoom(gameType: 'chill' | 'fresh', hostId: string): Promise<GameRoom> {
  if (!isValidGameType(gameType)) {
    throw new Error(`Invalid game type: ${gameType}`)
  }
  
  if (!hostId.trim()) {
    throw new Error('Host ID is required')
  }

  const roomId = generateRoomId()
  
  if (isTestMode) {
    console.log('Test mode: Creating mock room', roomId)
    return {
      id: roomId,
      game_type: gameType,
      host_id: hostId,
      participants: [{
        id: hostId,
        name: 'PT-1'
      }],
      game_state: {},
      status: 'waiting',
      created_at: new Date().toISOString()
    }
  }
  
  const newParticipant: Participant = {
    id: hostId,
    name: 'PT-1'
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      id: roomId,
      game_type: gameType,
      host_id: hostId,
      participants: [newParticipant],
      game_state: {},
      status: 'waiting'
    })
    .select()
    .single()
    
  if (error) {
    console.error('Supabase error:', error)
    throw error
  }
  
  if (!data) {
    throw new Error('No data returned from Supabase')
  }
  
  if (!isGameRoom(data)) {
    throw new Error('Invalid room data returned from Supabase')
  }
  
  return data
}

// 방 참가
export async function joinRoom(roomId: string, userId: string): Promise<GameRoom> {
  if (!roomId.trim()) {
    throw new Error('Room ID is required')
  }
  
  if (!userId.trim()) {
    throw new Error('User ID is required')
  }

  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()
    
  if (fetchError) throw fetchError
  if (!room) throw new Error('Room not found')
  if (!isGameRoom(room)) throw new Error('Invalid room data')
  
  // 이미 참가한 사용자인지 확인
  const isAlreadyJoined = room.participants.some(p => p.id === userId)
  if (isAlreadyJoined) {
    return room
  }
  
  const participantNumber = room.participants.length + 1
  const newParticipant: Participant = {
    id: userId,
    name: `PT-${participantNumber}`
  }
  
  const updatedParticipants: Participant[] = [...room.participants, newParticipant]
  
  const { data, error } = await supabase
    .from('rooms')
    .update({
      participants: updatedParticipants
    })
    .eq('id', roomId)
    .select()
    .single()
    
  if (error) throw error
  if (!data) throw new Error('Failed to join room')
  if (!isGameRoom(data)) throw new Error('Invalid room data after join')
  
  return data
}

// 실시간 구독 (타입 안전성 강화)
export function subscribeToRoom(roomId: string, callback: (payload: RoomUpdatePayload) => void) {
  if (!roomId.trim()) {
    throw new Error('Room ID is required')
  }

  if (isTestMode) {
    return {
      unsubscribe: () => {}
    }
  }
  
  console.log('Setting up subscription for room:', roomId)
  
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        console.log('Realtime event received:', payload.eventType, payload)
        
        const typedPayload: RoomUpdatePayload = {
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? (isGameRoom(payload.new) ? payload.new : undefined) : undefined,
          old: payload.old ? (isGameRoom(payload.old) ? payload.old : undefined) : undefined
        }
        
        callback(typedPayload)
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to room changes')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Subscription error')
      }
    })
    
  return channel
}

// 게임 상태 업데이트 (타입 안전성 강화)
export async function updateGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
  if (!roomId.trim()) {
    throw new Error('Room ID is required')
  }

  if (isTestMode) {
    console.log('Test mode: Updating game state', gameState)
    return
  }

  console.log('Updating game state for room', roomId, ':', gameState)

  // 타입 검증된 게임 상태 생성
  const validatedState: Partial<GameState> = {}
  
  if (gameState.current_round !== undefined) {
    validatedState.current_round = Number(gameState.current_round)
  }
  if (gameState.round_start_time !== undefined) {
    validatedState.round_start_time = Number(gameState.round_start_time)
  }
  if (gameState.countdown_start_time !== undefined) {
    validatedState.countdown_start_time = Number(gameState.countdown_start_time)
  }
  if (gameState.glowing_index !== undefined) {
    validatedState.glowing_index = Number(gameState.glowing_index)
  }
  if (gameState.button_color !== undefined) {
    validatedState.button_color = Number(gameState.button_color)
  }
  if (gameState.winner !== undefined) {
    validatedState.winner = String(gameState.winner)
  }
  if (gameState.round_end !== undefined) {
    validatedState.round_end = Boolean(gameState.round_end)
  }
  if (gameState.countdown_started !== undefined) {
    validatedState.countdown_started = Boolean(gameState.countdown_started)
  }
  if (gameState.round_scores !== undefined) {
    validatedState.round_scores = gameState.round_scores
  }

  // 기존 상태 가져오기
  const { data: roomData, error: fetchError } = await supabase
    .from('rooms')
    .select('game_state')
    .eq('id', roomId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch existing game state:', fetchError)
    throw fetchError
  }

  const currentState: GameState = roomData?.game_state || {}

  const newState: GameState = {
    ...currentState,
    ...validatedState
  }

  const { error } = await supabase
    .from('rooms')
    .update({ game_state: newState })
    .eq('id', roomId)

  if (error) {
    console.error('Failed to update game state:', error)
    throw error
  }

  console.log('Game state updated successfully')
}

// 방 ID 생성 (항상 4자리 숫자)
function generateRoomId(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
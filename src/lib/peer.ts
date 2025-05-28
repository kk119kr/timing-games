import Peer from 'peerjs'

export class GamePeerManager {
  private peer: Peer
  private connections: Map<string, any> = new Map()
  
  constructor(userId: string, isHost: boolean) {
    this.peer = new Peer(userId)
    
    this.peer.on('open', (id) => {
      console.log('Peer ID:', id)
    })
    
    if (isHost) {
      this.peer.on('connection', (conn) => {
        this.handleConnection(conn)
      })
    }
  }
  
  // 호스트가 참가자에게 연결
  connectToPeer(peerId: string) {
    const conn = this.peer.connect(peerId)
    this.handleConnection(conn)
  }
  
  // 연결 처리
  private handleConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      console.log('Connected to:', conn.peer)
    })
    
    conn.on('close', () => {
      this.connections.delete(conn.peer)
    })
  }
  
  // 모든 피어에게 메시지 전송
  broadcast(data: any) {
    this.connections.forEach(conn => {
      conn.send(data)
    })
  }
  
  // 특정 피어에게 메시지 전송
  sendTo(peerId: string, data: any) {
    const conn = this.connections.get(peerId)
    if (conn) {
      conn.send(data)
    }
  }
  
  // 메시지 수신 리스너 등록
  onMessage(callback: (data: any) => void) {
    this.connections.forEach(conn => {
      conn.on('data', callback)
    })
    
    // 새로운 연결에도 리스너 추가
    this.peer.on('connection', (conn) => {
      conn.on('data', callback)
    })
  }
  
  // 정리
  destroy() {
    this.connections.forEach(conn => conn.close())
    this.peer.destroy()
  }
}

// 게임 이벤트 타입
export interface GameEvent {
  type: 'button_glow' | 'button_press' | 'round_start' | 'round_end' | 'game_end'
  data: any
  timestamp: number
}
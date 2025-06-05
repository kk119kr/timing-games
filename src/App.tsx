import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import Home from './pages/Home'
import CreateRoom from './pages/CreateRoom'
import WaitingRoom from './pages/WaitingRoom'
import ChillGame from './pages/ChillGame'
import FreshGame from './pages/FreshGame'
import './App.css'

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/create/:gameType" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<WaitingRoom />} />
        <Route path="/game/chill/:roomId" element={<ChillGame />} />
        <Route path="/game/fresh/:roomId" element={<FreshGame />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  useEffect(() => {
    // 모바일 최적화 설정
    const initializeMobileOptimizations = () => {
      // 기본 스타일 설정
      document.body.style.backgroundColor = '#f5f5f5'
      document.body.style.fontFamily = 'Helvetica, Arial, system-ui, -apple-system, sans-serif'
      document.body.style.margin = '0'
      document.body.style.padding = '0'
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'relative'
      document.body.style.width = '100%'
      document.body.style.height = '100vh'
      document.body.style.height = '100dvh'
      
      // iOS Safari 특정 설정
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.style.height = '-webkit-fill-available'
        
        // iOS Safari 주소창 숨김 개선
        document.body.style.webkitOverflowScrolling = 'touch'
        document.body.style.overscrollBehavior = 'none'
      }
      
      // 터치 이벤트 최적화
      document.body.style.touchAction = 'manipulation'
      document.body.style.webkitTapHighlightColor = 'transparent'
      document.body.style.webkitUserSelect = 'none'
      document.body.style.webkitTouchCallout = 'none'
      document.body.style.userSelect = 'none'
    }
    
    // 뷰포트 메타태그 동적 설정
    const setupViewport = () => {
      let metaViewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement
      
      if (!metaViewport) {
        metaViewport = document.createElement('meta')
        metaViewport.name = 'viewport'
        document.head.appendChild(metaViewport)
      }
      
      // 모바일 최적화 뷰포트 설정
      const viewportContent = [
        'width=device-width',
        'initial-scale=1.0',
        'maximum-scale=1.0',
        'minimum-scale=1.0',
        'user-scalable=no',
        'viewport-fit=cover',
        'shrink-to-fit=no'
      ].join(', ')
      
      metaViewport.setAttribute('content', viewportContent)
    }
    
    // PWA 메타태그 설정
    const setupPWAMeta = () => {
      // Apple 특정 메타태그들
      const appleMetas = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Timing Games' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#000000' }
      ]
      
      appleMetas.forEach(({ name, content }) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.name = name
          document.head.appendChild(meta)
        }
        meta.content = content
      })
    }
    
    // 키보드 대응 설정
    const setupKeyboardHandling = () => {
      // iOS Safari 키보드 이슈 해결
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const handleResize = () => {
          // 키보드가 올라올 때 뷰포트 높이 조정
          const vh = window.innerHeight * 0.01
          document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        
        window.addEventListener('resize', handleResize)
        handleResize() // 초기 설정
        
        // 입력 필드 포커스 시 스크롤 방지
        const preventKeyboardScroll = (e: FocusEvent) => {
          const target = e.target as HTMLElement
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            setTimeout(() => {
              window.scrollTo(0, 0)
            }, 100)
          }
        }
        
        document.addEventListener('focusin', preventKeyboardScroll)
        
        return () => {
          window.removeEventListener('resize', handleResize)
          document.removeEventListener('focusin', preventKeyboardScroll)
        }
      }
    }
    
    // 성능 최적화 설정
    const setupPerformanceOptimizations = () => {
      // GPU 가속 활성화
      document.body.style.transform = 'translateZ(0)'
      document.body.style.webkitTransform = 'translateZ(0)'
      document.body.style.willChange = 'transform'
      
      // 스크롤 성능 개선
      document.body.style.webkitOverflowScrolling = 'touch'
      
      // 터치 지연 제거
      document.body.style.touchAction = 'manipulation'
    }
    
    // 브라우저 UI 숨김 (PWA 모드)
    const hideBrowserUI = () => {
      // 전체화면 요청 함수
      const requestFullscreen = () => {
        if ('standalone' in window.navigator && !window.navigator.standalone) {
          // PWA로 설치되지 않은 경우에만 전체화면 시도
          const elem = document.documentElement
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {
              // 전체화면 실패 시 무시
            })
          }
        }
      }
      
      // 사용자 상호작용 후 전체화면 시도
      let hasInteracted = false
      const handleFirstInteraction = () => {
        if (!hasInteracted) {
          hasInteracted = true
          setTimeout(requestFullscreen, 100)
          document.removeEventListener('touchstart', handleFirstInteraction)
          document.removeEventListener('click', handleFirstInteraction)
        }
      }
      
      document.addEventListener('touchstart', handleFirstInteraction)
      document.addEventListener('click', handleFirstInteraction)
    }
    
    // 모든 설정 실행
    initializeMobileOptimizations()
    setupViewport()
    setupPWAMeta()
    const keyboardCleanup = setupKeyboardHandling()
    setupPerformanceOptimizations()
    hideBrowserUI()
    
    // 페이지 로드 후 추가 최적화
    const handleLoad = () => {
      // 주소창 숨김 시도 (iOS Safari)
      setTimeout(() => {
        window.scrollTo(0, 1)
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 10)
      }, 100)
    }
    
    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
    }
    
    // Cleanup 함수
    return () => {
      if (keyboardCleanup) keyboardCleanup()
      window.removeEventListener('load', handleLoad)
    }
  }, [])
  
  // 브라우저 히스토리 뒤로가기 방지 (필요시)
  useEffect(() => {
    const preventBackNavigation = (e: PopStateEvent) => {
      // 특정 조건에서 뒤로가기 방지
      if (window.location.pathname.includes('/game/')) {
        e.preventDefault()
        window.history.pushState(null, '', window.location.pathname)
      }
    }
    
    // 히스토리 상태 설정
    window.history.pushState(null, '', window.location.pathname)
    window.addEventListener('popstate', preventBackNavigation)
    
    return () => {
      window.removeEventListener('popstate', preventBackNavigation)
    }
  }, [])
  
  return (
    <Router>
      <div 
        className="h-screen-mobile w-screen bg-gray-100 overflow-hidden no-select"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          height: '100dvh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <AnimatedRoutes />
      </div>
    </Router>
  )
}

export default App
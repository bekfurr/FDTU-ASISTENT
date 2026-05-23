'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useLiveAPI } from '@/hooks/useLiveAPI'
import { animate } from 'animejs'

// Mic and Stop icons
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
)

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
  </svg>
)

const Equalizer = ({ volume, isActive }) => {
  const barsRef = useRef(null)

  useEffect(() => {
    if (!barsRef.current) return
    const bars = barsRef.current.children

    if (isActive) {
      const v = Math.min(volume * 10, 1)
      animate(bars, {
        height: function() {
          return 10 + Math.random() * 20 + (v * 40) + 'px';
        },
        duration: 100,
        ease: 'linear',
      })
    } else {
      animate(bars, {
        height: '4px',
        duration: 300,
        ease: 'outQuad'
      })
    }
  }, [volume, isActive])

  return (
    <div ref={barsRef} style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '60px', marginTop: '10px' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="eq-bar" style={{ width: '6px', height: '4px', background: '#059669', borderRadius: '3px', transition: 'background 0.3s' }} />
      ))}
    </div>
  )
}

export default function Home() {
  // Navigation & Panel states
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelScreen, setPanelScreen] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Expanded faculty states (accordion)
  const [expandedFaculty, setExpandedFaculty] = useState(null)

  // Auth form states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerError, setRegisterError] = useState(null)
  const [registerLoading, setRegisterLoading] = useState(false)

  // Chat interface states
  const [messages, setMessages] = useState([])
  const [activeLinks, setActiveLinks] = useState([])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  // Live Assistant hook
  const {
    connected,
    isRecording,
    volume,
    connect,
    disconnect,
    setOnTextReceived,
    setOnToolCall,
    setOnTurnComplete,
    sendTextMessage
  } = useLiveAPI()

  // Track user session
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session) {
        setPanelScreen('chat')
      }
      setLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session) {
        setPanelScreen('chat')
      } else {
        setPanelScreen('login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Hook listeners for assistant responses
  useEffect(() => {
    setOnTextReceived((text) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'agent' && !lastMsg.isComplete) {
            const newPrev = [...prev]
            newPrev[newPrev.length - 1].text += text
            return newPrev
        } else {
            return [...prev, { role: 'agent', text, isComplete: false }]
        }
      })
    })

    setOnToolCall((links) => {
      setActiveLinks(links)
    })

    setOnTurnComplete(() => {
      setMessages(prev => {
        if (prev.length === 0) return prev;
        const newPrev = [...prev]
        const lastMsg = newPrev[newPrev.length - 1]
        if (lastMsg.role === 'agent') {
            lastMsg.isComplete = true
        }
        return newPrev
      })
    })
  }, [setOnTextReceived, setOnToolCall, setOnTurnComplete])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto disconnect on panel close
  useEffect(() => {
    if (!isPanelOpen && connected) {
      disconnect()
    }
  }, [isPanelOpen, connected, disconnect])

  // Handle actions
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    if (supabase.supabaseUrl === 'https://placeholder.supabase.co') {
      alert("Supabase ulanmagan. Sinov (test) rejimida kiringiz.")
      const fakeUser = { email: loginEmail || 'test@fstu.uz', id: 'fake-id' }
      setUser(fakeUser)
      setPanelScreen('chat')
      setLoginLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    })

    if (error) {
      setLoginError(error.message)
    } else {
      setUser(data.user)
      setPanelScreen('chat')
    }
    setLoginLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegisterLoading(true)
    setRegisterError(null)

    if (supabase.supabaseUrl === 'https://placeholder.supabase.co') {
      alert("Supabase ulanmagan. Sinov rejimida kiringiz.")
      const fakeUser = { email: registerEmail || 'test@fstu.uz', id: 'fake-id' }
      setUser(fakeUser)
      setPanelScreen('chat')
      setRegisterLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword
    })

    if (error) {
      setRegisterError(error.message)
    } else {
      alert("Ro'yxatdan o'tdingiz! Iltimos, tizimga kirish sahifasidan foydalaning.")
      setPanelScreen('login')
    }
    setRegisterLoading(false)
  }

  const handleLogout = async () => {
    if (connected) {
      disconnect()
    }
    setUser(null)
    setMessages([])
    setActiveLinks([])
    if (supabase.supabaseUrl !== 'https://placeholder.supabase.co') {
      await supabase.auth.signOut()
    }
    setPanelScreen('login')
  }

  const toggleRecording = () => {
    if (connected) {
      disconnect()
    } else {
      setActiveLinks([])
      connect()
    }
  }

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const text = inputText
    setInputText('')
    setMessages(prev => [...prev, { role: 'user', text, isComplete: true }])
    setActiveLinks([])

    if (connected) {
      sendTextMessage(text)
    } else {
      setMessages(prev => [...prev, { role: 'agent', text: "Jonli ulanish faol emas. Savol berish uchun avval mikrofondan ulaning.", isComplete: true }])
    }
  }

  // FDTU Static Data
  const ratings = [
    {
      name: "O'zbekiston milliy reytingi",
      logo: "https://fstu.uz/images/ilm-fan/Emblem_of_Uzbekistan.svg.png",
      value: "TOP 5"
    },
    {
      name: "THE Impact Rankings",
      logo: "https://fstu.uz/images/ilm-fan/impackt%20renking.png",
      value: "TOP 1001+"
    },
    {
      name: "THE World University Rankings 2023",
      logo: "https://fstu.uz/images/ilm-fan/the%20world%20universty%20reanking.png",
      value: "Reporter"
    },
    {
      name: "Texnika sohasi bo'yicha milliy reyting",
      logo: "https://fstu.uz/images/ilm-fan/Emblem_of_Uzbekistan.svg.png",
      value: "TOP 3"
    },
    {
      name: "QS Asian University Rankings 2024",
      logo: "https://fstu.uz/images/ilm-fan/asia%20qs%20ranking.png",
      value: "TOP 801+"
    },
    {
      name: "QS Ranking Central Asia",
      logo: "https://fstu.uz/images/ilm-fan/QS%20centreal%20asian%20ranking%202024.png",
      value: "TOP 50"
    }
  ]

  const faculties = [
    {
      name: "Mexanika-mashinasozlik fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/kafedralar/fakultet_logo/MMF.gif",
      description: "Zamonaviy mashinasozlik, transport vositalari muhandisligi va mexanika sohasida yuqori malakali muhandislarni tayyorlovchi yetakchi fakultet.",
      departments: [
        "Mashinasozlik texnologiyasi kafedrasi",
        "Tadbiqiy mexanika kafedrasi",
        "Texnologik mashinalar va jihozlar kafedrasi",
        "Transport vositalari muhandisligi kafedrasi"
      ]
    },
    {
      name: "Energetika muhandisligi fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/kafedralar/fakultet_logo/EE%20Fakultet%20png%2022.png",
      description: "Muqobil energiya manbalari, elektrotexnika, elektronika va energetika tizimlarini loyihalash sohasidagi innovatsion ta'lim yo'nalishi.",
      departments: [
        "Elektr muhandisligi kafedrasi",
        "Energetika muhandisligi kafedrasi",
        "Elektronika va asbobsozlik kafedrasi",
        "Fizika kafedrasi"
      ]
    },
    {
      name: "Kimyo texnologiya fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/elonlar/kimyo_logo.jpg",
      description: "Neft-gazni qayta ishlash, oziq-ovqat xavfsizligi va kimyoviy jarayonlar texnologiyasi bo'yicha sanoat uchun yetuk kadrlar tayyorlash markazi.",
      departments: [
        "Kimyo muhandisligi kafedrasi",
        "Oziq-ovqat texnologiyasi va xavfsizligi kafedrasi",
        "Neft va neft-gazni qayta ishlash kafedrasi",
        "Metrologiya va standartlashtirish kafedrasi"
      ]
    },
    {
      name: "Arxitektura va qurilish fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/kafedralar/fakultet_logo/Qurilish%20fakulteti%20logotip.png",
      description: "Arxitektura, shaharsozlik, qurilish materiallari ishlab chiqarish va geodeziya sohasidagi loyihachi va muhandislar maskani.",
      departments: [
        "Qurilish muhandisligi kafedrasi",
        "Muhandislik kommunikatsiyalari qurilishi va montaji kafedrasi",
        "Geodeziya, kartografiya va kadastr kafedrasi",
        "Arxitektura va kompyuter grafikasi kafedrasi",
        "Qurilish materiallari va buyumlari kafedrasi"
      ]
    },
    {
      name: "Ishlab chiqarishda boshqaruv fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/kafedralar/fakultet_logo/ichb.jpg",
      description: "Sanoat tarmoqlarida menejment, marketing, moliya-buxgalteriya va iqtisodiyot sohalarida samarali boshqaruvchilarni tarbiyalovchi fakultet.",
      departments: [
        "Iqtisodiyot kafedrasi",
        "Menejment va marketing kafedrasi",
        "Moliya va buxgalteriya hisobi kafedrasi",
        "Oliy matematika kafedrasi"
      ]
    },
    {
      name: "Yengil sanoat va to'qimachilik fakulteti",
      logo: "text-avatar",
      abbr: "YSTF",
      description: "To'qimachilik, tikuvchilik, yengil sanoat texnologiyalari va dizayn hamda tillarni o'rganish bo'yicha yuqori malakali mutaxassislar tayyorlash markazi.",
      departments: [
        "Yengil sanoat muhandisligi kafedrasi",
        "Yengil sanoat texnologiya va jihozlar kafedrasi",
        "O’zbek tili va tillarni o‘rgatish kafedrasi",
        "Ijtimoiy fanlar va sport kafedrasi"
      ]
    },
    {
      name: "Axborot texnologiyalari va telekommunikatsiya fakulteti",
      logo: "https://fstu.uz/admin/uploads/global/kafedralar/fakultet_logo/klt.png",
      description: "Sun'iy intellekt, kiberxavfsizlik, dasturiy injiniring va telekommunikatsiya muhandisligi yo'nalishlarida zamonaviy AKT mutaxassislarini tayyorlovchi fakultet.",
      departments: [
        "Kompyuter muhandisligi va sun’iy intellekt kafedrasi",
        "Axborot tizimlari va texnologiyalari kafedrasi",
        "Dasturiy injiniring va kiberxavfsizlik kafedrasi",
        "Telekommunikatsiya muhandisligi kafedrasi"
      ]
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* Header */}
      <header className="fdtu-header">
        <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="https://ungoals.fstu.uz/frontend/assets/images/logo.png" alt="FDTU Logo" className="logo-img" />
          <span className="univ-title" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>FDTU</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Farg'ona davlat texnika universiteti</span>
          </span>
        </div>
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)} 
          className="glass-button glow-button"
          style={{ padding: '10px 18px', fontSize: '0.95rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
          {isPanelOpen ? "Asistentni yopish" : "AI Asistenti"}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, maxWidth: '1400px', padding: '2rem 1.5rem' }}>
        <div className={`fdtu-layout ${isPanelOpen ? 'panel-open' : ''}`}>
          
          {/* Left Column: FDTU Website */}
          <div className="fdtu-main-content">
            
            {/* Hero Section */}
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '50%', filter: 'blur(50px)' }} />
              <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(50px)' }} />
              
              <h1 className="main-title" style={{ fontSize: '2.8rem', lineHeight: '1.2', maxWidth: '800px', marginBottom: '1rem' }}>
                Farg'ona Davlat Texnika Universiteti
              </h1>
              <p className="subtitle" style={{ fontSize: '1.15rem', maxWidth: '700px', marginBottom: '2rem' }}>
                Mamlakatimiz sanoati va texnologik taraqqiyoti uchun yuqori malakali muhandis-texnik kadrlar, dasturchilar va olimlarni tayyorlovchi yetakchi oliy ta'lim muassasasi.
              </p>
              
              <div className="stats-grid" style={{ width: '100%', maxWidth: '900px' }}>
                <div className="glass-panel stat-card">
                  <div className="stat-number">15,000+</div>
                  <div className="stat-label">Faol talabalar</div>
                </div>
                <div className="glass-panel stat-card">
                  <div className="stat-number">7 ta</div>
                  <div className="stat-label">Fakultetlar</div>
                </div>
                <div className="glass-panel stat-card">
                  <div className="stat-number">32 ta</div>
                  <div className="stat-label">Kafedralar</div>
                </div>
                <div className="glass-panel stat-card">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">Ilmiy laboratoriyalar</div>
                </div>
              </div>
            </div>

            {/* Reyting Ko'rsatkichlari */}
            <div>
              <h2 className="main-title" style={{ fontSize: '2rem', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '4px', height: '32px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                Reyting Ko'rsatkichlari
              </h2>
              <div className="ratings-grid">
                {ratings.map((rating, idx) => (
                  <div key={idx} className="glass-panel rating-card">
                    <img src={rating.logo} alt={rating.name} className="rating-logo" onError={(e) => { e.target.src = 'https://ungoals.fstu.uz/frontend/assets/images/logo.png' }} />
                    <div className="rating-info">
                      <div className="rating-name">{rating.name}</div>
                      <div className="rating-value">{rating.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fakultetlar va Kafedralar */}
            <div>
              <h2 className="main-title" style={{ fontSize: '2rem', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '4px', height: '32px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                Fakultetlar va Kafedralar
              </h2>
              <div className="faculty-list">
                {faculties.map((fac, idx) => {
                  const isExpanded = expandedFaculty === idx
                  return (
                    <div key={idx} className="glass-panel faculty-card" style={{ borderColor: isExpanded ? 'rgba(5, 150, 105, 0.3)' : 'var(--glass-border)' }}>
                      <div className="faculty-header" onClick={() => setExpandedFaculty(isExpanded ? null : idx)}>
                        <div className="faculty-meta">
                          {fac.logo === 'text-avatar' ? (
                            <div className="faculty-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              {fac.abbr}
                            </div>
                          ) : (
                            <img src={fac.logo} alt={fac.name} className="faculty-logo" onError={(e) => { e.target.src = 'https://ungoals.fstu.uz/frontend/assets/images/logo.png' }} />
                          )}
                          <div>
                            <div className="faculty-name">{fac.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fac.departments.length} ta kafedra mavjud</div>
                          </div>
                        </div>
                        <svg className={`chevron-icon ${isExpanded ? 'expanded' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      
                      {isExpanded && (
                        <div>
                          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '1.2rem', lineHeight: '1.6' }}>
                            {fac.description}
                          </p>
                          <div className="departments-grid">
                            {fac.departments.map((dep, dIdx) => (
                              <div key={dIdx} className="dep-card">
                                <div className="dep-bullet"></div>
                                <span>{dep}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Why FDTU section */}
            <div className="glass-panel" style={{ padding: '3rem 2.5rem' }}>
              <h2 className="main-title" style={{ fontSize: '1.8rem', textAlign: 'left', marginBottom: '1rem' }}>
                Nega Aynan FDTU?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                Farg'ona davlat texnika universiteti talabalarga jahon andozalariga mos ta'lim berish, innovatsion g'oyalarni qo'llab-quvvatlash va ilmiy izlanishlar uchun barcha sharoitlarni yaratib beradi.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Sifatli Ta'lim</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Xalqaro standartlarga javob beradigan zamonaviy o'quv dasturlari va yuqori ilmiy salohiyatga ega professorlar jamoasi.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Ilm-fan va Innovatsiyalar</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Talabalar va yosh tadqiqotchilar o'z loyihalarini startapga aylantirishlari uchun maxsus texnopark va kovorking markazi.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Keng Imkoniyatlar</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Xorijiy nufuzli universitetlar bilan hamkorlik dasturlari hamda yirik sanoat korxonalarida amaliyot o'tash imkoniyati.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2rem' }}>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Farg'ona Davlat Texnika Universiteti</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Farg'ona shahri, Farg'ona ko'chasi, 86-uy</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Tel: +998 (73) 226-05-97 | Email: info@fstu.uz</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <a href="https://telegram.org" target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Telegram</a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>YouTube</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Instagram</a>
              </div>
            </footer>

          </div>

          {/* Right Column: AI Assistant Panel */}
          <div className={`fdtu-panel-container ${isPanelOpen ? 'open' : ''}`}>
            <div className="glass-panel" style={{ padding: '1.8rem', height: 'calc(100vh - 120px)', position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Panel Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#059669' : '#ef4444', animation: connected ? 'pulse-glow 1.5s infinite' : 'none' }}></div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>AI Yordamchi</h3>
                </div>
                <button 
                  onClick={() => setIsPanelOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  title="Panelni yopish"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Conditional Screen Rendering */}
              {loading ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Yuklanmoqda...
                </div>
              ) : panelScreen === 'login' ? (
                /* LOGIN SCREEN */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Outfit' }}>Asistentga kirish</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>AI ovozli yordamchidan foydalanish uchun tizimga kiring.</p>
                  
                  {loginError && (
                    <div style={{ color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                      type="email" 
                      placeholder="Email manzilingiz" 
                      className="glass-input" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    <input 
                      type="password" 
                      placeholder="Parol" 
                      className="glass-input" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loginLoading}>
                      {loginLoading ? "Kirilmoqda..." : "Tizimga kirish"}
                    </button>
                  </form>

                  <button 
                    onClick={() => {
                      setLoginEmail('test@fstu.uz')
                      setLoginPassword('test1234')
                      const fakeUser = { email: 'test@fstu.uz', id: 'fake-id' }
                      setUser(fakeUser)
                      setPanelScreen('chat')
                    }}
                    className="glass-button"
                    style={{ width: '100%', marginTop: '0.8rem', background: 'rgba(255,255,255,0.2)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                  >
                    Sinov rejimida kirish
                  </button>

                  <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Akkauntingiz yo'qmi?{' '}
                    <button 
                      onClick={() => setPanelScreen('register')} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      Ro'yxatdan o'ting
                    </button>
                  </p>
                </div>
              ) : panelScreen === 'register' ? (
                /* REGISTER SCREEN */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Outfit' }}>Ro'yxatdan o'tish</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>FDTU AI yordamchisidan foydalanish uchun ro'yxatdan o'ting.</p>

                  {registerError && (
                    <div style={{ color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                      {registerError}
                    </div>
                  )}

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                      type="email" 
                      placeholder="Email manzilingiz" 
                      className="glass-input" 
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                    <input 
                      type="password" 
                      placeholder="Parol (kamida 6 ta belgi)" 
                      className="glass-input" 
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                    <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '0.5rem' }} disabled={registerLoading}>
                      {registerLoading ? "Ro'yxatdan o'tilmoqda..." : "Ro'yxatdan o'tish"}
                    </button>
                  </form>

                  <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Akkauntingiz bormi?{' '}
                    <button 
                      onClick={() => setPanelScreen('login')} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      Tizimga kiring
                    </button>
                  </p>
                </div>
              ) : (
                /* ACTIVE CHAT SCREEN */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  
                  {/* Active session info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5, 150, 105, 0.05)', padding: '8px 12px', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {user?.email}
                    </span>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '4px' }}>
                      Chiqish
                    </button>
                  </div>

                  {/* Active popup links inside sidebar */}
                  {activeLinks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                      {activeLinks.map((link, index) => (
                        <div key={index} className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--primary-color)', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{link.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px', marginBottom: '6px' }}>{link.description}</div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="glass-button" style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%' }}>
                            Havolani ochish
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Messages list */}
                  <div className="chat-container" style={{ flex: 1, minHeight: '150px', maxHeight: 'none', height: 'auto', padding: '0.5rem 0' }}>
                    {messages.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 'auto 0', padding: '1rem' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Asistent faol</h4>
                        <p style={{ fontSize: '0.85rem' }}>Universitet haqida savol berish uchun quyidagi mikrofon tugmasini bosing va gapiring.</p>
                      </div>
                    )}
                    
                    {messages.map((msg, index) => (
                      <div key={index} className={`chat-message ${msg.role}`} style={{ fontSize: '0.9rem', padding: '10px 14px', maxWidth: '90%' }}>
                        {msg.text}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Audio Equalizer & Mic Controls */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <div className="mic-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <button 
                        className={`mic-button ${connected ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        style={{ width: '56px', height: '56px' }}
                      >
                        {connected ? <StopIcon /> : <MicIcon />}
                      </button>
                      
                      <Equalizer volume={volume} isActive={connected} />
                    </div>

                    {/* Text input fallback */}
                    <form onSubmit={handleTextSubmit} style={{ width: '100%', display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="glass-input" 
                        style={{ padding: '10px 12px', fontSize: '0.9rem' }}
                        placeholder={connected ? "Savolingizni yozing..." : "Avval Live rejimga ulaning..."} 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={!connected}
                      />
                      <button 
                        type="submit" 
                        className="glass-button" 
                        style={{ padding: '10px 14px', fontSize: '0.9rem' }} 
                        disabled={!connected || !inputText.trim()}
                      >
                        Jo'natish
                      </button>
                    </form>

                  </div>

                </div>
              )}

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

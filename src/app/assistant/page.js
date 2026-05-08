'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useLiveAPI } from '@/hooks/useLiveAPI'
import { animate } from 'animejs'

// Simple SVG Mic Icon
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
      // Base height + random jitter + volume multiplier
      const v = Math.min(volume * 10, 1) // Normalize volume
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

export default function Assistant() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [activeLinks, setActiveLinks] = useState([])
  const messagesEndRef = useRef(null)
  const [inputText, setInputText] = useState('')

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

  useEffect(() => {
    // Check Auth
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && supabase.supabaseUrl !== 'https://placeholder.supabase.co') {
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const toggleRecording = () => {
    if (connected) {
      disconnect()
    } else {
      setActiveLinks([]) // Clear previous links
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
        setMessages(prev => [...prev, { role: 'agent', text: "Jonli ulanish (mikrofon) yoqilmagan. Iltimos oldin mikrofonni yoqing.", isComplete: true }])
    }
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="main-title" style={{ fontSize: '1.8rem', margin: 0, textAlign: 'left' }}>
            FDTU Asistenti
          </h2>
          {connected && <span className="glass-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Jonli (Live)</span>}
        </div>
        <button onClick={() => { disconnect(); supabase.auth.signOut(); router.push('/') }} className="glass-button danger" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          Chiqish
        </button>
      </div>

      {/* Pop up Link Cards */}
      {activeLinks.map((link, index) => (
        <div key={index} className="popup-link-card glass-panel" style={{ top: `${20 + index * 120}px` }}>
          <h3>{link.title}</h3>
          <p>{link.description}</p>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="glass-button" style={{ width: '100%', padding: '8px', fontSize: '0.9rem' }}>
            Sahifani ochish
          </a>
        </div>
      ))}

      {/* Main Chat Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', overflow: 'hidden' }}>
        
        <div className="chat-container">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'auto', marginBottom: 'auto' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>FDTU Jonli Asistentiga xush kelibsiz!</h3>
              <p>Muloqotni boshlash uchun quyidagi mikrofon tugmasini bosing va gapiring.</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div className="mic-wrapper" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              className={`mic-button ${connected ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              {connected ? <StopIcon /> : <MicIcon />}
            </button>
            
            {/* Equalizer inside wrapper below button */}
            <Equalizer volume={volume} isActive={connected} />
          </div>

          <form onSubmit={handleTextSubmit} style={{ width: '100%', display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder={connected ? "Yoki xabar yozing..." : "Oldin mikrofon tugmasini bosib Live tizimga ulaning..."} 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!connected}
            />
            <button type="submit" className="glass-button" disabled={!connected || !inputText.trim()}>
              Jo'natish
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

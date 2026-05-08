'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (supabase.supabaseUrl === 'https://placeholder.supabase.co') {
      alert("Supabase ulanmagan. Sinov rejimida kiringiz.")
      router.push('/assistant')
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setError(error.message)
    } else {
      alert("Ro'yxatdan o'tdingiz! Iltimos emailni tasdiqlang yoki tizimga kiring.")
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <h2 className="main-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Ro'yxatdan o'tish</h2>
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            className="glass-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Parol (kamida 6 ta belgi)"
            className="glass-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? "Kutilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Akkauntingiz bormi? <Link href="/login" style={{ color: 'var(--primary-color)' }}>Tizimga kirish</Link>
        </p>
      </div>
    </div>
  )
}

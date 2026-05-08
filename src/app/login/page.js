'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Simulate auth if supabase URL is not provided
    if (supabase.supabaseUrl === 'https://placeholder.supabase.co') {
      alert("Supabase ulanmagan. Sinov rejimida kiringiz.")
      router.push('/assistant')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
    } else {
      router.push('/assistant')
    }
    setLoading(false)
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <h2 className="main-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Kirish</h2>
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            placeholder="Parol"
            className="glass-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? "Kutilmoqda..." : "Tizimga kirish"}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Akkauntingiz yo'qmi? <Link href="/register" style={{ color: 'var(--primary-color)' }}>Ro'yxatdan o'tish</Link>
        </p>
      </div>
    </div>
  )
}

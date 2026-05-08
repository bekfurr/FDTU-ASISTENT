'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('')
  const router = useRouter()

  useEffect(() => {
    // In a real scenario, we'd verify the user has 'admin' role.
    // For now, we just make sure they are logged in.
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && supabase.supabaseUrl !== 'https://placeholder.supabase.co') {
        router.push('/login')
      }
    }
    checkAdmin()
  }, [router])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setStatus('Saqlanmoqda...')
    
    // In a real app, this would save to a secure Supabase table
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKey })
      })
      if (res.ok) {
        setStatus('Muvaffaqiyatli saqlandi!')
      } else {
        setStatus('Xatolik yuz berdi.')
      }
    } catch (err) {
      setStatus('Xatolik yuz berdi.')
    }
    
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="container">
      <h2 className="main-title" style={{ fontSize: '2.5rem', textAlign: 'left' }}>Admin Panel</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Tizim sozlamalari va foydalanuvchilarni boshqarish.</p>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Gemini API Sozlamalari</h3>
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Gemini API Kaliti</label>
            <input 
              type="password" 
              className="glass-input" 
              placeholder="AIzaSy..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="glass-button" style={{ alignSelf: 'flex-start' }}>Saqlash</button>
          {status && <span style={{ color: 'var(--primary-color)' }}>{status}</span>}
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Foydalanuvchilar Seansini Boshqarish</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Ma'lumotlar bazasidan (Supabase) to'g'ridan to'g'ri foydalanuvchilar limitlarini boshqarishingiz tavsiya etiladi.
          Bu yerdagi interfeys faqat namoyish uchun.
        </p>
        {/* Placeholder table for user list */}
        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Foydalanuvchi</th>
              <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Seans Limiti (daqiqa)</th>
              <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Harakat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px 8px' }}>student1@fdtu.uz</td>
              <td style={{ padding: '12px 8px' }}>60</td>
              <td style={{ padding: '12px 8px' }}>
                <button className="glass-button" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Tahrirlash</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

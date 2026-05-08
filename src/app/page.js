'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/assistant')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return null

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', width: '100%', animation: 'slideUp 0.8s ease' }}>
        <h1 className="main-title">Farg'ona Davlat Texnika Universiteti</h1>
        <p className="subtitle" style={{ margin: '0 auto 2rem auto', color: 'var(--text-secondary)' }}>
          Universitet bo'yicha aqlli ovozli yordamchi tizimiga xush kelibsiz. Davom etish uchun tizimga kiring.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Link href="/login" className="glass-button">
            Tizimga kirish
          </Link>
          <Link href="/register" className="glass-button" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
            Ro'yxatdan o'tish
          </Link>
        </div>
      </div>
    </div>
  )
}

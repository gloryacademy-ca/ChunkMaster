import { useState } from 'react'
import { loginUser } from '../db'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!name.trim() || pin.length < 4) {
      setError('이름과 4자리 PIN을 입력하세요')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await loginUser(name.trim(), pin)
      if (user) {
        onLogin(user)
      } else {
        setError('이름 또는 PIN이 틀렸습니다')
      }
    } catch (e) {
      setError('연결 오류가 발생했습니다. 다시 시도하세요.')
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-3xl mb-4 shadow-2xl">
            <span className="text-4xl">📚</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ChunkMaster</h1>
          <p className="text-indigo-200 text-sm mt-1">Glory Academy English Learning</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
          <div className="space-y-4">
            <div>
              <label className="text-white/80 text-sm font-semibold mb-2 block">이름 (Name)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: Yuchan"
                className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-2xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15"
              />
            </div>
            <div>
              <label className="text-white/80 text-sm font-semibold mb-2 block">PIN (4자리)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                placeholder="••••"
                className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-2xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 tracking-[0.5em]"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-white text-indigo-700 font-black text-lg rounded-2xl py-4 shadow-lg hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인 →'}
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Glory Academy · Coquitlam, BC
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import Login from './components/Login'
import StudentApp from './components/StudentApp'
import TeacherApp from './components/TeacherApp'

const SESSION_KEY = 'cm_user'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  function handleLogin(u) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setUser(u)
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-5xl mb-4">📚</div>
          <div className="font-black text-xl">ChunkMaster</div>
        </div>
      </div>
    )
  }

  if (!user) return <Login onLogin={handleLogin} />
  if (user.role === 'teacher') return <TeacherApp user={user} onLogout={handleLogout} />
  return <StudentApp user={user} onLogout={handleLogout} />
}

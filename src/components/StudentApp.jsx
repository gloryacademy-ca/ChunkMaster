import { useState, useEffect } from 'react'
import { LESSONS_MAP } from '../data/lessons'
import { saveProgress, subscribeProgress } from '../db'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, TOTAL_MAX } from './stages/Stages'

const STAGE_ICONS = ['', '📖', '🔊', '📝', '🧩', '✏️', '📄']

export default function StudentApp({ user, onLogout }) {
  const [screen, setScreen] = useState('home')     // home | lesson | complete
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [stage, setStage] = useState(1)
  const [stageScores, setStageScores] = useState({})
  const [progress, setProgress] = useState([])
  const [passage, setPassage] = useState('')
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('lessons')

  useEffect(() => {
    const unsub = subscribeProgress(user.id, setProgress)
    return () => unsub()
  }, [user.id])

  const assignedLessonIds = user.assignedLessons || []
  const assignedLessons = assignedLessonIds.map(id => LESSONS_MAP[id]).filter(Boolean)

  function getProgressForLesson(lessonId) {
    return progress.find(p => p.lessonId === lessonId)
  }

  async function startLesson(lesson) {
    setLoading(true)
    setSelectedLesson(lesson)
    setStage(1)
    setStageScores({})
    setPassage('')
    setSentences([])
    setScreen('lesson')

    try {
      // Firebase에서 선생님이 저장한 레슨 데이터 불러오기
      const ref = doc(db, 'lessons', `lesson_${lesson.id}`)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setPassage(data.passage || '')
        setSentences(data.sentences || [])
      } else {
        // passages.js fallback
        try {
          const { PASSAGES } = await import('../data/passages')
          const p = PASSAGES[lesson.id]
          if (p) {
            setPassage(p.passage || '')
            setSentences(p.sentences || [])
          }
        } catch (e) {
          setPassage('')
          setSentences([])
        }
      }
    } catch (e) {
      console.error('레슨 불러오기 오류:', e)
    }
    setLoading(false)
  }

  // Stage가 onComplete(pts) 로 호출하면 → 다음 스테이지로
  function handleStageComplete(pts) {
    const newScores = { ...stageScores, [stage]: pts || 0 }
    setStageScores(newScores)
    if (stage < 6) {
      setStage(s => s + 1)
    } else {
      finishLesson(newScores)
    }
  }

  async function finishLesson(scores) {
    const total = Object.values(scores).reduce((a, b) => a + b, 0)
    await saveProgress(user.id, selectedLesson.id, {
      stageScores: scores,
      totalScore: total,
      lessonTopic: selectedLesson.topic,
      userName: user.name
    })
    setScreen('complete')
  }

  // ─── HOME ───────────────────────────────────────────────
  if (screen === 'home') {
    const weeklyTotal = progress.reduce((a, p) => a + (p.totalScore || 0), 0)

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-indigo-700 text-white px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="font-black text-lg">📚 ChunkMaster</div>
            <button onClick={onLogout} className="text-indigo-300 text-xs px-3 py-1.5 bg-indigo-900 rounded-xl">
              로그아웃
            </button>
          </div>
          <div className="text-indigo-200 text-sm">안녕하세요, {user.name}! 👋</div>
          <div className="mt-2 bg-indigo-600 rounded-2xl px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-indigo-200">내 총 점수</div>
            <div className="font-black text-xl">{weeklyTotal}pt</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {[['lessons', '📖 레슨'], ['ranking', '🏆 랭킹']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-black transition-all ${tab === id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'lessons' && (
            <div className="space-y-3">
              {assignedLessons.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="font-bold">아직 배정된 레슨이 없어요</div>
                  <div className="text-sm mt-1">선생님께 문의해주세요</div>
                </div>
              ) : assignedLessons.map(lesson => {
                const prog = getProgressForLesson(lesson.id)
                const done = !!prog
                return (
                  <button key={lesson.id} onClick={() => startLesson(lesson)}
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all active:scale-95 ${done ? 'border-green-200' : 'border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-black text-gray-800">L{lesson.id}: {lesson.topic}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Week {lesson.week} · Day {lesson.day}</div>
                      </div>
                      <div className="text-right">
                        {done ? (
                          <div>
                            <div className="font-black text-green-600">{prog.totalScore}pt</div>
                            <div className="text-xs text-green-400">완료 ✓</div>
                          </div>
                        ) : (
                          <div className="text-indigo-500 font-black text-sm">시작 →</div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {tab === 'ranking' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b font-black text-gray-700">🏆 랭킹</div>
              <div className="p-4 text-center text-gray-400 text-sm">
                랭킹은 선생님 화면에서 확인하세요
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── LESSON ─────────────────────────────────────────────
  if (screen === 'lesson' && selectedLesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-indigo-700 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="text-indigo-200 font-bold text-sm">← 나가기</button>
          <div className="flex-1 text-center">
            <div className="font-black text-sm">L{selectedLesson.id}: {selectedLesson.topic}</div>
            <div className="text-indigo-200 text-xs">Week {selectedLesson.week} · Day {selectedLesson.day}</div>
          </div>
          <div className="text-indigo-200 text-xs font-bold">{stage}/6</div>
        </div>

        {/* Stage progress bar */}
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <div className="flex gap-1.5 mb-1">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
                s < stage ? 'bg-indigo-600' : s === stage ? 'bg-indigo-400' : 'bg-gray-200'
              }`} />
            ))}
          </div>
          <div className="flex justify-between">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`text-xs ${s === stage ? 'text-indigo-600 font-bold' : 'text-gray-300'}`}>
                {STAGE_ICONS[s]}
              </div>
            ))}
          </div>
        </div>

        {/* Stage content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-semibold">레슨을 불러오는 중...</p>
            </div>
          ) : (
            <>
              {stage === 1 && <Stage1 lesson={selectedLesson} onComplete={handleStageComplete} />}
              {stage === 2 && <Stage2 lesson={selectedLesson} passage={passage} sentences={sentences} onComplete={handleStageComplete} />}
              {stage === 3 && <Stage3 lesson={selectedLesson} sentences={sentences} onComplete={handleStageComplete} />}
              {stage === 4 && <Stage4 sentences={sentences} onComplete={handleStageComplete} />}
              {stage === 5 && <Stage5 sentences={sentences} onComplete={handleStageComplete} />}
              {stage === 6 && <Stage6 passage={passage} onComplete={handleStageComplete} />}
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── COMPLETE ───────────────────────────────────────────
  if (screen === 'complete') {
    const total = Object.values(stageScores).reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-1">레슨 완주!</h2>
          <p className="text-gray-400 text-sm mb-5">L{selectedLesson?.id}: {selectedLesson?.topic}</p>
          <div className="bg-indigo-50 rounded-2xl p-5 mb-5">
            <div className="text-5xl font-black text-indigo-700">{total}</div>
            <div className="text-gray-400 text-sm">/ {TOTAL_MAX}점 만점</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
            {Object.entries(stageScores).map(([s, pts]) => (
              <div key={s} className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="text-gray-400">{STAGE_ICONS[s]} S{s}</div>
                <div className="font-black text-indigo-700">{pts}pt</div>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen('home')}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl active:scale-95">
            홈으로 →
          </button>
        </div>
      </div>
    )
  }

  return null
}

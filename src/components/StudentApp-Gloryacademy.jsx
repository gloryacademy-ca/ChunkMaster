import { useState, useEffect } from 'react'
import { LESSONS_MAP } from '../data/lessons'
import { PASSAGES } from '../data/passages'
import { saveProgress, subscribeProgress } from '../db'
import { Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, TOTAL_MAX } from './stages/Stages'

const STAGE_LABELS = ['', '단어 학습', '지문 듣기', '문장 학습', '청크 암기', '영어로 쓰기', '전체 쓰기']
const STAGE_ICONS = ['', '📖', '🔊', '📝', '🧩', '✏️', '📄']

export default function StudentApp({ user, onLogout }) {
  const [screen, setScreen] = useState('home') // home | lesson | complete
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [stage, setStage] = useState(1)
  const [stageScores, setStageScores] = useState({})
  const [progress, setProgress] = useState([])
  const [passage, setPassage] = useState(null)
  const [sentences, setSentences] = useState([])
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState('lessons') // lessons | ranking

  // Listen to real-time progress
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
    setSelectedLesson(lesson)
    setStage(1)
    setStageScores({})
    setPassage(null)
    setSentences([])
    setGenerating(true)
    setScreen('lesson')
    await generatePassage(lesson)
    setGenerating(false)
  }

  async function generatePassage(lesson) {
    const data = PASSAGES[lesson.id]
    if (data) {
      setPassage(data.passage)
      setSentences(data.sentences)
    } else {
      // Fallback for lessons not yet written
      const fallback = `Today we are learning about ${lesson.topic}. This is an important topic for our English studies. Let us explore the key vocabulary words together. We will practice reading and writing with these words. Learning English takes time and effort every day. I enjoy studying new words and their meanings. Practice makes perfect, so let us keep going. Every lesson brings us closer to our goal. I am proud of my progress in English. Let us finish this lesson with confidence.`
      const fallbackSentences = [
        { en: `Today we are learning about ${lesson.topic}.`, ko: `오늘 우리는 ${lesson.topic}에 대해 배우고 있다.` },
        { en: "This is an important topic for our English studies.", ko: "이것은 영어 공부에서 중요한 주제이다." },
        { en: "Let us explore the key vocabulary words together.", ko: "핵심 어휘 단어들을 함께 탐구해보자." },
        { en: "We will practice reading and writing with these words.", ko: "우리는 이 단어들로 읽기와 쓰기를 연습할 것이다." },
        { en: "Learning English takes time and effort every day.", ko: "영어 학습은 매일 시간과 노력이 필요하다." },
        { en: "I enjoy studying new words and their meanings.", ko: "나는 새로운 단어와 그 뜻을 공부하는 것을 즐긴다." },
        { en: "Practice makes perfect, so let us keep going.", ko: "연습이 완벽을 만드니, 계속 나아가자." },
        { en: "Every lesson brings us closer to our goal.", ko: "모든 레슨이 우리를 목표에 더 가깝게 한다." },
        { en: "I am proud of my progress in English.", ko: "나는 영어 실력이 향상된 것이 자랑스럽다." },
        { en: "Let us finish this lesson with confidence.", ko: "자신감을 가지고 이 레슨을 마치자." }
      ]
      setPassage(fallback)
      setSentences(fallbackSentences)
    }
  }

  function handleStageComplete(stageNum, pts, meta) {
    const newScores = { ...stageScores, [stageNum]: pts }
    setStageScores(newScores)
    if (stageNum < 6) {
      setStage(stageNum + 1)
    } else {
      finishLesson(newScores)
    }
  }

  async function finishLesson(scores) {
    const total = Object.values(scores).reduce((a, b) => a + b, 0)
    await saveProgress(user.id, selectedLesson.id, {
      stageScores: scores,
      totalScore: total,
      lessonTopic: selectedLesson.topic
    })
    setScreen('complete')
  }

  function getRank(userId, allProgress) {
    const totals = {}
    allProgress.forEach(p => {
      totals[p.userId] = (totals[p.userId] || 0) + (p.totalScore || 0)
    })
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    const idx = sorted.findIndex(([id]) => id === userId)
    return { rank: idx + 1, total: totals[userId] || 0, entries: sorted.length }
  }

  if (screen === 'lesson' && selectedLesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
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
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
                s < stage ? 'bg-indigo-600' : s === stage ? 'bg-indigo-400' : 'bg-gray-200'
              }`} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`text-xs ${s === stage ? 'text-indigo-600 font-bold' : 'text-gray-300'}`}>
                {STAGE_ICONS[s]}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {generating ? (
            <div className="flex-1 flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-semibold">지문을 생성하는 중...</p>
            </div>
          ) : (
            <>
              {stage === 1 && <Stage1 lesson={selectedLesson} onComplete={handleStageComplete} />}
              {stage === 2 && <Stage2 lesson={selectedLesson} passage={passage} onComplete={handleStageComplete} />}
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

  if (screen === 'complete') {
    const total = Object.values(stageScores).reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-1">레슨 완주!</h2>
          <p className="text-gray-400 text-sm mb-5">L{selectedLesson.id}: {selectedLesson.topic}</p>
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
          <button onClick={() => setScreen('home')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">
            레슨 목록으로 →
          </button>
        </div>
      </div>
    )
  }

  // HOME
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-indigo-200 text-xs">안녕하세요!</p>
            <h1 className="font-black text-xl">{user.name} 🙌</h1>
          </div>
          <button onClick={onLogout} className="text-indigo-300 text-xs px-3 py-1.5 bg-indigo-800 rounded-xl">로그아웃</button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {[{id:'lessons', label:'내 레슨'}, {id:'ranking', label:'랭킹'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-black rounded-t-2xl transition-all ${
                tab === t.id ? 'bg-gray-50 text-indigo-700' : 'text-indigo-200 hover:text-white'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'lessons' && (
          <div className="space-y-3">
            {assignedLessons.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-semibold">아직 배정된 레슨이 없어요</p>
                <p className="text-sm">선생님께 문의하세요</p>
              </div>
            ) : assignedLessons.map(lesson => {
              const prog = getProgressForLesson(lesson.id)
              const done = !!prog
              return (
                <button key={lesson.id} onClick={() => startLesson(lesson)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:scale-98 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${done ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {done ? '✓' : `L${lesson.id}`}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-gray-800">{lesson.topic}</div>
                      <div className="text-xs text-gray-400">Week {lesson.week} · Day {lesson.day} · 단어 {lesson.vocab.length}개</div>
                    </div>
                    {done && (
                      <div className="text-right">
                        <div className="font-black text-indigo-600 text-lg">{prog.totalScore}pt</div>
                        <div className="text-xs text-gray-400">{prog.attempts}회</div>
                      </div>
                    )}
                    {!done && <div className="text-gray-300 text-xl">›</div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'ranking' && <RankingTab userId={user.id} progress={progress} allStudentIds={user.classStudents || []} />}
      </div>
    </div>
  )
}

function RankingTab({ userId, progress }) {
  const myTotal = progress.reduce((a, p) => a + (p.totalScore || 0), 0)
  const myLessons = progress.length

  return (
    <div className="space-y-4">
      <div className="bg-indigo-600 rounded-2xl p-5 text-white text-center">
        <div className="text-4xl font-black">{myTotal}pt</div>
        <div className="text-indigo-200 text-sm">{myLessons}개 레슨 완료</div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">내 레슨 기록</p>
        {progress.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">아직 완료한 레슨이 없어요</p>
        ) : progress.map(p => (
          <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div>
              <div className="font-bold text-gray-800 text-sm">{p.lessonTopic || `Lesson ${p.lessonId}`}</div>
              <div className="text-xs text-gray-400">{p.attempts}번 시도</div>
            </div>
            <div className="font-black text-indigo-600">{p.totalScore}pt</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { LESSONS_MAP } from '../data/lessons'
import { getClasses, saveClass, getAllProgress, subscribeAllProgress, createUser } from '../db'
import { db } from '../firebase'
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore'

// ─── Chunk splitter (의미 단위) ────────────────────────────
function getChunks(sentence) {
  const commaParts = sentence.split(/,\s*/)
  const chunks = []
  for (const part of commaParts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const conjParts = trimmed.split(/\s+(?=\b(?:and|but|so|or)\b\s)/)
    for (const cp of conjParts) {
      const t = cp.trim()
      if (!t) continue
      const words = t.split(' ')
      if (words.length <= 6) {
        chunks.push(t)
      } else {
        const prepositions = /\s+(?=\b(?:in|on|at|to|for|with|from|by|about|after|before|because|when|if|as|of)\b\s)/
        const subParts = t.split(prepositions)
        if (subParts.length > 1) {
          subParts.forEach(sp => { if (sp.trim()) chunks.push(sp.trim()) })
        } else {
          const mid = Math.ceil(words.length / 2)
          chunks.push(words.slice(0, mid).join(' '))
          chunks.push(words.slice(mid).join(' '))
        }
      }
    }
  }
  return chunks.filter(c => c.length > 0)
}

export default function TeacherApp({ user, onLogout }) {
  const [tab, setTab] = useState('monitor')
  const [classes, setClasses] = useState([])
  const [allProgress, setAllProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const unsub = subscribeAllProgress(setAllProgress)
    return () => unsub()
  }, [])

  async function loadData() {
    setLoading(true)
    const cls = await getClasses()
    setClasses(cls)
    const prog = await getAllProgress()
    setAllProgress(prog)
    setLoading(false)
  }

  const tabs = [
    { id: 'monitor', label: '모니터', icon: '📊' },
    { id: 'classes', label: '반 관리', icon: '👥' },
    { id: 'edit', label: '레슨 편집', icon: '✏️' },
    { id: 'ranking', label: '랭킹', icon: '🏆' },
    { id: 'setup', label: '설정', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-indigo-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-black text-lg">📚 ChunkMaster</div>
          <div className="text-indigo-300 text-xs">선생님 모드 · Glory Academy</div>
        </div>
        <button onClick={onLogout} className="text-indigo-300 text-xs px-3 py-1.5 bg-indigo-900 rounded-xl">로그아웃</button>
      </div>

      <div className="bg-indigo-700 flex overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex-1 py-2.5 text-xs font-black transition-all ${tab === t.id ? 'bg-gray-50 text-indigo-700 rounded-t-xl' : 'text-indigo-200'}`}>
            <div>{t.icon}</div>
            <div>{t.label}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'monitor' && <MonitorTab allProgress={allProgress} classes={classes} />}
            {tab === 'classes' && <ClassesTab classes={classes} onRefresh={loadData} />}
            {tab === 'edit' && <EditTab />}
            {tab === 'ranking' && <RankingTab allProgress={allProgress} />}
            {tab === 'setup' && <SetupTab onRefresh={loadData} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── MONITOR ──────────────────────────────────────────────
function MonitorTab({ allProgress, classes }) {
  const byUser = {}
  allProgress.forEach(p => {
    if (!byUser[p.userId]) byUser[p.userId] = []
    byUser[p.userId].push(p)
  })
  const stats = Object.entries(byUser).map(([userId, progs]) => ({
    userId,
    name: progs[0]?.userName || userId,
    total: progs.reduce((a, p) => a + (p.totalScore || 0), 0),
    lessons: progs.length,
    latest: progs.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))[0]
  })).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-3xl font-black text-indigo-700">{allProgress.length}</div>
          <div className="text-xs text-gray-400">총 레슨 완료</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-3xl font-black text-indigo-700">{Object.keys(byUser).length}</div>
          <div className="text-xs text-gray-400">활동 학생 수</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-black text-gray-700 text-sm">학생별 현황</h2>
        </div>
        {stats.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">아직 데이터가 없어요</p>
        ) : stats.map((s, i) => (
          <div key={s.userId} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i === 0 ? 'bg-amber-50' : ''}`}>
            <div className="text-xl w-8 text-center">{['👑','🥈','🥉'][i] || `${i+1}`}</div>
            <div className="flex-1">
              <div className="font-black text-gray-800">{s.name}</div>
              <div className="text-xs text-gray-400">{s.lessons}개 레슨 완료</div>
            </div>
            <div className="font-black text-indigo-700 text-lg">{s.total}pt</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLASSES ──────────────────────────────────────────────
function ClassesTab({ classes, onRefresh }) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedLessons, setSelectedLessons] = useState([])
  const [expandedClass, setExpandedClass] = useState(null)
  const allLessons = Object.values(LESSONS_MAP || {})

  async function createClass() {
    if (!newName.trim()) return
    setSaving(true)
    await saveClass({ name: newName.trim(), assignedLessons: selectedLessons, students: [] })
    setNewName('')
    setSelectedLessons([])
    await onRefresh()
    setSaving(false)
  }

  function toggleLesson(id) {
    setSelectedLessons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-black text-gray-800">+ 새 반 만들기</h2>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="반 이름 (예: 하이스쿨초급)"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-400 outline-none" />
        <div className="text-xs font-bold text-gray-500">레슨 배정 (선택)</div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {allLessons.slice(0, 25).map(l => (
            <button key={l.id} onClick={() => toggleLesson(l.id)}
              className={`text-xs px-2 py-1 rounded-lg font-bold transition-all ${selectedLessons.includes(l.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              L{l.id}
            </button>
          ))}
        </div>
        <button onClick={createClass} disabled={saving || !newName.trim()}
          className="w-full bg-indigo-600 disabled:bg-gray-300 text-white font-black py-3 rounded-2xl">
          {saving ? '저장 중...' : '반 만들기'}
        </button>
      </div>
      {classes.map(cls => (
        <div key={cls.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
            className="w-full flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-black text-gray-800">{cls.name}</div>
              <div className="text-xs text-gray-400">{(cls.assignedLessons || []).length}개 레슨 배정됨</div>
            </div>
            <span className="text-gray-400">{expandedClass === cls.id ? '▲' : '▼'}</span>
          </button>
          {expandedClass === cls.id && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-1">
                {(cls.assignedLessons || []).map(id => (
                  <span key={id} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg">L{id}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── EDIT TAB ─────────────────────────────────────────────
function EditTab() {
  const [lessonId, setLessonId] = useState('')
  const [lessonData, setLessonData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingSentIdx, setEditingSentIdx] = useState(null)
  const [editText, setEditText] = useState('')
  const [editKo, setEditKo] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const allLessons = Object.values(LESSONS_MAP || {})

  // passages.js에서 불러오거나 Firebase에 저장된 내용 불러오기
  async function loadLesson(id) {
    if (!id) return
    setLoading(true)
    setLessonData(null)
    setSaved(false)
    setStatusMsg('')
    try {
      // 1. Firebase에 저장된 내용이 있으면 우선 사용
      const ref = doc(db, 'lessons', `lesson_${id}`)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setLessonData(snap.data())
        setStatusMsg('✅ 저장된 레슨을 불러왔어요. 검토 후 수정하세요.')
        setLoading(false)
        return
      }
      // 2. 없으면 passages.js에서 불러오기
      const { PASSAGES } = await import('../data/passages')
      const passage = PASSAGES[id]
      if (passage) {
        // 청크 자동 생성
        const sentences = passage.sentences.map(s => ({
          ...s,
          chunks: s.chunks || getChunks(s.en)
        }))
        setLessonData({
          lessonId: id,
          topic: LESSONS_MAP[id]?.topic || '',
          passage: passage.passage,
          sentences
        })
        setStatusMsg('📖 passages.js에서 불러왔어요. 청크를 확인하고 저장해주세요.')
      } else {
        setLessonData({ lessonId: id, topic: LESSONS_MAP[id]?.topic || '', passage: '', sentences: [] })
        setStatusMsg('⚠️ 아직 지문이 없어요. 직접 입력하거나 문장을 추가해주세요.')
      }
    } catch (e) {
      alert('불러오기 오류: ' + e.message)
    }
    setLoading(false)
  }

  async function saveLesson() {
    if (!lessonData) return
    setSaving(true)
    try {
      const ref = doc(db, 'lessons', `lesson_${lessonId}`)
      await setDoc(ref, lessonData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('저장 오류: ' + e.message)
    }
    setSaving(false)
  }

  function startEditSentence(idx) {
    const s = lessonData.sentences[idx]
    setEditingSentIdx(idx)
    setEditText(s.en)
    setEditKo(s.ko)
  }

  function saveSentenceEdit() {
    const newSentences = [...lessonData.sentences]
    newSentences[editingSentIdx] = {
      en: editText.trim(),
      ko: editKo.trim(),
      chunks: getChunks(editText.trim())
    }
    setLessonData(d => ({ ...d, sentences: newSentences }))
    setEditingSentIdx(null)
    setEditText('')
    setEditKo('')
  }

  function addSentence() {
    const newSentences = [...(lessonData.sentences || []), { en: '', ko: '', chunks: [] }]
    setLessonData(d => ({ ...d, sentences: newSentences }))
    setEditingSentIdx(newSentences.length - 1)
    setEditText('')
    setEditKo('')
  }

  function deleteSentence(idx) {
    if (!window.confirm('이 문장을 삭제할까요?')) return
    const newSentences = lessonData.sentences.filter((_, i) => i !== idx)
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  function regenerateChunks(idx) {
    const s = lessonData.sentences[idx]
    const newSentences = [...lessonData.sentences]
    newSentences[idx] = { ...s, chunks: getChunks(s.en) }
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  function regenerateAllChunks() {
    const newSentences = lessonData.sentences.map(s => ({
      ...s,
      chunks: getChunks(s.en)
    }))
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  function updateChunk(sentIdx, chunkIdx, value) {
    const newSentences = [...lessonData.sentences]
    const newChunks = [...(newSentences[sentIdx].chunks || [])]
    newChunks[chunkIdx] = value
    newSentences[sentIdx] = { ...newSentences[sentIdx], chunks: newChunks }
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  function addChunk(sentIdx) {
    const newSentences = [...lessonData.sentences]
    const newChunks = [...(newSentences[sentIdx].chunks || []), '']
    newSentences[sentIdx] = { ...newSentences[sentIdx], chunks: newChunks }
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  function removeChunk(sentIdx, chunkIdx) {
    const newSentences = [...lessonData.sentences]
    const newChunks = newSentences[sentIdx].chunks.filter((_, i) => i !== chunkIdx)
    newSentences[sentIdx] = { ...newSentences[sentIdx], chunks: newChunks }
    setLessonData(d => ({ ...d, sentences: newSentences }))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-black text-gray-800">✏️ 레슨 편집</h2>
        <select value={lessonId} onChange={e => { setLessonId(e.target.value); setLessonData(null); setStatusMsg('') }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
          <option value="">레슨 선택...</option>
          {allLessons.map(l => (
            <option key={l.id} value={l.id}>L{l.id} · {l.topic}</option>
          ))}
        </select>
        <button onClick={() => loadLesson(lessonId)} disabled={!lessonId || loading}
          className="w-full bg-indigo-600 disabled:bg-gray-300 text-white font-black py-3 rounded-2xl">
          {loading ? '불러오는 중...' : '📖 불러오기'}
        </button>
        {statusMsg && (
          <div className={`text-sm font-semibold px-3 py-2 rounded-xl ${statusMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : statusMsg.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
            {statusMsg}
          </div>
        )}
      </div>

      {/* 편집 화면 */}
      {lessonData && (
        <div className="space-y-4">
          {/* 상단 툴바 */}
          <div className="bg-indigo-50 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="font-black text-indigo-700 text-sm">L{lessonId} · {lessonData.topic}</div>
              <div className="text-xs text-gray-500">{lessonData.sentences?.length || 0}개 문장</div>
            </div>
            <div className="flex gap-2">
              <button onClick={regenerateAllChunks}
                className="text-xs bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-xl">
                청크 전체 재생성
              </button>
              <button onClick={saveLesson} disabled={saving}
                className={`text-xs font-black px-4 py-1.5 rounded-xl text-white ${saved ? 'bg-green-500' : 'bg-indigo-600'}`}>
                {saving ? '저장 중...' : saved ? '✅ 저장됨' : '저장'}
              </button>
            </div>
          </div>

          {/* 지문 전체 텍스트 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="font-bold text-gray-700 text-sm">지문 (passage)</div>
            <textarea value={lessonData.passage || ''}
              onChange={e => setLessonData(d => ({ ...d, passage: e.target.value }))}
              placeholder="지문 전체를 입력하세요..."
              rows={5}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-indigo-400 outline-none resize-none" />
          </div>

          {/* 문장 목록 */}
          <div className="space-y-3">
            {(lessonData.sentences || []).map((s, sentIdx) => (
              <div key={sentIdx} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* 문장 헤더 */}
                <div className="px-4 py-3 bg-gray-50 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {editingSentIdx === sentIdx ? (
                      <div className="space-y-2">
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          placeholder="영어 문장" rows={2}
                          className="w-full border border-indigo-300 rounded-xl p-2 text-sm outline-none resize-none" />
                        <input value={editKo} onChange={e => setEditKo(e.target.value)}
                          placeholder="한국어 번역"
                          className="w-full border border-indigo-300 rounded-xl px-3 py-2 text-sm outline-none" />
                        <div className="flex gap-2">
                          <button onClick={saveSentenceEdit}
                            className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs">저장</button>
                          <button onClick={() => setEditingSentIdx(null)}
                            className="flex-1 bg-gray-200 text-gray-600 font-bold py-2 rounded-xl text-xs">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-gray-800 text-sm leading-relaxed">{s.en || '(문장 없음)'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.ko || '(번역 없음)'}</div>
                      </div>
                    )}
                  </div>
                  {editingSentIdx !== sentIdx && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEditSentence(sentIdx)}
                        className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg">수정</button>
                      <button onClick={() => regenerateChunks(sentIdx)}
                        className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-lg">청크↺</button>
                      <button onClick={() => deleteSentence(sentIdx)}
                        className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg">삭제</button>
                    </div>
                  )}
                </div>

                {/* 청크 목록 */}
                {editingSentIdx !== sentIdx && (
                  <div className="px-4 py-3 space-y-2">
                    <div className="text-xs font-bold text-gray-400 mb-2">청크 ({(s.chunks || []).length}개)</div>
                    {(s.chunks || []).map((chunk, chunkIdx) => (
                      <div key={chunkIdx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{chunkIdx + 1}.</span>
                        <input value={chunk}
                          onChange={e => updateChunk(sentIdx, chunkIdx, e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-amber-400 outline-none" />
                        <button onClick={() => removeChunk(sentIdx, chunkIdx)}
                          className="text-red-400 text-xs px-2 py-1 flex-shrink-0">✕</button>
                      </div>
                    ))}
                    <button onClick={() => addChunk(sentIdx)}
                      className="text-xs text-indigo-500 font-bold mt-1">+ 청크 추가</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 문장 추가 버튼 */}
          <button onClick={addSentence}
            className="w-full border-2 border-dashed border-indigo-300 text-indigo-500 font-black py-4 rounded-2xl">
            + 문장 추가
          </button>

          {/* 저장 버튼 (하단) */}
          <button onClick={saveLesson} disabled={saving}
            className={`w-full font-black py-4 rounded-3xl text-white text-lg ${saved ? 'bg-green-500' : 'bg-indigo-600'}`}>
            {saving ? '저장 중...' : saved ? '✅ 저장 완료!' : '💾 저장하기'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── RANKING ──────────────────────────────────────────────
function RankingTab({ allProgress }) {
  const byUser = {}
  allProgress.forEach(p => {
    if (!byUser[p.userId]) byUser[p.userId] = { name: p.userName || p.userId, total: 0, lessons: 0 }
    byUser[p.userId].total += (p.totalScore || 0)
    byUser[p.userId].lessons += 1
  })
  const sorted = Object.entries(byUser).sort((a, b) => b[1].total - a[1].total)
  const medals = ['👑', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-black text-gray-700">🏆 전체 랭킹</div>
        {sorted.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">아직 데이터가 없습니다</p>
        ) : sorted.map(([userId, data], i) => (
          <div key={userId} className={`flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0 ${i === 0 ? 'bg-amber-50' : ''}`}>
            <div className="text-2xl w-8 text-center">{medals[i] || `${i + 1}`}</div>
            <div className="flex-1">
              <div className="font-black text-gray-800">{data.name}</div>
              <div className="text-xs text-gray-400">{data.lessons}개 완료</div>
            </div>
            <div className="font-black text-indigo-700 text-xl">{data.total}pt</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SETUP ────────────────────────────────────────────────
function SetupTab({ onRefresh }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('student')
  const [classId, setClassId] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [classes, setClasses] = useState([])

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  async function createAccount() {
    if (!name.trim() || pin.length < 4) { setMessage('이름과 4자리 PIN을 입력하세요'); return }
    setCreating(true)
    setMessage('')
    try {
      const clsList = await getClasses()
      const targetClass = clsList.find(c => c.id === classId)
      await createUser({
        name: name.trim(),
        pin,
        role,
        classId: classId || null,
        assignedLessons: targetClass?.assignedLessons || [],
        userName: name.trim()
      })
      if (targetClass) {
        const students = targetClass.students || []
        await saveClass({ ...targetClass, students: [...students, name.trim()] })
      }
      setMessage(`✅ 계정 생성 완료! (${name} / PIN: ${pin})`)
      setName(''); setPin('')
      onRefresh()
    } catch (e) {
      setMessage('오류: ' + e.message)
    }
    setCreating(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <h2 className="font-black text-gray-800">계정 만들기</h2>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">역할</label>
          <div className="flex gap-2">
            {['student', 'teacher'].map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl font-bold text-sm ${role === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {r === 'student' ? '학생' : '선생님'}
              </button>
            ))}
          </div>
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="이름 (예: Yuchan)"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-400 outline-none" />
        <input value={pin} onChange={e => setPin(e.target.value.slice(0, 4))}
          placeholder="PIN 4자리" maxLength={4} type="number"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-400 outline-none" />
        {role === 'student' && (
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-400 outline-none">
            <option value="">반 선택 (선택사항)</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {message && (
          <div className={`p-3 rounded-xl text-sm font-semibold ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}
        <button onClick={createAccount} disabled={creating}
          className="w-full bg-indigo-600 disabled:bg-gray-300 text-white font-black py-3 rounded-2xl">
          {creating ? '생성 중...' : '계정 만들기'}
        </button>
      </div>
    </div>
  )
}

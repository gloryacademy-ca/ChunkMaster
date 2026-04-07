import { useState, useEffect, useRef } from 'react'
import { speak, stop } from '../../tts'

const MAX_SCORES = { 1: 10, 2: 10, 3: 10, 4: 20, 5: 30, 6: 20 }
export const TOTAL_MAX = Object.values(MAX_SCORES).reduce((a, b) => a + b, 0)

// ─── Chunk splitter (의미 단위로 자르기) ───────────────────
function getChunks(sentence) {
  // 1. 쉼표 기준으로 먼저 나누기
  const commaParts = sentence.split(/,\s*/)
  const chunks = []

  for (const part of commaParts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // 2. 접속사 앞에서 나누기 (and, but, so, or)
    const conjParts = trimmed.split(/\s+(?=\b(?:and|but|so|or)\b\s)/)

    for (const cp of conjParts) {
      const t = cp.trim()
      if (!t) continue
      const words = t.split(' ')

      if (words.length <= 6) {
        // 짧으면 그대로
        chunks.push(t)
      } else {
        // 7단어 이상이면 전치사구 기준으로 나누기
        const prepositions = /\s+(?=\b(?:in|on|at|to|for|with|from|by|about|after|before|because|when|if|as|of)\b\s)/
        const subParts = t.split(prepositions)
        if (subParts.length > 1) {
          subParts.forEach(sp => { if (sp.trim()) chunks.push(sp.trim()) })
        } else {
          // 그래도 길면 절반으로 나누기
          const mid = Math.ceil(words.length / 2)
          chunks.push(words.slice(0, mid).join(' '))
          chunks.push(words.slice(mid).join(' '))
        }
      }
    }
  }

  return chunks.filter(c => c.length > 0)
}

// ─── Stage Header ─────────────────────────────────────────
function StageHeader({ stage, title, score, current, total }) {
  const colors = ['', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-700']
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className={`${colors[stage]} text-white text-xs font-black px-3 py-1.5 rounded-full`}>
        STAGE {stage}
      </div>
      <span className="font-black text-gray-800 flex-1">{title}</span>
      {total && current && (
        <span className="text-xs text-gray-400 font-semibold">{current}/{total}</span>
      )}
      <span className="text-xs text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-lg">+{score}점</span>
    </div>
  )
}

// ─── 유틸: 배열 섞기 ──────────────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─── STAGE 1: 어휘 학습 + 퀴즈 ───────────────────────────
export function Stage1({ lesson, onComplete }) {
  const [phase, setPhase] = useState('study')   // study | quiz | result
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quizWords, setQuizWords] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([])

  const vocab = lesson.vocab  // 20개 전체

  async function speakWord(word) {
    await speak(word, { rate: 0.8 })
  }

  useEffect(() => {
    if (phase === 'study') {
      speakWord(vocab[current][0])
      setFlipped(false)
    }
  }, [current, phase])

  // 단어 카드 다음
  function nextCard() {
    if (current < vocab.length - 1) {
      setCurrent(c => c + 1)
    } else {
      stop()
      startQuiz()
    }
  }

  // 퀴즈 시작 - 20개 중 10개 랜덤 선택
  function startQuiz() {
    const picked = shuffle(vocab).slice(0, 10)
    const questions = picked.map(w => {
      const wrong = shuffle(vocab.filter(v => v[1] !== w[1])).slice(0, 3)
      return {
        word: w[0],
        correct: w[1],
        options: shuffle([w[1], ...wrong.map(v => v[1])])
      }
    })
    setQuizWords(questions)
    setQIdx(0)
    setSelected(null)
    setResults([])
    setScore(0)
    setPhase('quiz')
  }

  // 답 선택
  function handleAnswer(option) {
    if (selected !== null) return
    setSelected(option)
    const isCorrect = option === quizWords[qIdx].correct
    if (isCorrect) {
      speak('Correct!', { rate: 1.0 })
      setScore(s => s + 1)
    }
    setResults(r => [...r, { word: quizWords[qIdx].word, correct: isCorrect }])
    setTimeout(() => {
      if (qIdx < quizWords.length - 1) {
        setQIdx(i => i + 1)
        setSelected(null)
      } else {
        setPhase('result')
      }
    }, 900)
  }

  // 결과 → 다음 Stage
  function finish() {
    const pts = Math.round((score / 10) * MAX_SCORES[1])
    onComplete(pts)
  }

  // ── 단어 학습 화면 ──
  if (phase === 'study') {
    const word = vocab[current]
    const allSeen = current === vocab.length - 1
    return (
      <div className="flex flex-col h-full p-4">
        <StageHeader stage={1} title="오늘의 어휘" score={MAX_SCORES[1]} current={current + 1} total={vocab.length} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="text-xs text-gray-400 font-semibold">카드를 탭하면 발음을 들을 수 있어요</div>

          {/* 단어 카드 */}
          <div
            className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-10 text-center cursor-pointer shadow-lg active:scale-95 transition-transform"
            onClick={() => { setFlipped(f => !f); speakWord(word[0]) }}
          >
            <div className="text-3xl font-black text-indigo-800 mb-2">{word[0]}</div>
            {flipped
              ? <div className="text-xl text-indigo-500 font-bold mt-4">{word[1]}</div>
              : <div className="text-sm text-gray-400 mt-4">탭해서 뜻 보기 🔊</div>
            }
          </div>

          {/* 앞뒤 이동 */}
          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex-1 bg-gray-100 text-gray-500 font-black py-3 rounded-2xl disabled:opacity-30 active:scale-95">
              ← 이전
            </button>
            <button onClick={() => setCurrent(c => Math.min(vocab.length - 1, c + 1))}
              disabled={current === vocab.length - 1}
              className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-2xl disabled:opacity-30 active:scale-95">
              다음 →
            </button>
          </div>

          {/* 퀴즈 시작 버튼 - 마지막 카드 도달 후 표시 */}
          {allSeen && (
            <button onClick={startQuiz}
              className="w-full max-w-sm bg-green-500 text-white font-black py-4 rounded-3xl text-lg active:scale-95 animate-pulse">
              🧠 퀴즈 시작!
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── 퀴즈 화면 ──
  if (phase === 'quiz') {
    const q = quizWords[qIdx]
    return (
      <div className="flex flex-col h-full p-4">
        <StageHeader stage={1} title="어휘 퀴즈" score={MAX_SCORES[1]} current={qIdx + 1} total={10} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-sm mx-auto w-full">
          <div className="w-full bg-blue-600 rounded-3xl p-8 text-center shadow-lg">
            <div className="text-xs text-blue-200 mb-2 font-bold">뜻을 고르세요</div>
            <div className="text-4xl font-black text-white">{q.word}</div>
          </div>
          <div className="w-full grid grid-cols-2 gap-3">
            {q.options.map((opt, i) => {
              let bg = 'bg-white border-2 border-gray-200 text-gray-700'
              if (selected !== null) {
                if (opt === q.correct) bg = 'bg-green-500 border-green-500 text-white'
                else if (opt === selected && opt !== q.correct) bg = 'bg-red-400 border-red-400 text-white'
                else bg = 'bg-gray-100 border-gray-100 text-gray-400'
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt)}
                  className={`${bg} font-bold py-4 px-3 rounded-2xl text-sm transition-all active:scale-95`}>
                  {opt}
                </button>
              )
            })}
          </div>
          <div className="text-sm text-gray-400">맞힌 개수: {score}/{qIdx + (selected !== null ? 1 : 0)}</div>
        </div>
      </div>
    )
  }

  // ── 결과 화면 ──
  if (phase === 'result') {
    const pts = Math.round((score / 10) * MAX_SCORES[1])
    return (
      <div className="flex flex-col h-full p-4">
        <StageHeader stage={1} title="퀴즈 결과" score={MAX_SCORES[1]} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-sm mx-auto w-full">
          <div className="text-5xl">{score >= 8 ? '🎉' : score >= 5 ? '👍' : '💪'}</div>
          <div className="text-4xl font-black text-indigo-700">{score} / 10</div>
          <div className="text-gray-400 text-sm">{pts}점 획득!</div>
          <div className="w-full space-y-2 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm ${r.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className="font-bold">{r.word}</span>
                <span>{r.correct ? '✅ 정답' : '❌ 오답'}</span>
              </div>
            ))}
          </div>
          <button onClick={finish}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-3xl active:scale-95">
            다음 단계 →
          </button>
        </div>
      </div>
    )
  }
}

// ─── STAGE 2: 지문 전체 듣기 ─────────────────────────────
export function Stage2({ lesson, passage, sentences, onComplete }) {
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)
  const [showKo, setShowKo] = useState(false)

  async function playAll(rate = 0.85) {
    if (playing) { stop(); setPlaying(false); return }
    setPlaying(true)
    await speak(passage || sentences.map(s => s.en).join(' '), { rate })
    setPlaying(false)
    setDone(true)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <StageHeader stage={2} title="지문 전체 듣기" score={MAX_SCORES[2]} />
      <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full pt-4">

        {/* 지문 텍스트 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 overflow-y-auto max-h-64">
          {sentences.length > 0 ? sentences.map((s, i) => (
            <div key={i} className="mb-3">
              <div className="text-sm font-semibold text-gray-800 leading-relaxed">{s.en}</div>
              {showKo && <div className="text-xs text-purple-500 mt-0.5">{s.ko}</div>}
            </div>
          )) : (
            <p className="text-sm text-gray-500">{passage}</p>
          )}
        </div>

        {/* 한국어 번역 토글 */}
        <button onClick={() => setShowKo(k => !k)}
          className="w-full border-2 border-purple-200 text-purple-600 font-bold py-2.5 rounded-2xl text-sm">
          {showKo ? '한국어 숨기기' : '한국어 번역 보기'}
        </button>

        {/* 듣기 버튼 */}
        <div className="flex gap-3">
          <button onClick={() => playAll(0.85)}
            className={`flex-1 font-black py-4 rounded-2xl text-white active:scale-95 ${playing ? 'bg-red-500' : 'bg-purple-600'}`}>
            {playing ? '⏹ 멈추기' : '🔊 전체 듣기'}
          </button>
          <button onClick={() => playAll(0.65)} disabled={playing}
            className="flex-1 bg-purple-100 text-purple-700 font-black py-4 rounded-2xl active:scale-95 disabled:opacity-40">
            🐢 느리게
          </button>
        </div>

        {done && (
          <button onClick={() => onComplete(MAX_SCORES[2])}
            className="w-full bg-green-500 text-white font-black py-4 rounded-3xl active:scale-95">
            다음 단계 →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── STAGE 3: 문장별 쉐도잉 ──────────────────────────────
export function Stage3({ lesson, sentences, onComplete }) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)

  const s = sentences[current]

  useEffect(() => {
    setPlaying(false)
    if (s) speak(s.en, { rate: 0.85 })
  }, [current])

  async function playSentence(rate = 0.85) {
    if (playing) { stop(); setPlaying(false); return }
    setPlaying(true)
    await speak(s?.en || '', { rate })
    setPlaying(false)
  }

  function next() {
    stop()
    if (current < sentences.length - 1) {
      setCurrent(c => c + 1)
      setPlaying(false)
    } else {
      onComplete(MAX_SCORES[3])
    }
  }

  if (!s) return null

  return (
    <div className="flex flex-col h-full p-4">
      <StageHeader stage={3} title="문장별 쉐도잉" score={MAX_SCORES[3]} current={current + 1} total={sentences.length} />
      <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-sm mx-auto w-full">

        <div className="w-full bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-8 text-center shadow">
          <div className="text-xs text-green-500 font-bold mb-3 uppercase tracking-widest">따라 말해보세요 🎤</div>
          <div className="text-xl font-black text-gray-800 leading-relaxed">{s.en}</div>
          <div className="text-sm text-green-600 mt-4 font-semibold">{s.ko}</div>
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={() => playSentence(0.85)}
            className="flex-1 bg-green-600 text-white font-black py-4 rounded-2xl active:scale-95">
            🔊 듣기
          </button>
          <button onClick={() => playSentence(0.6)}
            className="flex-1 bg-green-100 text-green-700 font-black py-4 rounded-2xl active:scale-95">
            🐢 느리게
          </button>
        </div>

        <button onClick={next}
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-3xl text-lg active:scale-95">
          {current < sentences.length - 1 ? '따라했어요 ✓' : '완료 ✓'}
        </button>

        <div className="flex gap-1.5">
          {sentences.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === current ? 'bg-green-500 w-4' : i < current ? 'bg-green-300 w-2' : 'bg-gray-200 w-2'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── STAGE 4: Chunk Memorization ─────────────────────────
export function Stage4({ sentences, onComplete }) {
  const [sentIdx, setSentIdx] = useState(0)
  const [chunkIdx, setChunkIdx] = useState(0)
  const [revealed, setRevealed] = useState([])
  const [score, setScore] = useState(0)

  const s = sentences[sentIdx]
  if (!s) return null

  // 선생님이 저장한 청크 우선 사용, 없으면 자동 생성
  const chunks = (s.chunks && s.chunks.length > 0) ? s.chunks : getChunks(s.en)

  useEffect(() => {
    setChunkIdx(0)
    setRevealed([])
    speak(s.en, { rate: 0.85 })
  }, [sentIdx])

  function revealNext() {
    const next = chunkIdx
    setRevealed(r => [...r, next])
    speak(chunks[next], { rate: 0.85 })
    setChunkIdx(i => i + 1)
  }

  function nextSentence() {
    setScore(sc => sc + Math.round(MAX_SCORES[4] / sentences.length))
    if (sentIdx < sentences.length - 1) {
      setSentIdx(i => i + 1)
    } else {
      stop()
      onComplete(score + Math.round(MAX_SCORES[4] / sentences.length))
    }
  }

  const allRevealed = revealed.length >= chunks.length

  return (
    <div className="flex flex-col h-full p-4">
      <StageHeader stage={4} title="청크 암기" score={MAX_SCORES[4]} current={sentIdx + 1} total={sentences.length} />
      <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-sm mx-auto w-full">
        <div className="text-sm text-gray-400 text-center">{s.ko}</div>
        <div className="w-full bg-amber-50 rounded-3xl p-6 min-h-[120px] flex flex-wrap gap-2 items-center justify-center">
          {chunks.map((chunk, i) => (
            <span
              key={i}
              className={`px-4 py-2 rounded-2xl font-bold text-base transition-all ${
                revealed.includes(i)
                  ? 'bg-amber-400 text-white shadow'
                  : 'bg-gray-200 text-gray-200 select-none'
              }`}
              onClick={() => revealed.includes(i) && speak(chunk, { rate: 0.85 })}
            >
              {revealed.includes(i) ? chunk : '▓'.repeat(Math.min(chunk.length, 8))}
            </span>
          ))}
        </div>
        {!allRevealed ? (
          <button
            onClick={revealNext}
            className="w-full bg-amber-500 text-white font-black py-4 rounded-3xl active:scale-95"
          >
            다음 청크 보기 ({chunkIdx + 1}/{chunks.length})
          </button>
        ) : (
          <button
            onClick={nextSentence}
            className="w-full bg-green-500 text-white font-black py-4 rounded-3xl active:scale-95"
          >
            {sentIdx < sentences.length - 1 ? '다음 문장 →' : '완료 ✓'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── STAGE 5: Korean → English Writing ───────────────────
export function Stage5({ sentences, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)

  const s = sentences[idx]
  if (!s) return null

  function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  }

  function check() {
    const correct = normalize(s.en)
    const attempt = normalize(input)
    const correctWords = correct.split(' ')
    const attemptWords = attempt.split(' ')
    const matched = correctWords.filter(w => attemptWords.includes(w)).length
    const ratio = matched / correctWords.length
    const ok = ratio >= 0.8
    const pts = ok ? Math.round(MAX_SCORES[5] / sentences.length) : 0
    setScore(sc => sc + pts)
    setFeedback({ ok, correct: s.en })
    if (ok) speak('Great job!', { rate: 0.9 })
  }

  function next() {
    setFeedback(null)
    setInput('')
    if (idx < sentences.length - 1) {
      setIdx(i => i + 1)
    } else {
      stop()
      onComplete(score)
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <StageHeader stage={5} title="영어로 쓰기" score={MAX_SCORES[5]} current={idx + 1} total={sentences.length} />
      <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full pt-6">
        <div className="bg-rose-50 rounded-2xl p-5 text-center">
          <div className="text-lg font-bold text-gray-700">{s.ko}</div>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={!!feedback}
          placeholder="영어로 써보세요..."
          rows={3}
          className="w-full border-2 border-gray-200 rounded-2xl p-4 text-base focus:border-indigo-400 outline-none resize-none"
        />
        {feedback ? (
          <div className={`p-4 rounded-2xl ${feedback.ok ? 'bg-green-100' : 'bg-red-100'}`}>
            {feedback.ok ? (
              <div className="text-green-700 font-black text-center text-lg">✅ 정답!</div>
            ) : (
              <div>
                <div className="text-red-700 font-bold mb-1">❌ 다시 확인해보세요</div>
                <div className="text-sm text-gray-700">정답: <span className="font-semibold">{feedback.correct}</span></div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={check}
            disabled={!input.trim()}
            className="w-full bg-indigo-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg"
          >
            확인
          </button>
        )}
        {feedback && (
          <button
            onClick={next}
            className="w-full bg-green-500 text-white font-black py-4 rounded-3xl active:scale-95"
          >
            {idx < sentences.length - 1 ? '다음 →' : '완료 ✓'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── STAGE 6: Full Passage Writing ───────────────────────
export function Stage6({ passage, onComplete }) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  function submit() {
    const passageWords = passage.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    const inputWords = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    const matched = passageWords.filter(w => inputWords.includes(w)).length
    const ratio = matched / passageWords.length
    const pts = Math.round(MAX_SCORES[6] * ratio)
    setScore(pts)
    setSubmitted(true)
    speak('Great job! Well done!', { rate: 0.9 })
    onComplete(pts)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <StageHeader stage={6} title="전체 쓰기" score={MAX_SCORES[6]} />
      <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full pt-4">
        {!submitted ? (
          <>
            <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-gray-500 text-center">
              지금까지 배운 지문 전체를 기억해서 써보세요!
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="지문 전체를 영어로 써보세요..."
              className="flex-1 border-2 border-gray-200 rounded-2xl p-4 text-sm focus:border-indigo-400 outline-none resize-none min-h-[200px]"
            />
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="w-full bg-indigo-700 disabled:bg-gray-300 text-white font-black py-4 rounded-3xl active:scale-95"
            >
              제출하기 📝
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <div className="text-3xl font-black text-indigo-700">{score}점</div>
            <div className="text-gray-400">전체 쓰기 완료!</div>
          </div>
        )}
      </div>
    </div>
  )
}

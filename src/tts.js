// Web Speech API TTS wrapper - mobile/iOS compatible
let currentUtterance = null
let unlocked = false

// iOS requires a silent utterance triggered by user gesture to unlock audio
function unlockAudio() {
  if (unlocked || !window.speechSynthesis) return
  const silent = new SpeechSynthesisUtterance('')
  silent.volume = 0
  window.speechSynthesis.speak(silent)
  unlocked = true
}

// Call this once on any user interaction (tap/click) at app start
export function initTTS() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    unlockAudio()
    document.removeEventListener('touchstart', unlock)
    document.removeEventListener('click', unlock)
  }
  document.addEventListener('touchstart', unlock, { once: true })
  document.addEventListener('click', unlock, { once: true })
}

function getVoice(lang) {
  const voices = window.speechSynthesis.getVoices()
  return voices.find(v => v.lang.startsWith(lang) && v.localService) ||
         voices.find(v => v.lang.startsWith(lang)) ||
         null
}

export function speak(text, options = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }
    stop()

    const lang = options.lang || 'en-US'
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = options.rate || 0.85
    utter.pitch = options.pitch || 1.0
    utter.volume = options.volume || 1.0
    utter.onend = resolve
    utter.onerror = resolve

    const voice = getVoice(lang)
    if (voice) utter.voice = voice

    currentUtterance = utter

    // iOS fix: voices may not be ready yet
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v = getVoice(lang)
        if (v) utter.voice = v
        window.speechSynthesis.speak(utter)
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      window.speechSynthesis.speak(utter)
    }

    // iOS Safari bug: speechSynthesis stops after ~15s, need to resume
    const resumeTimer = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(resumeTimer)
      } else {
        window.speechSynthesis.resume()
      }
    }, 5000)

    utter.onend = () => { clearInterval(resumeTimer); resolve() }
    utter.onerror = () => { clearInterval(resumeTimer); resolve() }
  })
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  currentUtterance = null
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false
}

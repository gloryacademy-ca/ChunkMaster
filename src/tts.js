// Web Speech API TTS wrapper - mobile/iOS compatible
let currentUtterance = null
let unlocked = false

export function initTTS() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    if (unlocked || !window.speechSynthesis) return
    const silent = new SpeechSynthesisUtterance('')
    silent.volume = 0
    window.speechSynthesis.speak(silent)
    unlocked = true
  }
  document.addEventListener('touchstart', unlock, { once: true })
  document.addEventListener('click', unlock, { once: true })
}

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices()

  // iOS 우선순위: Samantha (가장 자연스러운 미국 영어)
  const preferred = [
    'Samantha',
    'Alex',
    'Google US English',
    'Microsoft Zira',
  ]

  for (const name of preferred) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }

  return voices.find(v => v.lang === 'en-US' && v.localService) ||
         voices.find(v => v.lang === 'en-US') ||
         voices.find(v => v.lang.startsWith('en')) ||
         null
}

export function speak(text, options = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }
    stop()

    function doSpeak() {
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'en-US'
      utter.rate = options.rate || 0.85
      utter.pitch = options.pitch || 1.0
      utter.volume = options.volume || 1.0

      const voice = getBestVoice()
      if (voice) utter.voice = voice

      currentUtterance = utter

      const resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) clearInterval(resumeTimer)
        else window.speechSynthesis.resume()
      }, 5000)

      utter.onend = () => { clearInterval(resumeTimer); resolve() }
      utter.onerror = () => { clearInterval(resumeTimer); resolve() }

      window.speechSynthesis.speak(utter)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
    } else {
      doSpeak()
    }
  })
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  currentUtterance = null
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false
}

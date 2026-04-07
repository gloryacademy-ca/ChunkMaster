// Web Speech API TTS wrapper
let currentUtterance = null

export function speak(text, options = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }
    stop()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = options.lang || 'en-US'
    utter.rate = options.rate || 0.85
    utter.pitch = options.pitch || 1.0
    utter.volume = options.volume || 1.0
    utter.onend = resolve
    utter.onerror = resolve
    currentUtterance = utter
    window.speechSynthesis.speak(utter)
  })
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  currentUtterance = null
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false
}

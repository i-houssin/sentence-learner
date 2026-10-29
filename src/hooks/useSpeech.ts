/* Adapted from Qwerty Learner src/hooks/useSpeech.ts (GPL-3.0).
 * Modified 2026-10-28: complete sentences, voice loading, repeat playback,
 * stable options, cancellation, browser/voice/error detection and cleanup. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import clamp from '../upstream/clamp'

export default function useSpeech(text: string, options: Pick<Settings, 'rate' | 'voice' | 'repeats'>) {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0),
    utterance = useRef<SpeechSynthesisUtterance | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const load = () => setVoices(synth.getVoices().filter((voice) => /^en(?:-|_|$)/i.test(voice.lang)))
    load()
    synth.addEventListener('voiceschanged', load)
    return () => synth.removeEventListener('voiceschanged', load)
  }, [supported])
  const cancel = useCallback(() => {
    generation.current++
    if (timer.current) clearTimeout(timer.current)
    if (supported) window.speechSynthesis.cancel()
    utterance.current = null
    setSpeaking(false)
  }, [supported])
  useEffect(() => {
    cancel()
    setError('')
    return cancel
  }, [text, options.rate, options.voice, options.repeats, cancel])
  const speak = useCallback(() => {
    cancel()
    setError('')
    if (!supported) {
      setError('Speech is not supported here. Use Read + type mode, or try an up-to-date browser with English voices.')
      return
    }
    const synth = window.speechSynthesis
    const available = synth.getVoices()
    const english = available.filter((voice) => /^en(?:-|_|$)/i.test(voice.lang))
    const voice =
      english.find((v) => v.voiceURI === options.voice) ?? english.find((v) => v.lang === 'en-US') ?? english[0]
    if (available.length > 0 && !voice) {
      setError('No English voice is installed. Add an English voice in your device settings, or switch to Read + type.')
      return
    }
    const token = generation.current
    let remaining = clamp(options.repeats, 1, 5)
    const play = () => {
      if (token !== generation.current) return
      const next = new SpeechSynthesisUtterance(text)
      utterance.current = next
      next.lang = voice?.lang ?? 'en-US'
      if (voice) next.voice = voice
      next.rate = clamp(options.rate, 0.5, 2)
      next.onstart = () => {
        if (token === generation.current) setSpeaking(true)
      }
      next.onend = () => {
        if (token !== generation.current) return
        remaining--
        if (remaining > 0) timer.current = setTimeout(play, 500)
        else {
          setSpeaking(false)
          utterance.current = null
        }
      }
      next.onerror = (event) => {
        if (token !== generation.current) return
        setSpeaking(false)
        if (!['interrupted', 'canceled'].includes(event.error))
          setError('Audio could not play. Try another English voice, check device audio, or use Read + type mode.')
      }
      setSpeaking(true)
      // Keep a strong ref to the utterance; otherwise some browser engines stop mid-sentence.
      synth.speak(next)
    }
    play()
  }, [cancel, supported, text, options.voice, options.rate, options.repeats])
  return { speak, cancel, speaking, supported, voices, error }
}

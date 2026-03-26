import { useState, useCallback, useRef } from 'react'
import { DiagnosisState, ChatMessage } from '../types'

export const useDiagnosis = () => {
  const [state, setState] = useState<DiagnosisState>('IDLE')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string>('')
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendDiagnosis = useCallback(async (text: string, images: string[] = []) => {
    setState('DIAGNOSING')
    setError('')
    
    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images,
      timestamp: Date.now()
    }
    
    const aid = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: aid,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('http://localhost:3213/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images, text }),
        signal: controller.signal
      })

      if (!response.body) throw new Error('ReadableStream not supported by this browser.')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          
          const events = chunk.split('\n\n')
          
          for (const ev of events) {
            if (ev.startsWith('data: ')) {
               const dataStr = ev.replace('data: ', '').trim()
               if (dataStr === '[DONE]') {
                 done = true
                 break;
               }
               
               if (dataStr) {
                 try {
                   const parsed = JSON.parse(dataStr)
                   if (parsed.error) {
                     setError(parsed.error)
                     setState('ERROR')
                     done = true
                     break;
                   } else if (parsed.text) {
                     setMessages(prev => prev.map(m => 
                       m.id === aid ? { ...m, content: m.content + parsed.text } : m
                     ))
                   }
                 } catch (e) {
                   console.error('Failed to parse SSE data', dataStr, e)
                 }
               }
            }
          }
        }
      }
      
      setState(prev => prev === 'ERROR' ? 'ERROR' : 'SUCCESS')
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, isStreaming: false } : m))

    } catch (err: any) {
      if (err.name === 'AbortError') {
         console.log('Stream aborted.')
         setState('IDLE')
      } else {
         setError(err.message || '网络连接失败，请检查 Agent 服务是否启动')
         setState('ERROR')
      }
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, isStreaming: false } : m))
    } finally {
      abortControllerRef.current = null;
    }
  }, [])

  const abortDiagnosis = useCallback(() => {
    if (abortControllerRef.current) {
       abortControllerRef.current.abort()
       abortControllerRef.current = null
    }
    setState('IDLE')
  }, [])

  return { state, messages, error, sendDiagnosis, abortDiagnosis }
}

import { useState, useCallback, useRef } from 'react'
import { DiagnosisState, ChatMessage } from '../types'

const DEFAULT_EMPTY_RESULT = '本次诊断未返回可显示内容，请重试一次或补充更具体的问题描述。'

function appendAssistantChunk(messages: ChatMessage[], assistantId: string, text: string): ChatMessage[] {
  return messages.map((m) =>
    m.id === assistantId ? { ...m, content: m.content + text } : m
  )
}

function finalizeAssistant(messages: ChatMessage[], assistantId: string): ChatMessage[] {
  return messages.map((m) => {
    if (m.id !== assistantId) return m
    const hasContent = Boolean(m.content && m.content.trim())
    return {
      ...m,
      content: hasContent ? m.content : DEFAULT_EMPTY_RESULT,
      isStreaming: false
    }
  })
}

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
      console.log('[useDiagnosis] Sending request to backend...');
      const response = await fetch('http://localhost:3213/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images, text }),
        signal: controller.signal
      })

      console.log('[useDiagnosis] Response received:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      if (!response.body) throw new Error('ReadableStream not supported by this browser.')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      let done = false
      let buffer = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          // SSE frames may be split across chunks, so we keep an incremental buffer.
          buffer += decoder.decode(value, { stream: !done })
          const lines = buffer.split('\n')
          // Save the last potentially incomplete line back to buffer
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

            const dataStr = trimmedLine.replace('data: ', '').trim()
            console.log('[useDiagnosis] Received SSE data:', dataStr);

            if (dataStr === '[DONE]') {
               done = true
               break;
            }
            
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.error) {
                setError(parsed.error)
                setState('ERROR')
                done = true
                break;
              } else if (parsed.text) {
                // Keep a single assistant bubble and append every streamed segment to it.
                setMessages(prev => appendAssistantChunk(prev, aid, parsed.text))
              }
            } catch (e) {
              console.error('[useDiagnosis] Failed to parse JSON:', dataStr, e)
            }
          }
        }
      }
      
      setState(prev => prev === 'ERROR' ? 'ERROR' : 'SUCCESS')
      // UI-side fallback keeps user-facing behavior stable if backend ends without text.
      setMessages(prev => finalizeAssistant(prev, aid))

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

import { useState, useRef, useEffect } from 'react'
import { useDiagnosis } from './hooks/useDiagnosis'
import { useImageUpload } from './hooks/useImageUpload'
import { MessageBubble } from './components/MessageBubble'
import { InputArea } from './components/InputArea'

function App() {
  const [inputText, setInputText] = useState('')
  const { state, messages, error, sendDiagnosis, abortDiagnosis } = useDiagnosis()
  const { images, logFiles, handlePaste, handleDrop, handleFileSelect, removeImage, removeLogFile, clearAll } = useImageUpload()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    sendDiagnosis(inputText, images, logFiles);
    setInputText('');
    clearAll();
  }

  return (
    <div 
      className="h-screen flex flex-col bg-dark-950"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 自定义标题栏 */}
      <header className="drag-region flex items-center justify-between h-10 px-4 bg-dark-900/80 backdrop-blur-sm border-b border-white/5 shrink-0 z-10 w-full relative">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 glow-pulse" />
          <span className="text-sm font-medium text-dark-300">AI 诊断工作台</span>
          {state === 'UPLOADING' && (
            <span className="text-xs text-accent-400 ml-2 animate-pulse">文件处理中...</span>
          )}
          {state === 'DIAGNOSING' && (
            <span className="text-xs text-primary-400 ml-2 animate-pulse">诊断中...</span>
          )}
        </div>
        <div className="no-drag flex items-center gap-1">
          <button
            className="w-8 h-8 flex items-center justify-center text-dark-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            onClick={() => window.api?.minimizeWindow()}
            title="最小化"
          >
            <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor"><rect width="12" height="2" rx="1"/></svg>
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-dark-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            onClick={() => window.api?.maximizeWindow()}
            title="最大化"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="8" height="8" rx="1.5"/></svg>
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-dark-400 hover:text-white hover:bg-red-500/80 rounded-md transition-colors"
            onClick={() => window.api?.closeWindow()}
            title="关闭"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-2">
          <div className="max-w-3xl mx-auto flex flex-col h-full justify-start">
            
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center animate-fade-in">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold gradient-text mb-2">大数据平台 AI 诊断</h1>
                  <p className="text-dark-400 text-sm max-w-md">
                    直接在界面粘贴 (Ctrl+V) 报错截图，或上传日志文件，AI 将快速识别问题并生成排查方案。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col animate-slide-up">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                
                {/* 错误提示框 */}
                {error && (
                  <div className="glass-card mb-6 p-4 max-w-[85%] border-l-4 border-l-red-500 bg-red-500/10">
                    <p className="text-red-400 font-medium text-sm">⚠️ 诊断异常断开</p>
                    <p className="text-dark-300 text-xs mt-1">{error}</p>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}

          </div>
        </div>

        {/* 底层阴影渐变 */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-dark-950 to-transparent pointer-events-none" />
      </main>

      {/* 输入区域组件 */}
      <InputArea 
        inputText={inputText}
        setInputText={setInputText}
        images={images}
        logFiles={logFiles}
        removeImage={removeImage}
        removeLogFile={removeLogFile}
        clearAll={clearAll}
        handleFileSelect={handleFileSelect}
        onSend={handleSend}
        onAbort={abortDiagnosis}
        state={state}
      />
    </div>
  )
}

export default App

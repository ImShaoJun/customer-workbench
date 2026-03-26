import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        
        {/* 头像 */}
        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-lg ${
          isUser 
            ? 'bg-gradient-to-br from-dark-600 to-dark-800 border border-dark-500 shadow-dark-900/50' 
            : 'bg-gradient-to-br from-primary-500 to-accent-600 shadow-primary-500/20'
        }`}>
          {isUser ? (
            <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          )}
        </div>

        {/* 消息体 */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className={`glass-card p-4 text-sm relative group overflow-hidden ${
             isUser ? 'bg-dark-800/80 border-dark-700 rounded-tr-none' : 'bg-dark-900/60 border-dark-700/50 rounded-tl-none'
          }`}>
            
            {/* 用户上传的图片预览 */}
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.images.map((img, i) => (
                  <img key={i} src={img} alt="uploaded" className="h-24 w-auto rounded border border-white/10 object-contain shadow-md" />
                ))}
              </div>
            )}

            {/* Markdown 渲染内容 */}
            <div className={`markdown-body break-words whitespace-pre-wrap ${message.isStreaming ? 'typing-cursor' : ''}`}>
              {isUser ? (
                <div className="text-white/90">{message.content}</div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              )}
            </div>

            {/* AI 消息的操作栏 */}
            {!isUser && !message.isStreaming && message.content && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-white/10 rounded-md text-dark-300 hover:text-white transition-colors"
                  title="复制回复"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          <span className={`text-[10px] text-dark-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

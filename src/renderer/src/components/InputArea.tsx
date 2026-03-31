import { useRef, useEffect } from 'react';
import { DiagnosisState } from '../types';

interface InputAreaProps {
  inputText: string;
  setInputText: (val: string) => void;
  images: string[];
  removeImage: (index: number) => void;
  clearImages: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onAbort: () => void;
  state: DiagnosisState;
}

export function InputArea({
  inputText,
  setInputText,
  images,
  removeImage,
  clearImages,
  handleFileSelect,
  onSend,
  onAbort,
  state
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputText.trim() || images.length > 0) && state !== 'DIAGNOSING') {
        onSend();
      }
    }
  };

  const isSending = state === 'DIAGNOSING';
  const canSend = (inputText.trim().length > 0 || images.length > 0) && !isSending;

  return (
    <div className="shrink-0 border-t border-white/5 bg-dark-900/70 px-4 md:px-8 py-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="glass-card p-3 focus-within:border-primary-500/50 outline outline-1 outline-transparent transition-colors shadow-lg">
          
          {/* 已上传图片预览区 */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/5">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-white/10" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 bg-dark-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 hover:bg-red-500"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-white placeholder-dark-500 resize-none outline-none text-sm leading-relaxed min-h-[40px] max-h-[120px]"
            placeholder="描述你的问题，支持换行(Shift+Enter)，直接 Ctrl+V 粘贴报错截图..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={1}
          />
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                上传图片
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  disabled={isSending}
                />
              </label>
            </div>
            
            {isSending ? (
              <button
                onClick={onAbort}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                终止诊断
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                开始诊断
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

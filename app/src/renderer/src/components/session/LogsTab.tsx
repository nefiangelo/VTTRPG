import React, { useRef, useEffect } from 'react'

export interface LogEntry {
  id: string
  time: string
  type: 'info' | 'success' | 'warn' | 'dice' | 'chat'
  message: string
}

interface LogsTabProps {
  logs: LogEntry[]
  onClear: () => void
}

export default function LogsTab({ logs, onClear }: LogsTabProps): React.JSX.Element {
  const logBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className='flex flex-col h-full overflow-hidden text-vtt-light select-none bg-vtt-dark'>
      {/* Header com Ação de Limpar */}
      <div className='p-3 border-b border-vtt-dark-gray bg-vtt-dark flex items-center justify-between'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-vtt-golden font-cinzel'>
          Terminal da Sessão
        </span>
        <button
          type='button'
          onClick={onClear}
          className='px-2.5 py-1 rounded bg-vtt-dark-gray hover:bg-neutral-700 text-[11px] text-neutral-300 hover:text-white cursor-pointer border border-vtt-light-gray/40'
        >
          Limpar Console
        </button>
      </div>

      {/* Janela de Logs com Auto-scroll */}
      <div
        ref={logBoxRef}
        className='flex-1 p-3 bg-vtt-dark font-mono text-[11px] overflow-y-auto flex flex-col gap-1.5 select-text'
      >
        {logs.length === 0 ? (
          <span className='text-neutral-500 italic'>Nenhum evento registrado ainda no console.</span>
        ) : (
          logs.map((log) => {
            let textColor = 'text-neutral-400'
            if (log.type === 'success') textColor = 'text-emerald-400'
            else if (log.type === 'warn') textColor = 'text-amber-400'
            else if (log.type === 'dice') textColor = 'text-purple-300 font-bold'
            else if (log.type === 'chat') textColor = 'text-cyan-300'

            return (
              <div key={log.id} className={`leading-relaxed break-words ${textColor}`}>
                <span className='text-neutral-500 mr-2 select-none'>[{log.time}]</span>
                <span>{log.message}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

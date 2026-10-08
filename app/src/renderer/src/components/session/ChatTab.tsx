import React, { useState } from 'react'

interface ChatMessage {
  id: string
  user: { username: string; role: string }
  text: string
  type: string
  timestamp: string
}

interface ChatTabProps {
  chatMessages: ChatMessage[]
  onSendMessage: (text: string) => void
  onRollDice: (formula: string) => void
  isConnected: boolean
}

export default function ChatTab({
  chatMessages,
  onSendMessage,
  onRollDice,
  isConnected
}: ChatTabProps): React.JSX.Element {
  const [inputText, setInputText] = useState('')
  const [customFormula, setCustomFormula] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !isConnected) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleCustomRoll = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFormula.trim() || !isConnected) return
    onRollDice(customFormula.trim())
    setCustomFormula('')
  }

  const diceSet = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100']

  return (
    <div className='flex flex-col h-full overflow-hidden text-vtt-light select-none bg-vtt-dark'>
      {/* Dock de Rolagem de Dados */}
      <div className='p-3 border-b border-vtt-dark-gray flex flex-col gap-2'>
        <span className='text-[11px] font-bold text-vtt-golden uppercase tracking-wide font-cinzel'>
          Rolar Dados
        </span>

        <div className='grid grid-cols-4 gap-1'>
          {diceSet.map((die) => (
            <button
              key={die}
              type='button'
              onClick={() => onRollDice(die)}
              disabled={!isConnected}
              className={`py-1 rounded text-xs font-semibold border transition-colors cursor-pointer text-center ${
                die === '1d20'
                  ? 'bg-vtt-red hover:bg-red-700 text-white border-transparent'
                  : 'bg-vtt-dark-gray hover:bg-neutral-700 border-vtt-light-gray/40 text-neutral-200'
              }`}
            >
              {die}
            </button>
          ))}
          <button
            type='button'
            onClick={() => onRollDice('2d6')}
            disabled={!isConnected}
            className='py-1 rounded text-xs font-semibold border bg-vtt-dark-gray hover:bg-neutral-700 border-vtt-light-gray/40 text-neutral-200 cursor-pointer'
          >
            2d6
          </button>
        </div>

        <form onSubmit={handleCustomRoll} className='flex gap-1.5 mt-0.5'>
          <input
            type='text'
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            placeholder='Ex: 2d6+4, 1d20...'
            disabled={!isConnected}
            className='flex-1 px-2.5 py-1 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vtt-red'
          />
          <button
            type='submit'
            disabled={!isConnected || !customFormula.trim()}
            className='px-2.5 py-1 bg-vtt-dark-gray hover:bg-neutral-700 disabled:opacity-50 text-white rounded text-xs font-semibold cursor-pointer border border-vtt-light-gray/40'
          >
            Rolar
          </button>
        </form>
      </div>

      {/* Mensagens de Chat */}
      <div className='flex-1 overflow-y-auto p-3 flex flex-col gap-2 select-text text-xs'>
        {chatMessages.length === 0 ? (
          <div className='h-full flex items-center justify-center text-neutral-500 italic text-center p-4'>
            Nenhuma mensagem no chat.
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-lg border flex flex-col gap-1 ${
                msg.type === 'dice' || msg.type === 'roll'
                  ? 'bg-purple-950/30 border-purple-800/40 text-purple-200'
                  : msg.user.role === 'gm'
                  ? 'bg-vtt-dark-gray border-vtt-red/40 text-neutral-200'
                  : 'bg-vtt-dark-gray border-vtt-light-gray/30 text-neutral-300'
              }`}
            >
              <div className='flex items-center justify-between text-[10px] text-neutral-400 select-none'>
                <span className='font-bold text-vtt-golden'>{msg.user.username}</span>
              </div>
              <div className='break-words whitespace-pre-wrap leading-relaxed'>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input de Envio */}
      <form onSubmit={handleSend} className='p-2.5 border-t border-vtt-dark-gray flex gap-2 bg-vtt-dark'>
        <input
          type='text'
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isConnected ? 'Enviar mensagem...' : 'Desconectado...'}
          disabled={!isConnected}
          className='flex-1 px-3 py-1.5 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vtt-red'
        />
        <button
          type='submit'
          disabled={!isConnected || !inputText.trim()}
          className='px-3.5 py-1.5 bg-vtt-red hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow'
        >
          Enviar
        </button>
      </form>
    </div>
  )
}

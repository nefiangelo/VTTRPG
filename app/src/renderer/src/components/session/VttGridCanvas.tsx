import React, { useState } from 'react'
import MarkdownViewer from './MarkdownViewer'

export interface ActiveHandout {
  id: string
  nodeId?: string
  title: string
  type: string
  by: string
  data: Record<string, unknown>
}

interface VttGridCanvasProps {
  campaignTitle?: string
  sessionTitle?: string
  activeHandout: ActiveHandout | null
  onCloseHandout: () => void
  isConnected: boolean
  currentPing: number | null
}

export default function VttGridCanvas({
  campaignTitle,
  sessionTitle,
  activeHandout,
  onCloseHandout,
  isConnected,
  currentPing
}: VttGridCanvasProps): React.JSX.Element {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [gridSize, setGridSize] = useState(50)
  const [showGrid, setShowGrid] = useState(true)

  const handleZoomIn = (): void => setZoomLevel((z) => Math.min(200, z + 15))
  const handleZoomOut = (): void => setZoomLevel((z) => Math.max(50, z - 15))
  const handleResetZoom = (): void => setZoomLevel(100)

  return (
    <main className='flex-1 h-screen relative overflow-hidden bg-vtt-dark-gray select-none flex flex-col'>
      {/* Grid da Mesa Virtual */}
      <div
        className='absolute inset-0 transition-transform duration-75 ease-out'
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'center center',
          backgroundImage: showGrid
            ? `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`
            : 'none',
          backgroundSize: `${gridSize}px ${gridSize}px`
        }}
      >
        {!activeHandout && (
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none select-none text-neutral-600'>
            <p className='text-xs uppercase tracking-wider font-semibold'>Grid da Mesa</p>
          </div>
        )}
      </div>

      {/* Handout Compartilhado na Mesa */}
      {activeHandout && (
        <div className='absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/75 backdrop-blur-xs'>
          <div
            className={`bg-vtt-dark border border-vtt-light-gray/40 rounded-2xl p-5 ${
              activeHandout.type === 'image' ? 'max-w-xl' : 'max-w-3xl'
            } max-h-[85vh] w-full shadow-2xl flex flex-col gap-3`}
          >
            <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-2'>
              <div className='flex flex-col min-w-0'>
                <h3 className='text-base font-bold text-white truncate font-cinzel'>{activeHandout.title}</h3>
                <span className='text-[11px] text-neutral-400'>
                  Apresentado por: <strong className='text-vtt-golden'>{activeHandout.by}</strong>
                </span>
              </div>
              <button
                type='button'
                onClick={onCloseHandout}
                className='px-3 py-1 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer border border-vtt-light-gray/30'
              >
                ✕ Fechar
              </button>
            </div>

            <div className='overflow-y-auto flex-1 p-2'>
              {activeHandout.type === 'image' ? (
                <div className='flex items-center justify-center'>
                  <img
                    src={String(activeHandout.data?.url || '')}
                    alt={activeHandout.title}
                    className='max-h-80 max-w-full object-contain rounded-xl'
                  />
                </div>
              ) : (
                <div className='w-full p-4 bg-vtt-dark-gray/60 rounded-xl border border-vtt-light-gray/30 select-text'>
                  <MarkdownViewer markdown={String(activeHandout.data?.markdown || '')} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Superior Simples */}
      <div className='absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none'>
        <div className='pointer-events-auto bg-vtt-dark/85 backdrop-blur-xs border border-vtt-light-gray/40 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs'>
          <span className='w-2 h-2 rounded-full bg-emerald-500' />
          <span className='font-bold text-vtt-golden font-cinzel'>{campaignTitle || 'Campanha'}</span>
          <span className='text-neutral-500'>|</span>
          <span className='text-neutral-300'>{sessionTitle || 'Mesa'}</span>
        </div>

        <div className='pointer-events-auto bg-vtt-dark/85 backdrop-blur-xs border border-vtt-light-gray/40 rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs'>
          <button
            type='button'
            onClick={handleZoomOut}
            className='w-6 h-6 rounded hover:bg-vtt-dark-gray text-neutral-300 font-bold flex items-center justify-center cursor-pointer'
            title='Diminuir Zoom'
          >
            -
          </button>
          <button
            type='button'
            onClick={handleResetZoom}
            className='px-2 py-0.5 rounded hover:bg-vtt-dark-gray text-[11px] font-mono text-neutral-200 cursor-pointer'
            title='Redefinir Zoom'
          >
            {zoomLevel}%
          </button>
          <button
            type='button'
            onClick={handleZoomIn}
            className='w-6 h-6 rounded hover:bg-vtt-dark-gray text-neutral-300 font-bold flex items-center justify-center cursor-pointer'
            title='Aumentar Zoom'
          >
            +
          </button>

          <span className='w-px h-3 bg-neutral-700 mx-1' />

          <button
            type='button'
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
              showGrid ? 'bg-vtt-red text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Grade
          </button>

          {showGrid && (
            <button
              type='button'
              onClick={() => setGridSize((prev) => (prev === 40 ? 50 : prev === 50 ? 60 : 40))}
              className='px-1.5 py-0.5 rounded hover:bg-vtt-dark-gray text-[10px] text-neutral-300 cursor-pointer'
              title='Alterar tamanho do grid'
            >
              {gridSize}px
            </button>
          )}
        </div>
      </div>

      {/* Barra de Status Inferior */}
      <footer className='absolute bottom-0 left-0 right-0 h-6 bg-vtt-dark border-t border-vtt-dark-gray px-4 flex items-center justify-between text-[10px] text-neutral-400 z-10 select-none'>
        <div className='flex items-center gap-3'>
          <span className='flex items-center gap-1.5'>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </span>
          {currentPing !== null && <span>Ping: {currentPing}ms</span>}
        </div>
        <span>Mesa Virtual</span>
      </footer>
    </main>
  )
}

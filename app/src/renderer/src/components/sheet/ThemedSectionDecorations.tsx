import React from 'react'

/**
 * Canto entalhado com arco côncavo, rebite circular e linha dupla
 * Exatamente como na ficha oficial de D&D 2024 enviada pelo usuário (Imagem 2).
 */
export function DndScallopedCorner(): React.JSX.Element {
  return (
    <div className="absolute top-0 left-0 w-9 h-9 pointer-events-none z-10 overflow-hidden">
      {/* Rebite circular metálico no canto superior esquerdo */}
      <div className="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-stone-500 border border-stone-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.3)] z-20 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-stone-300 opacity-60" />
      </div>

      {/* SVG entalhando o arco côncavo e desenhando a linha dupla da moldura */}
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        {/* Recorte do canto preenchendo a cor do fundo do wrapper (#e7e4dc) */}
        <path d="M0,0 L36,0 A 36 36 0 0 0 0 36 Z" fill="#e7e4dc" />
        {/* Linha externa da moldura acompanhando a curva côncava */}
        <path d="M36,0 A 36 36 0 0 0 0 36" stroke="#78716c" strokeWidth="2" />
        {/* Linha interna da moldura (dupla linha clássica de D&D) */}
        <path d="M36,4 A 32 32 0 0 0 4 36" stroke="#a8a29e" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

/**
 * Divisor com pontas em lança/diamante clássico de Vampiro: A Máscara (White Wolf)
 * Reproduz fielmente: ◆─────────────────── ATRIBUTOS ───────────────────◆ (Imagem 1)
 */
interface VampireSpearheadDividerProps {
  title: string
  description?: string
  rightAction?: React.ReactNode
}

export function VampireSpearheadDivider({
  title,
  description,
  rightAction
}: VampireSpearheadDividerProps): React.JSX.Element {
  return (
    <div className="w-full my-2.5">
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* Lança esquerda */}
        <div className="flex-1 flex items-center">
          <span className="w-2.5 h-2.5 rotate-45 bg-black shrink-0 shadow-sm" />
          <div className="h-[2px] bg-black w-full" />
        </div>

        {/* Título Central em Caixa Alta Serifada */}
        <h3 className="font-serif font-black text-xs sm:text-sm uppercase tracking-[0.25em] text-black px-2 shrink-0 select-none text-center">
          {title}
        </h3>

        {/* Lança direita */}
        <div className="flex-1 flex items-center">
          <div className="h-[2px] bg-black w-full" />
          <span className="w-2.5 h-2.5 rotate-45 bg-black shrink-0 shadow-sm" />
        </div>

        {rightAction && <div className="shrink-0 ml-1">{rightAction}</div>}
      </div>

      {description && (
        <p className="text-[11px] font-serif italic text-neutral-600 text-center mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * Coroa Ornamental Gótica em Ferro Forjado (Cabeçalho de Vampiro: A Máscara)
 * Inspirada na ornamentação superior e logotipo da Imagem 1.
 */
export function VampireTopOrnament(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col items-center justify-center my-2 text-black select-none pointer-events-none">
      <svg
        viewBox="0 0 600 70"
        className="w-full max-w-xl h-14 sm:h-16 text-black drop-shadow-sm"
        fill="currentColor"
      >
        {/* Barra horizontal em ferro forjado com remates em ponta de lança */}
        <line x1="20" y1="58" x2="580" y2="58" stroke="currentColor" strokeWidth="2.5" />
        <polygon points="10,58 24,54 24,62" fill="currentColor" />
        <polygon points="590,58 576,54 576,62" fill="currentColor" />

        {/* Losangos ornamentais ao longo da barra */}
        <polygon points="60,58 64,54 68,58 64,62" fill="currentColor" />
        <polygon points="120,58 124,54 128,58 124,62" fill="currentColor" />
        <polygon points="480,58 484,54 488,58 484,62" fill="currentColor" />
        <polygon points="540,58 544,54 548,58 544,62" fill="currentColor" />

        {/* Arco central e raios radiantes com pontas góticas */}
        <circle cx="300" cy="58" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" />
        {/* Raio central superior */}
        <line x1="300" y1="58" x2="300" y2="10" stroke="currentColor" strokeWidth="2.5" />
        <polygon points="300,4 296,14 304,14" fill="currentColor" />

        {/* Raios diagonais com pontas de flecha góticas */}
        <line x1="300" y1="58" x2="260" y2="16" stroke="currentColor" strokeWidth="2" />
        <polygon points="257,13 255,23 263,20" fill="currentColor" />
        <line x1="300" y1="58" x2="340" y2="16" stroke="currentColor" strokeWidth="2" />
        <polygon points="343,13 337,20 345,23" fill="currentColor" />

        <line x1="300" y1="58" x2="220" y2="25" stroke="currentColor" strokeWidth="1.8" />
        <polygon points="216,23 216,32 224,28" fill="currentColor" />
        <line x1="300" y1="58" x2="380" y2="25" stroke="currentColor" strokeWidth="1.8" />
        <polygon points="384,23 376,28 384,32" fill="currentColor" />

        <line x1="300" y1="58" x2="180" y2="38" stroke="currentColor" strokeWidth="1.5" />
        <line x1="300" y1="58" x2="420" y2="38" stroke="currentColor" strokeWidth="1.5" />

        {/* Círculo com flor de lis estilizada no centro do sol negro */}
        <circle cx="300" cy="58" r="8" fill="currentColor" />
      </svg>

      <div className="text-center -mt-2">
        <h2 className="font-serif font-black text-2xl sm:text-3xl tracking-[0.35em] uppercase text-black drop-shadow-sm">
          VAMPIRO
        </h2>
        <span className="font-serif font-black text-xs sm:text-sm tracking-[0.4em] uppercase text-neutral-800 -mt-1 block">
          A MÁSCARA
        </span>
      </div>
    </div>
  )
}

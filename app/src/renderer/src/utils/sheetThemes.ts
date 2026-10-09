export type SheetThemeId = 'dnd' | 'cyberpunk' | 'gothic' | 'horror' | 'heroic' | 'default'

export interface SheetThemeDefinition {
  id: SheetThemeId
  name: string
  subtitle: string
  icon: string
  accentHex: string
  tag: string
  variant: 'dnd' | 'cyberpunk' | 'vampire' | 'cthulhu' | 'heroic' | 'default'
  styles: {
    wrapper: string
    sectionCard: string
    sectionHeader: string
    sectionTitle: string
    sectionBullet: string
    sectionDesc: string
    fieldCard: string
    fieldLabel: string
    input: string
    textarea: string
    select: string
    checkboxText: string
    checkboxAccent: string
    rollButton: string
    badge: string
    modifierChip: string
    techTag?: string
  }
}

export const SHEET_THEMES: Record<SheetThemeId, SheetThemeDefinition> = {
  dnd: {
    id: 'dnd',
    name: 'D&D 5e (Ficha Oficial)',
    subtitle: 'Baseada na ficha oficial D&D 2024: cartão recortado duplo, rótulos em caixa alta espaçados e linhas de base',
    icon: '⚔️',
    accentHex: '#78716C',
    tag: 'D&D 5E // OFICIAL',
    variant: 'dnd',
    styles: {
      wrapper: 'bg-[#e7e4dc] p-4 sm:p-8 rounded-3xl shadow-2xl border border-stone-300',
      sectionCard:
        'bg-[#fdfcf9] text-stone-900 border-2 border-stone-400 rounded-lg p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] relative overflow-hidden',
      sectionHeader:
        'border-b-2 border-stone-400 pb-2 mb-4 flex items-center justify-between',
      sectionTitle:
        'text-sm font-bold text-stone-800 font-sans tracking-[0.18em] uppercase flex items-center gap-2',
      sectionBullet: 'w-2 h-2 bg-stone-700 rounded-full shrink-0',
      sectionDesc: 'text-xs text-stone-600 font-serif italic mt-0.5',
      fieldCard:
        'bg-transparent border-0 p-1 transition-all relative flex flex-col justify-end',
      fieldLabel:
        'text-[10px] font-bold text-stone-700 font-sans tracking-[0.18em] uppercase mb-0.5 truncate select-none',
      input:
        'w-full bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm font-semibold outline-none py-1 focus:border-stone-800 transition-colors',
      textarea:
        'w-full bg-stone-50/50 border-2 border-stone-300 rounded p-2 text-xs font-serif text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-700 resize-none leading-relaxed transition-all',
      select:
        'w-full bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-xs font-semibold outline-none py-1 focus:border-stone-800 cursor-pointer transition-colors',
      checkboxText: 'text-xs text-stone-800 font-sans font-semibold tracking-wide',
      checkboxAccent: 'accent-stone-700',
      rollButton:
        'flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider text-stone-800 bg-stone-200 hover:bg-stone-300 px-2 py-0.5 rounded border border-stone-400 shadow-sm transition-all cursor-pointer shrink-0',
      badge: 'bg-stone-200 text-stone-800 border border-stone-400 font-sans text-[10px] font-bold px-2 py-0.5 rounded',
      modifierChip:
        'text-xs font-bold font-serif text-stone-900 shrink-0 px-2 py-0.5 rounded-full bg-stone-100 border border-stone-400 shadow-sm',
      techTag: 'D&D 5E'
    }
  },

  gothic: {
    id: 'gothic',
    name: 'Vampiro: A Máscara (Ficha Oficial VTM)',
    subtitle: 'Baseada na ficha oficial White Wolf: papel branco, divisores em lança gótica, rótulos inline e trilhas de círculos',
    icon: '🦇',
    accentHex: '#000000',
    tag: 'VTM // WHITE WOLF',
    variant: 'vampire',
    styles: {
      wrapper: 'bg-[#18181b] p-4 sm:p-8 rounded-3xl shadow-2xl border border-neutral-700',
      sectionCard:
        'bg-[#ffffff] text-black border-2 border-black rounded-none p-5 sm:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.35)] relative overflow-hidden font-serif',
      sectionHeader:
        'border-b border-black pb-2 mb-4 flex items-center justify-between',
      sectionTitle:
        'text-sm font-black text-black font-serif tracking-[0.25em] uppercase flex items-center gap-2 drop-shadow-sm',
      sectionBullet: 'w-2 h-2 rotate-45 bg-black shrink-0',
      sectionDesc: 'text-xs text-neutral-600 font-serif italic mt-0.5',
      fieldCard:
        'bg-transparent border-0 p-1 transition-all relative',
      fieldLabel:
        'text-xs font-black text-black font-serif uppercase tracking-wider shrink-0 select-none',
      input:
        'w-full bg-transparent border-b border-black text-black font-serif text-xs font-bold outline-none px-1 py-0.5 focus:border-black transition-all',
      textarea:
        'w-full bg-neutral-50 border border-black rounded-none p-2 text-xs font-serif text-black placeholder:text-neutral-500 outline-none focus:border-black resize-none leading-relaxed transition-all',
      select:
        'w-full bg-transparent border-b border-black text-black font-serif text-xs font-bold outline-none px-1 py-0.5 cursor-pointer transition-all',
      checkboxText: 'text-xs text-black font-serif font-bold',
      checkboxAccent: 'accent-black',
      rollButton:
        'flex items-center gap-1 text-[10px] font-serif font-black uppercase text-white bg-black hover:bg-neutral-800 px-2 py-0.5 rounded-none shadow-sm transition-all cursor-pointer shrink-0',
      badge: 'bg-black text-white font-serif font-bold text-[10px] px-2 py-0.5 rounded-none',
      modifierChip:
        'text-xs font-bold font-serif text-black shrink-0 px-2 py-0.5 rounded-none border border-black',
      techTag: 'VTM // D10'
    }
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk RED (R. Talsorian)',
    subtitle: 'Ficha oficial Cyberpunk RED: faixas em vermelho vivo, alto contraste preto e cromo tático',
    icon: '⚡',
    accentHex: '#E52521',
    tag: 'RTG // CPR-RED',
    variant: 'cyberpunk',
    styles: {
      wrapper: 'bg-[#09090b] p-4 sm:p-6 rounded-3xl shadow-2xl border border-neutral-800',
      sectionCard:
        'bg-[#101014] border-2 border-[#e52521]/70 rounded-none p-4 sm:p-6 shadow-[0_0_20px_rgba(229,37,33,0.15)] relative overflow-hidden',
      sectionHeader:
        'bg-[#e52521] text-black px-4 py-2 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 flex items-center justify-between font-mono font-black uppercase tracking-widest text-xs',
      sectionTitle:
        'text-sm font-black text-black font-mono tracking-widest uppercase flex items-center gap-2 drop-shadow-sm',
      sectionBullet: 'w-2.5 h-2.5 bg-black shadow-sm shrink-0',
      sectionDesc: 'text-xs text-neutral-400 font-mono mt-1 tracking-tight',
      fieldCard:
        'bg-[#09090b] border-2 border-neutral-700/80 rounded-none p-2.5 sm:p-3 focus-within:border-[#e52521] focus-within:shadow-[0_0_12px_rgba(229,37,33,0.3)] transition-all relative',
      fieldLabel: 'text-[11px] font-black text-[#e52521] font-mono truncate uppercase tracking-widest',
      input:
        'w-full bg-[#141418] border border-neutral-700 rounded-none px-3 py-1.5 text-xs font-mono font-bold text-white placeholder:text-neutral-600 outline-none focus:border-[#e52521] focus:ring-1 focus:ring-[#e52521]/50 transition-all',
      textarea:
        'w-full bg-[#141418] border border-neutral-700 rounded-none p-2 text-xs font-mono text-white placeholder:text-neutral-600 outline-none focus:border-[#e52521] resize-none leading-relaxed transition-all',
      select:
        'w-full bg-[#141418] border border-neutral-700 rounded-none px-3 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-[#e52521] cursor-pointer transition-all',
      checkboxText: 'text-xs text-[#e52521] font-mono uppercase font-black tracking-wider',
      checkboxAccent: 'accent-[#e52521]',
      rollButton:
        'flex items-center gap-1.5 text-[11px] font-mono font-black uppercase text-black bg-[#e52521] hover:bg-white hover:text-[#e52521] px-2.5 py-1 rounded-none shadow-[0_0_12px_rgba(229,37,33,0.5)] transition-all cursor-pointer shrink-0',
      badge: 'bg-[#e52521]/20 text-[#e52521] border border-[#e52521]/60 font-mono font-bold rounded-none',
      modifierChip:
        'text-xs font-bold font-mono text-black bg-[#e52521] shrink-0 px-2 py-0.5 rounded-none shadow-sm',
      techTag: 'CP.RED'
    }
  },

  horror: {
    id: 'horror',
    name: 'Call of Cthulhu (Investigador)',
    subtitle: 'Ficha de dossiê de investigador dos anos 1920: papel envelhecido, máquina de escrever e sanidade',
    icon: '🐙',
    accentHex: '#10B981',
    tag: 'CHAOSIUM // CTHULHU',
    variant: 'cthulhu',
    styles: {
      wrapper: 'bg-[#1c1917] p-4 sm:p-8 rounded-3xl shadow-2xl border border-stone-800',
      sectionCard:
        'bg-[#f4ebd0] text-stone-900 border-2 border-[#57534e] rounded-sm p-5 sm:p-6 shadow-[0_6px_20px_rgba(0,0,0,0.25)] relative overflow-hidden font-mono',
      sectionHeader:
        'border-b-2 border-stone-700 pb-2 mb-4 flex items-center justify-between',
      sectionTitle:
        'text-sm font-bold text-stone-900 font-mono tracking-wider flex items-center gap-2 uppercase',
      sectionBullet: 'w-2 h-2 bg-emerald-700 rounded-full shrink-0',
      sectionDesc: 'text-xs text-stone-600 font-mono italic mt-0.5',
      fieldCard: 'bg-transparent border-0 p-1 relative',
      fieldLabel: 'text-[11px] font-bold text-stone-800 font-mono truncate tracking-wide uppercase',
      input:
        'w-full bg-transparent border-b border-stone-600 text-stone-900 font-mono text-xs outline-none px-1 py-1 focus:border-stone-900 transition-all',
      textarea:
        'w-full bg-stone-100/60 border border-stone-500 rounded-none p-2 text-xs font-mono text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-900 resize-none leading-relaxed transition-all',
      select:
        'w-full bg-transparent border-b border-stone-600 text-stone-900 font-mono text-xs outline-none px-1 py-1 cursor-pointer transition-all',
      checkboxText: 'text-xs text-stone-900 font-mono',
      checkboxAccent: 'accent-emerald-700',
      rollButton:
        'flex items-center gap-1.5 text-[11px] font-mono font-bold text-white bg-stone-800 hover:bg-stone-900 px-2 py-0.5 rounded-none shadow-sm transition-all cursor-pointer shrink-0',
      badge: 'bg-stone-800 text-white font-mono text-[10px] px-2 py-0.5 rounded-none',
      modifierChip: 'text-xs font-bold font-mono text-stone-900 shrink-0 px-2 py-0.5 border border-stone-600',
      techTag: 'SAN // D100'
    }
  },

  heroic: {
    id: 'heroic',
    name: 'Fantasia Arcana / Tormenta',
    subtitle: 'Safira profunda, runas reluzentes e espírito de alta aventura heroica',
    icon: '✨',
    accentHex: '#38BDF8',
    tag: 'TORMENTA20',
    variant: 'heroic',
    styles: {
      wrapper: 'bg-[#060c18] p-4 sm:p-6 rounded-3xl shadow-2xl border border-sky-950',
      sectionCard:
        'bg-gradient-to-b from-[#0e1b36] to-[#060c18] border-2 border-sky-800/70 rounded-2xl p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(56,189,248,0.2)] relative overflow-hidden',
      sectionHeader:
        'bg-gradient-to-r from-sky-950 via-[#0e1b36] to-transparent border-b-2 border-sky-800 px-4 py-3 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 flex items-center justify-between',
      sectionTitle:
        'text-base font-bold text-sky-200 font-cinzel tracking-wider flex items-center gap-2 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] uppercase',
      sectionBullet:
        'w-2.5 h-2.5 rounded-full bg-sky-400 border border-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.8)] shrink-0',
      sectionDesc: 'text-xs text-sky-400/80 font-sans mt-0.5',
      fieldCard:
        'bg-[#0b162c]/90 border border-sky-950 rounded-xl p-3 sm:p-3.5 focus-within:border-sky-400 focus-within:shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all shadow-inner',
      fieldLabel: 'text-[11px] font-bold text-sky-200 font-cinzel truncate tracking-wide uppercase',
      input:
        'w-full bg-[#050a14] border border-sky-950 rounded-lg px-3 py-2 text-xs font-sans text-sky-100 placeholder:text-sky-950 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all',
      textarea:
        'w-full bg-[#050a14] border border-sky-950 rounded-lg p-2.5 text-xs font-sans text-sky-100 placeholder:text-sky-950 outline-none focus:border-sky-400 resize-none leading-relaxed transition-all',
      select:
        'w-full bg-[#050a14] border border-sky-950 rounded-lg px-3 py-2 text-xs font-sans text-sky-100 outline-none focus:border-sky-400 cursor-pointer transition-all',
      checkboxText: 'text-xs text-sky-300 font-sans',
      checkboxAccent: 'accent-sky-400',
      rollButton:
        'flex items-center gap-1.5 text-[11px] font-cinzel font-bold text-sky-200 bg-sky-950 hover:bg-sky-900 px-2.5 py-1 rounded-md border border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-all cursor-pointer shrink-0',
      badge: 'bg-sky-950 text-sky-300 border border-sky-800',
      modifierChip:
        'text-xs font-bold font-mono text-sky-300 shrink-0 px-2 py-1 rounded bg-[#050a14] border border-sky-900',
      techTag: 'T20 // D20'
    }
  },

  default: {
    id: 'default',
    name: 'VTT Padrão / Minimalista',
    subtitle: 'Design escuro neutro, moderno e refinado com realces dourados',
    icon: '🛡️',
    accentHex: '#E9D180',
    tag: 'ORIGINAL',
    variant: 'default',
    styles: {
      wrapper: 'bg-neutral-950 p-4 sm:p-6 rounded-3xl shadow-2xl border border-neutral-800',
      sectionCard:
        'bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm',
      sectionHeader:
        'bg-neutral-900 border-b border-neutral-800 px-4 py-3 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 flex items-center justify-between',
      sectionTitle: 'text-base font-bold text-white font-cinzel tracking-wide flex items-center gap-2',
      sectionBullet: 'w-2.5 h-2.5 rounded-full bg-vtt-golden shadow-sm shrink-0',
      sectionDesc: 'text-xs text-neutral-400 mt-0.5',
      fieldCard:
        'bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 sm:p-3.5 focus-within:border-vtt-golden/60 transition-all shadow-inner',
      fieldLabel: 'text-[11px] font-bold text-neutral-300 font-cinzel truncate uppercase',
      input:
        'w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden',
      textarea:
        'w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-vtt-golden resize-none leading-relaxed',
      select:
        'w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer',
      checkboxText: 'text-xs text-neutral-300',
      checkboxAccent: 'accent-vtt-golden',
      rollButton:
        'flex items-center gap-1 text-[10px] text-vtt-golden bg-vtt-golden/10 hover:bg-vtt-golden/20 px-2 py-0.5 rounded-md border border-vtt-golden/30 transition-colors cursor-pointer shrink-0',
      badge: 'bg-neutral-800 text-vtt-golden border border-neutral-700',
      modifierChip:
        'text-xs font-bold font-mono text-vtt-golden shrink-0 px-2 py-1 rounded bg-black/40 border border-neutral-800',
      techTag: 'VTT'
    }
  }
}

export const SHEET_THEME_LIST = Object.values(SHEET_THEMES)

export function getSheetTheme(themeId?: string | null): SheetThemeDefinition {
  if (themeId && themeId in SHEET_THEMES) {
    return SHEET_THEMES[themeId as SheetThemeId]
  }
  return SHEET_THEMES.dnd // Default theme is D&D 5e
}

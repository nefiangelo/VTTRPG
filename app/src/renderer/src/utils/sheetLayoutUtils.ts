import type { SheetFieldWidth } from '../../../preload/index.d'

export const WIDTH_OPTIONS: { value: SheetFieldWidth; label: string; desc: string; colClass: string }[] = [
  { value: '1/4', label: '1/4 (25%)', desc: 'Compacto (ex: Nível, CA, Modificadores)', colClass: 'col-span-12 sm:col-span-6 md:col-span-3' },
  { value: '1/3', label: '1/3 (33%)', desc: 'Pequeno (ex: Atributos, PV)', colClass: 'col-span-12 sm:col-span-6 md:col-span-4' },
  { value: '1/2', label: '1/2 (50%)', desc: 'Médio (ex: Nome, Jogador, Dados de Vida)', colClass: 'col-span-12 sm:col-span-6' },
  { value: '2/3', label: '2/3 (66%)', desc: 'Médio-Largo', colClass: 'col-span-12 md:col-span-8' },
  { value: '3/4', label: '3/4 (75%)', desc: 'Largo', colClass: 'col-span-12 md:col-span-9' },
  { value: 'full', label: 'Inteiro (100%)', desc: 'Largura total (ex: Textos longos, listas)', colClass: 'col-span-12' }
]

export function getWidthColClass(width: SheetFieldWidth): string {
  const match = WIDTH_OPTIONS.find((w) => w.value === width)
  return match ? match.colClass : 'col-span-12 sm:col-span-6'
}

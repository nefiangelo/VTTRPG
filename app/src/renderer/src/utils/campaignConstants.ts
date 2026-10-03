import type { Campaign } from '../../../preload/index.d'

export const STATUS_LABEL: Record<Campaign['status'], string> = {
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Finalizada',
}

export const STATUS_COLOR: Record<Campaign['status'], string> = {
  active: 'bg-green-700/90 border border-green-500/50',
  paused: 'bg-yellow-700/90 border border-yellow-500/50',
  finished: 'bg-neutral-600/90 border border-neutral-400/50',
}

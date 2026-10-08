import type { ContentType, AttributeField, RpgSystemFull } from '../../../preload/index.d'

export interface ContentTypeMeta {
  value: ContentType
  label: string
  singularLabel: string
  emoji: string
  description: string
}

export const CONTENT_TYPE_LIST: ContentTypeMeta[] = [
  { value: 'class', label: 'Classes', singularLabel: 'Classe', emoji: '⚔️', description: 'Classes de personagens (ex: Bárbaro, Mago, Ladino)' },
  { value: 'race', label: 'Raças / Espécies', singularLabel: 'Raça', emoji: '🧝', description: 'Espécies e raças jogáveis (ex: Elfo, Anão, Humano)' },
  { value: 'subclass', label: 'Subclasses', singularLabel: 'Subclasse', emoji: '🌟', description: 'Especializações e arquétipos (ex: Caminho do Furioso)' },
  { value: 'spell', label: 'Magias', singularLabel: 'Magia', emoji: '✨', description: 'Feitiços, truques e rituais (ex: Bola de Fogo, Curar Ferimentos)' },
  { value: 'item', label: 'Itens & Equipamentos', singularLabel: 'Item', emoji: '🗡️', description: 'Armas, armaduras, consumíveis e itens mágicos' },
  { value: 'feat', label: 'Talentos', singularLabel: 'Talento', emoji: '💡', description: 'Vantagens e talentos especiais (ex: Alerta, Sortudo)' },
  { value: 'background', label: 'Históricos', singularLabel: 'Histórico', emoji: '📜', description: 'Origens e históricos de vida (ex: Soldado, Acólito)' },
  { value: 'monster', label: 'Monstros & NPCs', singularLabel: 'Monstro', emoji: '👹', description: 'Criaturas, adversários e fichas de monstros' },
]

export const DEFAULT_CONTENT_FIELDS: Record<ContentType, AttributeField[]> = {
  class: [
    { key: 'hit_die', label: 'Dado de Vida', type: 'text', placeholder: 'd12, d10, d8, d6' },
    { key: 'primary_ability', label: 'Atributo Primário', type: 'text', placeholder: 'Força, Destreza, Inteligência...' },
    { key: 'saving_throws', label: 'Salvaguardas', type: 'list', placeholder: 'str, con' },
    { key: 'armor_proficiencies', label: 'Proficiências com Armaduras', type: 'list', placeholder: 'Leve, Média, Pesada, Escudos' },
    { key: 'weapon_proficiencies', label: 'Proficiências com Armas', type: 'list', placeholder: 'Simples, Marciais' },
    { key: 'equipment', label: 'Equipamento Inicial', type: 'textarea', placeholder: 'Equipamentos concedidos no 1º nível...' },
    { key: 'description', label: 'Descrição da Classe', type: 'textarea', placeholder: 'Visão geral, estilo de jogo e lore da classe...' },
  ],
  spell: [
    { key: 'level', label: 'Nível da Magia', type: 'number', placeholder: '0 para truque, 1 a 9' },
    { key: 'school', label: 'Escola de Magia', type: 'text', placeholder: 'Evocação, Adivinhação, Ilusão...' },
    { key: 'casting_time', label: 'Tempo de Conjuração', type: 'text', placeholder: '1 ação, 1 ação bônus, 1 reação...' },
    { key: 'range', label: 'Alcance', type: 'text', placeholder: 'Toque, 18m / 60 ft, Pessoal...' },
    { key: 'components', label: 'Componentes', type: 'list', placeholder: 'V, S, M (diamante de 50po)' },
    { key: 'duration', label: 'Duração', type: 'text', placeholder: 'Instantânea, 1 minuto (conc)...' },
    { key: 'classes', label: 'Classes Conjuradoras', type: 'list', placeholder: 'Clérigo, Mago, Bruxo...' },
    { key: 'description', label: 'Descrição / Efeito', type: 'textarea', placeholder: 'Efeitos detalhados, dano e regras da magia...' },
  ],
  item: [
    { key: 'cat', label: 'Categoria', type: 'text', placeholder: 'arma, armadura, poção, item mágico...' },
    { key: 'cost', label: 'Custo', type: 'text', placeholder: '15 po, 50 pp...' },
    { key: 'weight', label: 'Peso', type: 'number', placeholder: 'Peso em lb / kg' },
    { key: 'damage', label: 'Dano', type: 'text', placeholder: '1d8 cortante, 1d6 perfurante...' },
    { key: 'ac', label: 'Classe de Armadura (CA)', type: 'text', placeholder: '14 + DES, +2...' },
    { key: 'properties', label: 'Propriedades', type: 'list', placeholder: 'Versátil, Pesada, Acuidade...' },
    { key: 'description', label: 'Descrição do Item', type: 'textarea', placeholder: 'Propriedades especiais e histórico do item...' },
  ],
  race: [
    { key: 'speed', label: 'Deslocamento', type: 'text', placeholder: '9m / 30 ft' },
    { key: 'size', label: 'Tamanho', type: 'text', placeholder: 'Médio, Pequeno' },
    { key: 'languages', label: 'Idiomas', type: 'list', placeholder: 'Comum, Élfico, Anão' },
    { key: 'traits', label: 'Características Raciais', type: 'textarea', placeholder: 'Visão no escuro, ancestral feérico...' },
    { key: 'description', label: 'Descrição da Espécie', type: 'textarea', placeholder: 'Origem, cultura e traços físicos...' },
  ],
  subclass: [
    { key: 'class', label: 'Classe Pai', type: 'text', placeholder: 'Guerreiro, Paladino, Mago...' },
    { key: 'description', label: 'Descrição da Subclasse', type: 'textarea', placeholder: 'Tema e arquétipo da subclasse...' },
  ],
  feat: [
    { key: 'prerequisite', label: 'Pré-requisito', type: 'text', placeholder: 'Força 13+, Conjurador de Magias...' },
    { key: 'description', label: 'Descrição do Talento', type: 'textarea', placeholder: 'Benefícios concedidos pelo talento...' },
  ],
  background: [
    { key: 'skills', label: 'Perícias Concedidas', type: 'list', placeholder: 'Atletismo, Percepção' },
    { key: 'tools', label: 'Ferramentas / Kits', type: 'list', placeholder: 'Kit de herbalismo, Dados de jogo' },
    { key: 'languages', label: 'Idiomas Adicionais', type: 'text', placeholder: '1 idioma à sua escolha' },
    { key: 'feature', label: 'Habilidade de Histórico', type: 'text', placeholder: 'Nome da característica especial' },
    { key: 'equipment', label: 'Equipamento', type: 'textarea', placeholder: 'Roupas de viajante, bolsa com 15 po...' },
    { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Histórico pessoal e conexões com o mundo...' },
  ],
  monster: [
    { key: 'cr', label: 'Nível de Desafio (CR)', type: 'text', placeholder: '1/4, 2, 10, 20' },
    { key: 'size', label: 'Tamanho', type: 'text', placeholder: 'Médio, Grande, Enorme' },
    { key: 'type', label: 'Tipo de Criatura', type: 'text', placeholder: 'Humanoide, Dragão, Monstruosidade' },
    { key: 'ac', label: 'Classe de Armadura (CA)', type: 'number', placeholder: '15' },
    { key: 'hp', label: 'Pontos de Vida (PV)', type: 'text', placeholder: '65 (10d10 + 10)' },
    { key: 'speed', label: 'Deslocamento', type: 'text', placeholder: '9m, voo 18m' },
    { key: 'actions', label: 'Ações e Ataques', type: 'textarea', placeholder: 'Garras: +5 para acertar, dano 2d6+3 cortante...' },
    { key: 'description', label: 'Descrição e Ecologia', type: 'textarea', placeholder: 'Comportamento, covil e lore da criatura...' },
  ],
}

/**
 * Gets the fixed fields defined for a content type in a system.
 * If the system has explicit configuration, it uses it.
 * If not defined at all, falls back to the default fields for that type.
 */
export function getContentFieldsForType(
  system: RpgSystemFull | null | undefined,
  type: ContentType
): AttributeField[] {
  if (!system) return DEFAULT_CONTENT_FIELDS[type] ?? []

  const cf = system.structure?.contentFields
  if (cf && type in cf && Array.isArray(cf[type])) {
    return cf[type]!
  }

  return DEFAULT_CONTENT_FIELDS[type] ?? []
}

export const DEFAULT_MODULAR_SECTIONS: import('../../../preload/index.d').ModularSectionConfig[] = [
  { id: 'inventory', title: 'Inventário & Itens', contentType: 'item', enabled: true },
  { id: 'spells', title: 'Grimório de Magias', contentType: 'spell', enabled: true },
  { id: 'features', title: 'Habilidades & Talentos', contentType: 'feat', enabled: true },
  { id: 'notes', title: 'Biografia & Anotações', enabled: true }
]

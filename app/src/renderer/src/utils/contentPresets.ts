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

// Preset Oficial D&D 5e / 2024 (Baseado na ficha oficial e Imagem 2)
export const DEFAULT_CUSTOM_SHEET_SECTIONS: import('../../../preload/index.d').SheetCustomSection[] = [
  {
    id: 'sec-dnd-id',
    title: 'Identidade & Antecedentes',
    description: 'Registro oficial de identificação e linhagem do aventureiro',
    column: 'left',
    fields: [
      { id: 'f-name', key: 'character_name', label: 'Character Name', type: 'text', width: 'full', placeholder: 'Nome do Personagem' },
      { id: 'f-bg', key: 'background', label: 'Background', type: 'reference', referenceType: 'background', width: '1/2', placeholder: 'Antecedente...' },
      { id: 'f-class', key: 'class', label: 'Class', type: 'reference', referenceType: 'class', width: '1/2', placeholder: 'Classe...' },
      { id: 'f-species', key: 'species', label: 'Species', type: 'reference', referenceType: 'race', width: '1/2', placeholder: 'Espécie / Raça...' },
      { id: 'f-subclass', key: 'subclass', label: 'Subclass', type: 'reference', referenceType: 'subclass', width: '1/2', placeholder: 'Subclasse...' },
      { id: 'f-level', key: 'level', label: 'Level', type: 'number', width: '1/4', defaultValue: 1 },
      { id: 'f-prof', key: 'prof_bonus', label: 'Proficiency', type: 'number', width: '1/4', defaultValue: 2 },
      { id: 'f-ac', key: 'armor_class', label: 'Armor Class', type: 'number', width: '1/4', defaultValue: 14 },
      { id: 'f-speed', key: 'speed', label: 'Speed', type: 'text', width: '1/4', defaultValue: '9m (30ft)' }
    ]
  },
  {
    id: 'sec-dnd-abilities',
    title: 'Atributos & Modificadores',
    description: 'Valores centrais de habilidade e modificadores de rolagem com d20',
    column: 'right',
    fields: [
      { id: 'f-str', key: 'strength', label: 'Força (STR)', type: 'number', width: '1/3', defaultValue: 16, isModifier: true },
      { id: 'f-dex', key: 'dexterity', label: 'Destreza (DEX)', type: 'number', width: '1/3', defaultValue: 14, isModifier: true },
      { id: 'f-con', key: 'constitution', label: 'Constituição (CON)', type: 'number', width: '1/3', defaultValue: 15, isModifier: true },
      { id: 'f-int', key: 'intelligence', label: 'Inteligência (INT)', type: 'number', width: '1/3', defaultValue: 10, isModifier: true },
      { id: 'f-wis', key: 'wisdom', label: 'Sabedoria (WIS)', type: 'number', width: '1/3', defaultValue: 12, isModifier: true },
      { id: 'f-cha', key: 'charisma', label: 'Carisma (CHA)', type: 'number', width: '1/3', defaultValue: 8, isModifier: true }
    ]
  },
  {
    id: 'sec-dnd-combat',
    title: 'Vitalidade & Sobrevivência',
    description: 'Pontos de vida, dados de vida e salvaguardas',
    column: 'right',
    fields: [
      { id: 'f-hp-cur', key: 'hp_current', label: 'Current HP', type: 'number', width: '1/3', defaultValue: 28 },
      { id: 'f-hp-max', key: 'hp_max', label: 'Max HP', type: 'number', width: '1/3', defaultValue: 28 },
      { id: 'f-hp-temp', key: 'hp_temp', label: 'Temp HP', type: 'number', width: '1/3', defaultValue: 0 },
      { id: 'f-hit-dice', key: 'hit_dice', label: 'Hit Dice', type: 'text', width: '1/2', defaultValue: '3d10' },
      { id: 'f-death-saves', key: 'death_saves', label: 'Death Saves', type: 'text', width: '1/2', placeholder: 'Sucessos: O O O | Falhas: O O O' }
    ]
  },
  {
    id: 'sec-dnd-notes',
    title: 'Características & Proficiências',
    description: 'Talentos de classe, proficiências em armas e idiomas',
    column: 'left',
    fields: [
      { id: 'f-features', key: 'class_features', label: 'Features & Traits', type: 'textarea', width: '1/2', placeholder: 'Ação Ágil, Segundo Fôlego, Visão no Escuro...' },
      { id: 'f-profs', key: 'proficiencies', label: 'Proficiencies & Languages', type: 'textarea', width: '1/2', placeholder: 'Armas Marciais, Armaduras Pesadas, Comum, Élfico...' }
    ]
  }
]

// Preset Oficial Vampiro: A Máscara / VTM White Wolf (Baseado na Imagem 1)
export const VAMPIRE_SHEET_SECTIONS: import('../../../preload/index.d').SheetCustomSection[] = [
  {
    id: 'sec-vtm-id',
    title: 'Identidade & Linhagem',
    description: 'Nome, Clã, Geração e histórico do Membro',
    fields: [
      { id: 'v-name', key: 'character_name', label: 'Nome', type: 'text', width: '1/3', placeholder: 'Nome do Vampiro' },
      { id: 'v-nature', key: 'nature', label: 'Natureza', type: 'text', width: '1/3', placeholder: 'Arquiteto, Rebelde...' },
      { id: 'v-gen', key: 'generation', label: 'Geração', type: 'text', width: '1/3', defaultValue: '12ª' },
      { id: 'v-player', key: 'player_name', label: 'Jogador', type: 'text', width: '1/3', placeholder: 'Nome do Jogador' },
      { id: 'v-demeanor', key: 'demeanor', label: 'Comportamento', type: 'text', width: '1/3', placeholder: 'Solitário, Juiz...' },
      { id: 'v-sire', key: 'sire', label: 'Senhor', type: 'text', width: '1/3', placeholder: 'Nome do Criador' },
      { id: 'v-chronicle', key: 'chronicle', label: 'Crônica', type: 'text', width: '1/3', placeholder: 'Noites de Sangue...' },
      { id: 'v-clan', key: 'clan', label: 'Clã', type: 'text', width: '1/3', placeholder: 'Ventrue, Brujah, Toreador...' },
      { id: 'v-concept', key: 'concept', label: 'Conceito', type: 'text', width: '1/3', placeholder: 'Magnata da Noite, Artista...' }
    ]
  },
  {
    id: 'sec-vtm-attributes',
    title: 'Atributos (Físicos • Sociais • Mentais)',
    description: 'Trilhas de 8 pontos com paradas de dados d10',
    fields: [
      { id: 'v-str', key: 'strength', label: 'Força', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-cha', key: 'charisma', label: 'Carisma', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-perc', key: 'perception', label: 'Percepção', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-dex', key: 'dexterity', label: 'Destreza', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-man', key: 'manipulation', label: 'Manipulação', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-int', key: 'intelligence', label: 'Inteligência', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-sta', key: 'stamina', label: 'Vigor', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-app', key: 'appearance', label: 'Aparência', type: 'number', width: '1/3', defaultValue: 1, isModifier: true },
      { id: 'v-wit', key: 'wits', label: 'Raciocínio', type: 'number', width: '1/3', defaultValue: 1, isModifier: true }
    ]
  },
  {
    id: 'sec-vtm-abilities',
    title: 'Habilidades (Talentos • Perícias • Conhecimentos)',
    description: 'Capacidades práticas e intelectuais do vampiro',
    fields: [
      { id: 'v-alert', key: 'alertness', label: 'Prontidão', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-ath', key: 'athletics', label: 'Atletismo', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-brawl', key: 'brawl', label: 'Briga', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-stealth', key: 'stealth', label: 'Furtividade', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-guns', key: 'firearms', label: 'Armas de Fogo', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-melee', key: 'melee', label: 'Armas Brancas', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-acad', key: 'academics', label: 'Acadêmicos', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-invest', key: 'investigation', label: 'Investigação', type: 'number', width: '1/3', defaultValue: 0, isModifier: true },
      { id: 'v-occult', key: 'occult', label: 'Ocultismo', type: 'number', width: '1/3', defaultValue: 0, isModifier: true }
    ]
  },
  {
    id: 'sec-vtm-virtues',
    title: 'Vantagens, Humanidade & Sangue',
    description: 'Reservatório de vitae e estado da alma',
    fields: [
      { id: 'v-disc', key: 'disciplines', label: 'Disciplinas', type: 'textarea', width: '1/2', placeholder: 'Potência ●●, Rapidez ●, Dominação ●●●' },
      { id: 'v-bg', key: 'backgrounds', label: 'Antecedentes', type: 'textarea', width: '1/2', placeholder: 'Recursos ●●●, Aliados ●●, Rebanho ●' },
      { id: 'v-humanity', key: 'humanity', label: 'Humanidade', type: 'number', width: '1/3', defaultValue: 7, isModifier: true },
      { id: 'v-will', key: 'willpower', label: 'Força de Vontade', type: 'number', width: '1/3', defaultValue: 5, isModifier: true },
      { id: 'v-blood', key: 'blood_pool', label: 'Pontos de Sangue', type: 'number', width: '1/3', defaultValue: 10 }
    ]
  }
]

// Preset Oficial Cyberpunk RED (Baseado em RTG CPR Fillable Sheet)
export const CYBERPUNK_SHEET_SECTIONS: import('../../../preload/index.d').SheetCustomSection[] = [
  {
    id: 'sec-cpr-handle',
    title: 'IDENTIDADE & STREET CRED // CPR',
    description: 'DADOS PESSOAIS DO EDGERUNNER',
    fields: [
      { id: 'cp-handle', key: 'character_name', label: 'HANDLE', type: 'text', width: '1/3', placeholder: 'Codinome nas ruas...' },
      { id: 'cp-role', key: 'role', label: 'ROLE', type: 'text', width: '1/3', placeholder: 'Solo, Netrunner, Tech, Rockerboy...' },
      { id: 'cp-rank', key: 'role_rank', label: 'ROLE RANK', type: 'number', width: '1/3', defaultValue: 4 },
      { id: 'cp-rep', key: 'reputation', label: 'REPUTAÇÃO (REP)', type: 'number', width: '1/2', defaultValue: 2 },
      { id: 'cp-aliases', key: 'aliases', label: 'ALIASES / RG REAL', type: 'text', width: '1/2', placeholder: 'Nomes nas corporações...' }
    ]
  },
  {
    id: 'sec-cpr-stats',
    title: 'STATISTICS (STATS PRIMÁRIOS 1-10)',
    description: 'PARÂMETROS BIOMÉTRICOS & NEURAIS',
    fields: [
      { id: 'cp-int', key: 'stat_int', label: 'INT', type: 'number', width: '1/4', defaultValue: 7, isModifier: true },
      { id: 'cp-ref', key: 'stat_ref', label: 'REF', type: 'number', width: '1/4', defaultValue: 8, isModifier: true },
      { id: 'cp-dex', key: 'stat_dex', label: 'DEX', type: 'number', width: '1/4', defaultValue: 7, isModifier: true },
      { id: 'cp-tech', key: 'stat_tech', label: 'TECH', type: 'number', width: '1/4', defaultValue: 5, isModifier: true },
      { id: 'cp-cool', key: 'stat_cool', label: 'COOL', type: 'number', width: '1/4', defaultValue: 6, isModifier: true },
      { id: 'cp-will', key: 'stat_will', label: 'WILL', type: 'number', width: '1/4', defaultValue: 6, isModifier: true },
      { id: 'cp-move', key: 'stat_move', label: 'MOVE', type: 'number', width: '1/4', defaultValue: 6, isModifier: true },
      { id: 'cp-body', key: 'stat_body', label: 'BODY', type: 'number', width: '1/4', defaultValue: 7, isModifier: true }
    ]
  },
  {
    id: 'sec-cpr-combat',
    title: 'SAÚDE, BLINDAGEM (SP) & COMBATE',
    description: 'CONDIÇÃO FÍSICA E PROTEÇÃO BALÍSTICA',
    fields: [
      { id: 'cp-hp', key: 'hit_points', label: 'HP ATUAL / TOTAL', type: 'number', width: '1/4', defaultValue: 40 },
      { id: 'cp-wound', key: 'seriously_wounded', label: 'FERIMENTO GRAVE', type: 'number', width: '1/4', defaultValue: 20 },
      { id: 'cp-death', key: 'death_save', label: 'DEATH SAVE', type: 'number', width: '1/4', defaultValue: 7 },
      { id: 'cp-humanity', key: 'humanity', label: 'HUMANIDADE (EMP)', type: 'text', width: '1/4', defaultValue: '48 / 50' },
      { id: 'cp-sp-head', key: 'sp_head', label: 'SP CABEÇA', type: 'number', width: '1/2', defaultValue: 11 },
      { id: 'cp-sp-body', key: 'sp_body', label: 'SP CORPO', type: 'number', width: '1/2', defaultValue: 11 }
    ]
  },
  {
    id: 'sec-cpr-cyber',
    title: 'CIBERMÉTICA & EQUIPAMENTOS TÁTICOS',
    description: 'HARDWARE NEURAL E ARSENAL',
    fields: [
      { id: 'cp-cyber', key: 'cyberware', label: 'CIBERWARE INSTALADO', type: 'textarea', width: '1/2', placeholder: 'Interface Plug, Wolvers, Cybereye c/ Termografia...' },
      { id: 'cp-weapons', key: 'weapons', label: 'ARMAS & MUNIÇÕES', type: 'textarea', width: '1/2', placeholder: 'Militech Crusher (3d6), Dai Lung Streetmaster (2d6)...' }
    ]
  }
]


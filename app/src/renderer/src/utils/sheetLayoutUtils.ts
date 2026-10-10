import type {
  SheetCustomSection,
  SheetCustomField,
  CanvasSheetLayout,
  CanvasElement,
  CanvasElementType
} from '../../../preload/index.d'

export const DEFAULT_CANVAS_WIDTH = 1040
export const DEFAULT_CANVAS_HEIGHT = 1400
export const DEFAULT_GRID_SIZE = 8

export interface ComponentPresetDef {
  type: CanvasElementType
  name: string
  defaultWidth: number
  defaultHeight: number
  description: string
  shortcut: string
}

export const COMPONENT_CATALOG: ComponentPresetDef[] = [
  {
    type: 'frame',
    name: 'Frame (Quadro)',
    defaultWidth: 340,
    defaultHeight: 260,
    description: 'Área delimitada para agrupar campos e organizar seções',
    shortcut: 'F'
  },
  {
    type: 'text_field',
    name: 'Campo de Entrada',
    defaultWidth: 200,
    defaultHeight: 52,
    description: 'Entrada de dados customizada (texto ou número com modificador)',
    shortcut: 'T'
  },
  {
    type: 'label',
    name: 'Rótulo / Texto',
    defaultWidth: 160,
    defaultHeight: 32,
    description: 'Texto estático, cabeçalho de seção ou aviso',
    shortcut: 'L'
  },
  {
    type: 'stat',
    name: 'Box de Atributo',
    defaultWidth: 92,
    defaultHeight: 104,
    description: 'Caixa de atributo RPG clássica com valor e modificador (+2)',
    shortcut: 'S'
  },
  {
    type: 'textarea',
    name: 'Área de Texto',
    defaultWidth: 300,
    defaultHeight: 130,
    description: 'Campo de texto multilinha para histórico, magias ou notas',
    shortcut: 'A'
  },
  {
    type: 'dots',
    name: 'Trilha de Pontos',
    defaultWidth: 200,
    defaultHeight: 46,
    description: 'Trilha de pontos clicáveis (ex: Sangue, Estresse, Munição)',
    shortcut: 'D'
  },
  {
    type: 'checkbox',
    name: 'Checkbox / Marcador',
    defaultWidth: 160,
    defaultHeight: 36,
    description: 'Marcador booleano (ex: Proficiência, Salvaguarda)',
    shortcut: 'C'
  },
  {
    type: 'divider',
    name: 'Divisor / Linha',
    defaultWidth: 280,
    defaultHeight: 4,
    description: 'Linha decorativa para separar conteúdos',
    shortcut: 'R'
  }
]

export function snap(val: number, gridSize = DEFAULT_GRID_SIZE, enabled = true): number {
  if (!enabled) return Math.round(val)
  return Math.round(val / gridSize) * gridSize
}

export function generateCanvasId(prefix = 'elem'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 7)}`
}

export function slugify(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Converte seções legadas (columns / flow) para uma tela Canvas livre com Frames e campos posicionados
 */
export function convertSectionsToCanvas(sections: SheetCustomSection[]): CanvasSheetLayout {
  const elements: CanvasElement[] = []
  let currentY = 32
  let currentX = 32
  const frameWidth = 460
  const colGap = 24

  sections.forEach((sec, sIdx) => {
    const frameId = sec.id || `frame_${sIdx}`
    // Calcular altura necessária com base no número de campos
    const rows = Math.ceil(sec.fields.length / 2)
    const frameHeight = Math.max(180, 70 + rows * 62)

    // Posicionar em duas colunas na tela
    if (sIdx % 2 === 0 && sIdx > 0) {
      currentX = 32
      currentY += frameHeight + 24
    } else if (sIdx % 2 === 1) {
      currentX = 32 + frameWidth + colGap
    }

    elements.push({
      id: frameId,
      type: 'frame',
      name: sec.title || `Quadro ${sIdx + 1}`,
      title: sec.title || `Seção ${sIdx + 1}`,
      subtitle: sec.description || '',
      showHeader: true,
      x: currentX,
      y: currentY,
      width: frameWidth,
      height: frameHeight,
      backgroundColor: 'rgba(23, 23, 28, 0.75)',
      borderColor: '#374151',
      borderWidth: 1,
      borderRadius: 10
    })

    // Adiciona os campos com coordenadas relativas ao Frame
    sec.fields.forEach((field, fIdx) => {
      const col = fIdx % 2
      const row = Math.floor(fIdx / 2)
      const isFull = field.width === 'full'
      const fWidth = isFull ? frameWidth - 32 : (frameWidth - 44) / 2
      const fx = isFull ? 16 : 16 + col * (fWidth + 12)
      const fy = 54 + row * 62

      let mappedType: CanvasElementType = 'text_field'
      if (field.type === 'stat') mappedType = 'stat'
      else if (field.type === 'label') mappedType = 'label'
      else if (field.type === 'textarea') mappedType = 'textarea'
      else if (field.type === 'dots') mappedType = 'dots'
      else if (field.type === 'checkbox') mappedType = 'checkbox'

      elements.push({
        id: field.id || generateCanvasId('fld'),
        type: mappedType,
        name: field.label,
        parentId: frameId,
        x: fx,
        y: fy,
        width: fWidth,
        height: mappedType === 'textarea' ? 100 : 50,
        label: field.label,
        key: field.key || slugify(field.label),
        inputType: field.type === 'number' ? 'number' : 'text',
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue,
        formula: field.formula
      })
    })

    if (sIdx % 2 === 1) {
      currentY += frameHeight + 24
      currentX = 32
    }
  })

  return {
    width: DEFAULT_CANVAS_WIDTH,
    height: Math.max(DEFAULT_CANVAS_HEIGHT, currentY + 120),
    elements,
    snapToGrid: true,
    gridSize: DEFAULT_GRID_SIZE
  }
}

/**
 * Converte elementos do Canvas de volta para formato de seções (para compatibilidade transparente com outras partes do sistema)
 */
export function syncCanvasToSections(canvas: CanvasSheetLayout): SheetCustomSection[] {
  const frames = canvas.elements.filter((e) => e.type === 'frame' && !e.parentId)
  const nonFramesWithoutParent = canvas.elements.filter((e) => e.type !== 'frame' && !e.parentId)

  const sections: SheetCustomSection[] = []

  // Converte cada Frame para uma Seção com seus campos filhos
  frames.forEach((frame) => {
    const children = canvas.elements.filter((e) => e.parentId === frame.id)
    const fields: SheetCustomField[] = children.map((c) => ({
      id: c.id,
      key: c.key || slugify(c.label || c.name),
      label: c.label || c.name,
      type:
        c.type === 'text_field'
          ? c.inputType === 'number'
            ? 'number'
            : 'text'
          : c.type === 'stat'
            ? 'stat'
            : c.type === 'label'
              ? 'label'
              : c.type === 'textarea'
                ? 'textarea'
                : c.type === 'dots'
                  ? 'dots'
                  : c.type === 'checkbox'
                    ? 'checkbox'
                    : 'text',
      width: '1/2',
      placeholder: c.placeholder,
      defaultValue: c.defaultValue,
      formula: c.formula
    }))

    sections.push({
      id: frame.id,
      title: frame.title || frame.name,
      description: frame.subtitle,
      fields
    })
  })

  // Se houver elementos avulsos na tela (fora de frames), agrupa em uma seção "Geral"
  if (nonFramesWithoutParent.length > 0) {
    sections.push({
      id: 'sec_free_canvas',
      title: 'Elementos Livres da Ficha',
      fields: nonFramesWithoutParent.map((c) => ({
        id: c.id,
        key: c.key || slugify(c.label || c.name),
        label: c.label || c.name,
        type:
          c.type === 'text_field'
            ? c.inputType === 'number'
              ? 'number'
              : 'text'
            : c.type === 'stat'
              ? 'stat'
              : c.type === 'label'
                ? 'label'
                : c.type === 'textarea'
                  ? 'textarea'
                  : c.type === 'dots'
                    ? 'dots'
                    : c.type === 'checkbox'
                      ? 'checkbox'
                      : 'text',
        width: '1/2',
        placeholder: c.placeholder,
        defaultValue: c.defaultValue,
        formula: c.formula
      }))
    })
  }

  return sections
}

/**
 * Cria um novo elemento inicial baseado no tipo de componente
 */
export function createDefaultCanvasElement(
  type: CanvasElementType,
  x: number,
  y: number,
  parentId: string | null = null
): CanvasElement {
  const cat = COMPONENT_CATALOG.find((c) => c.type === type)
  const id = generateCanvasId(type.substr(0, 3))

  switch (type) {
    case 'frame':
      return {
        id,
        type: 'frame',
        name: 'Novo Quadro',
        title: 'Título do Quadro',
        subtitle: 'Subtítulo descritivo',
        showHeader: true,
        x,
        y,
        width: cat?.defaultWidth || 340,
        height: cat?.defaultHeight || 260,
        backgroundColor: 'rgba(23, 23, 28, 0.85)',
        borderColor: '#404040',
        borderWidth: 1,
        borderRadius: 12
      }

    case 'text_field':
      return {
        id,
        type: 'text_field',
        name: 'Campo de Texto',
        label: 'Nome do Campo',
        key: 'novo_campo',
        inputType: 'text',
        placeholder: 'Insira aqui...',
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 200,
        height: cat?.defaultHeight || 52
      }

    case 'label':
      return {
        id,
        type: 'label',
        name: 'Texto / Rótulo',
        textContent: 'Texto de Exibição',
        fontSize: 16,
        fontWeight: 'bold',
        textColor: '#E9D180',
        textAlign: 'left',
        fontFamily: 'cinzel',
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 160,
        height: cat?.defaultHeight || 32
      }

    case 'stat':
      return {
        id,
        type: 'stat',
        name: 'Atributo',
        statLabel: 'FORÇA',
        statKey: 'forca',
        statScore: 10,
        showModifier: true,
        statFormula: '1d20+@{forca}',
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 92,
        height: cat?.defaultHeight || 104
      }

    case 'textarea':
      return {
        id,
        type: 'textarea',
        name: 'Anotações',
        label: 'Histórico / Notas',
        key: 'historico_notas',
        placeholder: 'Escreva detalhes, lore ou magias...',
        rows: 4,
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 300,
        height: cat?.defaultHeight || 130
      }

    case 'dots':
      return {
        id,
        type: 'dots',
        name: 'Pontos / Pips',
        label: 'Pontos de Sangue',
        key: 'sangue_pontos',
        maxDots: 8,
        dotStyle: 'circle',
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 200,
        height: cat?.defaultHeight || 46
      }

    case 'checkbox':
      return {
        id,
        type: 'checkbox',
        name: 'Marcador',
        label: 'Proficiente',
        key: 'proficiente',
        checked: false,
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 160,
        height: cat?.defaultHeight || 36
      }

    case 'divider':
      return {
        id,
        type: 'divider',
        name: 'Divisor',
        textColor: '#404040',
        parentId,
        x,
        y,
        width: cat?.defaultWidth || 280,
        height: cat?.defaultHeight || 4
      }

    default:
      return {
        id,
        type,
        name: 'Elemento',
        parentId,
        x,
        y,
        width: 160,
        height: 48
      }
  }
}

/**
 * Cria o layout inicial da ficha D&D 5e oficial em formato Canvas livre
 */
export function createDnd5eCanvasPreset(): CanvasSheetLayout {
  const elements: CanvasElement[] = [
    // 1. FRAME DE CABEÇALHO (Dados do Aventureiro)
    {
      id: 'frame_header',
      type: 'frame',
      name: 'Cabeçalho do Personagem',
      title: 'DADOS DO PERSONAGEM',
      subtitle: 'Identidade e Informações Básicas',
      showHeader: true,
      x: 32,
      y: 28,
      width: 976,
      height: 124,
      backgroundColor: 'rgba(23, 23, 28, 0.9)',
      borderColor: '#D4AF37',
      borderWidth: 1,
      borderRadius: 12
    },
    {
      id: 'fld_char_name',
      type: 'text_field',
      name: 'Nome do Personagem',
      label: 'NOME DO PERSONAGEM',
      key: 'character_name',
      inputType: 'text',
      placeholder: 'ex: Arandir das Sombras',
      parentId: 'frame_header',
      x: 20,
      y: 50,
      width: 250,
      height: 54
    },
    {
      id: 'fld_char_class',
      type: 'text_field',
      name: 'Classe & Nível',
      label: 'CLASSE & NÍVEL',
      key: 'class_level',
      inputType: 'text',
      placeholder: 'ex: Ladino 5',
      parentId: 'frame_header',
      x: 284,
      y: 50,
      width: 190,
      height: 54
    },
    {
      id: 'fld_char_race',
      type: 'text_field',
      name: 'Raça / Ancestralidade',
      label: 'RAÇA / ANCESTRALIDADE',
      key: 'race',
      inputType: 'text',
      placeholder: 'ex: Elfo da Floresta',
      parentId: 'frame_header',
      x: 488,
      y: 50,
      width: 190,
      height: 54
    },
    {
      id: 'fld_char_bg',
      type: 'text_field',
      name: 'Antecedente',
      label: 'ANTECEDENTE',
      key: 'background',
      inputType: 'text',
      placeholder: 'ex: Criminoso',
      parentId: 'frame_header',
      x: 692,
      y: 50,
      width: 264,
      height: 54
    },

    // 2. FRAME DE ATRIBUTOS (6 Habilidades Centrais D&D)
    {
      id: 'frame_attributes',
      type: 'frame',
      name: 'Habilidades & Modificadores',
      title: 'ATRIBUTOS DE HABILIDADE',
      subtitle: 'Valores e Modificadores para Testes e Ataques',
      showHeader: true,
      x: 32,
      y: 172,
      width: 636,
      height: 184,
      backgroundColor: 'rgba(23, 23, 28, 0.9)',
      borderColor: '#374151',
      borderWidth: 1,
      borderRadius: 12
    },
    {
      id: 'stat_str',
      type: 'stat',
      name: 'Força',
      statLabel: 'FORÇA',
      statKey: 'strength',
      statScore: 10,
      showModifier: true,
      statFormula: '1d20+@{mod_strength}',
      parentId: 'frame_attributes',
      x: 20,
      y: 54,
      width: 90,
      height: 106
    },
    {
      id: 'stat_dex',
      type: 'stat',
      name: 'Destreza',
      statLabel: 'DESTREZA',
      statKey: 'dexterity',
      statScore: 14,
      showModifier: true,
      statFormula: '1d20+@{mod_dexterity}',
      parentId: 'frame_attributes',
      x: 122,
      y: 54,
      width: 90,
      height: 106
    },
    {
      id: 'stat_con',
      type: 'stat',
      name: 'Constituição',
      statLabel: 'CONSTITUIÇÃO',
      statKey: 'constitution',
      statScore: 12,
      showModifier: true,
      statFormula: '1d20+@{mod_constitution}',
      parentId: 'frame_attributes',
      x: 224,
      y: 54,
      width: 90,
      height: 106
    },
    {
      id: 'stat_int',
      type: 'stat',
      name: 'Inteligência',
      statLabel: 'INTELIGÊNCIA',
      statKey: 'intelligence',
      statScore: 13,
      showModifier: true,
      statFormula: '1d20+@{mod_intelligence}',
      parentId: 'frame_attributes',
      x: 326,
      y: 54,
      width: 90,
      height: 106
    },
    {
      id: 'stat_wis',
      type: 'stat',
      name: 'Sabedoria',
      statLabel: 'SABEDORIA',
      statKey: 'wisdom',
      statScore: 10,
      showModifier: true,
      statFormula: '1d20+@{mod_wisdom}',
      parentId: 'frame_attributes',
      x: 428,
      y: 54,
      width: 90,
      height: 106
    },
    {
      id: 'stat_cha',
      type: 'stat',
      name: 'Carisma',
      statLabel: 'CARISMA',
      statKey: 'charisma',
      statScore: 16,
      showModifier: true,
      statFormula: '1d20+@{mod_charisma}',
      parentId: 'frame_attributes',
      x: 530,
      y: 54,
      width: 90,
      height: 106
    },

    // 3. FRAME DE COMBATE & VITALIDADE
    {
      id: 'frame_combat',
      type: 'frame',
      name: 'Combate & Defesas',
      title: 'COMBATE & SAÚDE',
      subtitle: 'Armadura, Pontos de Vida e Salvaguardas',
      showHeader: true,
      x: 684,
      y: 172,
      width: 324,
      height: 384,
      backgroundColor: 'rgba(23, 23, 28, 0.9)',
      borderColor: '#D32F2F',
      borderWidth: 1,
      borderRadius: 12
    },
    {
      id: 'fld_ac',
      type: 'text_field',
      name: 'Classe de Armadura (CA)',
      label: 'CLASSE DE ARMADURA',
      key: 'armor_class',
      inputType: 'number',
      defaultValue: 15,
      parentId: 'frame_combat',
      x: 16,
      y: 50,
      width: 140,
      height: 52
    },
    {
      id: 'fld_init',
      type: 'text_field',
      name: 'Iniciativa',
      label: 'INICIATIVA',
      key: 'initiative',
      inputType: 'number',
      defaultValue: 2,
      formula: '1d20+@{initiative}',
      parentId: 'frame_combat',
      x: 168,
      y: 50,
      width: 140,
      height: 52
    },
    {
      id: 'fld_hp',
      type: 'text_field',
      name: 'Pontos de Vida Atuais',
      label: 'PONTOS DE VIDA ATUAIS',
      key: 'hit_points',
      inputType: 'number',
      defaultValue: 32,
      parentId: 'frame_combat',
      x: 16,
      y: 114,
      width: 140,
      height: 52
    },
    {
      id: 'fld_hp_max',
      type: 'text_field',
      name: 'Vida Máxima',
      label: 'PV MÁXIMO',
      key: 'hit_points_max',
      inputType: 'number',
      defaultValue: 32,
      parentId: 'frame_combat',
      x: 168,
      y: 114,
      width: 140,
      height: 52
    },
    {
      id: 'fld_speed',
      type: 'text_field',
      name: 'Deslocamento',
      label: 'DESLOCAMENTO',
      key: 'speed',
      inputType: 'text',
      defaultValue: '9m (30ft)',
      parentId: 'frame_combat',
      x: 16,
      y: 178,
      width: 140,
      height: 52
    },
    {
      id: 'fld_hit_dice',
      type: 'text_field',
      name: 'Dados de Vida',
      label: 'DADOS DE VIDA',
      key: 'hit_dice',
      inputType: 'text',
      defaultValue: '5d8',
      formula: '1d8',
      parentId: 'frame_combat',
      x: 168,
      y: 178,
      width: 140,
      height: 52
    },
    {
      id: 'dots_death_saves',
      type: 'dots',
      name: 'Resistência à Morte',
      label: 'SUCESSOS CONTRA MORTE',
      key: 'death_save_success',
      maxDots: 3,
      parentId: 'frame_combat',
      x: 16,
      y: 242,
      width: 292,
      height: 48
    },
    {
      id: 'chk_inspiration',
      type: 'checkbox',
      name: 'Inspiração',
      label: '★ Inspiração do Mestre',
      key: 'inspiration',
      checked: false,
      parentId: 'frame_combat',
      x: 16,
      y: 304,
      width: 292,
      height: 38
    },

    // 4. FRAME DE PERÍCIAS & PROFICIÊNCIAS
    {
      id: 'frame_skills',
      type: 'frame',
      name: 'Perícias & Habilidades',
      title: 'PERÍCIAS SELECIONADAS',
      subtitle: 'Modificadores e Perícias Treinadas',
      showHeader: true,
      x: 32,
      y: 376,
      width: 636,
      height: 290,
      backgroundColor: 'rgba(23, 23, 28, 0.9)',
      borderColor: '#374151',
      borderWidth: 1,
      borderRadius: 12
    },
    {
      id: 'fld_acrobatics',
      type: 'text_field',
      name: 'Acrobacia',
      label: 'Acrobacia (Des)',
      key: 'acrobatics',
      inputType: 'number',
      defaultValue: 4,
      formula: '1d20+@{acrobatics}',
      parentId: 'frame_skills',
      x: 20,
      y: 50,
      width: 186,
      height: 52
    },
    {
      id: 'fld_stealth',
      type: 'text_field',
      name: 'Furtividade',
      label: 'Furtividade (Des)',
      key: 'stealth',
      inputType: 'number',
      defaultValue: 6,
      formula: '1d20+@{stealth}',
      parentId: 'frame_skills',
      x: 222,
      y: 50,
      width: 186,
      height: 52
    },
    {
      id: 'fld_perception',
      type: 'text_field',
      name: 'Percepção',
      label: 'Percepção (Sab)',
      key: 'perception',
      inputType: 'number',
      defaultValue: 3,
      formula: '1d20+@{perception}',
      parentId: 'frame_skills',
      x: 424,
      y: 50,
      width: 186,
      height: 52
    },
    {
      id: 'fld_athletics',
      type: 'text_field',
      name: 'Atletismo',
      label: 'Atletismo (For)',
      key: 'athletics',
      inputType: 'number',
      defaultValue: 0,
      formula: '1d20+@{athletics}',
      parentId: 'frame_skills',
      x: 20,
      y: 114,
      width: 186,
      height: 52
    },
    {
      id: 'fld_insight',
      type: 'text_field',
      name: 'Intuição',
      label: 'Intuição (Sab)',
      key: 'insight',
      inputType: 'number',
      defaultValue: 2,
      formula: '1d20+@{insight}',
      parentId: 'frame_skills',
      x: 222,
      y: 114,
      width: 186,
      height: 52
    },
    {
      id: 'fld_deception',
      type: 'text_field',
      name: 'Enganação',
      label: 'Enganação (Car)',
      key: 'deception',
      inputType: 'number',
      defaultValue: 5,
      formula: '1d20+@{deception}',
      parentId: 'frame_skills',
      x: 424,
      y: 114,
      width: 186,
      height: 52
    },
    {
      id: 'txt_proficiencies',
      type: 'textarea',
      name: 'Proficiências de Armas & Idiomas',
      label: 'PROFICIÊNCIAS DE ARMAS, ARMADURAS & IDIOMAS',
      key: 'proficiencies_languages',
      placeholder: 'Comum, Élfico, Armas Simples, Espada Curta, Kit de Ladrão...',
      parentId: 'frame_skills',
      x: 20,
      y: 178,
      width: 590,
      height: 94
    },

    // 5. FRAME DE ANOTAÇÕES & CARACTERÍSTICAS
    {
      id: 'frame_features',
      type: 'frame',
      name: 'Habilidades Especiais & Magias',
      title: 'HABILIDADES ESPECIAIS & TALENTOS',
      subtitle: 'Ataques furtivos, características de raça e classe',
      showHeader: true,
      x: 32,
      y: 686,
      width: 976,
      height: 240,
      backgroundColor: 'rgba(23, 23, 28, 0.9)',
      borderColor: '#374151',
      borderWidth: 1,
      borderRadius: 12
    },
    {
      id: 'txt_features_text',
      type: 'textarea',
      name: 'Características Especiais',
      label: 'HABILIDADES DE CLASSE, RAÇA & TALENTOS',
      key: 'features_traits',
      placeholder: 'Ataque Furtivo (3d6), Ação Astuta, Visão no Escuro (18m), Esquiva Sobrenatural...',
      rows: 6,
      parentId: 'frame_features',
      x: 20,
      y: 50,
      width: 936,
      height: 164
    }
  ]

  return {
    width: DEFAULT_CANVAS_WIDTH,
    height: 980,
    elements,
    snapToGrid: true,
    gridSize: DEFAULT_GRID_SIZE
  }
}

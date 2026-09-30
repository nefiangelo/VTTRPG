/**
 * seed-dnd5e.mjs
 * Populates vttrpg.db with D&D 5.5e (2024 PHB) core data.
 * Run from app/ directory:  node scripts/seed-dnd5e.mjs
 */
import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'

function resolveDbPath() {
  const p = process.platform
  let u
  if (p === 'win32') u = join(process.env.APPDATA ?? join(homedir(),'AppData','Roaming'),'app')
  else if (p === 'darwin') u = join(homedir(),'Library','Application Support','app')
  else u = join(process.env.XDG_CONFIG_HOME ?? join(homedir(),'.config'),'app')
  if (!existsSync(u)) mkdirSync(u, { recursive: true })
  return join(u, 'vttrpg.db')
}
const dbPath = resolveDbPath()
console.log('DB:', dbPath)
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS rpg_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE, version TEXT, genre TEXT, description TEXT,
    structure TEXT NOT NULL DEFAULT '{}', created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS system_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rpg_system_id INTEGER NOT NULL REFERENCES rpg_systems(id) ON DELETE CASCADE,
    homebrew_id INTEGER, type TEXT NOT NULL, name TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sc_sys  ON system_content(rpg_system_id);
  CREATE INDEX IF NOT EXISTS idx_sc_type ON system_content(rpg_system_id, type);
`)

const iSys = db.prepare(`
  INSERT INTO rpg_systems (name,slug,version,genre,description,structure)
  VALUES (@name,@slug,@version,@genre,@description,@structure)
  ON CONFLICT(slug) DO UPDATE SET name=excluded.name,version=excluded.version,
    genre=excluded.genre,description=excluded.description,structure=excluded.structure,
    updated_at=datetime('now') RETURNING id`)

const iContent = db.prepare(`
  INSERT INTO system_content (rpg_system_id,homebrew_id,type,name,data)
  VALUES (@rpg_system_id,NULL,@type,@name,@data) ON CONFLICT DO NOTHING`)

function seed(sid,type,entries){
  for(const [name,data] of entries)
    iContent.run({rpg_system_id:sid,type,name,data:JSON.stringify(data)})
}

const SYS = iSys.get({name:'Dungeons & Dragons 5.5e',slug:'dnd-5-5e',version:'2024',genre:'High Fantasy',description:'The 2024 revised edition of D&D 5e (One D&D). Updated classes, species, and rules.',structure:"{\"dice\": [\"d4\", \"d6\", \"d8\", \"d10\", \"d12\", \"d20\", \"d100\"], \"ability_scores\": [{\"key\": \"str\", \"label\": \"Strength\"}, {\"key\": \"dex\", \"label\": \"Dexterity\"}, {\"key\": \"con\", \"label\": \"Constitution\"}, {\"key\": \"int\", \"label\": \"Intelligence\"}, {\"key\": \"wis\", \"label\": \"Wisdom\"}, {\"key\": \"cha\", \"label\": \"Charisma\"}], \"skills\": [{\"key\": \"acrobatics\", \"label\": \"Acrobatics\", \"ability\": \"dex\"}, {\"key\": \"animal_handling\", \"label\": \"Animal Handling\", \"ability\": \"wis\"}, {\"key\": \"arcana\", \"label\": \"Arcana\", \"ability\": \"int\"}, {\"key\": \"athletics\", \"label\": \"Athletics\", \"ability\": \"str\"}, {\"key\": \"deception\", \"label\": \"Deception\", \"ability\": \"cha\"}, {\"key\": \"history\", \"label\": \"History\", \"ability\": \"int\"}, {\"key\": \"insight\", \"label\": \"Insight\", \"ability\": \"wis\"}, {\"key\": \"intimidation\", \"label\": \"Intimidation\", \"ability\": \"cha\"}, {\"key\": \"investigation\", \"label\": \"Investigation\", \"ability\": \"int\"}, {\"key\": \"medicine\", \"label\": \"Medicine\", \"ability\": \"wis\"}, {\"key\": \"nature\", \"label\": \"Nature\", \"ability\": \"int\"}, {\"key\": \"perception\", \"label\": \"Perception\", \"ability\": \"wis\"}, {\"key\": \"performance\", \"label\": \"Performance\", \"ability\": \"cha\"}, {\"key\": \"persuasion\", \"label\": \"Persuasion\", \"ability\": \"cha\"}, {\"key\": \"religion\", \"label\": \"Religion\", \"ability\": \"int\"}, {\"key\": \"sleight_of_hand\", \"label\": \"Sleight of Hand\", \"ability\": \"dex\"}, {\"key\": \"stealth\", \"label\": \"Stealth\", \"ability\": \"dex\"}, {\"key\": \"survival\", \"label\": \"Survival\", \"ability\": \"wis\"}], \"saving_throws\": [\"str\", \"dex\", \"con\", \"int\", \"wis\", \"cha\"], \"conditions\": [\"Blinded\", \"Charmed\", \"Deafened\", \"Exhaustion\", \"Frightened\", \"Grappled\", \"Incapacitated\", \"Invisible\", \"Paralyzed\", \"Petrified\", \"Poisoned\", \"Prone\", \"Restrained\", \"Stunned\", \"Unconscious\"], \"damage_types\": [\"Acid\", \"Bludgeoning\", \"Cold\", \"Fire\", \"Force\", \"Lightning\", \"Necrotic\", \"Piercing\", \"Poison\", \"Psychic\", \"Radiant\", \"Slashing\", \"Thunder\"], \"sheet_template\": {\"sections\": [\"identity\", \"ability_scores\", \"combat\", \"skills\", \"saving_throws\", \"features\", \"spellcasting\", \"equipment\", \"backstory\"], \"combat_fields\": [\"armor_class\", \"initiative\", \"speed\", \"hit_points\", \"hit_dice\", \"death_saves\"], \"identity_fields\": [\"name\", \"species\", \"class\", \"subclass\", \"background\", \"level\", \"experience\", \"alignment\", \"faith\"]}}"})
const SID = SYS.id
console.log(`rpg_system id=${{SID}}`)

const CLASSES = [
  ["Barbarian", {"hit_die": "d12", "primary_ability": "Strength", "saving_throws": ["str", "con"], "armor_proficiencies": ["Light", "Medium", "Shields"], "weapon_proficiencies": ["Simple", "Martial"], "skills": {"choose": 2, "from": ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"]}, "features": {"1": ["Rage (2/long rest)", "Unarmored Defense"], "2": ["Reckless Attack", "Danger Sense"], "3": ["Primal Path"], "5": ["Extra Attack", "Fast Movement"], "9": ["Brutal Strike"], "20": ["Primal Champion"]}, "rage_damage": {"1": 2, "9": 3, "16": 4}}],
  ["Bard", {"hit_die": "d8", "primary_ability": "Charisma", "saving_throws": ["dex", "cha"], "armor_proficiencies": ["Light"], "weapon_proficiencies": ["Simple", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"], "skills": {"choose": 3, "from": "any"}, "spellcasting": {"ability": "cha", "type": "full", "spell_list": "bard"}, "features": {"1": ["Bardic Inspiration (d6)", "Spellcasting"], "2": ["Jack of All Trades"], "3": ["Bard College", "Expertise"], "5": ["Bardic Inspiration (d8)", "Font of Inspiration"], "10": ["Magical Secrets"], "20": ["Superior Inspiration"]}}],
  ["Cleric", {"hit_die": "d8", "primary_ability": "Wisdom", "saving_throws": ["wis", "cha"], "armor_proficiencies": ["Light", "Medium", "Shields"], "weapon_proficiencies": ["Simple"], "skills": {"choose": 2, "from": ["History", "Insight", "Medicine", "Persuasion", "Religion"]}, "spellcasting": {"ability": "wis", "type": "full", "spell_list": "cleric"}, "features": {"1": ["Divine Domain", "Spellcasting"], "2": ["Channel Divinity (1/rest)"], "5": ["Destroy Undead (CR 1/2)"], "10": ["Divine Intervention"], "20": ["Divine Intervention Improvement"]}}],
  ["Druid", {"hit_die": "d8", "primary_ability": "Wisdom", "saving_throws": ["int", "wis"], "armor_proficiencies": ["Light", "Medium", "Shields (non-metal)"], "weapon_proficiencies": ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"], "skills": {"choose": 2, "from": ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"]}, "spellcasting": {"ability": "wis", "type": "full", "spell_list": "druid"}, "features": {"1": ["Druidic", "Spellcasting"], "2": ["Wild Shape (CR 1/4)", "Druid Circle"], "18": ["Timeless Body", "Beast Spells"], "20": ["Archdruid"]}}],
  ["Fighter", {"hit_die": "d10", "primary_ability": "Strength or Dexterity", "saving_throws": ["str", "con"], "armor_proficiencies": ["All armor", "Shields"], "weapon_proficiencies": ["Simple", "Martial"], "skills": {"choose": 2, "from": ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"]}, "features": {"1": ["Fighting Style", "Second Wind"], "2": ["Action Surge (1/rest)"], "3": ["Martial Archetype"], "5": ["Extra Attack (1)"], "11": ["Extra Attack (2)"], "17": ["Action Surge (2/rest)"], "20": ["Extra Attack (3)"]}}],
  ["Monk", {"hit_die": "d8", "primary_ability": "Dexterity and Wisdom", "saving_throws": ["str", "dex"], "armor_proficiencies": [], "weapon_proficiencies": ["Simple", "Shortswords"], "skills": {"choose": 2, "from": ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"]}, "features": {"1": ["Unarmored Defense", "Martial Arts (d4)"], "2": ["Ki (2 points)"], "3": ["Monastic Tradition", "Deflect Missiles"], "5": ["Extra Attack", "Stunning Strike"], "20": ["Perfect Self"]}}],
  ["Paladin", {"hit_die": "d10", "primary_ability": "Strength and Charisma", "saving_throws": ["wis", "cha"], "armor_proficiencies": ["All armor", "Shields"], "weapon_proficiencies": ["Simple", "Martial"], "skills": {"choose": 2, "from": ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"]}, "spellcasting": {"ability": "cha", "type": "half", "spell_list": "paladin"}, "features": {"1": ["Divine Sense", "Lay on Hands"], "2": ["Fighting Style", "Spellcasting", "Divine Smite"], "3": ["Sacred Oath"], "5": ["Extra Attack"], "6": ["Aura of Protection"], "20": ["Sacred Oath Feature"]}}],
  ["Ranger", {"hit_die": "d10", "primary_ability": "Dexterity and Wisdom", "saving_throws": ["str", "dex"], "armor_proficiencies": ["Light", "Medium", "Shields"], "weapon_proficiencies": ["Simple", "Martial"], "skills": {"choose": 3, "from": ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"]}, "spellcasting": {"ability": "wis", "type": "half", "spell_list": "ranger"}, "features": {"1": ["Favored Enemy", "Natural Explorer"], "2": ["Fighting Style", "Spellcasting"], "3": ["Ranger Archetype"], "5": ["Extra Attack"], "20": ["Foe Slayer"]}}],
  ["Rogue", {"hit_die": "d8", "primary_ability": "Dexterity", "saving_throws": ["dex", "int"], "armor_proficiencies": ["Light"], "weapon_proficiencies": ["Simple", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"], "skills": {"choose": 4, "from": ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"]}, "features": {"1": ["Expertise (2 skills)", "Sneak Attack (1d6)", "Cunning Action"], "3": ["Roguish Archetype"], "5": ["Uncanny Dodge"], "7": ["Evasion"], "11": ["Reliable Talent"], "20": ["Stroke of Luck"]}}],
  ["Sorcerer", {"hit_die": "d6", "primary_ability": "Charisma", "saving_throws": ["con", "cha"], "armor_proficiencies": [], "weapon_proficiencies": ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"], "skills": {"choose": 2, "from": ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"]}, "spellcasting": {"ability": "cha", "type": "full", "spell_list": "sorcerer"}, "features": {"1": ["Sorcerous Origin", "Spellcasting"], "2": ["Font of Magic", "Sorcery Points (2)"], "3": ["Metamagic (2)"], "20": ["Sorcerous Restoration"]}}],
  ["Warlock", {"hit_die": "d8", "primary_ability": "Charisma", "saving_throws": ["wis", "cha"], "armor_proficiencies": ["Light"], "weapon_proficiencies": ["Simple"], "skills": {"choose": 2, "from": ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"]}, "spellcasting": {"ability": "cha", "type": "pact", "spell_list": "warlock"}, "features": {"1": ["Otherworldly Patron", "Pact Magic"], "2": ["Eldritch Invocations (2)"], "3": ["Pact Boon"], "11": ["Mystic Arcanum (6th)"], "20": ["Eldritch Master"]}}],
  ["Wizard", {"hit_die": "d6", "primary_ability": "Intelligence", "saving_throws": ["int", "wis"], "armor_proficiencies": [], "weapon_proficiencies": ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"], "skills": {"choose": 2, "from": ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]}, "spellcasting": {"ability": "int", "type": "full", "spell_list": "wizard"}, "features": {"1": ["Arcane Recovery", "Spellcasting"], "2": ["Arcane Tradition"], "18": ["Spell Mastery"], "20": ["Signature Spells"]}}],
]

const SUBCLASSES = [
  ["Path of the Berserker", {"class": "Barbarian", "features": {"3": "Frenzy", "6": "Mindless Rage", "10": "Intimidating Presence", "14": "Retaliation"}}],
  ["Path of the Totem Warrior", {"class": "Barbarian", "features": {"3": "Spirit Seeker and Totem Spirit", "6": "Aspect of the Beast", "10": "Spirit Walker", "14": "Totemic Attunement"}}],
  ["Path of the Storm Herald", {"class": "Barbarian", "features": {"3": "Storm Aura", "6": "Storm Soul", "10": "Shielding Storm", "14": "Raging Storm"}}],
  ["Path of the Zealot", {"class": "Barbarian", "features": {"3": "Divine Fury and Warrior of the Gods", "6": "Fanatical Focus", "10": "Zealous Presence", "14": "Rage Beyond Death"}}],
  ["College of Lore", {"class": "Bard", "features": {"3": "Bonus Proficiencies and Cutting Words", "6": "Additional Magical Secrets", "14": "Peerless Skill"}}],
  ["College of Valor", {"class": "Bard", "features": {"3": "Bonus Proficiencies and Combat Inspiration", "6": "Extra Attack", "14": "Battle Magic"}}],
  ["College of Glamour", {"class": "Bard", "features": {"3": "Mantle of Inspiration and Enthralling Performance", "6": "Mantle of Majesty", "14": "Unbreakable Majesty"}}],
  ["College of Swords", {"class": "Bard", "features": {"3": "Blade Flourish and Bonus Proficiencies", "6": "Extra Attack", "14": "Master's Flourish"}}],
  ["Life Domain", {"class": "Cleric", "domain_spells": {"1": ["Bless", "Cure Wounds"], "3": ["Lesser Restoration", "Spiritual Weapon"], "5": ["Beacon of Hope", "Revivify"], "7": ["Death Ward", "Guardian of Faith"], "9": ["Mass Cure Wounds", "Raise Dead"]}, "features": {"1": "Disciple of Life", "2": "Preserve Life", "6": "Blessed Healer", "8": "Divine Strike", "17": "Supreme Healing"}}],
  ["Light Domain", {"class": "Cleric", "domain_spells": {"1": ["Burning Hands", "Faerie Fire"], "3": ["Flaming Sphere", "Scorching Ray"], "5": ["Daylight", "Fireball"], "7": ["Guardian of Faith", "Wall of Fire"], "9": ["Flame Strike", "Scrying"]}, "features": {"1": "Warding Flare", "2": "Radiance of the Dawn", "6": "Improved Flare", "8": "Potent Spellcasting", "17": "Corona of Light"}}],
  ["Trickery Domain", {"class": "Cleric", "features": {"1": "Blessing of the Trickster", "2": "Invoke Duplicity", "6": "Cloak of Shadows", "8": "Divine Strike", "17": "Improved Duplicity"}}],
  ["War Domain", {"class": "Cleric", "features": {"1": "War Priest", "2": "Guided Strike", "6": "War God's Blessing", "8": "Divine Strike", "17": "Avatar of Battle"}}],
  ["Knowledge Domain", {"class": "Cleric", "features": {"1": "Blessings of Knowledge", "2": "Knowledge of the Ages", "6": "Read Thoughts", "8": "Potent Spellcasting", "17": "Visions of the Past"}}],
  ["Circle of the Land", {"class": "Druid", "features": {"2": "Natural Recovery and Bonus Cantrip", "3": "Circle Spells", "6": "Land's Stride", "10": "Nature's Ward", "14": "Nature's Sanctuary"}}],
  ["Circle of the Moon", {"class": "Druid", "features": {"2": "Combat Wild Shape and Circle Forms", "6": "Primal Strike", "10": "Elemental Wild Shape", "14": "Thousand Forms"}}],
  ["Circle of Spores", {"class": "Druid", "features": {"2": "Halo of Spores and Symbiotic Entity", "6": "Fungal Infestation", "10": "Spreading Spores", "14": "Fungal Body"}}],
  ["Champion", {"class": "Fighter", "features": {"3": "Improved Critical (19-20)", "7": "Remarkable Athlete", "10": "Additional Fighting Style", "15": "Superior Critical (18-20)", "18": "Survivor"}}],
  ["Battle Master", {"class": "Fighter", "features": {"3": "Combat Superiority 4d8 and Student of War", "7": "Know Your Enemy", "10": "Improved Combat Superiority d10", "15": "Relentless"}}],
  ["Eldritch Knight", {"class": "Fighter", "spellcasting": {"ability": "int", "schools": ["Abjuration", "Evocation"]}, "features": {"3": "Spellcasting and Weapon Bond", "7": "War Magic", "10": "Eldritch Strike", "15": "Arcane Charge", "18": "Improved War Magic"}}],
  ["Psi Warrior", {"class": "Fighter", "features": {"3": "Psionic Power d6", "7": "Telekinetic Adept", "10": "Guarded Mind", "15": "Bulwark of Force", "18": "Telekinetic Master"}}],
  ["Way of the Open Hand", {"class": "Monk", "features": {"3": "Open Hand Technique", "6": "Wholeness of Body", "11": "Tranquility", "17": "Quivering Palm"}}],
  ["Way of Shadow", {"class": "Monk", "features": {"3": "Shadow Arts", "6": "Shadow Step", "11": "Cloak of Shadows", "17": "Opportunist"}}],
  ["Way of the Four Elements", {"class": "Monk", "features": {"3": "Disciple of the Elements", "6": "Elemental Attunement+", "11": "Elemental Attunement++", "17": "Elemental Attunement+++"}}],
  ["Way of Mercy", {"class": "Monk", "features": {"3": "Hand of Healing and Hand of Harm", "6": "Physician of No Remorse", "11": "Hand of Ultimate Mercy", "17": "Flurry of Healing and Harm"}}],
  ["Oath of Devotion", {"class": "Paladin", "oath_spells": {"3": ["Protection from Evil and Good", "Sanctuary"], "5": ["Lesser Restoration", "Zone of Truth"], "9": ["Beacon of Hope", "Dispel Magic"], "13": ["Freedom of Movement", "Guardian of Faith"], "17": ["Commune", "Flame Strike"]}, "features": {"3": "Sacred Weapon and Turn the Unholy", "7": "Aura of Devotion", "15": "Purity of Spirit", "20": "Holy Nimbus"}}],
  ["Oath of the Ancients", {"class": "Paladin", "features": {"3": "Nature's Wrath and Turn the Faithless", "7": "Aura of Warding", "15": "Undying Sentinel", "20": "Elder Champion"}}],
  ["Oath of Vengeance", {"class": "Paladin", "features": {"3": "Abjure Enemy and Vow of Enmity", "7": "Relentless Avenger", "15": "Soul of Vengeance", "20": "Avenging Angel"}}],
  ["Oath of Glory", {"class": "Paladin", "features": {"3": "Inspiring Smite and Peerless Athlete", "7": "Aura of Alacrity", "15": "Glorious Defense", "20": "Living Legend"}}],
  ["Hunter", {"class": "Ranger", "features": {"3": "Hunter's Prey", "7": "Defensive Tactics", "11": "Multiattack", "15": "Superior Hunter's Defense"}}],
  ["Beast Master", {"class": "Ranger", "features": {"3": "Ranger's Companion", "7": "Exceptional Training", "11": "Bestial Fury", "15": "Share Spells"}}],
  ["Gloom Stalker", {"class": "Ranger", "features": {"3": "Dread Ambusher and Umbral Sight", "7": "Iron Mind", "11": "Stalker's Flurry", "15": "Shadowy Dodge"}}],
  ["Fey Wanderer", {"class": "Ranger", "features": {"3": "Dreadful Strikes and Otherworldly Glamour", "7": "Beguiling Twist", "11": "Fey Reinforcements", "15": "Misty Wanderer"}}],
  ["Thief", {"class": "Rogue", "features": {"3": "Fast Hands and Second-Story Work", "9": "Supreme Sneak", "13": "Use Magic Device", "17": "Thief's Reflexes"}}],
  ["Assassin", {"class": "Rogue", "features": {"3": "Bonus Proficiencies and Assassinate", "9": "Infiltration Expertise", "13": "Impostor", "17": "Death Strike"}}],
  ["Arcane Trickster", {"class": "Rogue", "spellcasting": {"ability": "int", "schools": ["Enchantment", "Illusion"]}, "features": {"3": "Spellcasting and Mage Hand Legerdemain", "9": "Magical Ambush", "13": "Versatile Trickster", "17": "Spell Thief"}}],
  ["Soulknife", {"class": "Rogue", "features": {"3": "Psionic Power and Psychic Blades", "9": "Soul Blades", "13": "Psychic Veil", "17": "Rend Mind"}}],
  ["Draconic Bloodline", {"class": "Sorcerer", "features": {"1": "Dragon Ancestor and Draconic Resilience", "6": "Elemental Affinity", "14": "Dragon Wings", "18": "Draconic Presence"}}],
  ["Wild Magic Surge", {"class": "Sorcerer", "features": {"1": "Wild Magic Surge and Tides of Chaos", "6": "Bend Luck", "14": "Controlled Chaos", "18": "Spell Bombardment"}}],
  ["Storm Sorcery", {"class": "Sorcerer", "features": {"1": "Wind Speaker and Tempestuous Magic", "6": "Heart of the Storm and Storm Guide", "14": "Storm's Fury", "18": "Wind Soul"}}],
  ["The Fiend", {"class": "Warlock", "expanded_spells": {"1": ["Burning Hands", "Command"], "2": ["Blindness/Deafness", "Scorching Ray"], "3": ["Fireball", "Stinking Cloud"], "4": ["Fire Shield", "Wall of Fire"], "5": ["Flame Strike", "Hallow"]}, "features": {"1": "Dark One's Blessing", "6": "Dark One's Own Luck", "10": "Fiendish Resilience", "14": "Hurl Through Hell"}}],
  ["The Archfey", {"class": "Warlock", "features": {"1": "Fey Presence", "6": "Misty Escape", "10": "Beguiling Defenses", "14": "Dark Delirium"}}],
  ["The Great Old One", {"class": "Warlock", "features": {"1": "Awakened Mind", "6": "Entropic Ward", "10": "Thought Shield", "14": "Create Thrall"}}],
  ["The Celestial", {"class": "Warlock", "features": {"1": "Bonus Cantrips and Healing Light", "6": "Radiant Soul", "10": "Celestial Resilience", "14": "Searing Vengeance"}}],
  ["School of Evocation", {"class": "Wizard", "features": {"2": "Evocation Savant and Sculpt Spells", "6": "Potent Cantrip", "10": "Empowered Evocation", "14": "Overchannel"}}],
  ["School of Abjuration", {"class": "Wizard", "features": {"2": "Abjuration Savant and Arcane Ward", "6": "Projected Ward", "10": "Improved Abjuration", "14": "Spell Resistance"}}],
  ["School of Illusion", {"class": "Wizard", "features": {"2": "Illusion Savant and Improved Minor Illusion", "6": "Malleable Illusions", "10": "Illusory Self", "14": "Illusory Reality"}}],
  ["School of Transmutation", {"class": "Wizard", "features": {"2": "Transmutation Savant and Minor Alchemy", "6": "Transmuter's Stone", "10": "Shapechanger", "14": "Master Transmuter"}}],
  ["School of Necromancy", {"class": "Wizard", "features": {"2": "Necromancy Savant and Grim Harvest", "6": "Undead Thralls", "10": "Inured to Undeath", "14": "Command Undead"}}],
  ["School of Divination", {"class": "Wizard", "features": {"2": "Divination Savant and Portent", "6": "Expert Divination", "10": "The Third Eye", "14": "Greater Portent"}}],
]

const SPECIES = [
  ["Human", {"size": "Medium", "speed": 30, "traits": ["Resourceful", "Skillful", "Versatile (1 Origin feat)"], "asi": "Flexible"}],
  ["Elf", {"size": "Medium", "speed": 30, "traits": ["Darkvision 60 ft", "Fey Ancestry", "Keen Senses (Perception prof)", "Trance", "Elven Lineage (High/Wood/Drow)"], "subraces": {"High": {"bonus_cantrip": true}, "Wood": {"speed": 35}, "Drow": {"darkvision": 120, "sunlight_sensitivity": true}}}],
  ["Dwarf", {"size": "Medium", "speed": 25, "traits": ["Darkvision 60 ft", "Dwarven Resilience", "Dwarven Combat Training", "Stonecunning", "Tool Proficiency"], "subraces": {"Hill Dwarf": {"wis_bonus": 1, "hp_per_level": 1}, "Mountain Dwarf": {"armor": ["Light", "Medium"]}}}],
  ["Halfling", {"size": "Small", "speed": 30, "traits": ["Lucky", "Brave", "Halfling Nimbleness"], "subraces": {"Lightfoot": {"cha_bonus": 1}, "Stout": {"con_bonus": 1}}}],
  ["Gnome", {"size": "Small", "speed": 30, "traits": ["Darkvision 60 ft", "Gnomish Cunning"], "subraces": {"Forest Gnome": {"minor_illusion": true}, "Rock Gnome": {"tinker": true}, "Deep Gnome": {"darkvision": 120}}}],
  ["Half-Elf", {"size": "Medium", "speed": 30, "traits": ["Darkvision 60 ft", "Fey Ancestry", "Skill Versatility (2 profs)"], "asi": "+2 CHA +1/+1 any two"}],
  ["Half-Orc", {"size": "Medium", "speed": 30, "traits": ["Darkvision 60 ft", "Menacing", "Relentless Endurance", "Savage Attacks"]}],
  ["Tiefling", {"size": "Medium", "speed": 30, "traits": ["Darkvision 60 ft", "Hellish Resistance (fire)", "Infernal Legacy"], "asi": "+1 INT +2 CHA"}],
  ["Dragonborn", {"size": "Medium", "speed": 30, "traits": ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Darkvision 60 ft"], "ancestry_types": ["Black (Acid)", "Blue (Lightning)", "Brass (Fire)", "Bronze (Lightning)", "Copper (Acid)", "Gold (Fire)", "Green (Poison)", "Red (Fire)", "Silver (Cold)", "White (Cold)"]}],
  ["Aasimar", {"size": "Medium", "speed": 30, "traits": ["Darkvision 60 ft", "Celestial Resistance (necrotic+radiant)", "Healing Hands", "Light Bearer (Light cantrip)", "Celestial Revelation"]}],
  ["Goliath", {"size": "Medium", "speed": 35, "traits": ["Giant's Legacy (Cloud/Fire/Frost/Hill/Stone/Storm)", "Large Form", "Powerful Build"]}],
  ["Orc", {"size": "Medium", "speed": 30, "traits": ["Adrenaline Rush", "Darkvision 120 ft", "Powerful Build", "Relentless Endurance"]}],
]

const SPELLS = [
  ["Fire Bolt", {"level": 0, "school": "Evocation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "1d10 fire; 2d10 at 5th, 3d10 at 11th, 4d10 at 17th."}],
  ["Eldritch Blast", {"level": 0, "school": "Evocation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Warlock"], "description": "1d10 force per beam; extra beams at 5th/11th/17th level."}],
  ["Guidance", {"level": 0, "school": "Divination", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "1 minute (conc)", "classes": ["Cleric", "Druid"], "description": "Add 1d4 to one ability check before spell ends."}],
  ["Sacred Flame", {"level": 0, "school": "Evocation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Cleric"], "description": "1d8 radiant on failed DEX save; cover irrelevant."}],
  ["Vicious Mockery", {"level": 0, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Bard"], "description": "1d4 psychic on failed WIS save; disadvantage on next attack."}],
  ["Prestidigitation", {"level": 0, "school": "Transmutation", "casting_time": "1 action", "range": "10 ft", "components": ["V", "S"], "duration": "1 hour", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Minor magical tricks."}],
  ["Mage Hand", {"level": 0, "school": "Conjuration", "casting_time": "1 action", "range": "30 ft", "components": ["V", "S"], "duration": "1 minute", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Spectral hand carries up to 10 lb."}],
  ["Minor Illusion", {"level": 0, "school": "Illusion", "casting_time": "1 action", "range": "30 ft", "components": ["S", "M"], "duration": "1 minute", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Sound or image; INV check vs spell save DC to disbelieve."}],
  ["Shillelagh", {"level": 0, "school": "Transmutation", "casting_time": "1 bonus action", "range": "Self", "components": ["V", "S", "M"], "duration": "1 minute", "classes": ["Druid"], "description": "Club or quarterstaff uses WIS for attacks; deals 1d8."}],
  ["Toll the Dead", {"level": 0, "school": "Necromancy", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Cleric", "Warlock", "Wizard"], "description": "1d8 necrotic on failed WIS save; 1d12 if target missing HP."}],
  ["Blade Ward", {"level": 0, "school": "Abjuration", "casting_time": "1 action", "range": "Self", "components": ["V", "S"], "duration": "1 round", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Resistance to B/P/S from weapon attacks."}],
  ["True Strike", {"level": 0, "school": "Divination", "casting_time": "1 action", "range": "Self", "components": ["S"], "duration": "Instantaneous", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "(2024) Make weapon attack using spellcasting ability; +1d6 radiant."}],
  ["Produce Flame", {"level": 0, "school": "Conjuration", "casting_time": "1 action", "range": "Self", "components": ["V", "S"], "duration": "10 minutes", "classes": ["Druid"], "description": "Light in hand or hurl for 1d8 fire attack; 2d8 at 5th, 3d8 at 11th."}],
  ["Spare the Dying", {"level": 0, "school": "Necromancy", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Cleric"], "description": "Stabilize a creature with 0 HP."}],
  ["Thunderclap", {"level": 0, "school": "Evocation", "casting_time": "1 action", "range": "Self (5-ft radius)", "components": ["S"], "duration": "Instantaneous", "classes": ["Bard", "Druid", "Sorcerer", "Warlock", "Wizard"], "description": "5-ft radius: 1d6 thunder on failed CON save; audible 100 ft away."}],
  ["Magic Missile", {"level": 1, "school": "Evocation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "3 darts, 1d4+1 force each; auto-hits. +1 dart per slot above 1st."}],
  ["Cure Wounds", {"level": 1, "school": "Abjuration", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Druid", "Paladin", "Ranger"], "description": "Restore 2d8+spellmod HP. +2d8 per slot above 1st."}],
  ["Shield", {"level": 1, "school": "Abjuration", "casting_time": "1 reaction", "range": "Self", "components": ["V", "S"], "duration": "1 round", "classes": ["Sorcerer", "Wizard"], "description": "+5 AC until start of next turn; immune to Magic Missile."}],
  ["Bless", {"level": 1, "school": "Enchantment", "casting_time": "1 action", "range": "30 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Cleric", "Paladin"], "description": "Up to 3 creatures add 1d4 to attacks and saves. +1 target per slot."}],
  ["Thunderwave", {"level": 1, "school": "Evocation", "casting_time": "1 action", "range": "Self (15-ft cube)", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Bard", "Druid", "Sorcerer", "Wizard"], "description": "2d8 thunder; push 10 ft on failed CON save."}],
  ["Charm Person", {"level": 1, "school": "Enchantment", "casting_time": "1 action", "range": "30 ft", "components": ["V", "S"], "duration": "1 hour", "classes": ["Bard", "Druid", "Sorcerer", "Warlock", "Wizard"], "description": "Humanoid friendly on failed WIS save. +1 target per slot."}],
  ["Hunter's Mark", {"level": 1, "school": "Divination", "casting_time": "1 bonus action", "range": "90 ft", "components": ["V"], "duration": "1 hour (conc)", "classes": ["Ranger"], "description": "Mark target; +1d6 damage on hits; adv tracking checks."}],
  ["Hex", {"level": 1, "school": "Enchantment", "casting_time": "1 bonus action", "range": "90 ft", "components": ["V", "S", "M"], "duration": "1 hour (conc)", "classes": ["Warlock"], "description": "+1d6 necrotic on hits; disadv on chosen ability checks."}],
  ["Detect Magic", {"level": 1, "school": "Divination", "casting_time": "1 action", "range": "Self", "components": ["V", "S"], "duration": "10 minutes (conc)", "classes": ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Wizard"], "description": "Sense magic within 30 ft; see auras."}],
  ["Healing Word", {"level": 1, "school": "Abjuration", "casting_time": "1 bonus action", "range": "60 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Druid"], "description": "Restore 2d4+spellmod HP. +2d4 per slot above 1st."}],
  ["Sleep", {"level": 1, "school": "Enchantment", "casting_time": "1 action", "range": "90 ft", "components": ["V", "S", "M"], "duration": "1 minute", "classes": ["Bard", "Sorcerer", "Wizard"], "description": "5d8 HP of creatures fall unconscious (lowest HP first)."}],
  ["Burning Hands", {"level": 1, "school": "Evocation", "casting_time": "1 action", "range": "Self (15-ft cone)", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "3d6 fire in 15-ft cone; DEX save for half. +1d6 per slot."}],
  ["Inflict Wounds", {"level": 1, "school": "Necromancy", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Cleric"], "description": "3d10 necrotic on hit. +1d10 per slot above 1st."}],
  ["Identify", {"level": 1, "school": "Divination", "casting_time": "1 minute (ritual)", "range": "Touch", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Bard", "Wizard"], "description": "Learn magic properties of one object or creature."}],
  ["Longstrider", {"level": 1, "school": "Transmutation", "casting_time": "1 action", "range": "Touch", "components": ["V", "S", "M"], "duration": "1 hour", "classes": ["Bard", "Druid", "Ranger", "Wizard"], "description": "Touch a creature: speed +10 ft. +1 target per slot above 1st."}],
  ["Hold Person", {"level": 2, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"], "description": "Paralyze humanoid on failed WIS save. +1 target per slot."}],
  ["Misty Step", {"level": 2, "school": "Conjuration", "casting_time": "1 bonus action", "range": "Self", "components": ["V"], "duration": "Instantaneous", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Teleport up to 30 ft to visible unoccupied space."}],
  ["Invisibility", {"level": 2, "school": "Illusion", "casting_time": "1 action", "range": "Touch", "components": ["V", "S", "M"], "duration": "1 hour (conc)", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Invisible until attack or cast. +1 target per slot."}],
  ["Suggestion", {"level": 2, "school": "Enchantment", "casting_time": "1 action", "range": "30 ft", "components": ["V", "M"], "duration": "8 hours (conc)", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Target follows reasonable suggestion on failed WIS save."}],
  ["Spiritual Weapon", {"level": 2, "school": "Evocation", "casting_time": "1 bonus action", "range": "60 ft", "components": ["V", "S"], "duration": "1 minute", "classes": ["Cleric"], "description": "Force weapon; BA to move+attack (1d8+spellmod force). +1d8 per 2 slots."}],
  ["Scorching Ray", {"level": 2, "school": "Evocation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "3 rays, 2d6 fire each on hit. +1 ray per slot."}],
  ["Pass Without Trace", {"level": 2, "school": "Abjuration", "casting_time": "1 action", "range": "Self", "components": ["V", "S", "M"], "duration": "1 hour (conc)", "classes": ["Druid", "Ranger"], "description": "+10 Stealth; not trackable nonmagically."}],
  ["Shatter", {"level": 2, "school": "Evocation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "10-ft sphere: 3d8 thunder, CON save for half."}],
  ["Silence", {"level": 2, "school": "Illusion", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "10 minutes (conc)", "classes": ["Bard", "Cleric", "Ranger"], "description": "20-ft sphere: no sound; immune thunder; no V components."}],
  ["Lesser Restoration", {"level": 2, "school": "Abjuration", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Druid", "Paladin", "Ranger"], "description": "End one disease or condition (blinded/deafened/paralyzed/poisoned)."}],
  ["Mirror Image", {"level": 2, "school": "Illusion", "casting_time": "1 action", "range": "Self", "components": ["V", "S"], "duration": "1 minute", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Create 3 duplicates; attackers roll d20 to target right one."}],
  ["Darkness", {"level": 2, "school": "Evocation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "M"], "duration": "10 minutes (conc)", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "15-ft radius magical darkness; blocks darkvision."}],
  ["Phantasmal Force", {"level": 2, "school": "Illusion", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Bard", "Sorcerer", "Wizard"], "description": "Illusion only target perceives; 1d6 psychic/turn."}],
  ["Fireball", {"level": 3, "school": "Evocation", "casting_time": "1 action", "range": "150 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "20-ft radius: 8d6 fire, DEX save for half. +1d6 per slot."}],
  ["Lightning Bolt", {"level": 3, "school": "Evocation", "casting_time": "1 action", "range": "Self (100-ft line)", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "100-ft line: 8d6 lightning, DEX save for half. +1d6 per slot."}],
  ["Counterspell", {"level": 3, "school": "Abjuration", "casting_time": "1 reaction", "range": "60 ft", "components": ["S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Auto-counter spells 3rd or lower; ability check for higher."}],
  ["Spirit Guardians", {"level": 3, "school": "Conjuration", "casting_time": "1 action", "range": "Self (15-ft radius)", "components": ["V", "S", "M"], "duration": "10 minutes (conc)", "classes": ["Cleric"], "description": "3d8 radiant/necrotic + halved speed; WIS save for half. +1d8 per slot."}],
  ["Hypnotic Pattern", {"level": 3, "school": "Illusion", "casting_time": "1 action", "range": "120 ft", "components": ["S", "M"], "duration": "1 minute (conc)", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "30-ft cube: WIS save or charmed+incapacitated."}],
  ["Dispel Magic", {"level": 3, "school": "Abjuration", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Druid", "Paladin", "Sorcerer", "Warlock", "Wizard"], "description": "End effect: auto 3rd or lower; check for higher."}],
  ["Fly", {"level": 3, "school": "Transmutation", "casting_time": "1 action", "range": "Touch", "components": ["V", "S", "M"], "duration": "10 minutes (conc)", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Flying speed 60 ft. +1 target per slot."}],
  ["Haste", {"level": 3, "school": "Transmutation", "casting_time": "1 action", "range": "30 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Sorcerer", "Wizard"], "description": "Double speed; +2 AC; adv DEX saves; extra limited action."}],
  ["Revivify", {"level": 3, "school": "Necromancy", "casting_time": "1 action", "range": "Touch", "components": ["V", "S", "M (300 gp diamonds)"], "duration": "Instantaneous", "classes": ["Cleric", "Paladin"], "description": "Revive creature dead up to 1 minute at 1 HP."}],
  ["Animate Dead", {"level": 3, "school": "Necromancy", "casting_time": "1 minute", "range": "10 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Cleric", "Wizard"], "description": "Animate skeleton or zombie. +2 undead per slot above 3rd."}],
  ["Slow", {"level": 3, "school": "Transmutation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Sorcerer", "Wizard"], "description": "Up to 6 creatures: half speed, -2 AC, -2 DEX saves, one action or bonus action only."}],
  ["Mass Healing Word", {"level": 3, "school": "Abjuration", "casting_time": "1 bonus action", "range": "60 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Bard", "Cleric"], "description": "Up to 6 creatures each regain 1d4+spellmod HP. +1d4 per slot above 3rd."}],
  ["Banishment", {"level": 4, "school": "Abjuration", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Cleric", "Paladin", "Sorcerer", "Warlock", "Wizard"], "description": "CHA save or banished. Extraplanar permanently gone if maintained."}],
  ["Polymorph", {"level": 4, "school": "Transmutation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "1 hour (conc)", "classes": ["Bard", "Druid", "Sorcerer", "Wizard"], "description": "Transform creature into beast (CR not exceeding level)."}],
  ["Greater Invisibility", {"level": 4, "school": "Illusion", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "1 minute (conc)", "classes": ["Bard", "Sorcerer", "Wizard"], "description": "Invisible even while attacking or casting."}],
  ["Dimension Door", {"level": 4, "school": "Conjuration", "casting_time": "1 action", "range": "500 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Teleport 500 ft to visualized spot; bring one willing creature."}],
  ["Ice Storm", {"level": 4, "school": "Evocation", "casting_time": "1 action", "range": "300 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Druid", "Sorcerer", "Wizard"], "description": "20-ft radius: 2d8 bludgeoning + 4d6 cold; difficult terrain."}],
  ["Wall of Fire", {"level": 4, "school": "Evocation", "casting_time": "1 action", "range": "120 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Druid", "Sorcerer", "Wizard"], "description": "60-ft wall: 5d8 fire to creatures entering or on one side."}],
  ["Death Ward", {"level": 4, "school": "Abjuration", "casting_time": "1 action", "range": "Touch", "components": ["V", "S"], "duration": "8 hours", "classes": ["Cleric", "Paladin"], "description": "Drop to 0 HP instead drop to 1 HP once."}],
  ["Confusion", {"level": 4, "school": "Enchantment", "casting_time": "1 action", "range": "90 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Bard", "Druid", "Sorcerer", "Wizard"], "description": "10-ft radius: WIS save or random action each turn."}],
  ["Hold Monster", {"level": 5, "school": "Enchantment", "casting_time": "1 action", "range": "90 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Like Hold Person but any creature type."}],
  ["Cone of Cold", {"level": 5, "school": "Evocation", "casting_time": "1 action", "range": "Self (60-ft cone)", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "8d8 cold; CON save for half. Frozen statue on 0 HP."}],
  ["Raise Dead", {"level": 5, "school": "Necromancy", "casting_time": "1 hour", "range": "Touch", "components": ["V", "S", "M (500 gp diamond)"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Paladin"], "description": "Revive creature dead up to 10 days (intact body needed)."}],
  ["Scrying", {"level": 5, "school": "Divination", "casting_time": "10 minutes", "range": "Self", "components": ["V", "S", "M (1000 gp focus)"], "duration": "10 minutes (conc)", "classes": ["Bard", "Cleric", "Druid", "Warlock", "Wizard"], "description": "Spy on creature or location anywhere on same plane."}],
  ["Telekinesis", {"level": 5, "school": "Transmutation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "10 minutes (conc)", "classes": ["Sorcerer", "Wizard"], "description": "Move creature (STR contest) or object (1000 lb) with your mind."}],
  ["Flame Strike", {"level": 5, "school": "Evocation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Cleric"], "description": "10-ft radius, 40-ft column: 4d6 fire + 4d6 radiant, DEX save for half."}],
  ["Mass Cure Wounds", {"level": 5, "school": "Abjuration", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Bard", "Cleric", "Druid"], "description": "Up to 6 creatures regain 3d8+spellmod HP. +1d8 per slot."}],
  ["Dominate Person", {"level": 5, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "1 minute (conc)", "classes": ["Bard", "Sorcerer", "Wizard"], "description": "Dominate a humanoid (WIS save); save after damage."}],
  ["Chain Lightning", {"level": 6, "school": "Evocation", "casting_time": "1 action", "range": "150 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "Primary 10d8 lightning (DEX half); jumps to 3 more targets (4d8)."}],
  ["Disintegrate", {"level": 6, "school": "Transmutation", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "10d6+40 force on hit (DEX 5d6+20); 0 HP = disintegrated."}],
  ["Heal", {"level": 6, "school": "Abjuration", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Cleric", "Druid"], "description": "Restore 70 HP; end disease/blinded/deafened. +10 HP per slot."}],
  ["Globe of Invulnerability", {"level": 6, "school": "Abjuration", "casting_time": "1 action", "range": "Self (10-ft radius)", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Sorcerer", "Wizard"], "description": "Blocks spells level 5 and lower. +1 level per slot above 6th."}],
  ["Sunbeam", {"level": 6, "school": "Evocation", "casting_time": "1 action", "range": "Self (60-ft line)", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Druid", "Sorcerer", "Wizard"], "description": "60-ft line: 6d8 radiant, CON save for half and not blinded."}],
  ["Mass Suggestion", {"level": 6, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V", "M"], "duration": "24 hours", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Suggest activity to up to 12 creatures that can hear you (WIS save)."}],
  ["Finger of Death", {"level": 7, "school": "Necromancy", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "7d8+30 necrotic (CON half); creature killed rises as zombie."}],
  ["Plane Shift", {"level": 7, "school": "Conjuration", "casting_time": "1 action", "range": "Touch", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"], "description": "Transport 8 willing creatures to another plane; or banish one."}],
  ["Reverse Gravity", {"level": 7, "school": "Transmutation", "casting_time": "1 action", "range": "100 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Druid", "Sorcerer", "Wizard"], "description": "50-ft radius: unanchored objects/creatures fall upward."}],
  ["Resurrection", {"level": 7, "school": "Necromancy", "casting_time": "1 hour", "range": "Touch", "components": ["V", "S", "M (1000 gp diamond)"], "duration": "Instantaneous", "classes": ["Bard", "Cleric"], "description": "Restore creature dead up to 100 years to full life."}],
  ["Teleport", {"level": 7, "school": "Conjuration", "casting_time": "1 action", "range": "10 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Bard", "Sorcerer", "Wizard"], "description": "Teleport to familiar destination; roll for accuracy."}],
  ["Dominate Monster", {"level": 8, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V", "S"], "duration": "1 hour (conc)", "classes": ["Bard", "Sorcerer", "Warlock", "Wizard"], "description": "Dominate any creature (WIS save hourly or on damage)."}],
  ["Power Word Stun", {"level": 8, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V"], "duration": "Until ended", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Creature with 150 or fewer HP: stunned. CON save each turn."}],
  ["Earthquake", {"level": 8, "school": "Evocation", "casting_time": "1 action", "range": "500 ft", "components": ["V", "S", "M"], "duration": "1 minute (conc)", "classes": ["Cleric", "Druid", "Sorcerer"], "description": "100-ft radius tremor: difficult terrain, prone, concentration checks."}],
  ["Antimagic Field", {"level": 8, "school": "Abjuration", "casting_time": "1 action", "range": "Self (10-ft radius)", "components": ["V", "S", "M"], "duration": "1 hour (conc)", "classes": ["Cleric", "Wizard"], "description": "Suppresses all magic within 10-ft sphere."}],
  ["Sunburst", {"level": 8, "school": "Evocation", "casting_time": "1 action", "range": "150 ft", "components": ["V", "S", "M"], "duration": "Instantaneous", "classes": ["Druid", "Sorcerer", "Wizard"], "description": "60-ft radius: 12d6 radiant, CON save for half and not blinded 1 minute."}],
  ["Wish", {"level": 9, "school": "Conjuration", "casting_time": "1 action", "range": "Self", "components": ["V"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "Most powerful spell; duplicate any spell level 8 or lower, or describe desired effect."}],
  ["True Resurrection", {"level": 9, "school": "Necromancy", "casting_time": "1 hour", "range": "Touch", "components": ["V", "S", "M (25000 gp diamonds)"], "duration": "Instantaneous", "classes": ["Cleric", "Druid"], "description": "Restore creature dead up to 200 years; creates new body if needed."}],
  ["Meteor Swarm", {"level": 9, "school": "Evocation", "casting_time": "1 action", "range": "1 mile", "components": ["V", "S"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "4 explosions in 40-ft radius: 20d6 fire + 20d6 bludgeoning each (DEX half)."}],
  ["Time Stop", {"level": 9, "school": "Transmutation", "casting_time": "1 action", "range": "Self", "components": ["V"], "duration": "Instantaneous", "classes": ["Sorcerer", "Wizard"], "description": "Take 1d4+1 extra turns; ends if you affect another creature."}],
  ["Foresight", {"level": 9, "school": "Divination", "casting_time": "1 minute", "range": "Touch", "components": ["V", "S", "M"], "duration": "8 hours", "classes": ["Bard", "Druid", "Warlock", "Wizard"], "description": "No surprise; adv on all attacks/checks/saves; enemies disadv."}],
  ["Power Word Kill", {"level": 9, "school": "Enchantment", "casting_time": "1 action", "range": "60 ft", "components": ["V"], "duration": "Instantaneous", "classes": ["Sorcerer", "Warlock", "Wizard"], "description": "Creature with 100 or fewer HP dies instantly (no save)."}],
]

const FEATS = [
  ["Alert", {"cat": "General", "prereq": null, "description": "+5 initiative; cannot be surprised; hidden creatures gain no adv on attacks vs you."}],
  ["Actor", {"cat": "General", "prereq": null, "description": "+1 CHA; adv Deception/Performance when impersonating."}],
  ["Athlete", {"cat": "General", "prereq": null, "description": "+1 STR or DEX; stand from prone at 5 ft; no half speed climbing."}],
  ["Charger", {"cat": "General", "prereq": null, "description": "Move 10 ft before attacking: +5 damage or push 10 ft."}],
  ["Crossbow Expert", {"cat": "General", "prereq": null, "description": "Ignore loading; no disadv close range; BA attack with one-handed weapon."}],
  ["Defensive Duelist", {"cat": "General", "prereq": "DEX 13+", "description": "Reaction: add proficiency bonus to AC when hit with finesse weapon."}],
  ["Dual Wielder", {"cat": "General", "prereq": null, "description": "+1 AC while dual-wielding; use non-light weapons; draw/stow two at once."}],
  ["Dungeon Delver", {"cat": "General", "prereq": null, "description": "Adv detect secret doors; adv saves vs traps; resist trap damage."}],
  ["Durable", {"cat": "General", "prereq": null, "description": "+1 CON; minimum Hit Die recovery = 2x CON mod (min 2)."}],
  ["Elemental Adept", {"cat": "General", "prereq": "Spellcasting feature", "description": "Choose damage type; ignore resistance; treat 1s as 2s on damage."}],
  ["Great Weapon Master", {"cat": "General", "prereq": null, "description": "On crit or kill: BA attack. Take -5 to hit for +10 damage."}],
  ["Healer", {"cat": "General", "prereq": null, "description": "Stabilize for free; healer's kit: 1d6+4+level HP (1/short rest per creature)."}],
  ["Heavily Armored", {"cat": "General", "prereq": "Medium Armor prof", "description": "+1 STR; gain Heavy Armor proficiency."}],
  ["Heavy Armor Master", {"cat": "General", "prereq": "Heavy Armor prof", "description": "+1 STR; reduce nonmagical B/P/S damage by 3 in heavy armor."}],
  ["Inspiring Leader", {"cat": "General", "prereq": "CHA 13+", "description": "10-min speech: up to 6 creatures gain temp HP = level + CHA. 1/short rest."}],
  ["Keen Mind", {"cat": "General", "prereq": null, "description": "+1 INT; know north/hours to dawn; recall last month."}],
  ["Lucky", {"cat": "General", "prereq": null, "description": "3 luck points/long rest; reroll any d20 or impose disadv on attack vs you."}],
  ["Mage Slayer", {"cat": "General", "prereq": null, "description": "React to attack caster in reach; disadv concentration save; adv saves vs adjacent."}],
  ["Magic Initiate", {"cat": "General", "prereq": null, "description": "Choose class; learn 2 cantrips + 1 1st-level spell (1/long rest). 2024: use that class ability."}],
  ["Martial Adept", {"cat": "General", "prereq": null, "description": "2 Battle Master maneuvers; 1 Superiority Die (d6)."}],
  ["Medium Armor Master", {"cat": "General", "prereq": "Medium Armor prof", "description": "No Stealth disadv; max DEX to AC = 3."}],
  ["Mobile", {"cat": "General", "prereq": null, "description": "Speed +10 ft; Dash no OA; attack target = no OA from it."}],
  ["Mounted Combatant", {"cat": "General", "prereq": null, "description": "Adv vs unmounted smaller creatures; redirect attacks to yourself."}],
  ["Observant", {"cat": "General", "prereq": null, "description": "+1 INT or WIS; lip-read; +5 passive Perception/Investigation."}],
  ["Polearm Master", {"cat": "General", "prereq": null, "description": "BA butt attack (1d4 bludgeoning); OA when creature enters reach."}],
  ["Resilient", {"cat": "General", "prereq": null, "description": "+1 chosen ability; saving throw proficiency in that ability."}],
  ["Ritual Caster", {"cat": "General", "prereq": "INT or WIS 13+", "description": "Ritual book with 2 1st-level rituals; add from scrolls/spellbooks."}],
  ["Savage Attacker", {"cat": "General", "prereq": null, "description": "Once per turn: reroll all weapon damage dice; use either result."}],
  ["Sentinel", {"cat": "General", "prereq": null, "description": "OA stops movement; react to Disengage; OA when enemy attacks ally."}],
  ["Sharpshooter", {"cat": "General", "prereq": null, "description": "No disadv long range; ignore cover; -5 to hit for +10 damage."}],
  ["Shield Master", {"cat": "General", "prereq": null, "description": "BA shove after attack; +2 DEX saves with shield; negate damage on DEX save success."}],
  ["Skilled", {"cat": "General", "prereq": null, "description": "Proficiency in 3 skills or tools."}],
  ["Skulker", {"cat": "General", "prereq": "DEX 13+", "description": "Hide lightly obscured; miss ranged: position not revealed; dim light no disadv Perception."}],
  ["Spell Sniper", {"cat": "General", "prereq": "Spellcasting feature", "description": "Double attack-roll spell range; ignore cover; 1 attack-roll cantrip."}],
  ["Tavern Brawler", {"cat": "General", "prereq": null, "description": "+1 STR or CON; prof improvised weapons/unarmed (1d4); grapple as BA."}],
  ["Tough", {"cat": "General", "prereq": null, "description": "+2 HP per level (all levels)."}],
  ["War Caster", {"cat": "General", "prereq": "Spellcasting feature", "description": "Adv concentration; somatic with weapons; cast spell as OA."}],
  ["Weapon Master", {"cat": "General", "prereq": null, "description": "+1 STR or DEX; proficiency in 4 weapons."}],
  ["Crafter", {"cat": "Origin", "prereq": null, "description": "Prof 3 artisan tools; 20% discount; craft 1 free common magic item/long rest."}],
  ["Musician", {"cat": "Origin", "prereq": null, "description": "Prof 3 instruments; grant Bardic Inspiration to allies after long rest performance."}],
  ["Magic Initiate (Cleric)", {"cat": "Origin", "prereq": null, "description": "2 Cleric cantrips + 1 1st-level Cleric spell."}],
  ["Magic Initiate (Druid)", {"cat": "Origin", "prereq": null, "description": "2 Druid cantrips + 1 1st-level Druid spell."}],
  ["Magic Initiate (Wizard)", {"cat": "Origin", "prereq": null, "description": "2 Wizard cantrips + 1 1st-level Wizard spell."}],
  ["Alert (Origin)", {"cat": "Origin", "prereq": null, "description": "Same as Alert; can take as Origin feat."}],
  ["Lucky (Origin)", {"cat": "Origin", "prereq": null, "description": "Same as Lucky; can take as Origin feat."}],
  ["Tough (Origin)", {"cat": "Origin", "prereq": null, "description": "Same as Tough; can take as Origin feat."}],
  ["Skilled (Origin)", {"cat": "Origin", "prereq": null, "description": "Same as Skilled; can take as Origin feat."}],
]

const EQUIPMENT = [
  ["Dagger", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d4 piercing", "weight": 1, "cost": "2 gp", "properties": ["Finesse", "Light", "Thrown (20/60)"]}],
  ["Quarterstaff", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d6 bludgeoning", "weight": 4, "cost": "2 sp", "properties": ["Versatile (1d8)"]}],
  ["Club", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d4 bludgeoning", "weight": 2, "cost": "1 sp", "properties": ["Light"]}],
  ["Handaxe", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d6 slashing", "weight": 2, "cost": "5 gp", "properties": ["Light", "Thrown (20/60)"]}],
  ["Javelin", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d6 piercing", "weight": 2, "cost": "5 sp", "properties": ["Thrown (30/120)"]}],
  ["Mace", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d6 bludgeoning", "weight": 4, "cost": "5 gp", "properties": []}],
  ["Spear", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d6 piercing", "weight": 3, "cost": "1 gp", "properties": ["Thrown (20/60)", "Versatile (1d8)"]}],
  ["Greatclub", {"cat": "weapon", "weapon_type": "Simple Melee", "damage": "1d8 bludgeoning", "weight": 10, "cost": "2 sp", "properties": ["Two-Handed"]}],
  ["Shortbow", {"cat": "weapon", "weapon_type": "Simple Ranged", "damage": "1d6 piercing", "weight": 2, "cost": "25 gp", "properties": ["Ammunition (80/320)", "Two-Handed"]}],
  ["Light Crossbow", {"cat": "weapon", "weapon_type": "Simple Ranged", "damage": "1d8 piercing", "weight": 5, "cost": "25 gp", "properties": ["Ammunition (80/320)", "Loading", "Two-Handed"]}],
  ["Sling", {"cat": "weapon", "weapon_type": "Simple Ranged", "damage": "1d4 bludgeoning", "weight": 0, "cost": "1 sp", "properties": ["Ammunition (30/120)"]}],
  ["Dart", {"cat": "weapon", "weapon_type": "Simple Ranged", "damage": "1d4 piercing", "weight": 0.25, "cost": "5 cp", "properties": ["Finesse", "Thrown (20/60)"]}],
  ["Shortsword", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d6 piercing", "weight": 2, "cost": "10 gp", "properties": ["Finesse", "Light"]}],
  ["Longsword", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d8 slashing", "weight": 3, "cost": "15 gp", "properties": ["Versatile (1d10)"]}],
  ["Rapier", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d8 piercing", "weight": 2, "cost": "25 gp", "properties": ["Finesse"]}],
  ["Scimitar", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d6 slashing", "weight": 3, "cost": "25 gp", "properties": ["Finesse", "Light"]}],
  ["Battleaxe", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d8 slashing", "weight": 4, "cost": "10 gp", "properties": ["Versatile (1d10)"]}],
  ["Warhammer", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d8 bludgeoning", "weight": 2, "cost": "15 gp", "properties": ["Versatile (1d10)"]}],
  ["Flail", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d8 bludgeoning", "weight": 2, "cost": "10 gp", "properties": []}],
  ["Greatsword", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "2d6 slashing", "weight": 6, "cost": "50 gp", "properties": ["Heavy", "Two-Handed"]}],
  ["Greataxe", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d12 slashing", "weight": 7, "cost": "30 gp", "properties": ["Heavy", "Two-Handed"]}],
  ["Maul", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "2d6 bludgeoning", "weight": 10, "cost": "10 gp", "properties": ["Heavy", "Two-Handed"]}],
  ["Glaive", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d10 slashing", "weight": 6, "cost": "20 gp", "properties": ["Heavy", "Reach", "Two-Handed"]}],
  ["Halberd", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d10 slashing", "weight": 6, "cost": "20 gp", "properties": ["Heavy", "Reach", "Two-Handed"]}],
  ["Pike", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d10 piercing", "weight": 18, "cost": "5 gp", "properties": ["Heavy", "Reach", "Two-Handed"]}],
  ["Whip", {"cat": "weapon", "weapon_type": "Martial Melee", "damage": "1d4 slashing", "weight": 3, "cost": "2 gp", "properties": ["Finesse", "Reach"]}],
  ["Longbow", {"cat": "weapon", "weapon_type": "Martial Ranged", "damage": "1d8 piercing", "weight": 2, "cost": "50 gp", "properties": ["Ammunition (150/600)", "Heavy", "Two-Handed"]}],
  ["Hand Crossbow", {"cat": "weapon", "weapon_type": "Martial Ranged", "damage": "1d6 piercing", "weight": 3, "cost": "75 gp", "properties": ["Ammunition (30/120)", "Light", "Loading"]}],
  ["Heavy Crossbow", {"cat": "weapon", "weapon_type": "Martial Ranged", "damage": "1d10 piercing", "weight": 18, "cost": "50 gp", "properties": ["Ammunition (100/400)", "Heavy", "Loading", "Two-Handed"]}],
  ["Padded Armor", {"cat": "armor", "armor_type": "Light", "ac": "11 + DEX", "weight": 8, "cost": "5 gp", "stealth": "Disadvantage"}],
  ["Leather Armor", {"cat": "armor", "armor_type": "Light", "ac": "11 + DEX", "weight": 10, "cost": "10 gp", "stealth": "Normal"}],
  ["Studded Leather", {"cat": "armor", "armor_type": "Light", "ac": "12 + DEX", "weight": 13, "cost": "45 gp", "stealth": "Normal"}],
  ["Hide Armor", {"cat": "armor", "armor_type": "Medium", "ac": "12 + DEX (max 2)", "weight": 12, "cost": "10 gp", "stealth": "Disadvantage"}],
  ["Chain Shirt", {"cat": "armor", "armor_type": "Medium", "ac": "13 + DEX (max 2)", "weight": 20, "cost": "50 gp", "stealth": "Normal"}],
  ["Scale Mail", {"cat": "armor", "armor_type": "Medium", "ac": "14 + DEX (max 2)", "weight": 45, "cost": "50 gp", "stealth": "Disadvantage"}],
  ["Breastplate", {"cat": "armor", "armor_type": "Medium", "ac": "14 + DEX (max 2)", "weight": 20, "cost": "400 gp", "stealth": "Normal"}],
  ["Half Plate", {"cat": "armor", "armor_type": "Medium", "ac": "15 + DEX (max 2)", "weight": 40, "cost": "750 gp", "stealth": "Disadvantage"}],
  ["Ring Mail", {"cat": "armor", "armor_type": "Heavy", "ac": "14", "weight": 40, "cost": "30 gp", "stealth": "Disadvantage"}],
  ["Chain Mail", {"cat": "armor", "armor_type": "Heavy", "ac": "16", "weight": 55, "cost": "75 gp", "stealth": "Disadvantage", "requirement": "STR 13"}],
  ["Splint Armor", {"cat": "armor", "armor_type": "Heavy", "ac": "17", "weight": 60, "cost": "200 gp", "stealth": "Disadvantage", "requirement": "STR 15"}],
  ["Plate Armor", {"cat": "armor", "armor_type": "Heavy", "ac": "18", "weight": 65, "cost": "1500 gp", "stealth": "Disadvantage", "requirement": "STR 15"}],
  ["Shield", {"cat": "armor", "armor_type": "Shield", "ac": "+2", "weight": 6, "cost": "10 gp"}],
  ["Healer's Kit", {"cat": "gear", "description": "10 uses; stabilize downed creature, no Medicine check.", "cost": "5 gp", "weight": 3}],
  ["Thieves' Tools", {"cat": "gear", "description": "Pick locks and disarm traps.", "cost": "25 gp", "weight": 1}],
  ["Spellbook", {"cat": "gear", "description": "100-page book for wizard spells.", "cost": "50 gp", "weight": 3}],
  ["Holy Symbol", {"cat": "gear", "description": "Spellcasting focus for cleric/paladin.", "cost": "5 gp", "weight": 1}],
  ["Arcane Focus", {"cat": "gear", "description": "Crystal/orb/rod/staff/wand; focus for bard/sorcerer/warlock/wizard.", "cost": "10 gp", "weight": 1}],
  ["Component Pouch", {"cat": "gear", "description": "Holds material components.", "cost": "25 gp", "weight": 2}],
  ["Druidic Focus", {"cat": "gear", "description": "Mistletoe/totem/wooden staff/yew wand; focus for druid/ranger.", "cost": "1 gp", "weight": 2}],
  ["Rope, Hempen 50 ft", {"cat": "gear", "description": "2 HP; DC 17 STR to break.", "cost": "1 gp", "weight": 10}],
  ["Torch", {"cat": "gear", "description": "Burns 1 hr; bright 20 ft, dim 40 ft; 1 fire damage improvised weapon.", "cost": "1 cp", "weight": 1}],
  ["Rations 1 day", {"cat": "gear", "description": "Dry foods for travel.", "cost": "5 sp", "weight": 2}],
  ["Tinderbox", {"cat": "gear", "description": "Light fire: 1 action; light torch: bonus action.", "cost": "5 sp", "weight": 1}],
  ["Backpack", {"cat": "gear", "description": "Holds 30 lb / 1 cu ft.", "cost": "2 gp", "weight": 5}],
  ["Bag of Holding", {"cat": "magic_item", "rarity": "Uncommon", "attunement": false, "description": "500 lb / 64 cu ft; always weighs 15 lb."}],
  ["Cloak of Protection", {"cat": "magic_item", "rarity": "Uncommon", "attunement": true, "description": "+1 AC and saving throws."}],
  ["+1 Weapon", {"cat": "magic_item", "rarity": "Uncommon", "attunement": false, "description": "+1 to attack and damage rolls."}],
  ["+2 Weapon", {"cat": "magic_item", "rarity": "Rare", "attunement": false, "description": "+2 to attack and damage rolls."}],
  ["+3 Weapon", {"cat": "magic_item", "rarity": "Very Rare", "attunement": false, "description": "+3 to attack and damage rolls."}],
  ["+1 Armor", {"cat": "magic_item", "rarity": "Rare", "attunement": false, "description": "+1 to AC."}],
  ["+2 Armor", {"cat": "magic_item", "rarity": "Very Rare", "attunement": false, "description": "+2 to AC."}],
  ["+3 Armor", {"cat": "magic_item", "rarity": "Legendary", "attunement": false, "description": "+3 to AC."}],
  ["Potion of Healing", {"cat": "magic_item", "rarity": "Common", "attunement": false, "description": "Restore 2d4+2 HP."}],
  ["Potion of Greater Healing", {"cat": "magic_item", "rarity": "Uncommon", "attunement": false, "description": "Restore 4d4+4 HP."}],
  ["Potion of Superior Healing", {"cat": "magic_item", "rarity": "Rare", "attunement": false, "description": "Restore 8d4+8 HP."}],
  ["Potion of Supreme Healing", {"cat": "magic_item", "rarity": "Very Rare", "attunement": false, "description": "Restore 10d4+20 HP."}],
  ["Potion of Invisibility", {"cat": "magic_item", "rarity": "Very Rare", "attunement": false, "description": "Invisible 1 hour or until attack/cast."}],
  ["Potion of Speed", {"cat": "magic_item", "rarity": "Very Rare", "attunement": false, "description": "Haste effect for 1 minute."}],
  ["Ring of Protection", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "+1 AC and saving throws."}],
  ["Boots of Speed", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "BA: double speed, OAs disadv. 10 min/long rest."}],
  ["Amulet of Health", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "CON score = 19 while attuned."}],
  ["Gauntlets of Ogre Power", {"cat": "magic_item", "rarity": "Uncommon", "attunement": true, "description": "STR score = 19 while attuned."}],
  ["Headband of Intellect", {"cat": "magic_item", "rarity": "Uncommon", "attunement": true, "description": "INT score = 19 while attuned."}],
  ["Periapt of Wisdom", {"cat": "magic_item", "rarity": "Uncommon", "attunement": true, "description": "WIS score = 19 while attuned."}],
  ["Cloak of Elvenkind", {"cat": "magic_item", "rarity": "Uncommon", "attunement": true, "description": "Adv Stealth; others disadv Perception to spot you."}],
  ["Boots of Elvenkind", {"cat": "magic_item", "rarity": "Uncommon", "attunement": false, "description": "No sound while moving; adv Stealth for silence."}],
  ["Wand of Fireballs", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "7 charges; cast Fireball (1+ charges = 3rd+ level)."}],
  ["Staff of Healing", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "10 charges; Cure Wounds, Lesser Restoration, Mass Cure Wounds."}],
  ["Flame Tongue", {"cat": "magic_item", "rarity": "Rare", "attunement": true, "description": "Longsword; BA ignite for +2d6 fire while lit."}],
  ["Vorpal Sword", {"cat": "magic_item", "rarity": "Legendary", "attunement": true, "description": "+3 sword; ignore slash resistance; nat 20 decapitates."}],
  ["Deck of Many Things", {"cat": "magic_item", "rarity": "Legendary", "attunement": false, "description": "Draw a card and face reality-altering consequences."}],
]

const BACKGROUNDS = [
  ["Acolyte", {"skills": ["Insight", "Religion"], "languages": 2, "equipment": ["Holy symbol", "Prayer book", "5 incense", "Vestments", "15 gp"], "feature": "Shelter of the Faithful"}],
  ["Charlatan", {"skills": ["Deception", "Sleight of Hand"], "tools": ["Disguise kit", "Forgery kit"], "equipment": ["Fine clothes", "Disguise kit", "15 gp"], "feature": "False Identity"}],
  ["Criminal", {"skills": ["Deception", "Stealth"], "tools": ["Gaming set", "Thieves tools"], "equipment": ["Crowbar", "Dark clothes", "15 gp"], "feature": "Criminal Contact"}],
  ["Entertainer", {"skills": ["Acrobatics", "Performance"], "tools": ["Disguise kit", "Musical instrument"], "equipment": ["Instrument", "Costume", "15 gp"], "feature": "By Popular Demand"}],
  ["Folk Hero", {"skills": ["Animal Handling", "Survival"], "tools": ["Artisan tools", "Vehicles land"], "equipment": ["Artisan tools", "Shovel", "Iron pot", "10 gp"], "feature": "Rustic Hospitality"}],
  ["Guild Artisan", {"skills": ["Insight", "Persuasion"], "tools": ["Artisan tools"], "languages": 1, "equipment": ["Artisan tools", "Letter of intro", "15 gp"], "feature": "Guild Membership"}],
  ["Hermit", {"skills": ["Medicine", "Religion"], "tools": ["Herbalism kit"], "languages": 1, "equipment": ["Scroll case", "Winter blanket", "Herbalism kit", "5 gp"], "feature": "Discovery"}],
  ["Noble", {"skills": ["History", "Persuasion"], "tools": ["Gaming set"], "languages": 1, "equipment": ["Fine clothes", "Signet ring", "Scroll of pedigree", "25 gp"], "feature": "Position of Privilege"}],
  ["Outlander", {"skills": ["Athletics", "Survival"], "tools": ["Musical instrument"], "languages": 1, "equipment": ["Staff", "Hunting trap", "Animal trophy", "10 gp"], "feature": "Wanderer"}],
  ["Sage", {"skills": ["Arcana", "History"], "languages": 2, "equipment": ["Ink bottle", "Quill", "Small knife", "Unanswered letter", "10 gp"], "feature": "Researcher"}],
  ["Sailor", {"skills": ["Athletics", "Perception"], "tools": ["Navigator tools", "Vehicles water"], "equipment": ["Belaying pin", "50 ft silk rope", "Lucky charm", "10 gp"], "feature": "Ship's Passage"}],
  ["Soldier", {"skills": ["Athletics", "Intimidation"], "tools": ["Gaming set", "Vehicles land"], "equipment": ["Rank insignia", "Enemy trophy", "Cards", "10 gp"], "feature": "Military Rank"}],
  ["Urchin", {"skills": ["Sleight of Hand", "Stealth"], "tools": ["Disguise kit", "Thieves tools"], "equipment": ["Small knife", "City map", "Pet mouse", "10 gp"], "feature": "City Secrets"}],
  ["Wayfarer", {"skills": ["Insight", "Stealth"], "tools": ["Thieves tools"], "languages": 1, "equipment": ["Bedroll", "Caltrops (20)", "2 daggers", "Crowbar", "16 gp"], "feature": "Lucky (Origin feat)", "origin_feat": "Lucky"}],
  ["Guard", {"skills": ["Athletics", "Perception"], "tools": ["Gaming set"], "languages": 1, "equipment": ["Spear", "Light crossbow + 20 bolts", "Gaming set", "11 gp"], "feature": "Alert (Origin feat)", "origin_feat": "Alert"}],
  ["Farmer", {"skills": ["Animal Handling", "Nature"], "tools": ["Carpenter tools"], "languages": 1, "equipment": ["Sickle", "Herbalism kit", "Shovel", "Iron pot", "30 gp"], "feature": "Tough (Origin feat)", "origin_feat": "Tough"}],
  ["Artisan", {"skills": ["History", "Persuasion"], "tools": ["Artisan tools"], "languages": 1, "equipment": ["Artisan tools", "Letter of intro", "Fine clothes", "32 gp"], "feature": "Crafter (Origin feat)", "origin_feat": "Crafter"}],
  ["Scribe", {"skills": ["History", "Investigation"], "tools": ["Calligrapher supplies"], "languages": 1, "equipment": ["Calligrapher supplies", "Fine clothes", "Book of lore", "23 gp"], "feature": "Skilled (Origin feat)", "origin_feat": "Skilled"}],
]

const runSeed = db.transaction(() => {
  seed(SID, 'class',      CLASSES)
  console.log(`   class      ${CLASSES.length} rows`)
  seed(SID, 'subclass',   SUBCLASSES)
  console.log(`   subclass   ${SUBCLASSES.length} rows`)
  seed(SID, 'species',    SPECIES)
  console.log(`   species    ${SPECIES.length} rows`)
  seed(SID, 'spell',      SPELLS)
  console.log(`   spell      ${SPELLS.length} rows`)
  seed(SID, 'feat',       FEATS)
  console.log(`   feat       ${FEATS.length} rows`)
  seed(SID, 'equipment',  EQUIPMENT)
  console.log(`   equipment  ${EQUIPMENT.length} rows`)
  seed(SID, 'background', BACKGROUNDS)
  console.log(`   background ${BACKGROUNDS.length} rows`)
})
runSeed()

const totals = db.prepare(`
  SELECT type, COUNT(*) as count FROM system_content
  WHERE rpg_system_id = ? GROUP BY type ORDER BY type`).all(SID)

console.log('\n🎲  D&D 5.5e seed complete!')
console.log('─'.repeat(40))
totals.forEach(({type,count}) => console.log(`  ${type.padEnd(14)} ${count} rows`))
console.log('─'.repeat(40))
db.close()
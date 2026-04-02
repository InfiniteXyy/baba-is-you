// Community level format parser and serializer
// Converts between community thingsMap JSON and internal Level format

import { Entity, Position, TextWord, createEntity, resetEntityCounter, deriveTextureName } from '../engine/entities';

// Community format types
export interface CommunityLevel {
  id: string;
  name: string;
  sceneWidth: number;
  sceneHeight: number;
  thingsMap: CommunityThingGroup[];
}

export interface CommunityThingGroup {
  species: string;
  name: string;
  thingSetup: CommunityThingSetup[];
}

export interface CommunityThingSetup {
  defaultBlockX: number;
  defaultBlockY: number;
  defaultTowards: number;
  textureName: string;
}

// Internal level format
export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  entities: Entity[];
}

// Mapping from species+textureName to internal EntityType
const OPERATOR_TEXTURES = new Set(['Text_IS', 'Text_AND', 'Text_NOT', 'Text_HAS', 'Text_MAKE', 'Text_NEAR', 'Text_ON', 'Text_FACING', 'Text_LONELY']);
const PROPERTY_TEXTURES = new Set([
  'Text_YOU', 'Text_WIN', 'Text_PUSH', 'Text_STOP', 'Text_LOVE', 'Text_HATE',
  'Text_DEFEAT', 'Text_HOT', 'Text_MELT', 'Text_FLOAT', 'Text_SINK',
  'Text_OPEN', 'Text_SHUT', 'Text_MOVE', 'Text_PULL', 'Text_SHIFT',
]);

function textureNameToEntityInfo(textureName: string, species: string): { type: string; word?: TextWord } {
  if (species === 'characters') {
    return { type: textureName };
  }
  if (species === 'nouns') {
    // "Text_BABA" → TEXT_WORD with word "BABA"
    const word = textureName.replace('Text_', '') as TextWord;
    return { type: 'TEXT_WORD', word };
  }
  if (species === 'operators') {
    // "Text_IS" → TEXT_IS
    return { type: `TEXT_${textureName.replace('Text_', '')}` };
  }
  if (species === 'properties') {
    // "Text_YOU" → TEXT_YOU
    return { type: `TEXT_${textureName.replace('Text_', '')}` };
  }
  // Unknown species — use textureName as type
  return { type: textureName };
}

function getSpecies(entity: Entity): string {
  if (entity.type === 'TEXT_WORD') return 'nouns';
  if (entity.type.startsWith('TEXT_')) {
    const texName = entity.textureName || deriveTextureName(entity.type, entity.word);
    if (OPERATOR_TEXTURES.has(texName)) return 'operators';
    if (PROPERTY_TEXTURES.has(texName)) return 'properties';
    // Fallback: check known operators/properties by type
    if (['TEXT_IS', 'TEXT_AND'].includes(entity.type)) return 'operators';
    return 'properties';
  }
  return 'characters';
}

export function parseCommunityLevel(data: CommunityLevel): Level {
  resetEntityCounter();
  const entities: Entity[] = [];

  for (const group of data.thingsMap) {
    for (const setup of group.thingSetup) {
      const { type, word } = textureNameToEntityInfo(setup.textureName, group.species);
      const position: Position = { x: setup.defaultBlockX, y: setup.defaultBlockY };
      const entity = createEntity(type, position, word);
      // Override textureName with the one from community data
      entity.textureName = setup.textureName;
      entities.push(entity);
    }
  }

  return {
    id: data.id,
    name: data.name,
    width: data.sceneWidth,
    height: data.sceneHeight,
    entities,
  };
}

export function levelToCommunityFormat(level: Level): CommunityLevel {
  // Group entities by species + name (textureName)
  const groups = new Map<string, { species: string; name: string; setups: CommunityThingSetup[] }>();

  for (const entity of level.entities) {
    const species = getSpecies(entity);
    const textureName = entity.textureName || deriveTextureName(entity.type, entity.word);
    const key = `${species}:${textureName}`;

    if (!groups.has(key)) {
      groups.set(key, { species, name: textureName, setups: [] });
    }
    groups.get(key)!.setups.push({
      defaultBlockX: entity.position.x,
      defaultBlockY: entity.position.y,
      defaultTowards: 0,
      textureName,
    });
  }

  const thingsMap: CommunityThingGroup[] = [];
  for (const group of groups.values()) {
    thingsMap.push({
      species: group.species,
      name: group.name,
      thingSetup: group.setups,
    });
  }

  return {
    id: level.id,
    name: level.name,
    sceneWidth: level.width,
    sceneHeight: level.height,
    thingsMap,
  };
}

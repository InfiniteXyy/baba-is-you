// Built-in levels loaded from community-format JSON files
import { parseCommunityLevel, CommunityLevel, Level } from './communityLevel';

import level001 from './levels/level001.json';
import level002 from './levels/level002.json';
import level003 from './levels/level003.json';
import level004 from './levels/level004.json';
import level005 from './levels/level005.json';
import level006 from './levels/level006.json';
import level007 from './levels/level007.json';
import level102 from './levels/level102.json';
import level104 from './levels/level104.json';
import level107 from './levels/level107.json';
import level1a from './levels/level1a.json';
import level1b from './levels/level1b.json';
import level202 from './levels/level202.json';
import level208 from './levels/level208.json';
import level209 from './levels/level209.json';
import level212 from './levels/level212.json';
import level301 from './levels/level301.json';
import level309 from './levels/level309.json';

export type { Level } from './communityLevel';

const levelJsons: CommunityLevel[] = [
  level001 as CommunityLevel,
  level002 as CommunityLevel,
  level003 as CommunityLevel,
  level004 as CommunityLevel,
  level005 as CommunityLevel,
  level006 as CommunityLevel,
  level007 as CommunityLevel,
  level102 as CommunityLevel,
  level104 as CommunityLevel,
  level107 as CommunityLevel,
  level1a as CommunityLevel,
  level1b as CommunityLevel,
  level202 as CommunityLevel,
  level208 as CommunityLevel,
  level209 as CommunityLevel,
  level212 as CommunityLevel,
  level301 as CommunityLevel,
  level309 as CommunityLevel,
];

// Map level IDs to friendly names (from the source repo)
const LEVEL_NAMES: Record<string, string> = {
  level001: 'Where Do I Go?',
  level002: 'Now What Is This?',
  level003: 'Out Of Reach',
  level004: 'Still Out Of Reach',
  level005: 'Volcano',
  level006: 'Off Limits',
  level007: 'Grass Yard',
  level102: 'Turns',
  level104: 'Pillar Yard',
  level107: 'Novice Locksmith',
  level1a: 'Submerged Ruins',
  level1b: 'Sunken Temple',
  level202: 'Warm River',
  level208: 'Tiny Pond',
  level209: 'Catch The Thief!',
  level212: 'Evaporating River',
  level301: 'Fragility',
  level309: 'Level 3-9',
};

export const levels: Level[] = levelJsons.map(json => {
  const level = parseCommunityLevel(json);
  level.name = LEVEL_NAMES[level.id] || level.name;
  return level;
});

export function getLevelById(id: string): Level | undefined {
  return levels.find(l => l.id === id);
}

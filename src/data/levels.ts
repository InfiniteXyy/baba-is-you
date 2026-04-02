// Built-in levels loaded from community-format JSON files
import { parseCommunityLevel, CommunityLevel, Level } from './communityLevel';

import firstStepsJson from './levels/first-steps.json';
import youJson from './levels/you.json';
import pushJson from './levels/push.json';
import stopJson from './levels/stop.json';
import whereDoIGoJson from './levels/where-do-i-go.json';
import loveJson from './levels/love.json';

export type { Level } from './communityLevel';

const levelJsons: CommunityLevel[] = [
  firstStepsJson as CommunityLevel,
  youJson as CommunityLevel,
  pushJson as CommunityLevel,
  stopJson as CommunityLevel,
  whereDoIGoJson as CommunityLevel,
  loveJson as CommunityLevel,
];

export const levels: Level[] = levelJsons.map(parseCommunityLevel);

export function getLevelById(id: string): Level | undefined {
  return levels.find(l => l.id === id);
}

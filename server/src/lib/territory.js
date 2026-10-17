export const CHALLENGE_DAYS = 7;

export function nextTerritory(current, runnerId, now = new Date()) {
  if (!current) {
    return {
      action: 'claimed',
      owner: runnerId,
      challenger: null,
      challengeExpiresAt: null,
      capturedAt: now,
    };
  }
  if (String(current.owner) === String(runnerId)) {
    if (current.challenger && current.challengeExpiresAt > now) {
      return {
        action: 'defended', owner: runnerId, challenger: null,
        challengeExpiresAt: null, capturedAt: current.capturedAt,
      };
    }
    return { action: 'unchanged' };
  }
  if (current.challenger && String(current.challenger) === String(runnerId) &&
      current.challengeExpiresAt > now) {
    return {
      action: 'captured', owner: runnerId, challenger: null,
      challengeExpiresAt: null, capturedAt: now,
    };
  }
  return {
    action: 'contested', owner: current.owner, challenger: runnerId,
    challengeExpiresAt: new Date(now.getTime() + CHALLENGE_DAYS * 86400_000),
    capturedAt: current.capturedAt,
  };
}

import type { CharacterAction } from '@/lib/types';

/**
 * Weighted random selection of an action from a character's action library.
 * Higher weight = more likely to be selected.
 */
export function selectWeightedAction(actions: CharacterAction[]): CharacterAction {
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;

    for (const action of actions) {
        random -= action.weight;
        if (random <= 0) return action;
    }

    return actions[0]; // fallback
}

/**
 * Default rarity weights
 */
export const RARITY_WEIGHTS: Record<string, number> = {
    common: 100,
    uncommon: 30,
    rare: 5,
    legendary: 1,
};

/**
 * Time-of-day activity multiplier.
 * Characters are more "active" during peak hours, less at night.
 */
export function getActivityMultiplier(hour: number): number {
    // Peak hours: 10am-10pm
    if (hour >= 10 && hour <= 22) return 1.0;
    // Late night: 10pm-2am (wind down)
    if (hour > 22 || hour < 2) return 0.4;
    // Early morning: 2am-6am (sleeping)
    if (hour >= 2 && hour < 6) return 0.1;
    // Morning: 6am-10am (waking up)
    return 0.6;
}

/**
 * Determine if an action should trigger right now.
 * Called periodically (e.g., every 30 seconds).
 * Returns the selected action or null if nothing triggers.
 */
export function shouldTriggerAction(
    actions: CharacterAction[],
    baseChance: number = 0.15 // 15% base chance per check
): CharacterAction | null {
    const hour = new Date().getHours();
    const multiplier = getActivityMultiplier(hour);
    const roll = Math.random();

    if (roll > baseChance * multiplier) return null;

    return selectWeightedAction(actions);
}

// Port of manimlib/utils/family_ops.py
// Generic over any node exposing getFamily() and a `submobjects` array.

/**
 * Flatten a list of mobjects into all their family members.
 * @param {Iterable<{ getFamily(): any[], hasPoints?(): boolean }>} mobjectList
 * @param {boolean} [excludePointless]
 */
export function extractMobjectFamilyMembers(mobjectList, excludePointless = false) {
  const out = [];
  for (const mob of mobjectList) {
    for (const sm of mob.getFamily()) {
      if (!excludePointless || (sm.hasPoints && sm.hasPoints())) out.push(sm);
    }
  }
  return out;
}

/**
 * Remove `toRemove` members from a mobject list, replacing any mobject that
 * contains one in its family with the surviving family members.
 * @returns {[any[], boolean]} new list and whether anything was removed
 */
export function recursiveMobjectRemove(mobjects, toRemove) {
  const result = [];
  let foundInList = false;
  for (const mob of mobjects) {
    if (toRemove.has(mob)) {
      foundInList = true;
      continue;
    }
    const [subList, foundInSub] = recursiveMobjectRemove(mob.submobjects, toRemove);
    if (foundInSub) {
      result.push(...subList);
      foundInList = true;
    } else {
      result.push(mob);
    }
  }
  return [result, foundInList];
}

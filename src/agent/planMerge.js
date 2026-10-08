// Holds a plan edit to what the model says it did: items it didn't declare as removed are kept unchanged,
// and a pure "remove" edit can't add anything. The model still decides every change.

/**
 * @param {object[]} currentItems  items of the plan before the edit (from the database)
 * @param {object[]} newItems      items the model returned (kept ones carry existingItemId)
 * @param {{type: string, removedItemIds: string[]} | null} planEdit  the model's own description of the edit
 * @returns the item list to save, in model order, with any silently dropped originals restored
 */
export function enforcePlanEdit(currentItems, newItems, planEdit) {
  if (!planEdit) return newItems;
  const current = new Map(currentItems.map((i) => [i.id, i]));
  const removed = new Set(planEdit.removedItemIds.filter((id) => current.has(id)));
  const referenced = new Set(newItems.map((i) => i.existingItemId).filter((id) => current.has(id)));

  // A "remove" edit only takes things away.
  let items = planEdit.type === 'remove' ? newItems.filter((i) => current.has(i.existingItemId)) : newItems;
  // Never resurrect what the model said it removed, even if it also listed it.
  items = items.filter((i) => !removed.has(i.existingItemId));

  // Anything the model neither kept nor declared removed is restored as it was.
  for (const old of currentItems) {
    if (!removed.has(old.id) && !referenced.has(old.id)) {
      items.push({ existingItemId: old.id, day: old.day, startTime: old.startTime, durationMin: old.durationMin, title: old.title, isBreak: old.kind === 'break' });
    }
  }
  return items;
}

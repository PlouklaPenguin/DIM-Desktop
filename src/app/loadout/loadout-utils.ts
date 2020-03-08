import _ from 'lodash';
import { Loadout, LoadoutItem } from './loadout-types';
import { DimItem } from '../inventory/item-types';
import uuidv4 from 'uuid/v4';
import { DimStore } from 'app/inventory/store-types';

/**
 * Creates a new loadout, with all of the items equipped.
 */
// TODO: check that all usages expect all-equipped
export function newLoadout(name: string, items: readonly LoadoutItem[], equipped = true): Loadout {
  return {
    id: uuidv4(),
    classType: -1,
    name,
    items: items.map((i) => convertToLoadoutItem(i, equipped))
  };
}

/*
 * Calculates the light level for a list of items, one per type of weapon and armor
 * or it won't be accurate. function properly supports guardians w/o artifacts
 * returns to tenth decimal place.
 */
export function getLight(store: DimStore, items: DimItem[]): number {
  // https://www.reddit.com/r/DestinyTheGame/comments/6yg4tw/how_overall_power_level_is_calculated/
  let itemWeight = {
    Weapons: 6,
    Armor: 5,
    General: 4
  };
  // 3 Weapons, 4 Armor, 2 General
  let itemWeightDenominator = 46;
  if (store.isDestiny2()) {
    // 3 Weapons, 4 Armor, 1 General
    itemWeight = {
      Weapons: 1,
      Armor: 1,
      General: 1
    };
    itemWeightDenominator = 8;
  } else if (store.level === 40) {
    // 3 Weapons, 4 Armor, 3 General
    itemWeightDenominator = 50;
  }

  const exactLight =
    items.reduce(
      (memo, item) =>
        memo +
        item.primStat!.value *
          (itemWeight[item.type === 'ClassItem' ? 'General' : item.bucket.sort!] || 1),
      0
    ) / itemWeightDenominator;

  return Math.floor(exactLight * 10) / 10;
}

// Generate an optimized item set (loadout items) based on a filtered set of items and a value function
export function optimalItemSet(
  applicableItems: DimItem[],
  bestItemFn: (item: DimItem) => number
): DimItem[] {
  const itemsByType = _.groupBy(applicableItems, (i) => i.type);

  // Pick the best item
  let items = _.mapValues(itemsByType, (items) => _.maxBy(items, bestItemFn)!);

  // Solve for the case where our optimizer decided to equip two exotics
  const getLabel = (i: DimItem) => i.equippingLabel;
  // All items that share an equipping label, grouped by label
  const overlaps = _.groupBy(Object.values(items).filter(getLabel), getLabel);
  _.forIn(overlaps, (overlappingItems) => {
    if (overlappingItems.length <= 1) {
      return;
    }

    const options: { [x: string]: DimItem }[] = [];
    // For each item, replace all the others overlapping it with the next best thing
    for (const item of overlappingItems) {
      const option = { ...items };
      const otherItems = overlappingItems.filter((i) => i !== item);
      let optionValid = true;

      for (const otherItem of otherItems) {
        // Note: we could look for items that just don't have the *same* equippingLabel but
        // that may fail if there are ever mutual-exclusion items beyond exotics.
        const nonExotics = itemsByType[otherItem.type].filter((i) => !i.equippingLabel);
        if (nonExotics.length) {
          option[otherItem.type] = _.maxBy(nonExotics, bestItemFn)!;
        } else {
          // this option isn't usable because we couldn't swap this exotic for any non-exotic
          optionValid = false;
        }
      }

      if (optionValid) {
        options.push(option);
      }
    }

    // Pick the option where the optimizer function adds up to the biggest number, again favoring equipped stuff
    if (options.length > 0) {
      const bestOption = _.maxBy(options, (opt) => _.sumBy(Object.values(opt), bestItemFn))!;
      items = bestOption;
    }
  });

  return Object.values(items);
}

export function optimalLoadout(
  applicableItems: DimItem[],
  bestItemFn: (item: DimItem) => number,
  name: string
): Loadout {
  const items = optimalItemSet(applicableItems, bestItemFn);
  const finalItems = items.map((item) => convertToLoadoutItem(item, true));
  return newLoadout(name, finalItems);
}
/** Create a loadout from all of this character's items that can be in loadouts */
export function loadoutFromAllItems(
  store: DimStore,
  name: string,
  onlyEquipped?: boolean
): Loadout {
  const allItems = store.items.filter(
    (item) => item.canBeInLoadout() && (!onlyEquipped || item.equipped)
  );
  return newLoadout(name, allItems);
}

/**
 * Converts DimItem or other LoadoutItem-like objects to real loadout items.
 */
export function convertToLoadoutItem(item: LoadoutItem, equipped: boolean) {
  return {
    id: item.id,
    hash: item.hash,
    amount: 1,
    equipped
  };
}

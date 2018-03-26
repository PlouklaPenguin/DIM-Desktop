import { DestinyTrackerServiceType } from "../item-review/destiny-tracker.service";
import { DestinyVendorsResponse, DestinyVendorSaleItemComponent, DestinyVendorResponse, DestinyProfileResponse, DestinyVendorItemDefinition } from "bungie-api-ts/destiny2";
import * as _ from "underscore";
import { D2ManifestDefinitions } from "../destiny2/d2-definitions.service";
import { flatMap } from "../util";

function isWeaponOrArmor(
  defs: D2ManifestDefinitions,
  saleItemComponent: DestinyVendorSaleItemComponent | DestinyVendorItemDefinition
): boolean {
  const inventoryItemStats = defs.InventoryItem.get(saleItemComponent.itemHash).stats;
  return inventoryItemStats &&
          (inventoryItemStats.primaryBaseStatHash === 1480404414 || // weapon
           inventoryItemStats.primaryBaseStatHash === 3897883278); // armor
}

export async function fetchRatingsForVendors(
  defs: D2ManifestDefinitions,
  destinyTrackerService: DestinyTrackerServiceType,
  vendorsResponse: DestinyVendorsResponse
): Promise<DestinyTrackerServiceType> {
  const saleComponentArray = Object.values(vendorsResponse.sales.data)
    .map((saleItemComponent) => saleItemComponent.saleItems);

  const saleComponents = flatMap(saleComponentArray, (v) => Object.values(v))
    .filter((sc) => isWeaponOrArmor(defs, sc));

  return destinyTrackerService.bulkFetchVendorItems(saleComponents);
}

export async function fetchRatingsForVendor(
  defs: D2ManifestDefinitions,
  destinyTrackerService: DestinyTrackerServiceType,
  vendorResponse: DestinyVendorResponse
): Promise<DestinyTrackerServiceType> {
  const saleComponents = Object.values(vendorResponse.sales.data)
    .filter((sc) => isWeaponOrArmor(defs, sc));

  return destinyTrackerService.bulkFetchVendorItems(saleComponents);
}

export async function fetchRatingsForKiosks(
  defs: D2ManifestDefinitions,
  destinyTrackerService: DestinyTrackerServiceType,
  profileResponse: DestinyProfileResponse
): Promise<DestinyTrackerServiceType> {
  const kioskVendorHashes = new Set(Object.keys(profileResponse.profileKiosks.data.kioskItems));
  _.each(profileResponse.characterKiosks.data, (kiosk) => {
    _.each(kiosk.kioskItems, (_, kioskHash) => {
      kioskVendorHashes.add(kioskHash);
    });
  });

  const vendorItems = flatMap(Array.from(kioskVendorHashes), (kvh) => {
    const vendorHash = Number(kvh);
    const kioskItems = profileResponse.profileKiosks.data.kioskItems[vendorHash].concat(_.flatten(Object.values(profileResponse.characterKiosks.data).map((d) => Object.values(d.kioskItems))));
    const vendorDef = defs.Vendor.get(vendorHash);
    return kioskItems.map((ki) => vendorDef.itemList[ki.index]).filter((vid) => isWeaponOrArmor(defs, vid));
  });

  return destinyTrackerService.bulkFetchKioskItems(vendorItems);
}

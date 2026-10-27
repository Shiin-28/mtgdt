import { block101 } from "./block101";
import { cardshopAdapter } from "./cardshop-common";
import { dmcollectibles } from "./dmcollectibles";
import { greengate } from "./greengate";
import { staxx } from "./staxx";
import { CHECK_URL_QUERY, type StoreAdapter, type StoreInfo } from "./types";
import { cardpro, highmarket, infinity, trics } from "./unsupported";

const jace = cardshopAdapter({ id: "jace", name: "Jace Collection", base: "https://www.jacecollection.com" });
const vault = cardshopAdapter({ id: "vault", name: "Vault Card Shop", base: "https://www.vaultcardshop.com" });

/** Every store, in the order the user listed them. */
export const STORES: StoreAdapter[] = [
  highmarket,
  jace,
  greengate,
  dmcollectibles,
  block101,
  infinity,
  cardpro,
  vault,
  staxx,
  trics,
];

export function storeInfo(s: StoreAdapter): StoreInfo {
  return {
    id: s.id,
    name: s.name,
    homepage: s.homepage,
    support: s.support,
    note: s.note,
    checkUrlTemplate: s.checkUrl(CHECK_URL_QUERY),
  };
}

export function getStore(id: string) {
  return STORES.find((s) => s.id === id);
}

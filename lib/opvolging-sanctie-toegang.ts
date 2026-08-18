import "server-only";

import {
  vereisMachtiging,
} from "@/lib/auth";
import type {
  OpvolgingBron,
} from "@/lib/opvolging-sancties";

export function vereisOpvolgingSanctieBeheer(
  bronType: OpvolgingBron,
) {
  return bronType === "DESKCONTROLE"
    ? vereisMachtiging(
        "DESKCONTROLES_BEHEREN",
      )
    : vereisMachtiging(
        "TERREINCONTROLES_BEHEREN",
      );
}

export function vereisOpvolgingSanctieInzage(
  bronType: OpvolgingBron,
) {
  return bronType === "DESKCONTROLE"
    ? vereisMachtiging(
        "DESKCONTROLES_BEKIJKEN",
      )
    : vereisMachtiging(
        "TERREINCONTROLES_BEKIJKEN",
      );
}

import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

type RateLimitRij = {
  aantal: number;
};

export function hashSleutel(
  sleutel: string,
) {
  return createHash("sha256")
    .update(sleutel, "utf8")
    .digest("hex");
}

export async function controleerPubliekeRateLimit({
  sleutel,
  maximum,
  vensterMs,
}: {
  sleutel: string;
  maximum: number;
  vensterMs: number;
}) {
  if (
    !sleutel ||
    !Number.isSafeInteger(maximum) ||
    maximum < 1 ||
    !Number.isSafeInteger(vensterMs) ||
    vensterMs < 1
  ) {
    return false;
  }

  const gehashteSleutel =
    hashSleutel(sleutel);

  const nu = new Date();
  const vervaltOp = new Date(
    nu.getTime() + vensterMs,
  );

  try {
    const rijen =
      await prisma.$queryRaw<RateLimitRij[]>`
        INSERT INTO
          "publieke_rate_limits" (
            "sleutel",
            "venster_start",
            "vervalt_op",
            "aantal"
          )
        VALUES (
          ${gehashteSleutel},
          ${nu},
          ${vervaltOp},
          1
        )
        ON CONFLICT ("sleutel")
        DO UPDATE SET
          "venster_start" =
            CASE
              WHEN
                "publieke_rate_limits"."vervalt_op" <= ${nu}
              THEN ${nu}
              ELSE
                "publieke_rate_limits"."venster_start"
            END,
          "vervalt_op" =
            CASE
              WHEN
                "publieke_rate_limits"."vervalt_op" <= ${nu}
              THEN ${vervaltOp}
              ELSE
                "publieke_rate_limits"."vervalt_op"
            END,
          "aantal" =
            CASE
              WHEN
                "publieke_rate_limits"."vervalt_op" <= ${nu}
              THEN 1
              ELSE
                LEAST(
                  "publieke_rate_limits"."aantal" + 1,
                  ${maximum + 1}
                )
            END
        RETURNING
          "aantal"
      `;

    return (
      rijen.length === 1 &&
      rijen[0].aantal <= maximum
    );
  } catch (fout) {
    console.error(
      "Centrale publieke rate limiting is mislukt.",
      fout instanceof Error
        ? fout.message
        : "Onbekende fout",
    );

    // Bij een databasefout wordt de publieke actie
    // uit veiligheid tijdelijk geblokkeerd.
    return false;
  }
}

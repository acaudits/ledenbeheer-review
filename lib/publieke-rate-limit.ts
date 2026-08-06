import "server-only";

type LimietRegistratie = {
  gestartOp: number;
  vervaltOp: number;
  aantal: number;
};

const MAXIMAAL_AANTAL_SLEUTELS = 10_000;

const globaleRateLimit =
  globalThis as typeof globalThis & {
    publiekeRateLimitRegistraties?: Map<
      string,
      LimietRegistratie
    >;
  };

const registraties =
  globaleRateLimit.publiekeRateLimitRegistraties ??
  new Map<string, LimietRegistratie>();

globaleRateLimit.publiekeRateLimitRegistraties =
  registraties;

function verwijderVerlopenRegistraties(
  nu: number,
) {
  if (registraties.size < 1_000) {
    return;
  }

  for (const [
    sleutel,
    registratie,
  ] of registraties) {
    if (registratie.vervaltOp <= nu) {
      registraties.delete(sleutel);
    }
  }
}

export function controleerPubliekeRateLimit({
  sleutel,
  maximum,
  vensterMs,
}: {
  sleutel: string;
  maximum: number;
  vensterMs: number;
}) {
  const nu = Date.now();

  verwijderVerlopenRegistraties(nu);

  const bestaand =
    registraties.get(sleutel);

  if (
    !bestaand ||
    bestaand.vervaltOp <= nu
  ) {
    if (
      !bestaand &&
      registraties.size >=
        MAXIMAAL_AANTAL_SLEUTELS
    ) {
      return false;
    }

    registraties.set(sleutel, {
      gestartOp: nu,
      vervaltOp: nu + vensterMs,
      aantal: 1,
    });

    return true;
  }

  if (bestaand.aantal >= maximum) {
    return false;
  }

  bestaand.aantal += 1;
  return true;
}

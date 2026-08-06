import "server-only";

type LimietRegistratie = {
  gestartOp: number;
  aantal: number;
};

const globaleRateLimit = globalThis as typeof globalThis & {
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
  const bestaand = registraties.get(sleutel);

  if (
    !bestaand ||
    nu - bestaand.gestartOp >= vensterMs
  ) {
    registraties.set(sleutel, {
      gestartOp: nu,
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

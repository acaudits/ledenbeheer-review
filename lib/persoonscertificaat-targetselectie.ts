import "server-only";

export const TARGETSTATUSSEN = [
  "GRIJS",
  "ROOD",
  "GEEL",
  "GROEN",
] as const;

export type TargetStatus =
  (typeof TARGETSTATUSSEN)[number];

export function isTargetStatus(
  waarde: unknown,
): waarde is TargetStatus {
  return (
    typeof waarde === "string" &&
    TARGETSTATUSSEN.some(
      (status) =>
        status === waarde,
    )
  );
}

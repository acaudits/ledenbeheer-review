import {
  GEBRUIKERSROLLEN,
  rolLabel,
  type GebruikersrolWaarde,
} from "@/lib/autorisatie";

type Props = {
  geselecteerd?: readonly GebruikersrolWaarde[];
  compact?: boolean;
  beheerderVerplicht?: boolean;
};

export function GebruikersRollenVeld({
  geselecteerd = ["AUDITEUR"],
  compact = false,
  beheerderVerplicht = false,
}: Props) {
  return (
    <fieldset>
      <legend
        className={
          compact
            ? "sr-only"
            : "mb-2 text-sm font-semibold text-slate-700"
        }
      >
        Rollen *
      </legend>

      <div
        className={`grid gap-2 ${
          compact
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2"
        }`}
      >
        {GEBRUIKERSROLLEN.map(
          (rol) => {
            const verplicht =
              beheerderVerplicht &&
              rol === "BEHEERDER";

            return (
              <label
                key={rol}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900 ${
                  verplicht
                    ? "cursor-not-allowed border-violet-200 bg-violet-50 text-violet-700"
                    : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {verplicht ? (
                  <input
                    type="hidden"
                    name="rollen"
                    value="BEHEERDER"
                  />
                ) : null}

                <input
                  type="checkbox"
                  name={
                    verplicht
                      ? undefined
                      : "rollen"
                  }
                  value={rol}
                  defaultChecked={
                    geselecteerd.includes(
                      rol,
                    )
                  }
                  disabled={verplicht}
                  className="size-4 rounded border-slate-300 accent-emerald-700"
                />

                <span>
                  {rolLabel(rol)}
                </span>
              </label>
            );
          },
        )}
      </div>
    </fieldset>
  );
}

"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
} from "react";

import {
  stelTijdelijkWachtwoordIn,
  type WachtwoordResetStatus,
} from "@/app/gebruikers/actions";

type TijdelijkWachtwoordFormProps = {
  gebruikerId: number;
};

const beginStatus: WachtwoordResetStatus = {
  succes: false,
  melding: "",
};

export function TijdelijkWachtwoordForm({
  gebruikerId,
}: TijdelijkWachtwoordFormProps) {
  const formulierRef =
    useRef<HTMLFormElement>(null);

  const wachtwoordId = useId();
  const bevestigingId = useId();

  const [status, formulierActie, bezig] =
    useActionState(
      stelTijdelijkWachtwoordIn,
      beginStatus,
    );

  useEffect(() => {
    if (status.succes) {
      formulierRef.current?.reset();
    }
  }, [status.succes]);

  return (
    <details className="group text-left">
      <summary className="cursor-pointer list-none rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
        Tijdelijk wachtwoord
      </summary>

      <form
        ref={formulierRef}
        action={formulierActie}
        className="mt-3 w-72 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
      >
        <input
          type="hidden"
          name="id"
          value={gebruikerId}
        />

        <p className="text-xs leading-5 text-slate-500">
          Stel een tijdelijk wachtwoord van minimaal
          12 tekens in. Geef dit veilig aan de
          gebruiker door.
        </p>

        {status.melding && (
          <div
            role="status"
            className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
              status.succes
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status.melding}
          </div>
        )}

        <div>
          <label
            htmlFor={wachtwoordId}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Tijdelijk wachtwoord
          </label>

          <input
            id={wachtwoordId}
            name="tijdelijkWachtwoord"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label
            htmlFor={bevestigingId}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Herhaal tijdelijk wachtwoord
          </label>

          <input
            id={bevestigingId}
            name="bevestiging"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {bezig
            ? "Instellen..."
            : "Wachtwoord instellen"}
        </button>
      </form>
    </details>
  );
}

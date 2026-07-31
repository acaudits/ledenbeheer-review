"use client";

import {
  useActionState,
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  slaEigenProfielOp,
  type ProfielStatus,
} from "./actions";

const beginProfielStatus: ProfielStatus = {
  succes: false,
  melding: "",
};

type ProfielFormulierProps = {
  voornaam: string;
  achternaam: string;
  email: string;
  eersteInstelling?: boolean;
};

export function ProfielFormulier({
  voornaam,
  achternaam,
  email,
  eersteInstelling = false,
}: ProfielFormulierProps) {
  const router = useRouter();

  const [
    status,
    formulierActie,
    bezig,
  ] = useActionState(
    slaEigenProfielOp,
    beginProfielStatus,
  );

  useEffect(() => {
    if (!status.succes) {
      return;
    }

    if (eersteInstelling) {
      router.replace("/");
    } else {
      router.refresh();
    }
  }, [
    status.succes,
    eersteInstelling,
    router,
  ]);

  return (
    <form
      action={formulierActie}
      className="space-y-5"
    >
      {status.melding ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.succes
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.melding}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="voornaam"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Voornaam
        </label>

        <input
          id="voornaam"
          name="voornaam"
          type="text"
          required
          minLength={2}
          maxLength={100}
          autoComplete="given-name"
          defaultValue={voornaam}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label
          htmlFor="achternaam"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Achternaam
        </label>

        <input
          id="achternaam"
          name="achternaam"
          type="text"
          required
          minLength={2}
          maxLength={150}
          autoComplete="family-name"
          defaultValue={achternaam}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          E-mailadres
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={email}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Dit adres wordt ook gebruikt om in te loggen.
        </p>
      </div>

      <button
        type="submit"
        disabled={bezig}
        className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig
          ? "Profiel opslaan..."
          : eersteInstelling
            ? "Profiel voltooien"
            : "Wijzigingen opslaan"}
      </button>
    </form>
  );
}

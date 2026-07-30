"use client";

import { useActionState } from "react";
import {
    maakGebruikerAan,
    type GebruikerFormulierStatus,
  } from "@/app/gebruikers/actions";  
  const beginStatus: GebruikerFormulierStatus = {
    succes: false,
    melding: "",
  };
  

export function GebruikerToevoegenForm() {
  const [status, formulierActie, bezig] = useActionState(
    maakGebruikerAan,
    beginStatus,
  );

  return (
    <form action={formulierActie} className="space-y-5">
      {status.melding && (
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
      )}

      <div>
        <label
          htmlFor="naam"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Naam
        </label>

        <input
          id="naam"
          name="naam"
          type="text"
          autoComplete="name"
          placeholder="Naam van de gebruiker"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          E-mailadres *
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="naam@bedrijf.be"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label
          htmlFor="tijdelijkWachtwoord"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Tijdelijk wachtwoord *
        </label>

        <input
          id="tijdelijkWachtwoord"
          name="tijdelijkWachtwoord"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          placeholder="Minimaal 12 tekens"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Geef dit wachtwoord veilig door. De gebruiker moet het na
          de eerste login wijzigen.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          name="beheerder"
          type="checkbox"
          className="mt-0.5 size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
        />

        <span>
          <span className="block text-sm font-semibold text-slate-800">
            Beheerder
          </span>

          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Beheerders mogen andere gebruikers toevoegen en
            activeren of deactiveren.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={bezig}
        className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? "Gebruiker aanmaken..." : "Gebruiker aanmaken"}
      </button>
    </form>
  );
}

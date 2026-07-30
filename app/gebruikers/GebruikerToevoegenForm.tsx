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

      <div>
        <label
          htmlFor="rol"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Rol *
        </label>

        <select
          id="rol"
          name="rol"
          required
          defaultValue="AUDITEUR"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        >
          <option value="AUDITEUR">
            Auditeur
          </option>

          <option value="ADMINISTRATIEF">
            Administratief
          </option>

          <option value="BEHEERDER">
            Beheerder
          </option>
        </select>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Beheerders hebben volledige toegang.
          Administratieve gebruikers beheren certificaten.
          Auditeurs beheren controles.
        </p>
      </div>

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

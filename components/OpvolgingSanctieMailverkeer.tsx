"use client";

import {
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Mail = {
  sleutel: string;
  bronMailId: number;
  bestandsnaam: string;
  bestandstype: string;
  afzenderNaam: string | null;
  afzenderEmail: string;
  ontvangers: unknown;
  cc: unknown;
  onderwerp: string | null;
  verzondenOp: string;
  tekstInhoud: string;
  bijlagen: unknown;
  internVerzonden: boolean;
};

type Props = {
  opvolgingId: number;
  mails: Mail[];
};

const datumFormatter =
  new Intl.DateTimeFormat(
    "nl-BE",
    {
      dateStyle: "long",
      timeZone:
        "Europe/Brussels",
    },
  );

const tijdFormatter =
  new Intl.DateTimeFormat(
    "nl-BE",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Brussels",
    },
  );

const volledigFormatter =
  new Intl.DateTimeFormat(
    "nl-BE",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "Europe/Brussels",
    },
  );

function adressen(
  waarde: unknown,
) {
  if (!Array.isArray(waarde)) {
    return "—";
  }

  const labels =
    waarde.flatMap(
      (item) => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return [];
        }

        const record =
          item as Record<
            string,
            unknown
          >;

        const email =
          typeof record.email ===
          "string"
            ? record.email
            : "";

        const naam =
          typeof record.naam ===
          "string"
            ? record.naam
            : "";

        return email
          ? [
              naam
                ? `${naam} <${email}>`
                : email,
            ]
          : [];
      },
    );

  return labels.join(", ") || "—";
}

type BijlageBeschrijving = {
  bestandsnaam: string;
  mimeType: string;
  bestandsgrootte: number;
  contentId: string | null;
  inline: boolean;
};

function bijlagen(
  waarde: unknown,
): BijlageBeschrijving[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return [];
    }

    const record =
      item as Record<string, unknown>;

    if (
      typeof record.bestandsnaam !==
      "string"
    ) {
      return [];
    }

    return [{
      bestandsnaam:
        record.bestandsnaam,
      mimeType:
        typeof record.mimeType ===
        "string"
          ? record.mimeType
          : "application/octet-stream",
      bestandsgrootte:
        typeof record.bestandsgrootte ===
          "number"
          ? record.bestandsgrootte
          : 0,
      contentId:
        typeof record.contentId ===
        "string"
          ? record.contentId
          : null,
      inline:
        record.inline === true,
    }];
  });
}

function bestandsgrootte(
  aantalBytes: number,
): string {
  if (aantalBytes < 1024) {
    return `${aantalBytes} B`;
  }

  if (aantalBytes < 1024 * 1024) {
    return `${(
      aantalBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    aantalBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function bestandsoort(
  bijlage: BijlageBeschrijving,
): string {
  if (
    bijlage.mimeType.startsWith(
      "image/",
    )
  ) {
    return bijlage.inline
      ? "Inline afbeelding"
      : "Foto of afbeelding";
  }

  if (
    bijlage.mimeType ===
    "application/pdf"
  ) {
    return "PDF-document";
  }

  return bijlage.inline
    ? "Inline bestand"
    : "Bijlage";
}

export function OpvolgingSanctieMailverkeer({
  opvolgingId,
  mails,
}: Props) {
  const router =
    useRouter();

  const bestandRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    bezig,
    setBezig,
  ] = useState(false);

  const [
    melding,
    setMelding,
  ] = useState("");

  const [
    fout,
    setFout,
  ] = useState("");

  async function upload(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const bestand =
      bestandRef.current
        ?.files?.[0];

    if (!bestand) {
      setFout(
        "Selecteer eerst een EML-bestand.",
      );
      return;
    }

    setBezig(true);
    setFout("");
    setMelding("");

    try {
      const data =
        new FormData();

      data.set(
        "bestand",
        bestand,
      );

      const antwoord =
        await fetch(
          `/api/opvolging-sancties/${opvolgingId}/mails`,
          {
            method: "POST",
            body: data,
          },
        );

      const resultaat =
        await antwoord.json() as {
          melding?: string;
        };

      if (!antwoord.ok) {
        throw new Error(
          resultaat.melding ||
            "Uploaden is mislukt.",
        );
      }

      setMelding(
        resultaat.melding ||
          "Mail toegevoegd.",
      );

      if (bestandRef.current) {
        bestandRef.current.value =
          "";
      }

      router.refresh();
    } catch (uploadFout) {
      setFout(
        uploadFout instanceof Error
          ? uploadFout.message
          : "Uploaden is mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  const alleBijlagen =
    mails.flatMap((mail) =>
      bijlagen(mail.bijlagen).map(
        (bijlage, index) => ({
          ...bijlage,
          sleutel: `${mail.sleutel}-${index}`,
          mailOnderwerp:
            mail.onderwerp ||
            "(Geen onderwerp)",
          afzender:
            mail.afzenderNaam
              ? `${mail.afzenderNaam} <${mail.afzenderEmail}>`
              : mail.afzenderEmail,
          verzondenOp:
            mail.verzondenOp,
        }),
      ),
    );

  let vorigeDag = "";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black text-slate-950">
        Mailverkeer
      </h2>

      <p className="mt-1 text-sm text-slate-600">
        Upload Outlook EML- of standaard EML-bestanden. De oudste mail staat bovenaan.
      </p>

      <form
        onSubmit={upload}
        className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm font-semibold text-slate-700">
          EML-bestand
          <input
            ref={bestandRef}
            type="file"
            accept=".eml,message/rfc822"
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={bezig}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {bezig
            ? "Analyseren..."
            : "Mail uploaden"}
        </button>
      </form>

      {fout ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {fout}
        </p>
      ) : null}

      {melding ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {melding}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-950">
              Bijlagen en inline bestanden
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Alleen onderstaande referenties en bestandsgegevens zijn opgeslagen. De bestanden zelf zijn niet bewaard.
            </p>
          </div>

          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-950">
            {alleBijlagen.length}{" "}
            {alleBijlagen.length === 1
              ? "bestand"
              : "bestanden"}
          </span>
        </div>

        {alleBijlagen.length === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-white/70 p-3 text-sm font-semibold text-slate-500">
            In de opgeladen mails zijn geen bijlagen of inline bestanden gevonden.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {alleBijlagen.map(
              (bijlage) => (
                <li
                  key={bijlage.sleutel}
                  className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-black text-slate-950">
                        {bijlage.bestandsnaam}
                      </p>

                      <p className="mt-1 text-xs font-bold text-amber-800">
                        {bestandsoort(
                          bijlage,
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {bestandsgrootte(
                        bijlage.bestandsgrootte,
                      )}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1 break-words text-xs text-slate-600">
                    <div>
                      <dt className="inline font-bold">
                        Bestandstype:{" "}
                      </dt>
                      <dd className="inline">
                        {bijlage.mimeType}
                      </dd>
                    </div>

                    <div>
                      <dt className="inline font-bold">
                        Afzender:{" "}
                      </dt>
                      <dd className="inline">
                        {bijlage.afzender}
                      </dd>
                    </div>

                    <div>
                      <dt className="inline font-bold">
                        E-mail:{" "}
                      </dt>
                      <dd className="inline">
                        {bijlage.mailOnderwerp}
                      </dd>
                    </div>

                    <div>
                      <dt className="inline font-bold">
                        Datum:{" "}
                      </dt>
                      <dd className="inline">
                        {volledigFormatter.format(
                          new Date(
                            bijlage.verzondenOp,
                          ),
                        )}
                      </dd>
                    </div>

                    {bijlage.contentId ? (
                      <div>
                        <dt className="inline font-bold">
                          Content-ID:{" "}
                        </dt>
                        <dd className="inline">
                          {bijlage.contentId}
                        </dd>
                      </div>
                    ) : null}

                    <div>
                      <dt className="inline font-bold">
                        Opslag:{" "}
                      </dt>
                      <dd className="inline font-semibold text-amber-800">
                        Alleen referentie – bestand niet opgeslagen
                      </dd>
                    </div>
                  </dl>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <div className="mt-4 min-h-56 rounded-2xl bg-[#efeae2] p-4 sm:p-6">
        {mails.length === 0 ? (
          <div className="flex min-h-44 items-center justify-center text-center text-sm font-semibold text-slate-500">
            Nog geen mailverkeer toegevoegd.
          </div>
        ) : (
          mails.map((mail) => {
            const datum =
              new Date(
                mail.verzondenOp,
              );

            const dag =
              datumFormatter.format(
                datum,
              );

            const toonDag =
              dag !== vorigeDag;

            vorigeDag = dag;


            return (
              <div
                key={mail.sleutel}
                className="space-y-3"
              >
                {toonDag ? (
                  <div className="flex justify-center py-3">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                      {dag}
                    </span>
                  </div>
                ) : null}

                <div
                  className={
                    mail.internVerzonden
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <article
                    className={
                      mail.internVerzonden
                        ? "max-w-[88%] rounded-2xl rounded-br-sm bg-[#d9fdd3] px-4 py-3 shadow-sm sm:max-w-[72%]"
                        : "max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm sm:max-w-[72%]"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all text-xs font-black text-emerald-800">
                        {mail.afzenderNaam
                          ? `${mail.afzenderNaam} · `
                          : ""}
                        {mail.afzenderEmail}
                      </span>

                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-white">
                        {mail.bestandstype}
                      </span>
                    </div>

                    {mail.onderwerp ? (
                      <p className="mt-2 text-sm font-black text-slate-950">
                        {mail.onderwerp}
                      </p>
                    ) : null}

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                      {mail.tekstInhoud}
                    </p>

                    <div className="mt-2 flex justify-end">
                      <time className="text-[11px] font-semibold text-slate-500">
                        {tijdFormatter.format(
                          datum,
                        )}
                      </time>
                    </div>

                    <details className="mt-3 border-t border-slate-300/70 pt-2 text-xs text-slate-600">
                      <summary className="cursor-pointer font-bold text-emerald-800">
                        E-mailgegevens
                      </summary>

                      <dl className="mt-2 space-y-1 break-words">
                        <div>
                          <dt className="inline font-bold">
                            Van:{" "}
                          </dt>
                          <dd className="inline">
                            {mail.afzenderEmail}
                          </dd>
                        </div>

                        <div>
                          <dt className="inline font-bold">
                            Aan:{" "}
                          </dt>
                          <dd className="inline">
                            {adressen(
                              mail.ontvangers,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="inline font-bold">
                            Cc:{" "}
                          </dt>
                          <dd className="inline">
                            {adressen(
                              mail.cc,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="inline font-bold">
                            Datum:{" "}
                          </dt>
                          <dd className="inline">
                            {volledigFormatter.format(
                              datum,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="inline font-bold">
                            Bestand:{" "}
                          </dt>
                          <dd className="inline">
                            {mail.bestandsnaam}
                          </dd>
                        </div>

                      </dl>

                    </details>
                  </article>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

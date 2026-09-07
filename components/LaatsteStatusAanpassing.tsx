type LaatsteStatusAanpassingProps = {
  waarde: string | null;
};

const datumFormatter =
  new Intl.DateTimeFormat(
    "nl-BE",
    {
      timeZone:
        "Europe/Brussels",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
  );

function formatteerDatum(
  waarde: string,
) {
  const datum = new Date(waarde);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return null;
  }

  return datumFormatter.format(
    datum,
  );
}

export function LaatsteStatusAanpassing({
  waarde,
}: LaatsteStatusAanpassingProps) {
  const geformatteerd =
    waarde
      ? formatteerDatum(waarde)
      : null;

  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <span
        className="hidden text-slate-300 sm:inline"
        aria-hidden="true"
      >
        •
      </span>

      <span>
        Laatste synchronisatie:{" "}
        <strong className="font-semibold text-slate-700">
          {geformatteerd ??
            "nog niet uitgevoerd"}
        </strong>
      </span>
    </span>
  );
}

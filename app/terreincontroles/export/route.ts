import { vereisMachtiging } from "@/lib/auth";
import { maakTerreincontroleExcel } from "@/app/terreincontroles/excel-export";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  await vereisMachtiging(
    "TERREINCONTROLES_EXPORTEREN",
  );

  const excelBuffer =
    await maakTerreincontroleExcel(
      false,
    );

  const blob = new Blob(
    [
      excelBuffer as unknown as BlobPart,
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );

  const datum =
    new Date()
      .toISOString()
      .slice(0, 10);

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="terreincontroles-${datum}.xlsx"`,
      "Cache-Control":
        "no-store",
    },
  });
}

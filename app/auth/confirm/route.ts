import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const toegestaneTypes: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParameter = url.searchParams.get("next");

  const next =
    nextParameter?.startsWith("/") && !nextParameter.startsWith("//")
      ? nextParameter
      : "/wachtwoord-instellen";

  if (
    tokenHash &&
    type &&
    toegestaneTypes.includes(type)
  ) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      "/wachtwoord-instellen?fout=ongeldige-link",
      request.url,
    ),
  );
}

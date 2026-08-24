import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout. So aceita POST de proposito: se fosse GET, um `<img src=".../signout">`
 * num site qualquer deslogaria o usuario sem consentimento (CSRF de logout). Com
 * POST + form, o navegador nao dispara isso automaticamente a partir de outra
 * origem.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

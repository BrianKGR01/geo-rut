import { NextResponse } from "next/server";
import { inviteAdminRequestSchema } from "@/features/admins/inviteContract";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/supabase";

/** Traduce los códigos de error de la API admin de Auth a mensajes accionables en español. */
function inviteErrorMessage(code: string | undefined): string {
  if (code === "email_exists") return "Ese email ya tiene una cuenta en el sistema.";
  if (code === "email_address_invalid") return "Ese email no es válido.";
  return "No se pudo invitar a ese email. Intenta de nuevo.";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inviteAdminRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa el email ingresado." }, { status: 400 });
  }

  // Solo un administrador activo (sesión real, no anónima) puede invitar a otro — mismo chequeo
  // que el layout de /admin, repetido acá porque un Route Handler no pasa por ese layout.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims || claims.is_anonymous) {
    return NextResponse.json({ error: "Tenés que iniciar sesión como administrador." }, { status: 401 });
  }
  const { data: caller } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caller) {
    return NextResponse.json({ error: "No tenés permiso para invitar administradores." }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(parsed.data.email);
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteErrorMessage(inviteError?.code) }, { status: 400 });
  }

  const insert: TablesInsert<"admins"> = {
    user_id: invited.user.id,
    display_name: parsed.data.displayName || null,
    invited_by: claims.sub,
  };
  const { data: adminRow, error: insertError } = await adminClient
    .from("admins")
    .insert(insert)
    .select("user_id, display_name, invited_by, created_at")
    .single();
  if (insertError || !adminRow) {
    return NextResponse.json(
      { error: "Se invitó al usuario pero no se pudo guardar como administrador. Avisa para revisarlo." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      userId: adminRow.user_id,
      email: parsed.data.email,
      displayName: adminRow.display_name,
      invitedBy: adminRow.invited_by,
      createdAt: adminRow.created_at,
    },
    { status: 201 },
  );
}

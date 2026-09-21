import { AdminsScreen } from "@/components/admin/AdminsScreen";
import { getAdminEmails, listActiveAdmins } from "@/features/admins/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";

export default async function AdminsPage() {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const admins = await listActiveAdmins(supabase);
  const emails = await getAdminEmails(createAdminClient(), admins.map((admin) => admin.userId));
  const withEmail = admins.map((admin) => ({ ...admin, email: emails.get(admin.userId) }));

  return <AdminsScreen admins={withEmail} currentUserId={currentUserId} />;
}

import { StoresScreen } from "@/components/admin/StoresScreen";
import { listActiveStores } from "@/features/stores/api";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";
import { createClient } from "@/lib/supabase/server";

export default async function StoresPage() {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const stores = await listActiveStores(supabase);

  return <StoresScreen stores={stores} currentUserId={currentUserId} />;
}

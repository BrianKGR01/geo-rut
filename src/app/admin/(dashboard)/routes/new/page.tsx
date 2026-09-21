import { NewRouteScreen } from "@/components/admin/NewRouteScreen";
import { listActiveDrivers } from "@/features/drivers/api";
import { listActiveStores } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";

export default async function NewRoutePage() {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const [drivers, stores] = await Promise.all([listActiveDrivers(supabase), listActiveStores(supabase)]);

  return <NewRouteScreen drivers={drivers} catalogStores={stores} currentUserId={currentUserId} />;
}

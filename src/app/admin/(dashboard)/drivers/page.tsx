import { DriversScreen } from "@/components/admin/DriversScreen";
import { listActiveDrivers } from "@/features/drivers/api";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";

export default async function DriversPage() {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const drivers = await listActiveDrivers(supabase);

  return <DriversScreen drivers={drivers} currentUserId={currentUserId} />;
}

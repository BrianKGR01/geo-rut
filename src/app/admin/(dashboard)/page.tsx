import { RoutesScreen } from "@/components/admin/RoutesScreen";
import { listActiveDrivers } from "@/features/drivers/api";
import { listRoutes } from "@/features/routes/api";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const [routes, drivers] = await Promise.all([listRoutes(supabase), listActiveDrivers(supabase)]);

  return <RoutesScreen routes={routes} drivers={drivers} currentUserId={currentUserId} />;
}

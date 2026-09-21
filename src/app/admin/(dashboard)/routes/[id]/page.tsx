import { notFound } from "next/navigation";
import { RouteDetailScreen } from "@/components/admin/RouteDetailScreen";
import { listActiveDrivers } from "@/features/drivers/api";
import { getRoute } from "@/features/routes/api";
import { listActiveStores } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/currentAdmin";

interface RouteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RouteDetailPage({ params }: RouteDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);
  const [route, drivers, stores] = await Promise.all([
    getRoute(supabase, id),
    listActiveDrivers(supabase),
    listActiveStores(supabase),
  ]);
  if (!route) notFound();

  return <RouteDetailScreen route={route} drivers={drivers} catalogStores={stores} currentUserId={currentUserId} />;
}

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// OPERATOR — упрощённая роль для сотрудника на кухне/зале: доступ только
// к /admin/[venueSlug]/operator (вкл/выкл блюд и ингредиентов), без цен,
// себестоимости и состава. Заводится вручную через prisma/create-staff.ts.
export type StaffContext = {
  supabaseUserId: string;
  email: string;
  tenantId: string;
  role: "OWNER" | "STAFF" | "OPERATOR";
  venueId: string | null;
};

// Who's logged in right now, and what StaffMember row (if any) links them
// to a tenant. Returns null if there's no session or no StaffMember row —
// callers decide what "not allowed" looks like (redirect vs 403 JSON).
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const staff = await prisma.staffMember.findUnique({
    where: { supabaseUserId: user.id },
  });
  if (!staff) return null;

  return {
    supabaseUserId: staff.supabaseUserId,
    email: staff.email,
    tenantId: staff.tenantId,
    role: staff.role as "OWNER" | "STAFF" | "OPERATOR",
    venueId: staff.venueId,
  };
}

// OWNER can touch every venue under their tenant; STAFF only their own venue.
export function canEditVenue(staff: StaffContext, venue: { id: string; tenantId: string }) {
  if (staff.tenantId !== venue.tenantId) return false;
  if (staff.role === "OWNER") return true;
  return staff.venueId === venue.id;
}

// Кто может редактировать САМО МЕНЮ и его настройки: цены, названия,
// описания, скидки, состав/себестоимость, категории, модификаторы,
// ссылки точки, столы, ИИ-команды, удаление чего-либо.
//
// OWNER и STAFF — могут. OPERATOR — НЕТ: его роль сознательно урезана до
// «переключить наличие блюда/ингредиента» (см. страницу /operator).
// Раньше это ограничение держалось только на том, что интерфейс не
// показывал оператору кнопки — но сами API-маршруты роль не проверяли, и
// технически подготовленный оператор мог менять цены запросом напрямую.
// Теперь каждый маршрут-изменение вызывает эту проверку явно.
export function canEditMenu(staff: StaffContext) {
  return staff.role === "OWNER" || staff.role === "STAFF";
}

// true, если тело запроса на изменение блюда/ингредиента трогает ТОЛЬКО
// поле available (вкл/выкл) и ничего больше — единственное, что дозволено
// делать роли OPERATOR через /api/admin/items|ingredients/[id].
export function isAvailabilityOnlyPatch(body: unknown): body is { available: boolean } {
  if (!body || typeof body !== "object") return false;
  const keys = Object.keys(body as Record<string, unknown>);
  return (
    keys.length === 1 &&
    keys[0] === "available" &&
    typeof (body as { available: unknown }).available === "boolean"
  );
}

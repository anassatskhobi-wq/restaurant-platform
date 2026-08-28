// Одноразовый (и переиспользуемый) скрипт: связывает пользователей
// Supabase Auth (по UID) с записями StaffMember в базе, чтобы вход в
// /admin/login реально работал.
//
// Запуск:
//   npx tsx prisma/create-staff.ts
//
// Чтобы добавить ещё одного сотрудника — допиши объект в массив STAFF
// ниже и запусти скрипт заново. Уже существующие записи не трогает
// (кроме обновления полей у того же supabaseUserId) — безопасно
// запускать повторно.
//
// Сначала заведи самого пользователя в Supabase: Dashboard → Authentication
// → Users → Add user (email + пароль), скопируй его UID оттуда — это и
// есть supabaseUserId ниже. Проверяй, что копируешь UID из строки с
// нужным email — таблица показывает всех пользователей сразу.
//
// role:
//   "OWNER"    — видит и редактирует все точки тенанта, полный редактор
//   "STAFF"    — полный редактор, но только своя точка (venueSlug обязателен)
//   "OPERATOR" — только вкл/выкл блюд и ингредиентов на своей точке
//                (venueSlug обязателен), без цен и себестоимости —
//                попадает сразу на /admin/[venueSlug]/operator

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAFF: {
  supabaseUserId: string;
  email: string;
  tenantId: string;
  role: "OWNER" | "STAFF" | "OPERATOR";
  venueSlug?: string;
}[] = [
  {
    supabaseUserId: "d9a3f959-24f9-49aa-880c-3d5e05fcfc68",
    email: "info@anassatskhobi.ge",
    tenantId: "tenant-vm",
    role: "OWNER",
  },
  {
    supabaseUserId: "47db27f8-5ea6-4daa-be34-157a71e567d0",
    email: "ereda24tbilisi@gmail.com",
    tenantId: "tenant-vm",
    role: "OPERATOR",
    venueSlug: "chicago-style",
  },
];

async function main() {
  for (const s of STAFF) {
    let venueId: string | null = null;
    if (s.venueSlug) {
      const venue = await prisma.venue.findUnique({ where: { slug: s.venueSlug } });
      if (!venue) throw new Error(`Точка "${s.venueSlug}" не найдена — проверь slug.`);
      venueId = venue.id;
    }

    const staff = await prisma.staffMember.upsert({
      where: { supabaseUserId: s.supabaseUserId },
      update: { email: s.email, tenantId: s.tenantId, role: s.role, venueId },
      create: {
        supabaseUserId: s.supabaseUserId,
        email: s.email,
        tenantId: s.tenantId,
        role: s.role,
        venueId,
      },
    });

    console.log("StaffMember готов:", staff);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Простой лимит частоты запросов в памяти процесса. Нужен, чтобы
// защитить ПУБЛИЧНЫЕ эндпоинты (оформление заказа, вызов официанта) от
// накрутки: входа в систему они не требуют, а slug точки известен любому,
// кто видел QR-код на столе. Без лимита один скрипт может за минуту
// создать сотни фейковых заказов и вызовов официанта.
//
// Осознанные ограничения этого подхода (это ПЕРВЫЙ рубеж, не финальный):
//  - счётчик живёт в памяти одного серверного инстанса. На Vercel их
//    может быть несколько параллельно, плюс инстанс periodically
//    перезапускается и счётчик обнуляется. Поэтому лимит — «мягкий»:
//    он гасит примитивный спам, но не является строгой гарантией.
//  - для строгого распределённого лимита позже нужен внешний счётчик
//    (например Upstash Redis) — тогда эту функцию можно заменить, не
//    трогая вызовы в маршрутах.

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

// Раз в минуту выкидываем протухшие записи, чтобы Map не рос бесконечно
// при большом числе разных ключей (IP-адресов, столов).
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    // 10 минут без обращений — точно можно забыть про этот ключ.
    if (now - b.windowStart > 600_000) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

// Возвращает ok:false, если для этого ключа за последнее окно уже было
// больше `limit` обращений. `key` формирует вызывающий код — обычно это
// что-то вроде "order:table:<id>" или "waiter:ip:<ip>".
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || now - b.windowStart > windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { ok: true, retryAfterSec: 0 };
  }

  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.windowStart + windowMs - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// IP клиента за прокси Vercel/Next. Заголовок x-forwarded-for может быть
// цепочкой "клиент, прокси1, прокси2" — нас интересует первый адрес.
// Если заголовков нет (локальная разработка) — общий ключ "local".
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  return real || "local";
}

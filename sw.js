// 圏外でも動くように、アプリのファイルを端末に保存しておく
// 電波があるときは最新版を取りに行き、つながらない・遅いときは保存した版を使う
const CACHE = "sanzai-v4";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
const TIMEOUT_MS = 3000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(FILES.map((f) =>
        fetch(new Request(f, { cache: "reload" })).then((r) => { if (r.ok) return c.put(f, r); })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === "navigate" ? await cache.match("./index.html") : undefined);

    const network = fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });

    if (!cached) return network.catch(() => Response.error());

    // 3秒以内に最新版が取れればそれを、取れなければ保存した版を表示
    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), TIMEOUT_MS));
    e.waitUntil(network.catch(() => {}));
    return Promise.race([network.catch(() => cached), timeout]);
  })());
});

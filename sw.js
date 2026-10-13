/* My Race – Service Worker: offline + Web Push */
var V = "myrace-v2";
var ASSETS = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(ASSETS); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Mạng trước, lỗi mạng thì dùng bản đã lưu. Chỉ xử lý file cùng nguồn (thời tiết Open-Meteo đi thẳng ra mạng). */
self.addEventListener("fetch", function (e) {
  var r = e.request;
  var u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return;
  /* version.json luôn đi thẳng ra mạng để biết chính xác có bản mới hay không (mất mạng thì báo lỗi, không dùng bản cũ) */
  if (/\/version\.json$/.test(u.pathname)) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () {
    return caches.match(r).then(function (m) { return m || caches.match("./"); });
  }));
});

/* Nhận thông báo đẩy từ Worker */
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "My Race", {
    body: d.body || "",
    tag: d.tag || "myrace",
    icon: "apple-touch-icon.png",
    badge: "apple-touch-icon.png",
    data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var u = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ("focus" in cs[i]) return cs[i].focus();
    return self.clients.openWindow(u);
  }));
});

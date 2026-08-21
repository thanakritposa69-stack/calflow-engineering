import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://calflow.example/", { headers: { accept: "text/html", host: "calflow.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the CalFlow calculator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>CalFlow — Engineering Calculator<\/title>/i);
  assert.match(html, /คำนวณงานวิศวกรรม/);
  assert.match(html, /กระบอกลม/);
  assert.match(html, /สายพานลำเลียง/);
  assert.match(html, /สายพานเรียบ/);
  assert.match(html, /7 หมวดคำนวณ/);
  assert.match(html, /เครื่องคำนวณใช้งานทั่วไป/);
  assert.match(html, /แรงบิดมอเตอร์/);
  assert.match(html, /T = 9,550 × P ÷ n/);
  assert.match(html, /736\.6/);
  assert.match(html, /77\.4/);
  assert.match(html, /ส่งออก PDF/);
  assert.match(html, /ดาวน์โหลดแอป/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /TH/);
  assert.match(html, /EN/);
  assert.match(html, /https:\/\/calflow\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

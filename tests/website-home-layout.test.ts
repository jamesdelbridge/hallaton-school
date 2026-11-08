import assert from "node:assert/strict";
import test from "node:test";
import { defaultHomeLayout, homeLayoutCustomTargets, homeLayoutInput, readHomeLayout } from "../lib/website-home-layout";

test("homepage destinations stay local and custom targets are identified", () => {
  assert.deepEqual(readHomeLayout(null), defaultHomeLayout);
  const layout = { ...defaultHomeLayout, links: { ...defaultHomeLayout.links, welcome: "/page?pid=custom-club" } };
  assert.equal(homeLayoutInput.safeParse(layout).success, true);
  assert.deepEqual(homeLayoutCustomTargets(JSON.stringify(layout)), ["custom-club"]);
  for (const welcome of ["//example.test", "https://example.test", "/staff", "javascript:alert(1)"]) {
    assert.equal(homeLayoutInput.safeParse({ ...layout, links: { ...layout.links, welcome } }).success, false);
  }
  assert.equal(homeLayoutInput.safeParse({ ...layout, order: [...layout.order.slice(1), layout.order[1]] }).success, false);
  const { order: _order, ...olderLayout } = layout;
  assert.deepEqual(readHomeLayout(JSON.stringify(olderLayout)).order, defaultHomeLayout.order);
});

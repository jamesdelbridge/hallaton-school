"use client";

import { useState } from "react";
import { readHomeLayout, type HomeLayout } from "@/lib/website-home-layout";

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

export function HomeLayoutEditor({ initial }: { initial: string }) {
  const [layout, setLayout] = useState<HomeLayout>(() => readHomeLayout(initial));
  function move(index: number, offset: number) {
    setLayout((current) => {
      const order = [...current.order];
      const target = index + offset;
      if (target < 0 || target >= order.length) return current;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, order };
    });
  }
  return <div className="portal-form">
    <input type="hidden" name="body" value={JSON.stringify(layout)} />
    <p>Hide sections or change links. Hiding a section only removes it from the homepage: public content remains accessible elsewhere. Links must be local, for example <code>#news</code>, <code>/contact</code> or <code>/page?pid=36</code>. Check that links do not point to hidden sections. Custom pages must be published before their links, or selected together for publication.</p>
    <fieldset className="social-fieldset"><legend>Homepage section order</legend>
      {layout.order.map((key, index) => <div className="panel-actions" key={key}>
        <span>{index + 1}. {label(key)}</span>
        <button type="button" className="row-action" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label(key)} up`}>Move up</button>
        <button type="button" className="row-action" disabled={index === layout.order.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label(key)} down`}>Move down</button>
      </div>)}
    </fieldset>
    <fieldset className="social-fieldset"><legend>Visible homepage sections</legend>
      {(Object.keys(layout.visible) as (keyof HomeLayout["visible"])[]).map((key) => <label key={key} className="publish-toggle"><input type="checkbox" checked={layout.visible[key]} onChange={(event) => setLayout((current) => ({ ...current, visible: { ...current.visible, [key]: event.target.checked } }))} />{label(key)}</label>)}
    </fieldset>
    <fieldset className="social-fieldset"><legend>Homepage destinations</legend>
      {(Object.keys(layout.links) as (keyof HomeLayout["links"])[]).map((key) => <label key={key}>{label(key)}<input value={layout.links[key]} required maxLength={512} onChange={(event) => setLayout((current) => ({ ...current, links: { ...current.links, [key]: event.target.value } }))} /></label>)}
    </fieldset>
  </div>;
}

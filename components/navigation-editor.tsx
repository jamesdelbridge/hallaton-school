"use client";

import { useState } from "react";
import type { NavigationSection } from "@/lib/school-navigation";

export function NavigationEditor({ initial, related = false }: { initial: string; related?: boolean }) {
  const [sections, setSections] = useState<NavigationSection[]>(() => JSON.parse(initial) as NavigationSection[]);
  function updateSection(index: number, patch: Partial<NavigationSection>) {
    setSections((current) => current.map((section, i) => i === index ? { ...section, ...patch } : section));
  }
  function moveSection(index: number, offset: number) {
    setSections((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function moveChild(index: number, childIndex: number, offset: number) {
    setSections((current) => current.map((section, i) => {
      if (i !== index) return section;
      const children = [...(section.children ?? [])];
      const target = childIndex + offset;
      if (target < 0 || target >= children.length) return section;
      [children[childIndex], children[target]] = [children[target], children[childIndex]];
      return { ...section, children };
    }));
  }
  return <div>
    <input type="hidden" name="body" value={JSON.stringify(sections)} />
    <p>{related ? "Each section link identifies the school page on which its items appear under Related information; use one section per page. Removing a section removes its related links." : "Remove a section to remove its submenu too."} Use local links such as <code>/</code>, <code>/contact</code>, <code>/#news</code> or <code>/page?pid=36</code>. Create a new page draft before linking to it. Publish it first, or select it together with the menu when promoting. Changes remain private until published.</p>
    {sections.map((section, index) => <fieldset className="social-fieldset" key={index}>
      <legend>Menu {index + 1}</legend>
      <label>Menu name<input value={section.label} required maxLength={100} onChange={(event) => updateSection(index, { label: event.target.value })} /></label>
      <label>Menu link<input value={section.href} required maxLength={512} onChange={(event) => updateSection(index, { href: event.target.value })} /></label>
      {(section.children ?? []).map((child, childIndex) => <fieldset className="social-fieldset" key={childIndex}>
        <legend>Menu item {childIndex + 1}</legend>
        <label>Item name<input value={child.label} required maxLength={100} onChange={(event) => updateSection(index, { children: (section.children ?? []).map((item, i) => i === childIndex ? { ...item, label: event.target.value } : item) })} /></label>
        <label>Item link<input value={child.href} required maxLength={512} onChange={(event) => updateSection(index, { children: (section.children ?? []).map((item, i) => i === childIndex ? { ...item, href: event.target.value } : item) })} /></label>
        <button type="button" className="row-action" disabled={childIndex === 0} onClick={() => moveChild(index, childIndex, -1)} aria-label={`Move item ${childIndex + 1} up`}>Move up</button>
        <button type="button" className="row-action" disabled={childIndex === (section.children?.length ?? 0) - 1} onClick={() => moveChild(index, childIndex, 1)} aria-label={`Move item ${childIndex + 1} down`}>Move down</button>
        <button type="button" className="row-action" onClick={() => updateSection(index, { children: (section.children ?? []).filter((_, i) => i !== childIndex) })}>Remove item</button>
      </fieldset>)}
      <div className="panel-actions">
        <button type="button" className="row-action" onClick={() => updateSection(index, { children: [...(section.children ?? []), { label: "", href: "/" }] })}>Add menu item</button>
        <button type="button" className="row-action" disabled={index === 0} onClick={() => moveSection(index, -1)} aria-label={`Move menu ${index + 1} up`}>Move menu up</button>
        <button type="button" className="row-action" disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)} aria-label={`Move menu ${index + 1} down`}>Move menu down</button>
        <button type="button" className="row-action" onClick={() => setSections((current) => current.filter((_, i) => i !== index))}>Remove menu</button>
      </div>
    </fieldset>)}
    <button type="button" className="row-action" onClick={() => setSections((current) => [...current, { label: "", href: "/" }])}>Add menu</button>
  </div>;
}

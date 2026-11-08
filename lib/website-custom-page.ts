export function isCustomPageId(id: string) {
  return /^custom-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 50;
}

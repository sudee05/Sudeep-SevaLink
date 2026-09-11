import * as LucideIcons from "lucide-react";

export function getLucideIcon(name, fallback = LucideIcons.CircleHelp) {
  if (!name) return fallback;

  const value = String(name).trim();
  const pascalName = value
    .replace(/[-_\s]+([a-zA-Z0-9])/g, (_, character) => character.toUpperCase())
    .replace(/^([a-z])/, (_, character) => character.toUpperCase());

  return LucideIcons[pascalName] || LucideIcons[value] || fallback;
}

export function toLucideKebabCase(name) {
  return String(name || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

import type { Resource } from "./Resource";

/**
 * Accepts both concrete and abstract constructors. Abstract bases (e.g. Noise, Texture)
 * are registered for type-hierarchy queries; only concrete subclasses can be instantiated.
 */
export type ResourceClass = abstract new () => Resource;

export interface TypeIcon {
  codicon: string;
  color: string;
}

interface RegistrationOpts {
  icon?: TypeIcon;
  /**
   * Marks a type as non-instantiable. Abstract classes are registered so hierarchy
   * queries work, but they must be filtered from "New <Type>..." pickers.
   */
  abstract?: boolean;
}

const resourceClasses = new Map<string, ResourceClass>();
const classIcons = new Map<ResourceClass, TypeIcon>();
const abstractClasses = new Set<ResourceClass>();

const DEFAULT_ICON: TypeIcon = { codicon: "symbol-structure", color: "#7ABAD4" };

/**
 * Register a resource class under its serialized type name. Supports the bare
 * `(name, cls)` shape, the icon shape `(name, cls, icon)`, and the full options
 * object `(name, cls, { icon, abstract })`.
 */
export function registerResourceClass(
  name: string,
  cls: ResourceClass,
  iconOrOpts?: TypeIcon | RegistrationOpts,
): void {
  resourceClasses.set(name, cls);
  if (!iconOrOpts) return;
  if ("codicon" in iconOrOpts) {
    classIcons.set(cls, iconOrOpts);
    return;
  }
  if (iconOrOpts.icon) classIcons.set(cls, iconOrOpts.icon);
  if (iconOrOpts.abstract) abstractClasses.add(cls);
}

export function isAbstractResourceClass(cls: ResourceClass): boolean {
  return abstractClasses.has(cls);
}

export function getResourceClass(name: string): ResourceClass | null {
  return resourceClasses.get(name) ?? null;
}

export function hasResourceClass(name: string): boolean {
  return resourceClasses.has(name);
}

export function resourceTypeNames(): string[] {
  return [...resourceClasses.keys()];
}

/** Instantiate a registered resource class. Caller must ensure the class is concrete. */
export function instantiateResourceClass(cls: ResourceClass): Resource {
  return new (cls as new () => Resource)();
}

/**
 * Look up the display icon for a type. Walks the prototype chain so concrete types
 * inherit their ancestor's icon when no explicit one is registered.
 */
export function getTypeIcon(name: string): TypeIcon {
  const cls = resourceClasses.get(name);
  if (!cls) return DEFAULT_ICON;
  let current: unknown = cls;
  while (current && current !== Object) {
    const icon = classIcons.get(current as ResourceClass);
    if (icon) return icon;
    current = Object.getPrototypeOf(current as object);
  }
  return DEFAULT_ICON;
}

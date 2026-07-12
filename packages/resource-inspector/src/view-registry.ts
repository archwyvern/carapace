import type { ReactNode } from "react";
import type { PropertyDescriptor, PropertySource } from "./protocol";

/**
 * Renders a type's custom inspector view. The host's registry declares which view key a type
 * owns (surfaced through `PropertyHost.viewOf`); the host registers the component for that key
 * here. The {@link ResourceInspector} then renders it above the generic field list.
 */
export type ResourceViewRenderer = (source: PropertySource) => ReactNode;

const views = new Map<string, ResourceViewRenderer>();

/** Register the component that renders the named inspector view key. */
export function registerResourceView(key: string, render: ResourceViewRenderer): void {
  views.set(key, render);
}

/** The renderer registered for a view key, or undefined. */
export function getRegisteredView(key: string): ResourceViewRenderer | undefined {
  return views.get(key);
}

/**
 * Renders a single field's custom inspector control. A field declares it owns a view via
 * `view: "<key>"`; the host registers the component here. The adapter then emits a custom field
 * that defers to it — the source owns the field's layout rather than the generic per-kind widget.
 */
export type FieldViewRenderer = (source: PropertySource, field: PropertyDescriptor) => ReactNode;

const fieldViews = new Map<string, FieldViewRenderer>();

/** Register the component that renders the named field-view key. */
export function registerFieldView(key: string, render: FieldViewRenderer): void {
  fieldViews.set(key, render);
}

/** The renderer registered for a field-view key, or undefined. */
export function getRegisteredFieldView(key: string): FieldViewRenderer | undefined {
  return fieldViews.get(key);
}

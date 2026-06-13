import { useEffect, useReducer } from "react";
import { Inspector } from "@carapace/shell";
import type { Resource } from "@carapace/resources";
import { resourceToFields, resourceToSections } from "./adapter";
import type { ResourceAdapterOptions } from "./adapter";

export interface ResourceInspectorProps extends ResourceAdapterOptions {
  resource: Resource;
}

/**
 * Binds a live {@link Resource} to the shell {@link Inspector}: derives the field list each
 * render via {@link resourceToFields}, and re-renders whenever the resource (or any embedded
 * sub-resource — changes bubble up the ownership chain) changes. Field edits flow straight
 * to the resource's `Observable`s through the adapter's `setValue` handlers.
 */
export function ResourceInspector({ resource, override, pickType, renderResource }: ResourceInspectorProps) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const sub = resource.onChanged(() => bump());
    return () => sub.unsubscribe();
  }, [resource]);

  const opts: ResourceAdapterOptions = { override, pickType, renderResource };
  const rootCustom = renderResource?.(resource);
  // Class-hierarchy categories: concrete type first, then the inherited Resource base.
  const categories = resource.typeName === "Resource" ? ["Resource"] : [resource.typeName, "Resource"];
  return (
    <>
      {rootCustom}
      <Inspector
        fields={resourceToFields(resource, opts)}
        sections={resourceToSections(resource)}
        categories={categories}
      />
    </>
  );
}

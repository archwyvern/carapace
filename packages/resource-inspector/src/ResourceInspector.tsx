import { Inspector } from "@carapace/shell";
import type { Resource } from "@carapace/resources";
import { resourceToFields, resourceToSections, resolveResourceView, resourceCategories } from "./adapter";
import type { ResourceAdapterOptions } from "./adapter";
import { useResourceChanges } from "./useResourceChanges";

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
  useResourceChanges(resource);

  const opts: ResourceAdapterOptions = { override, pickType, renderResource };
  // The resource owns its inspector layout: a host `renderResource` wins, else the view its type
  // declares. The same resolution + category order is used for embedded sub-resources (mapResource).
  const rootCustom = resolveResourceView(resource, renderResource);
  const categories = resourceCategories(resource);
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

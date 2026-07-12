import { Inspector } from "@carapace/shell";
import type { PropertySource } from "./protocol";
import { resourceToFields, resourceToSections, resolveResourceView, resourceCategories } from "./adapter";
import type { ResourceAdapterOptions } from "./adapter";
import { useResourceChanges } from "./useResourceChanges";

export interface ResourceInspectorProps extends ResourceAdapterOptions {
  source: PropertySource;
}

/**
 * Binds a live {@link PropertySource} to the shell {@link Inspector}: derives the field list each
 * render via {@link resourceToFields}, and re-renders whenever the source (or any embedded
 * sub-source — changes bubble up the ownership chain) changes. Field edits flow straight
 * to the source through the adapter's `setValue` handlers.
 */
export function ResourceInspector({ source, host, override, pickType, renderResource }: ResourceInspectorProps) {
  useResourceChanges(source);

  const opts: ResourceAdapterOptions = { host, override, pickType, renderResource };
  // The source owns its inspector layout: a host `renderResource` wins, else the view its type
  // declares. The same resolution + category order is used for embedded sub-sources (mapResource).
  const rootCustom = resolveResourceView(source, opts);
  const categories = resourceCategories(source);
  return (
    <>
      {rootCustom}
      <Inspector
        fields={resourceToFields(source, opts)}
        sections={resourceToSections(source)}
        categories={categories}
      />
    </>
  );
}

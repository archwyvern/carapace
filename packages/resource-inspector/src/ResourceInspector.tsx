import { Inspector } from "@carapace/shell";
import type { InspectorField } from "@carapace/shell";
import type { PropertySource } from "./protocol";
import { resourceToFields, resourceToSections, resolveResourceView, resourceCategories } from "./adapter";
import type { ResourceAdapterOptions } from "./adapter";
import { useResourceChanges } from "./useResourceChanges";

export interface ResourceInspectorProps extends ResourceAdapterOptions {
  source: PropertySource;
  /**
   * Editor-injected synthetic fields (e.g. an "Anchors Preset" dropdown that derives from and
   * writes through real fields without existing on the data model). Each is spliced in FRONT
   * of the source's fields for its `category` band (fields without a category lead the whole
   * list). The data model never sees them — they are pure inspector UI.
   */
  extraFields?: InspectorField[];
}

/**
 * Binds a live {@link PropertySource} to the shell {@link Inspector}: derives the field list each
 * render via {@link resourceToFields}, and re-renders whenever the source (or any embedded
 * sub-source — changes bubble up the ownership chain) changes. Field edits flow straight
 * to the source through the adapter's `setValue` handlers.
 */
export function ResourceInspector({ source, host, override, pickType, renderResource, extraFields, extraVisibility }: ResourceInspectorProps) {
  useResourceChanges(source);

  const opts: ResourceAdapterOptions = { host, override, pickType, renderResource, extraVisibility };
  // The source owns its inspector layout: a host `renderResource` wins, else the view its type
  // declares. The same resolution + category order is used for embedded sub-sources (mapResource).
  const rootCustom = resolveResourceView(source, opts);
  const categories = resourceCategories(source);
  let fields = resourceToFields(source, opts);
  if (extraFields && extraFields.length > 0) {
    for (const extra of [...extraFields].reverse()) {
      const at = extra.category ? fields.findIndex(f => f.category === extra.category) : 0;
      fields = at < 0
        ? [...fields, extra]
        : [...fields.slice(0, at), extra, ...fields.slice(at)];
    }
  }
  return (
    <>
      {rootCustom}
      <Inspector
        fields={fields}
        sections={resourceToSections(source)}
        categories={categories}
      />
    </>
  );
}

/**
 * Resource Inspector page — placeholder.
 *
 * Next: mount `<ResourceInspector>` from `@carapace/resource-inspector` over real
 * `@carapace/resources` instances (GradientTexture2D, FastNoiseLite, ShaderMaterial…),
 * showing the adapter binding a Resource's properties/groups/categories onto the shell
 * Inspector — plus the custom `renderResource` hooks (gradient bar, curve canvas).
 * Wiring this needs the resource-inspector / resources / primitives packages added as
 * playground deps + vite source aliases (mirroring lambert/drydock).
 */
export function ResourceInspectorPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-widest text-accent">Carapace · Resource Inspector</div>
        <h1 className="text-base font-bold text-fg">Resource inspector</h1>
        <p className="mt-0.5 text-sm text-fg-mid">The data-bound layer over the presentational Inspector.</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center text-sm text-fg-mid">
          Coming next — this page will bind real <code className="text-fg">@carapace/resources</code> instances
          through <code className="text-fg">@carapace/resource-inspector</code> into the shell Inspector.
        </div>
      </div>
    </div>
  );
}

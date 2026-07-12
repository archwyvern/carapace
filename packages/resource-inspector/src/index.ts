export { ResourceInspector } from "./ResourceInspector";
export type { ResourceInspectorProps } from "./ResourceInspector";
export { resourceToFields, resourceToSections } from "./adapter";
export type { ResourceAdapterOptions } from "./adapter";
export { registerResourceView, getRegisteredView, registerFieldView, getRegisteredFieldView } from "./view-registry";
export type { ResourceViewRenderer, FieldViewRenderer } from "./view-registry";
export { useResourceChanges } from "./useResourceChanges";
export type {
  PropertySource,
  PropertyDescriptor,
  PropertyHost,
  PropertyKind,
  TupleMemberDesc,
  ValueSlot,
  Subscription,
} from "./protocol";

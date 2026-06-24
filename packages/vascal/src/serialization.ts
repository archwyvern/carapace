/**
 * The serialization layer: the consumer-driven type registry, decorators, and the reader that
 * materializes a parsed document into runtime objects. Decoupled from any resource model — the
 * consumer registers `TypeDescriptor`s (by hand or via decorators) that drive (de)serialization.
 */

export {
  TypeRegistry,
  type ConstructorDescriptor,
  type PropertyDescriptor,
  type TypeDescriptor,
} from "./registry.js";

export {
  AfterDeserialize,
  VascalProperty,
  VascalType,
  registerDecoratedTypes,
} from "./decorators.js";

export {
  ValueReader,
  deserialize,
  readResourceDocument,
  type ExternalLoader,
  type ReaderOptions,
} from "./reader.js";

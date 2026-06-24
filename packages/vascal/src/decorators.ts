import type { TypeRegistry } from "./registry.js";

/**
 * Decorator-based registration sugar over `TypeRegistry`. A consumer can either register descriptors
 * by hand (`registry.register({...})`) or decorate classes and call `registerDecoratedTypes(registry)`
 * once at startup. Decorators mirror the engine's `[VascalType]` / `[Export]` / `IAfterDeserialize`.
 */

interface VascalClassMeta {
  _vascalName?: string;
  _vascalProps?: Record<string, { type: string; setter?: string }>;
  _vascalAfterDeserialize?: string;
  _vascalEnums?: Record<string, unknown>;
}

const registeredClasses: Array<{ ctor: new (...args: any[]) => any; meta: VascalClassMeta }> = [];

/**
 * Marks a class as a Vascal-serializable type.
 *
 * ```ts
 * @VascalType("ShaderMaterial")
 * class ShaderMaterial extends Material { ... }
 * ```
 */
export function VascalType(name: string) {
  return function <T extends new (...args: any[]) => any>(target: T, context: ClassDecoratorContext<T>) {
    const meta = context.metadata as VascalClassMeta;
    meta._vascalName = name;
    registeredClasses.push({ ctor: target, meta });
  };
}

/**
 * Marks a field as a Vascal-serializable property.
 *
 * ```ts
 * @VascalProperty() shader: Shader | null = null;
 * @VascalProperty("int") renderPriority = 0;
 * @VascalProperty("Shader", { via: "setShader" }) shader: Shader | null = null;
 * ```
 */
export function VascalProperty(type = "auto", opts?: { via?: string }) {
  return function (_: undefined, context: ClassFieldDecoratorContext) {
    const meta = context.metadata as VascalClassMeta;
    if (!meta._vascalProps) meta._vascalProps = {};
    meta._vascalProps[String(context.name)] = { type, setter: opts?.via };
  };
}

/**
 * Marks a method to be called after deserialization completes.
 *
 * ```ts
 * @AfterDeserialize()
 * onDeserialized() { ... }
 * ```
 */
export function AfterDeserialize() {
  return function (_: Function, context: ClassMethodDecoratorContext) {
    const meta = context.metadata as VascalClassMeta;
    meta._vascalAfterDeserialize = String(context.name);
  };
}

/**
 * Registers all `@VascalType` decorated classes with a `TypeRegistry`. Call once after all decorated
 * classes have been imported. Manually registered types win — decorator-discovered properties are
 * merged underneath, not overwritten.
 */
export function registerDecoratedTypes(registry: TypeRegistry): void {
  for (const { ctor, meta } of registeredClasses) {
    const name = meta._vascalName;
    if (!name) continue;

    const props: Record<string, { type: string; set: (instance: any, value: any) => void }> = {};
    if (meta._vascalProps) {
      for (const [key, info] of Object.entries(meta._vascalProps)) {
        if (info.setter) {
          const methodName = info.setter;
          props[key] = { type: info.type, set: (o, v) => o[methodName](v) };
        } else {
          props[key] = {
            type: info.type,
            set: (o, v) => {
              o[key] = v;
            },
          };
        }
      }
    }

    const existing = registry.get(name);
    if (existing) {
      if (!existing.properties) existing.properties = {};
      for (const [key, desc] of Object.entries(props)) {
        const lowerKey = key.toLowerCase();
        const alreadyDefined = Object.keys(existing.properties).some((k) => k.toLowerCase() === lowerKey);
        if (!alreadyDefined) {
          existing.properties[key] = desc;
        }
      }
      if (!existing.afterDeserialize && meta._vascalAfterDeserialize) {
        existing.afterDeserialize = meta._vascalAfterDeserialize;
      }
    } else {
      registry.register({
        name,
        create: () => new ctor(),
        properties: props,
        enums: meta._vascalEnums,
        afterDeserialize: meta._vascalAfterDeserialize,
      });
    }
  }
}

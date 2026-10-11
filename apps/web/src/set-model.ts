import type { Variable } from "@isetl/runtime";
export type SetOperation =
  "union" | "intersection" | "difference" | "symmetric";
export function combineSets(a: Variable, b: Variable, operation: SetOperation) {
  const left = new Set(a.value.items.map((item) => item.key));
  const right = new Set(b.value.items.map((item) => item.key));
  const regions = [
    a.value.items.filter((item) => !right.has(item.key)),
    a.value.items.filter((item) => right.has(item.key)),
    b.value.items.filter((item) => !left.has(item.key)),
  ];
  const included =
    operation === "union"
      ? [true, true, true]
      : operation === "intersection"
        ? [false, true, false]
        : operation === "difference"
          ? [true, false, false]
          : [true, false, true];
  return {
    regions,
    included,
    result: regions.flatMap((items, index) => (included[index] ? items : [])),
  };
}

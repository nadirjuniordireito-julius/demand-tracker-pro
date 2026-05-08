// validatePdfStyles.ts
import type { ReactElement } from "react";

const INVALID = ["auto", undefined, null, NaN];

function isInvalid(v: unknown) {
  return INVALID.includes(v as never) || (typeof v === "number" && !isFinite(v));
}

export function validatePdfTree(el: ReactElement, path = "root") {
  if (!el || typeof el !== "object") return;

  const props = (el.props ?? {}) as { style?: Record<string, unknown>; children?: unknown };

  if (props.style) {
    Object.entries(props.style).forEach(([key, value]) => {
      if (isInvalid(value)) {
        console.error(
          `❌ Estilo inválido em ${path} → ${key}:`,
          value,
          "\nStyle:",
          props.style
        );
        throw new Error(`Invalid style ${key} at ${path}`);
      }
    });
  }

  const children = props.children;
  if (Array.isArray(children)) {
    children.forEach((c, i) =>
      validatePdfTree(c as ReactElement, `${path}.children[${i}]`)
    );
  } else if (children) {
    validatePdfTree(children as ReactElement, `${path}.children`);
  }
}

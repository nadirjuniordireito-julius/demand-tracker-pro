// validatePdfStyles.ts
import type { ReactElement } from "react";

const INVALID = ["auto", undefined, null, NaN];

function isInvalid(v: any) {
  return INVALID.includes(v) || (typeof v === "number" && !isFinite(v));
}

export function validatePdfTree(el: ReactElement, path = "root") {
  if (!el || typeof el !== "object") return;

  const props: any = el.props || {};

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
      validatePdfTree(c, `${path}.children[${i}]`)
    );
  } else if (children) {
    validatePdfTree(children, `${path}.children`);
  }
}

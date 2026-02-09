import { useState, useCallback, useLayoutEffect } from 'react';

export function useResizeObserver<T extends HTMLElement>(): [
  (node: T | null) => void,
  { width: number; height: number }
] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [node, setNode] = useState<T | null>(null);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useLayoutEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(node);
    setSize({ width: node.offsetWidth, height: node.offsetHeight });
    return () => ro.disconnect();
  }, [node]);

  return [ref, size];
}

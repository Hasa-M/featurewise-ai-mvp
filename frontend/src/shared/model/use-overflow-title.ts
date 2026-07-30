import { useCallback } from 'react';
import type { MouseEvent } from 'react';

function isOverflowing(element: HTMLElement) {
  return (
    element.scrollWidth > element.clientWidth ||
    element.scrollHeight > element.clientHeight
  );
}

export function useOverflowTitle<Element extends HTMLElement>() {
  const onMouseEnter = useCallback((event: MouseEvent<Element>) => {
    const element = event.currentTarget;
    const text = element.textContent?.trim();

    if (text && isOverflowing(element)) {
      element.title = text;
      return;
    }

    element.removeAttribute('title');
  }, []);

  const onMouseLeave = useCallback((event: MouseEvent<Element>) => {
    event.currentTarget.removeAttribute('title');
  }, []);

  return { onMouseEnter, onMouseLeave };
}
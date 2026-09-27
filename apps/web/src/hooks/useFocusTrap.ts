import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap hook for accessible modal dialogs.
 * Traps Tab and Shift+Tab within container, restores focus on exit,
 * and handles optional Escape key callback.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape?: () => void,
) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    if (typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element or the container itself
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const firstFocusable = focusables[0];

    // If an element inside has autofocus, it will already be focused; otherwise focus the first element
    if (firstFocusable && !container.contains(document.activeElement)) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !container.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [containerRef, isActive, onEscape]);
}

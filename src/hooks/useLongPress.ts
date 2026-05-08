import { useCallback, useEffect, useRef } from "react";

interface Options {
  delay?: number;
  moveThreshold?: number;
}

/**
 * Long-press gesture hook using Pointer Events. Works on mouse + touch.
 * Returns event handlers to spread on the target element.
 * The callback receives the original pointerdown event so callers can
 * compute coordinates, target, etc.
 */
export function useLongPress(
  onLongPress: (e: React.PointerEvent) => void,
  { delay = 500, moveThreshold = 8 }: Options = {}
) {
  const timerRef = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const startEventRef = useRef<React.PointerEvent | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
    startEventRef.current = null;
  }, []);

  useEffect(() => () => clear(), [clear]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only primary button / touch / pen
    if (e.pointerType === "mouse" && e.button !== 0) return;
    firedRef.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    // Persist a synthetic-like snapshot we can use later
    const captured = {
      clientX: e.clientX,
      clientY: e.clientY,
      currentTarget: e.currentTarget,
      target: e.target,
      pointerType: e.pointerType,
    } as unknown as React.PointerEvent;
    startEventRef.current = captured;
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      if (startEventRef.current) {
        onLongPress(startEventRef.current);
      }
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(15);
        }
      } catch {
        /* noop */
      }
    }, delay);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > moveThreshold) clear();
  };

  const cancel = () => clear();

  const onClickCapture = (e: React.MouseEvent) => {
    if (firedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      firedRef.current = false;
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (firedRef.current) e.preventDefault();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture,
    onContextMenu,
  };
}

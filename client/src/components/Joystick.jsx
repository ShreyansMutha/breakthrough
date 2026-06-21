import { useRef, useState } from 'react';

const MAX = 40; // px the nub can travel
const DEAD = 18; // px before a step fires

// A one-step-per-flick joystick. Push past the deadzone -> fires a single step
// in the dominant direction; you must release (or return to center) before the
// next step. Emits semantic directions: 'forward' | 'back' | 'left' | 'right'.
export default function Joystick({ onStep, disabled }) {
  const baseRef = useRef(null);
  const activeRef = useRef(false);
  const firedRef = useRef(false);
  const [nub, setNub] = useState({ x: 0, y: 0 });

  const handle = (clientX, clientY) => {
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(dist, MAX);
    setNub({ x: (dx / dist) * clamped, y: (dy / dist) * clamped });

    if (!firedRef.current && dist > DEAD && !disabled) {
      firedRef.current = true;
      let dir;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'back' : 'forward';
      onStep(dir);
    }
  };

  const reset = () => {
    activeRef.current = false;
    firedRef.current = false;
    setNub({ x: 0, y: 0 });
  };

  const onDown = (e) => {
    activeRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handle(e.clientX, e.clientY);
  };
  const onMove = (e) => {
    if (!activeRef.current) return;
    handle(e.clientX, e.clientY);
  };

  return (
    <div
      ref={baseRef}
      className={`joystick ${disabled ? 'disabled' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <span className="joystick-ring" />
      <span
        className="joystick-nub"
        style={{ transform: `translate(${nub.x}px, ${nub.y}px)` }}
      />
    </div>
  );
}

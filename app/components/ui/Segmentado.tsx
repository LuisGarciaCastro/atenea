"use client";

import { useLayoutEffect, useRef, useState } from "react";
import comun from "./comun.module.css";

export default function Segmentado<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const activo = ref.current?.querySelector<HTMLElement>('[data-on="true"]');
    if (activo) setThumb({ left: activo.offsetLeft, width: activo.offsetWidth });
  }, [value, options.length]);

  return (
    <div className={comun.seg} ref={ref}>
      {thumb && (
        <span
          className={comun.segThumb}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
          aria-hidden="true"
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-on={value === opt.value}
          aria-pressed={value === opt.value}
          className={`${comun.segBtn} ${value === opt.value ? comun.segBtnOn : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

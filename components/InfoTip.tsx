"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface InfoTipProps {
  title: string;
  desc: string;
  formula?: string;
  side?: "auto" | "top" | "bottom" | "left" | "right";
}

export default function InfoTip({
  title,
  desc,
  formula,
  side = "auto",
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: string }>({
    top: 0,
    left: 0,
    placement: "right",
  });
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let placement = side;
    let top = 0;
    let left = 0;

    if (side === "auto") {
      // Determine auto placement: if on the right half of the screen (e.g. sidebar), place to the left
      if (rect.right + tooltipWidth + gap > vw) {
        placement = "left";
      } else {
        placement = "right";
      }
    }

    if (placement === "left") {
      left = rect.left - tooltipWidth - gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (placement === "right") {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (placement === "top") {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.top - tooltipHeight - gap;
    } else {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.bottom + gap;
    }

    // Viewport clamping
    if (left < 10) left = 10;
    if (left + tooltipWidth > vw - 10) left = vw - tooltipWidth - 10;
    if (top < 10) top = 10;
    if (top + tooltipHeight > vh - 10) top = vh - tooltipHeight - 10;

    setCoords({ top, left, placement });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  const handleFocus = () => {
    updatePosition();
    setOpen(true);
  };

  const handleBlur = () => {
    setOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className="infotip-anchor"
        tabIndex={0}
        role="button"
        aria-label={`${title}: ${desc}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={(e) => {
          e.stopPropagation();
          updatePosition();
          setOpen((v) => !v);
        }}
      >
        <span className="info-icon" aria-hidden="true">
          i
        </span>
      </span>

      {mounted &&
        open &&
        createPortal(
          <div
            className={`infotip-portal-bubble placement-${coords.placement}`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            role="tooltip"
          >
            <div className="infotip-bubble-gloss" />
            <strong className="infotip-title">{title}</strong>
            <span className="infotip-desc">{desc}</span>
            {formula && <code className="infotip-formula mono">{formula}</code>}
          </div>,
          document.body
        )}
    </>
  );
}

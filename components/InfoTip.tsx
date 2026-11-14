"use client";
import React from "react";

interface InfoTipProps {
  title: string;
  desc: string;
  formula?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export default function InfoTip({
  title,
  desc,
  formula,
  side = "top",
}: InfoTipProps) {
  return (
    <span
      className={`infotip-anchor infotip-${side}`}
      tabIndex={0}
      role="tooltip"
      aria-label={`${title}: ${desc}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="info-icon" aria-hidden="true">
        i
      </span>
      <span className="infotip-bubble">
        <strong className="infotip-title">{title}</strong>
        <span className="infotip-desc">{desc}</span>
        {formula && <code className="infotip-formula mono">{formula}</code>}
      </span>
    </span>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { playfair, jost } from "@/lib/fonts";

export const AnchorFashionLogo = ({
  className,
  isLoading = false,
  noLink = false,
}: {
  className?: string;
  isLoading?: boolean;
  noLink?: boolean;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const innerContent = (
    <>
      <style>{`
        .af-draw-gold {
          fill: #C9A86A;
          stroke: #C9A86A;
          stroke-width: 0.5px;
        }

        .af-draw-blue {
          fill: #122B59;
          stroke: #122B59;
          stroke-width: 0.5px;
        }

        .af-draw-line {
          stroke: #122B59;
          stroke-width: 1.5px;
        }

        .dark .af-draw-blue {
          fill: #F8FAFC;
          stroke: #F8FAFC;
        }

        .dark .af-draw-line {
          stroke: #F8FAFC;
        }
      `}</style>

      {/* SVG Canvas for the Perfect Anchor Fashion Logo */}
      <svg
        viewBox="0 0 440 130"
        className="h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Mask to cut out the standard crossbar of the 'A' */}
          <mask id="a-crossbar-cut">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x="0" y="55" width="100" height="15" fill="black" />
          </mask>
        </defs>

        {/* 1. The Gold 'A' */}
        <g mask="url(#a-crossbar-cut)">
          <text
            x="15"
            y="80"
            className={`af-draw-gold ${playfair.className}`}
            style={{ fontSize: "90px", fontWeight: "500" }}
          >
            A
          </text>
        </g>

        {/* 2. The Custom Gold Swoosh across the 'A' */}
        <path
          d="M 5 65 Q 45 35 95 68 Q 50 50 15 73 Z"
          className="af-draw-gold"
          style={{ strokeWidth: "0.5px" }}
        />

        {/* 3. The 'NCHOR' text in Dark Blue */}
        <text
          x="105"
          y="80"
          className={`af-draw-blue ${playfair.className}`}
          style={{ fontSize: "66px", fontWeight: "600", letterSpacing: "2px" }}
        >
          NCHOR
        </text>

      </svg>
    </>
  );

  const containerProps = {
    className: `flex select-none items-center ${className || "w-full"}`,
    "aria-label": "Anchor Fashion Home",
    style: {
      verticalAlign: "middle",
      boxSizing: "border-box" as const,
    },
  };

  if (noLink) {
    return <div {...containerProps}>{innerContent}</div>;
  }

  return (
    <Link href="/" {...containerProps}>
      {innerContent}
    </Link>
  );
};

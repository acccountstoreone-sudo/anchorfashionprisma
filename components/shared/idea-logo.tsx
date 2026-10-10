"use client";

import { useEffect, useState } from "react";

interface IdeaLogoProps {
  className?: string;
}

export function IdeaLogo({ className = "w-32 h-auto" }: IdeaLogoProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <style>{`
        .animated-logo-path-1 {
          stroke: currentColor;
          stroke-width: 1;
          fill: transparent;
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw-stroke 2.5s ease-in-out forwards, fill-in 1s ease-in-out 2s forwards;
        }
        .animated-logo-path-2 {
          fill: transparent;
          transform: scale(0);
          transform-origin: 90px 15px; /* approximate center of the red shape */
          animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 2.2s forwards, fill-red 0.5s ease-in-out 2.2s forwards;
        }
        
        @keyframes draw-stroke {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fill-in {
          to {
            fill: currentColor;
            stroke-color: transparent;
          }
        }
        
        @keyframes pop-in {
          to {
            transform: scale(1);
          }
        }
        
        @keyframes fill-red {
          to {
            fill: #d02128;
          }
        }
      `}</style>
      <svg
        id="Layer_1"
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 205.24 115.79"
        className="h-full w-full text-slate-900"
      >
        <path
          className="animated-logo-path-1"
          d="M35.1 95.53a14.7 14.7 0 01-4.32 10.85 16.43 16.43 0 01-11.88 4.47A16.54 16.54 0 017 106.42a14.61 14.61 0 01-4.6-10.89V86.2h11.74v15.91c0 4 1.58 6 4.76 6s4.54-2 4.54-6v-11.5c0-4.85-1.37-8.58-4.1-11.3L7 67.15c-3.08-3-4.62-7.51-4.62-13.35v-7.2a14.65 14.65 0 014.5-10.93q4.46-4.41 11.72-4.41t11.74 4.41a14.68 14.68 0 014.47 10.93v9.32H23.15V40c0-4-1.52-6-4.55-6s-4.46 2-4.46 6v10.33c0 4.86 1.34 8.58 4 11.23l12.34 12.16c3.1 3.1 4.62 7.55 4.62 13.42zM78 110.1H62.47V108a12.48 12.48 0 01-8.47 2.85c-8.32 0-12.46-4.57-12.46-13.78V79.72c0-9.64 5.76-14.5 17.29-14.5h3.61V40c0-4-1.47-6-4.41-6s-4.33 2-4.33 6v15.92H42V46.6q0-7 4.36-11.15c2.92-2.76 6.81-4.19 11.7-4.19s8.84 1.43 11.74 4.19 4.34 6.49 4.34 11.15v60.79zm-15.48-4.82V68H59c-3.81 0-5.72 2-5.72 5.92v28.21c0 3.79 1.35 5.72 4 5.72a7.31 7.31 0 005.19-2.57zM99.86 110.1H80.63l3.78-2.71V34.72L80.63 32h15.5v75.4zM107 107.39V5h15.4l-3.73 2.7v99.74l3.73 2.71h-19.24zM161.7 95.53a14.39 14.39 0 01-4.8 10.89 18.89 18.89 0 01-24.31 0 14.25 14.25 0 01-4.84-10.89V46.6a14.11 14.11 0 014.84-10.88 18.79 18.79 0 0124.31 0 14.24 14.24 0 014.8 10.88zm-11.7 6.58V40c0-4-1.75-6-5.22-6s-5.27 2-5.27 6v62.1c0 4 1.75 6 5.27 6s5.22-1.95 5.22-5.99zM202.4 55.92h-11.74V40c0-3.84-1.19-5.75-3.59-5.75-1.56 0-3.13.86-4.68 2.56v70.57l3.8 2.71H166.9l3.82-2.71V34.72L166.9 32h15.49v2.14a12.25 12.25 0 018.27-2.87q11.75 0 11.74 13.78z"
        />
        <path
          className="animated-logo-path-2"
          d="M96.13 23.86h-15.5l3.78-2.68L96.13 5.84v18z"
        />
      </svg>
    </div>
  );
}

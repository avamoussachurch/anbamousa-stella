import React from 'react';

type AmbientWorldProps = {
  variant?: 'app' | 'login';
};

/**
 * Lightweight, decorative atmosphere shared by every Anba Mousa workspace.
 * All movement is CSS-transform/opacity based, pointer-transparent, and
 * disabled by the user's reduced-motion preference.
 */
export const AmbientWorld: React.FC<AmbientWorldProps> = ({ variant = 'app' }) => (
  <div
    aria-hidden="true"
    className={`ambient-world ambient-world--${variant}`}
  >
    <div className="ambient-world__glow ambient-world__glow--one" />
    <div className="ambient-world__glow ambient-world__glow--two" />
    <div className="ambient-world__arch ambient-world__arch--left" />
    <div className="ambient-world__arch ambient-world__arch--right" />
    <div className="ambient-world__horizon" />
    <div className="ambient-world__lantern ambient-world__lantern--left"><span /></div>
    <div className="ambient-world__lantern ambient-world__lantern--right"><span /></div>
    <div className="ambient-world__particles">
      {Array.from({ length: 14 }, (_, index) => (
        <i key={index} className={`ambient-world__particle ambient-world__particle--${index + 1}`} />
      ))}
    </div>
    <div className="ambient-world__grain" />
  </div>
);

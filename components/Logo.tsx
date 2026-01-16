
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F9E292" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        <g transform="translate(50,50)">
          {/* O logo original composto por 4 formas de "gota" em espiral */}
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              d="M-5,-5 C-25,-35 -45,-15 -25,10 C-15,25 -5,15 -5,5 Z"
              fill="url(#goldGradient)"
              transform={`rotate(${angle}) scale(1.4)`}
              style={{ mixBlendMode: 'normal' }}
            />
          ))}
          {/* Centro suave */}
          <circle r="4" fill="#1e293b" />
        </g>
      </svg>
    </div>
  );
};

export default Logo;

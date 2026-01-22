
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  // SVG da letra "E." em Branco sobre fundo Midnight Blue (#0f172a)
  // Design focado em sofisticação, clareza e autoridade financeira
  const essenziaSerifLogo = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyOCIgZmlsbD0iIzBmMTcyYSIvPgogIDxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgcng9IjI2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1vcGFjaXR5PSIwLjEiLz4KICA8dGV4dCB4PSI1MCIgeT0iNjYiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkUuPC90ZXh0Pgo8L3N2Zz4=";

  return (
    <div className={`${className} flex items-center justify-center overflow-hidden rounded-xl shadow-md transition-all hover:scale-105 duration-300 bg-[#0f172a]`}>
      <img 
        src={essenziaSerifLogo} 
        alt="Essenzia Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;

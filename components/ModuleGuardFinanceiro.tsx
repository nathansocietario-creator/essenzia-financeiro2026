
import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService.ts';
import { ModulePermission } from '../types.ts';

interface GuardProps {
  children: React.ReactNode;
  onPermissionGranted: (perms: ModulePermission) => void;
}

const ModuleGuardFinanceiro: React.FC<GuardProps> = ({ children, onPermissionGranted }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const grantAccess = async () => {
      const perms = await authService.getModulePermissions('static-id');
      if (perms) {
        onPermissionGranted(perms);
      }
      setLoading(false);
    };
    grantAccess();
  }, [onPermissionGranted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
          Carregando Módulo...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ModuleGuardFinanceiro;

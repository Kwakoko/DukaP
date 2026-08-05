import React from 'react';
import { versionMetadata } from '../../config/versionMetadata';

interface AppVersionFooterProps {
  className?: string;
  isFixed?: boolean;
}

export const AppVersionFooter: React.FC<AppVersionFooterProps> = ({ 
  className = '', 
  isFixed = false 
}) => {
  const { appName, currentYear, version, buildNumber } = versionMetadata;

  const baseClasses = `w-full text-center py-3 px-4 text-[11px] font-medium tracking-tight text-slate-400 dark:text-slate-500 transition-colors select-none ${className}`;
  const fixedClasses = isFixed 
    ? 'fixed bottom-0 left-0 right-0 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-800/60 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]' 
    : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mb-16 md:mb-4';

  return (
    <footer className={`${baseClasses} ${fixedClasses}`} aria-label="Application Version Information">
      <div className="inline-flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
        <span className="font-semibold text-slate-600 dark:text-slate-300">{appName}</span>
        <span>&copy; {currentYear}</span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span>Version <strong className="font-semibold text-slate-600 dark:text-slate-300">{version}</strong></span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span>Build <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">{buildNumber}</code></span>
      </div>
    </footer>
  );
};

export default AppVersionFooter;

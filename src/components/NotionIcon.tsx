import React from 'react';

type NotionIconName =
  | 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'education'
  | 'bill' | 'home' | 'clothing' | 'donation' | 'investment' | 'other'
  | 'salary' | 'freelance' | 'business' | 'gift'
  | 'cash' | 'bank' | 'wallet' | 'credit-card' | 'savings'
  | 'goal-home' | 'goal-car' | 'goal-plane' | 'goal-phone' | 'goal-education'
  | 'goal-fund' | 'goal-health' | 'target';

interface NotionIconProps {
  name?: string;
  size?: number;
  className?: string;
}

const Svg: React.FC<NotionIconProps & { children: React.ReactNode }> = ({ size = 20, className = '', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);

export const NotionIcon: React.FC<NotionIconProps> = ({ name = 'other', size = 20, className }) => {
  const icon = name as NotionIconName;

  switch (icon) {
    case 'food':
      return <Svg size={size} className={className}><path d="M6 2v20" /><path d="M10 2v7a4 4 0 0 1-8 0V2" /><path d="M18 2c-2 2-3 5-3 9v3h5V2" /><path d="M20 14v8" /></Svg>;
    case 'transport':
      return <Svg size={size} className={className}><path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 12h14" /></Svg>;
    case 'shopping':
      return <Svg size={size} className={className}><path d="M6 7h12l-1 14H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></Svg>;
    case 'entertainment':
      return <Svg size={size} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 12h3" /><path d="M9.5 10.5v3" /><circle cx="16" cy="11" r=".5" /><circle cx="18" cy="14" r=".5" /></Svg>;
    case 'health':
      return <Svg size={size} className={className}><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z" /><path d="M9 12h6" /><path d="M12 9v6" /></Svg>;
    case 'education':
      return <Svg size={size} className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" /></Svg>;
    case 'bill':
      return <Svg size={size} className={className}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" /><path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" /></Svg>;
    case 'home':
    case 'goal-home':
      return <Svg size={size} className={className}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></Svg>;
    case 'clothing':
      return <Svg size={size} className={className}><path d="M8 4 4 6l2 5 2-1v10h8V10l2 1 2-5-4-2" /><path d="M9 4a3 3 0 0 0 6 0" /></Svg>;
    case 'donation':
      return <Svg size={size} className={className}><path d="M7 11v8" /><path d="M17 11v8" /><path d="M4 11h16" /><path d="M5 19h14" /><path d="M12 11V6" /><path d="M12 6c-1.5-3-5-2-5 .5 0 2 2 3 5 3" /><path d="M12 6c1.5-3 5-2 5 .5 0 2-2 3-5 3" /></Svg>;
    case 'investment':
      return <Svg size={size} className={className}><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></Svg>;
    case 'salary':
    case 'cash':
      return <Svg size={size} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9v.01" /><path d="M18 15v.01" /></Svg>;
    case 'freelance':
      return <Svg size={size} className={className}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="m10 9-2 3 2 3" /><path d="m14 9 2 3-2 3" /></Svg>;
    case 'business':
    case 'bank':
      return <Svg size={size} className={className}><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-8h6v8" /></Svg>;
    case 'gift':
      return <Svg size={size} className={className}><path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1-3-5-3-5 0" /><path d="M12 7c1-3 5-3 5 0" /></Svg>;
    case 'wallet':
      return <Svg size={size} className={className}><path d="M3 7h16a2 2 0 0 1 2 2v10H3V7Z" /><path d="M3 7l13-4v4" /><path d="M16 14h5" /><circle cx="17" cy="14" r="1" /></Svg>;
    case 'credit-card':
      return <Svg size={size} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></Svg>;
    case 'savings':
      return <Svg size={size} className={className}><path d="M5 12a7 7 0 0 1 14 0v5H5v-5Z" /><path d="M8 17v4" /><path d="M16 17v4" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M12 13h.01" /></Svg>;
    case 'goal-car':
      return <Svg size={size} className={className}><path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></Svg>;
    case 'goal-plane':
      return <Svg size={size} className={className}><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></Svg>;
    case 'goal-phone':
      return <Svg size={size} className={className}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Svg>;
    case 'goal-education':
      return <Svg size={size} className={className}><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M7 10v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5" /></Svg>;
    case 'goal-fund':
      return <Svg size={size} className={className}><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></Svg>;
    case 'goal-health':
      return <Svg size={size} className={className}><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z" /></Svg>;
    case 'target':
      return <Svg size={size} className={className}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Svg>;
    default:
      return <Svg size={size} className={className}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></Svg>;
  }
};

export const IconBubble: React.FC<{
  name?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ name, color = '#71717a', size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  const iconSizes = { sm: 16, md: 19, lg: 22 };

  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center shrink-0 ${className}`} style={{ backgroundColor: `${color}14`, color }}>
      <NotionIcon name={name} size={iconSizes[size]} />
    </div>
  );
};
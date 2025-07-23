interface TennisBallIconProps {
  size?: number;
  className?: string;
}

export default function TennisBallIcon({ size = 24, className = "" }: TennisBallIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tennis ball base circle */}
      <circle 
        cx="12" 
        cy="12" 
        r="11" 
        fill="currentColor"
        stroke="none"
      />
      
      {/* Tennis ball characteristic curved lines */}
      <path 
        d="M 2 12 Q 8 6, 12 12 Q 16 18, 22 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path 
        d="M 2 12 Q 8 18, 12 12 Q 16 6, 22 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
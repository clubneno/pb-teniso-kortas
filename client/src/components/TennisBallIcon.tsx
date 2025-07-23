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
      {/* Tennis ball base circle - classic yellow-green color */}
      <circle 
        cx="12" 
        cy="12" 
        r="11" 
        fill="currentColor"
        stroke="none"
      />
      
      {/* Tennis ball characteristic curved seam lines */}
      <path 
        d="M 3 12 Q 7 5, 12 12 Q 17 19, 21 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path 
        d="M 3 12 Q 7 19, 12 12 Q 17 5, 21 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Additional texture lines for more realistic look */}
      <path 
        d="M 6 8 Q 10 10, 12 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path 
        d="M 18 16 Q 14 14, 12 12" 
        fill="none" 
        stroke="white" 
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
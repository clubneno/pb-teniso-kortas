interface TennisBallIconProps {
  size?: number;
  className?: string;
}

export default function TennisBallIcon({ size = 24, className = "" }: TennisBallIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 69.447 69.447" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(-1271.769 -1574.648)">
        {/* Main tennis ball circle - using currentColor for theming */}
        <path 
          d="M1341.208,1609.372a34.719,34.719,0,1,1-34.72-34.724A34.724,34.724,0,0,1,1341.208,1609.372Z" 
          fill="currentColor"
        />
        {/* Tennis ball characteristic curved seam lines in white */}
        <path 
          d="M1311.144,1574.993a35.139,35.139,0,0,0-4.61-.344,41.069,41.069,0,0,1-34.369,29.735,34.3,34.3,0,0,0-.381,4.635l.183-.026a45.921,45.921,0,0,0,39.149-33.881Zm29.721,34.692a45.487,45.487,0,0,0-33.488,34.054l-.071.313a34.54,34.54,0,0,0,4.818-.455,41.218,41.218,0,0,1,28.686-29.194,36.059,36.059,0,0,0,.388-4.8Z" 
          fill="white"
        />
      </g>
    </svg>
  );
}
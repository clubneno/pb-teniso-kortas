// Button component removed - using div for better text color control

interface TimeSlot {
  startTime: string;
  endTime: string;
  timeDisplay: string;
  isReserved: boolean;
}

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  onSlotSelect: (slot: string) => void;
  selectedSlot: string | null;
  isPublicView?: boolean;
}

export default function TimeSlotGrid({ 
  timeSlots, 
  onSlotSelect, 
  selectedSlot, 
  isPublicView = false 
}: TimeSlotGridProps) {
  
  const getSlotClassName = (slot: TimeSlot) => {
    const baseClasses = "text-center transition-colors !text-white";
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    
    if (slot.isReserved) {
      return `${baseClasses} bg-red-600 border border-red-700 cursor-not-allowed`;
    }
    
    if (selectedSlot === timeRange && !isPublicView) {
      return `${baseClasses} bg-tennis-green-600 border border-tennis-green-700`;
    }
    
    if (isPublicView) {
      return `${baseClasses} bg-green-600 border border-green-700`;
    }
    
    return `${baseClasses} bg-green-500 border border-green-600 hover:bg-green-600`;
  };

  const getStatusText = (slot: TimeSlot) => {
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    
    if (slot.isReserved) {
      return "Užimta";
    }
    
    if (selectedSlot === timeRange && !isPublicView) {
      return "Pasirinkta";
    }
    
    return "Laisva";
  };

  // Text color functions no longer needed - using inline styles for white text

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {timeSlots.map((slot) => {
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        
        return (
          <div
            key={timeRange}
            className={`${getSlotClassName(slot)} cursor-pointer rounded-md p-3 min-h-[60px] flex items-center justify-center`}
            onClick={() => !slot.isReserved && !isPublicView && onSlotSelect(timeRange)}
            style={{ 
              color: 'white',
              pointerEvents: slot.isReserved || isPublicView ? 'none' : 'auto'
            }}
          >
            <div className="text-center" style={{ color: 'white' }}>
              <div className="text-sm font-medium" style={{ color: 'white' }}>
                {slot.timeDisplay}
              </div>
              <div className="text-xs" style={{ color: 'white' }}>
                {getStatusText(slot)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

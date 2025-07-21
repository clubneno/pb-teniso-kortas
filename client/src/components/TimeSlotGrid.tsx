import { Button } from "@/components/ui/button";

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

  const getStatusColor = (slot: TimeSlot) => {
    // White text is now handled by the button's base classes
    return "";
  };

  const getTimeColor = (slot: TimeSlot) => {
    // White text is now handled by the button's base classes
    return "";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {timeSlots.map((slot) => {
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        
        return (
          <Button
            key={timeRange}
            className={getSlotClassName(slot)}
            onClick={() => !slot.isReserved && !isPublicView && onSlotSelect(timeRange)}
            disabled={slot.isReserved || isPublicView}
            style={{ color: 'white' }}
          >
            <div className="p-1" style={{ color: 'white' }}>
              <div className={`text-sm font-medium ${getTimeColor(slot)}`} style={{ color: 'white' }}>
                {slot.timeDisplay}
              </div>
              <div className={`text-xs ${getStatusColor(slot)}`} style={{ color: 'white' }}>
                {getStatusText(slot)}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

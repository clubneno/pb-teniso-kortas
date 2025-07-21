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
    const baseClasses = "text-center transition-colors";
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    
    if (slot.isReserved) {
      return `${baseClasses} bg-red-50 border border-red-200 opacity-60 cursor-not-allowed`;
    }
    
    if (selectedSlot === timeRange && !isPublicView) {
      return `${baseClasses} bg-tennis-green-500 border border-tennis-green-600 text-white`;
    }
    
    if (isPublicView) {
      return `${baseClasses} bg-white border border-gray-200`;
    }
    
    return `${baseClasses} bg-white border border-gray-200 hover:bg-gray-50`;
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
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    
    if (slot.isReserved) {
      return "text-red-900";
    }
    
    if (selectedSlot === timeRange && !isPublicView) {
      return "text-white";
    }
    
    return "text-gray-700";
  };

  const getTimeColor = (slot: TimeSlot) => {
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    
    if (slot.isReserved) {
      return "text-red-900";
    }
    
    if (selectedSlot === timeRange && !isPublicView) {
      return "text-white";
    }
    
    return "text-gray-900";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {timeSlots.map((slot) => {
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        
        return (
          <Button
            key={timeRange}
            variant="outline"
            className={getSlotClassName(slot)}
            onClick={() => !slot.isReserved && !isPublicView && onSlotSelect(timeRange)}
            disabled={slot.isReserved || isPublicView}
          >
            <div className="p-1">
              <div className={`text-sm font-medium ${getTimeColor(slot)}`}>
                {slot.timeDisplay}
              </div>
              <div className={`text-xs ${getStatusColor(slot)}`}>
                {getStatusText(slot)}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

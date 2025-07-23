// Button component removed - using div for better text color control

interface TimeSlot {
  startTime: string;
  endTime: string;
  timeDisplay: string;
  isReserved: boolean;
  totalReservations?: number;
  reservedCourts?: string;
}

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  onSlotSelect: (slot: string) => void;
  selectedSlots: string[];
  selectedDate: string; // YYYY-MM-DD format
  isPublicView?: boolean;
}

export default function TimeSlotGrid({ 
  timeSlots, 
  onSlotSelect, 
  selectedSlots, 
  selectedDate,
  isPublicView = false 
}: TimeSlotGridProps) {
  
  const isSlotInPast = (slot: TimeSlot) => {
    const now = new Date();
    
    // Format today's date as YYYY-MM-DD using local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Only check if slot is in the past for today's date
    if (selectedDate !== todayStr) {
      return false;
    }
    
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return now > slotTime;
  };

  const getSlotClassName = (slot: TimeSlot) => {
    const baseClasses = "text-center transition-colors text-white";
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    const isPast = isSlotInPast(slot);
    
    if (slot.isReserved) {
      return `${baseClasses} bg-red-600 border border-red-700 cursor-not-allowed`;
    }
    
    // Show partial availability for public view when other courts are reserved
    if (isPublicView && slot.totalReservations && slot.totalReservations > 0 && !slot.isReserved) {
      return `${baseClasses} bg-orange-600 border border-orange-700`;
    }
    
    if (isPast) {
      return `${baseClasses} bg-gray-500 border border-gray-600 cursor-not-allowed opacity-60`;
    }
    
    if (selectedSlots && selectedSlots.includes(timeRange) && !isPublicView) {
      return `${baseClasses} bg-tennis-green-600 border border-tennis-green-700`;
    }
    
    if (isPublicView) {
      return `${baseClasses} bg-green-600 border border-green-700`;
    }
    
    return `${baseClasses} bg-green-500 border border-green-600 hover:bg-green-600`;
  };

  const getStatusText = (slot: TimeSlot) => {
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    const isPast = isSlotInPast(slot);
    

    
    if (isPast) {
      return "Praėjęs";
    }
    
    if (slot.isReserved) {
      return "Užimta";
    }
    
    if (selectedSlots && selectedSlots.includes(timeRange) && !isPublicView) {
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
            onClick={() => !slot.isReserved && !isSlotInPast(slot) && !isPublicView && onSlotSelect(timeRange)}
            style={{ 
              pointerEvents: slot.isReserved || isSlotInPast(slot) || isPublicView ? 'none' : 'auto'
            }}
          >
            <div className="text-center">
              <div className="text-sm font-medium">
                {slot.timeDisplay}
              </div>
              <div className="text-xs">
                {getStatusText(slot)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

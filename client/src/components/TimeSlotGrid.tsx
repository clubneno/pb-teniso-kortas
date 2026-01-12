import { motion } from "framer-motion";

interface TimeSlot {
  startTime: string;
  endTime: string;
  timeDisplay: string;
  isReserved: boolean;
  isMaintenance?: boolean;
  maintenanceType?: string; // 'maintenance' or 'winter_season'
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
    const baseClasses = "text-center transition-all duration-200 text-white backdrop-blur-[8px] rounded-lg";
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    const isPast = isSlotInPast(slot);

    // Check maintenance FIRST - always show maintenance colors regardless of time
    if (slot.isMaintenance) {
      // Different colors for winter season vs maintenance
      if (slot.maintenanceType === 'winter_season') {
        return `${baseClasses} bg-blue-500/70 border-2 border-blue-400 cursor-not-allowed`;
      }
      return `${baseClasses} bg-amber-500/70 border-2 border-amber-400 cursor-not-allowed`;
    }

    if (slot.isReserved) {
      return `${baseClasses} bg-red-500/70 border-2 border-red-400 cursor-not-allowed`;
    }

    // Show partial availability for public view when other courts are reserved
    if (isPublicView && slot.totalReservations && slot.totalReservations > 0 && !slot.isReserved) {
      return `${baseClasses} bg-orange-500/60 border border-orange-400`;
    }

    // Only show "past" styling for available slots (not maintenance, not reserved)
    if (isPast) {
      return `${baseClasses} bg-gray-500/50 border border-gray-400/50 cursor-not-allowed text-gray-300`;
    }

    if (selectedSlots && selectedSlots.includes(timeRange) && !isPublicView) {
      return `${baseClasses} bg-tennis-yellow border-2 border-tennis-yellow text-tennis-green-700 font-semibold shadow-lg shadow-tennis-yellow/50 ring-2 ring-tennis-yellow/30 ring-offset-1 ring-offset-transparent`;
    }

    if (isPublicView) {
      return `${baseClasses} bg-green-500/50 border border-green-400/50`;
    }

    return `${baseClasses} bg-green-500/40 border border-green-400/40 hover:bg-green-500/60 hover:border-green-400/60 hover:shadow-glass-sm`;
  };

  const getStatusText = (slot: TimeSlot) => {
    const timeRange = `${slot.startTime}-${slot.endTime}`;
    const isPast = isSlotInPast(slot);

    // Check maintenance FIRST - always show maintenance type regardless of time
    if (slot.isMaintenance) {
      return slot.maintenanceType === 'winter_season' ? "Žiemos sezonas" : "Tvarkymo darbai";
    }

    if (slot.isReserved) {
      return "Užimta";
    }

    // Only show "Praėjęs" for available slots (not maintenance, not reserved)
    if (isPast) {
      return "Praėjęs";
    }

    if (selectedSlots && selectedSlots.includes(timeRange) && !isPublicView) {
      return "Pasirinkta";
    }

    return "Laisva";
  };

  // Text color functions no longer needed - using inline styles for white text

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {timeSlots.map((slot, index) => {
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        const isClickable = !slot.isReserved && !slot.isMaintenance && !isSlotInPast(slot) && !isPublicView;

        return (
          <motion.div
            key={timeRange}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            whileHover={isClickable ? { scale: 1.05, y: -2 } : {}}
            whileTap={isClickable ? { scale: 0.95 } : {}}
            className={`${getSlotClassName(slot)} cursor-pointer p-3 min-h-[60px] flex items-center justify-center`}
            onClick={() => isClickable && onSlotSelect(timeRange)}
            style={{
              pointerEvents: isClickable ? 'auto' : 'none'
            }}
          >
            <div className="text-center">
              <div className="text-sm font-medium drop-shadow">
                {slot.timeDisplay}
              </div>
              <div className="text-xs opacity-80">
                {getStatusText(slot)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

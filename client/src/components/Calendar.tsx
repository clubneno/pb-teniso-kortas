import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const monthNames = [
    "Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis",
    "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"
  ];

  const dayNames = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to be last day (6)
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Previous month's trailing days
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i, 12, 0, 0)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day, 12, 0, 0)
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const isDateSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    return date < todayAtNoon;
  };

  const calendarDays = generateCalendarDays();

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center font-medium text-gray-500 py-2 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((calDay, index) => {
            const isSelected = isDateSelected(calDay.date);
            const isTodayDate = isToday(calDay.date);
            const isPast = isPastDate(calDay.date);
            
            return (
              <button
                key={index}
                className={`
                  text-center py-2 text-sm rounded-lg transition-colors
                  ${!calDay.isCurrentMonth ? 'text-gray-400' : ''}
                  ${isSelected ? 'bg-yellow-400 text-black font-bold shadow-lg border-2 border-yellow-500' : ''}
                  ${isTodayDate && !isSelected ? 'bg-tennis-green-100 text-tennis-green-700 font-medium' : ''}
                  ${isPast && calDay.isCurrentMonth && !isSelected ? 'text-gray-400' : ''}
                  ${!isPast && calDay.isCurrentMonth && !isSelected ? 'hover:bg-tennis-green-50 text-gray-800' : ''}
                  ${isPast ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !isPast && onDateSelect(calDay.date)}
                disabled={isPast}
              >
                {calDay.day}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Calendar from "@/components/Calendar";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { 
  Clock, 
  Trophy, 
  Smartphone, 
  Calendar as CalendarIcon,
  Eye,
  LogIn,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import heroImage from '@assets/WhatsApp Image 2025-07-22 at 22.06.17_1753261982317.jpeg';
import TennisBallIcon from "@/components/TennisBallIcon";

interface Court {
  id: number;
  name: string;
  description?: string;
  hourlyRate: string;
  isActive: boolean;
}

interface PublicReservation {
  id: number;
  courtId: number;
  date: string;
  startTime: string;
  endTime: string;
  court: Court;
}

export default function Landing() {
  // Create date in Vilnius timezone
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    // Convert to Vilnius timezone
    const vilniusTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return new Date(vilniusTime.getFullYear(), vilniusTime.getMonth(), vilniusTime.getDate(), 12, 0, 0);
  });
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  // Format date string for Vilnius timezone
  const getVilniusDateString = (date: Date) => {
    const vilniusDate = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return `${vilniusDate.getFullYear()}-${String(vilniusDate.getMonth() + 1).padStart(2, '0')}-${String(vilniusDate.getDate()).padStart(2, '0')}`;
  };
  
  const selectedDateStr = getVilniusDateString(selectedDate);
  
  // Use the same availability API as Dashboard for consistency
  const { data: availabilityData = [], isLoading: availabilityLoading } = useQuery<{startTime: string; endTime: string}[]>({
    queryKey: ["/api/courts", selectedCourtId, "availability", selectedDateStr],
    queryFn: () => fetch(`/api/courts/${selectedCourtId}/availability?date=${selectedDateStr}`).then(res => res.json()),
    enabled: !!selectedCourtId,
    staleTime: 0,
  });

  // Get all reservations for comprehensive view (cross-court info)
  const { data: allReservationsForDate = [], isLoading: reservationsLoading } = useQuery<PublicReservation[]>({
    queryKey: ["/api/reservations/public", selectedDateStr],
    queryFn: () => fetch(`/api/reservations/public?date=${selectedDateStr}`).then(res => res.json()),
    staleTime: 0,
  });

  useEffect(() => {
    if (courts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(courts[0].id);
    }
  }, [courts, selectedCourtId]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Europe/Vilnius'
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      // Use exact same logic as Dashboard: check if slot is in availabilityData (reserved slots)
      const isReserved = availabilityData.some((slot) => 
        slot.startTime === startTime && slot.endTime === endTime
      );



      // Check how many courts are reserved at this time slot (for cross-court info)
      const allReservationsAtThisTime = allReservationsForDate.filter((r: any) => 
        r.startTime === startTime && r.endTime === endTime
      );
      
      // Get court names that have reservations at this time
      const reservedCourts = allReservationsAtThisTime.map((r: any) => r.court.name).join(', ');

      slots.push({
        startTime,
        endTime,
        timeDisplay: startTime,
        isReserved,
        totalReservations: allReservationsAtThisTime.length,
        reservedCourts: reservedCourts,
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b-2 border-tennis-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2e6b4a' }}>
                <TennisBallIcon size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-tennis-green-600">PB teniso kortas</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="text-white font-medium hover:opacity-90"
                style={{ backgroundColor: '#2e6b4a' }}
              >
                <LogIn size={16} className="mr-2" />
                Prisijungti
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div 
        className="relative bg-gradient-to-br from-tennis-green-600 to-tennis-green-700 text-white bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(34, 197, 94, 0.8), rgba(21, 128, 61, 0.8)), url(${heroImage})`
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Rezervuokite PB teniso kortą
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-3xl mx-auto">Rinkitės datą, laiką, rezervuokite PB kortą ir mėgaukitės žaidimu.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/auth'}
                className="bg-white text-tennis-green-700 hover:bg-gray-100 font-bold text-lg shadow-lg"
              >
                <CalendarIcon size={20} className="mr-2" />
                Rezervuoti Dabar
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Public Schedule View */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Korto užimtumas</h2>
            <p className="text-xl text-gray-300">Peržiūrėkite laisvus laikus (reikia prisijungti, kad rezervuotumėte)</p>
          </div>

          <Card className="shadow-lg bg-gray-700 border-gray-600">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Calendar */}
                <div className="lg:w-1/2">
                  <h3 className="text-xl font-semibold mb-4 text-white">Pasirinkite datą</h3>
                  <Calendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>

                {/* Court Selection & Time Slots */}
                <div className="lg:w-1/2">
                  <h3 className="text-xl font-semibold mb-4 text-white">Kortai</h3>
                  
                  {/* Court Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {courts.map((court) => (
                      <div
                        key={court.id}
                        onClick={() => setSelectedCourtId(court.id)}
                        className={`
                          relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105
                          ${selectedCourtId === court.id 
                            ? "bg-tennis-green-500 border-tennis-green-400 shadow-lg shadow-tennis-green-500/30" 
                            : "bg-gray-600 border-gray-500 hover:bg-gray-500 hover:border-gray-400 hover:shadow-md"}
                        `}
                      >
                        {/* Selection Indicator */}
                        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 transition-all
                          ${selectedCourtId === court.id 
                            ? "bg-white border-white" 
                            : "border-gray-400"}
                        `}>
                          {selectedCourtId === court.id && (
                            <div className="w-2 h-2 bg-tennis-green-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        
                        {/* Court Info */}
                        <div className="text-white">
                          <h4 className="font-semibold text-lg mb-1">{court.name}</h4>
                          <p className="text-sm opacity-90 mb-2">{court.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-tennis-yellow font-bold text-lg">
                              {court.hourlyRate}€/val
                            </span>
                            {selectedCourtId === court.id && (
                              <span className="text-xs bg-white/20 px-2 py-1 rounded">Pasirinkta</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold mb-4 text-white">
                      {formatDate(selectedDate)}
                    </h4>
                    
                    <TimeSlotGrid 
                      timeSlots={timeSlots}
                      onSlotSelect={() => {}}
                      selectedSlot={null}
                      selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                      isPublicView={true}
                    />
                    
                    <div className="mt-6 text-center">
                      <Button 
                        size="lg"
                        onClick={() => window.location.href = '/auth'}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-lg border-2 border-yellow-400 transform hover:scale-105 transition-all duration-200"
                      >
                        <LogIn size={20} className="mr-2" />
                        Prisijunkite, kad rezervuotumėte
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Footer */}
      <footer className="bg-tennis-green-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <TennisBallIcon size={16} className="text-tennis-green-600" />
                </div>
                <span className="text-lg font-bold">PB teniso kortas</span>
              </div>
              <p className="text-tennis-green-100">Moderni PB teniso korto rezervacijos sistema Jūsų patogumui. </p>
            </div>
            

            
            <div>
              <h4 className="font-semibold mb-3">Kontaktai</h4>
              <ul className="space-y-2 text-tennis-green-100">
                <li>📞 +370 686 63751</li>
                <li>📍 Skyplaičių g. 15, Plungė</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Darbo laikas</h4>
              <ul className="space-y-2 text-tennis-green-100">
                <li>Pirmadienį - Penktadienį: 8:00-22:00</li>
                <li>Šeštadienį - Sekmadienį: 9:00-21:00</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-tennis-green-500 mt-8 pt-8 text-center text-tennis-green-100">
            <p>© 2025 PB teniso kortas. Visos teisės saugomos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

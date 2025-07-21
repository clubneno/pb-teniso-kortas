import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Calendar from "@/components/Calendar";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { 
  Volleyball, 
  Clock, 
  Trophy, 
  Smartphone, 
  Calendar as CalendarIcon,
  Eye,
  LogIn,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: reservations = [] } = useQuery<PublicReservation[]>({
    queryKey: ["/api/reservations/public", selectedDate.toISOString().split('T')[0], selectedCourtId],
    enabled: !!selectedCourtId,
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
      weekday: 'long'
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const isReserved = reservations.some(r => 
        r.startTime <= startTime && r.endTime > startTime
      );
      
      slots.push({
        startTime,
        endTime,
        timeDisplay: `${startTime}`,
        isReserved,
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
              <div className="w-10 h-10 bg-tennis-green-500 rounded-full flex items-center justify-center">
                <Volleyball className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-tennis-green-600">TennisReserve</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-tennis-green-500 hover:bg-tennis-green-600"
              >
                <LogIn size={16} className="mr-2" />
                Prisijungti
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-tennis-green-600 to-tennis-green-700 text-white">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Rezervuokite Teniso Kortą
              <span className="text-tennis-yellow ml-2">Lengvai</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-3xl mx-auto">
              Moderni teniso kortų rezervacijos sistema. Rinkitės laiką, rezervuokite kortą ir mėgaukitės žaidimu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-tennis-yellow text-tennis-green-700 hover:bg-yellow-300 font-bold text-lg"
              >
                <CalendarIcon size={20} className="mr-2" />
                Rezervuoti Dabar
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-tennis-green-600 font-bold text-lg"
              >
                <Eye size={20} className="mr-2" />
                Peržiūrėti Tvarkaraštį
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Public Schedule View */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Kortų Prieinamumas</h2>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {courts.map((court) => (
                      <Button
                        key={court.id}
                        variant={selectedCourtId === court.id ? "default" : "outline"}
                        onClick={() => setSelectedCourtId(court.id)}
                        className={selectedCourtId === court.id 
                          ? "bg-tennis-green-500 hover:bg-tennis-green-600" 
                          : ""}
                      >
                        {court.name}
                        <Badge variant="secondary" className="ml-2">
                          {court.hourlyRate}€/val
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold mb-4 text-white">
                      {formatDate(selectedDate)} - Kortų Prieinamumas
                    </h4>
                    
                    <TimeSlotGrid 
                      timeSlots={timeSlots}
                      onSlotSelect={() => {}}
                      selectedSlot={null}
                      isPublicView={true}
                    />
                    
                    <div className="mt-6 text-center">
                      <Button 
                        size="lg"
                        onClick={() => window.location.href = '/api/login'}
                        className="bg-tennis-green-500 hover:bg-tennis-green-600"
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
                <div className="w-8 h-8 bg-tennis-yellow rounded-full flex items-center justify-center">
                  <Volleyball className="text-tennis-green-600" size={16} />
                </div>
                <span className="text-lg font-bold">TennisReserve</span>
              </div>
              <p className="text-tennis-green-100">Moderni teniso kortų rezervacijos sistema visoms jūsų sportinėms reikmėms.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Paslaugos</h4>
              <ul className="space-y-2 text-tennis-green-100">
                <li>Kortų rezervacija</li>
                <li>Grupės užsiėmimai</li>
                <li>Privačios pamokos</li>
                <li>Inventoriaus nuoma</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Kontaktai</h4>
              <ul className="space-y-2 text-tennis-green-100">
                <li>📞 +370 600 12345</li>
                <li>✉️ info@tennisreserve.lt</li>
                <li>📍 Vilnius, Lietuva</li>
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
            <p>&copy; 2024 TennisReserve. Visos teisės saugomos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

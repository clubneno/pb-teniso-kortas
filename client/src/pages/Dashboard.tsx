import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Calendar from "@/components/Calendar";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import ReservationCard from "@/components/ReservationCard";
import ProfileEdit from "@/components/ProfileEdit";
import { 
  Volleyball, 
  CalendarPlus, 
  List, 
  UserPen, 
  LogOut 
} from "lucide-react";
// Using Volleyball icon as tennis ball alternative

interface Court {
  id: number;
  name: string;
  description?: string;
  hourlyRate: string;
  isActive: boolean;
}

interface ReservationWithDetails {
  id: number;
  userId: string;
  courtId: number;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  court: Court;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
    retry: false,
  });

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const { data: availabilityData = [] } = useQuery<{startTime: string; endTime: string}[]>({
    queryKey: ["/api/courts", selectedCourtId, "availability", selectedDateStr],
    queryFn: () => fetch(`/api/courts/${selectedCourtId}/availability?date=${selectedDateStr}`).then(res => res.json()),
    enabled: !!selectedCourtId,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Neautorizuotas",
        description: "Jūs esate atsijungę. Prisijungiama iš naujo...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (courts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(courts[0].id);
    }
  }, [courts, selectedCourtId]);

  // Refresh courts data when component mounts to get latest hourly rates
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
  }, []);

  const createReservationMutation = useMutation({
    mutationFn: async (data: {
      courtId: number;
      date: string;
      startTime: string;
      endTime: string;
      totalPrice: string;
    }) => {
      await apiRequest("POST", "/api/reservations", data);
    },
    onSuccess: () => {
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Rezervacija sėkmingai sukurta. Patvirtinimo el. laiškas išsiųstas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts", selectedCourtId, "availability"] });
      setSelectedTimeSlot(null);
    },
    onError: (error) => {
      console.error("Reservation error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Neautorizuotas",
          description: "Jūs esate atsijungę. Prisijungiama iš naujo...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko sukurti rezervacijos. Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const isReserved = availabilityData.some((slot) => 
        slot.startTime === startTime && slot.endTime === endTime
      );
      
      slots.push({
        startTime,
        endTime,
        timeDisplay: startTime,
        isReserved,
      });
    }
    return slots;
  };

  const handleReservation = () => {
    if (!selectedCourtId || !selectedTimeSlot) return;

    const selectedCourt = courts.find(c => c.id === selectedCourtId);
    if (!selectedCourt) return;

    const [startTime] = selectedTimeSlot.split('-');
    const endTime = `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

    const reservationData = {
      courtId: selectedCourtId,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      startTime,
      endTime,
      totalPrice: selectedCourt.hourlyRate,
    };
    
    console.log("Sending reservation data:", reservationData);
    createReservationMutation.mutate(reservationData);
  };

  const activeReservations = reservations
    .filter(r => r.status === 'confirmed' && new Date(r.date) >= new Date())
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateA.getTime() - dateB.getTime(); // Soonest first
    });
  
  const pastReservations = reservations
    .filter(r => r.status === 'confirmed' && new Date(r.date) < new Date())
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

  const timeSlots = generateTimeSlots();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b-2 border-tennis-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-tennis-green-500 rounded-full flex items-center justify-center">
                <Volleyball className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-tennis-green-600">PB teniso kortas</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await fetch('/api/logout', { method: 'POST' });
                    queryClient.clear();
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Fallback: clear cache and redirect anyway
                    queryClient.clear();
                    window.location.href = '/';
                  }
                }}
              >
                <LogOut size={16} className="mr-2" />
                Atsijungti
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-20 h-20 bg-tennis-green-100 rounded-full flex items-center justify-center">
                <Volleyball className="text-tennis-green-600" size={32} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Sveiki, {user?.firstName || 'Naudotojau'}!
                </h1>
                <p className="text-gray-600 mb-4">
                  {user?.email} {user?.phone && ` | ${user.phone}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs defaultValue="booking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="booking">
              <CalendarPlus size={16} className="mr-2" />
              Nauja Rezervacija
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <List size={16} className="mr-2" />
              Mano Rezervacijos
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserPen size={16} className="mr-2" />
              Profilio Redagavimas
            </TabsTrigger>
          </TabsList>

          {/* Booking Tab */}
          <TabsContent value="booking">
            <Card>
              <CardHeader>
                <CardTitle>Rezervuoti Teniso Kortą</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Calendar Selection */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Pasirinkite Datą</h3>
                    <Calendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                    />
                  </div>

                  {/* Time Slots Selection */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Pasirinkite Kortą ir Laiką</h3>
                    
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
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        {selectedDate.toLocaleDateString('lt-LT')} prieinami laikai:
                      </p>
                      
                      <TimeSlotGrid
                        timeSlots={timeSlots}
                        onSlotSelect={setSelectedTimeSlot}
                        selectedSlot={selectedTimeSlot}
                        selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                        isPublicView={false}
                      />
                    </div>

                    {/* Booking Summary */}
                    {selectedTimeSlot && selectedCourtId && (
                      <Card className="mt-6 bg-tennis-green-50 border-tennis-green-200">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-tennis-green-800 mb-2">Rezervacijos Santrauka</h4>
                          <div className="text-sm text-tennis-green-700 space-y-1">
                            <div><strong>Data:</strong> {selectedDate.toLocaleDateString('lt-LT')}</div>
                            <div><strong>Laikas:</strong> {selectedTimeSlot}</div>
                            <div><strong>Kortas:</strong> {courts.find(c => c.id === selectedCourtId)?.name}</div>
                            <div><strong>Kaina:</strong> {courts.find(c => c.id === selectedCourtId)?.hourlyRate}€/val</div>
                          </div>
                          <Button 
                            className="w-full mt-4 bg-tennis-green-500 hover:bg-tennis-green-600"
                            onClick={handleReservation}
                            disabled={createReservationMutation.isPending}
                          >
                            {createReservationMutation.isPending ? "Rezervuojama..." : "Patvirtinti Rezervaciją"}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-6">
            {/* Active Reservations */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-green-600">Aktyvios Rezervacijos</h3>
              {reservationsLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tennis-green-600 mx-auto"></div>
                  </CardContent>
                </Card>
              ) : activeReservations.length > 0 ? (
                <div className="space-y-4">
                  {activeReservations.map((reservation) => (
                    <ReservationCard 
                      key={reservation.id} 
                      reservation={reservation} 
                      showActions={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    Neturite aktyvių rezervacijų
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Past Reservations */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-600">Rezervacijų Istorija</h3>
              {pastReservations.length > 0 ? (
                <div className="space-y-4">
                  {pastReservations.map((reservation) => (
                    <ReservationCard 
                      key={reservation.id} 
                      reservation={reservation} 
                      showActions={false}
                      isPast={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    Neturite rezervacijų istorijos
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProfileEdit user={user || undefined} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

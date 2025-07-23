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
import { useSEO } from "@/hooks/useSEO";
import Calendar from "@/components/Calendar";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import ReservationCard from "@/components/ReservationCard";
import ProfileEdit from "@/components/ProfileEdit";
import { 
  CalendarPlus, 
  List, 
  UserPen, 
  LogOut 
} from "lucide-react";
import TennisBallIcon from "@/components/TennisBallIcon";

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
  
  // SEO optimization for dashboard
  useSEO({
    title: "Mano rezervacijos - PB teniso kortas",
    description: "Valdykite savo teniso kortų rezervacijas, peržiūrėkite istoriją ir sukurkite naujas rezervacijas. Lengvas ir patogus rezervacijų valdymas.",
    canonical: "/savitarna",
    keywords: "rezervacijų valdymas, teniso rezervacijos, mano rezervacijos, teniso kortas, savitarna",
    ogTitle: "Rezervacijų valdymas - PB teniso kortas",
    ogDescription: "Valdykite visas savo teniso kortų rezervacijas vienoje vietoje. Peržiūrėkite istoriją ir kurkite naujas rezervacijas lengvai.",
  });
  // Create date in Vilnius timezone
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const vilniusTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return new Date(vilniusTime.getFullYear(), vilniusTime.getMonth(), vilniusTime.getDate(), 12, 0, 0);
  });
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
    retry: false,
  });

  // Format date string for Vilnius timezone
  const getVilniusDateString = (date: Date) => {
    const vilniusDate = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return `${vilniusDate.getFullYear()}-${String(vilniusDate.getMonth() + 1).padStart(2, '0')}-${String(vilniusDate.getDate()).padStart(2, '0')}`;
  };
  
  const selectedDateStr = getVilniusDateString(selectedDate);
  
  const { data: availabilityData = [] } = useQuery<{startTime: string; endTime: string}[]>({
    queryKey: ["/api/courts", selectedCourtId, "availability", selectedDateStr],
    queryFn: () => fetch(`/api/courts/${selectedCourtId}/availability?date=${selectedDateStr}`).then(res => res.json()),
    enabled: !!selectedCourtId,
  });

  // Get all reservations for comprehensive view
  const { data: allReservationsForDate = [] } = useQuery({
    queryKey: ["/api/reservations/public", selectedDateStr],
    queryFn: () => fetch(`/api/reservations/public?date=${selectedDateStr}`).then(res => res.json()),
    staleTime: 0, // Always refetch to avoid cache issues
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
      setSelectedTimeSlots([]);
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
    // Generate 30-minute slots starting from 8:00
    let startMinutes = 8 * 60; // 8:00 in minutes
    const endMinutes = 22 * 60; // 22:00 in minutes (last possible start time)
    
    while (startMinutes < endMinutes) {
      const endSlotMinutes = startMinutes + 30; // Add 30 minutes
      
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endSlotMinutes / 60);
      const endMin = endSlotMinutes % 60;
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      // Check if this slot overlaps with any existing reservation
      const isReserved = availabilityData.some((reservation) => {
        // Check if time slots overlap
        return !(endTime <= reservation.startTime || startTime >= reservation.endTime);
      });

      // Check how many courts are reserved at this time slot (overlapping)
      const allReservationsAtThisTime = allReservationsForDate.filter((r: any) => 
        !(endTime <= r.startTime || startTime >= r.endTime)
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
      
      startMinutes += 30; // Move to next 30-minute slot
    }
    return slots;
  };

  // Validation functions
  const validateTimeSlots = (timeSlots: string[]) => {
    // Check maximum duration (120 minutes = 4 slots of 30 minutes each)
    if (timeSlots.length > 4) {
      return { isValid: false, error: "Maksimalus rezervacijos laikas yra 120 minučių (4 laiko intervalai)" };
    }

    if (timeSlots.length === 0) {
      return { isValid: false, error: "Pasirinkite bent vieną laiko intervalą" };
    }

    // Check if time slots are consecutive
    const sortedSlots = [...timeSlots].sort();
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlotStart = sortedSlots[i].split('-')[0];
      const previousSlotEnd = sortedSlots[i-1].split('-')[1];
      
      if (currentSlotStart !== previousSlotEnd) {
        return { isValid: false, error: "Laiko intervalai turi būti iš eilės, be pertraukų" };
      }
    }

    return { isValid: true, error: null };
  };

  const handleReservation = () => {
    if (!selectedCourtId || selectedTimeSlots.length === 0) return;

    // Validate time slots
    const validation = validateTimeSlots(selectedTimeSlots);
    if (!validation.isValid) {
      toast({
        title: "Netinkamas laiko pasirinkimas",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const selectedCourt = courts.find(c => c.id === selectedCourtId);
    if (!selectedCourt) return;

    // Sort selected time slots to ensure they are in chronological order
    const sortedSlots = [...selectedTimeSlots].sort();
    
    // Get the start time from the first slot and end time from the last slot
    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];
    
    const [startTime] = firstSlot.split('-');
    const [, endTime] = lastSlot.split('-');

    // Calculate total duration and price
    const totalSlots = selectedTimeSlots.length;
    const totalHours = totalSlots * 0.5; // Each slot is 30 minutes = 0.5 hours

    const reservationData = {
      courtId: selectedCourtId,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      startTime,
      endTime,
      totalPrice: (parseFloat(selectedCourt.hourlyRate) * totalHours).toString(),
    };
    
    console.log("Sending reservation data:", reservationData);
    createReservationMutation.mutate(reservationData);
  };

  // Get current date in Vilnius timezone for accurate comparisons
  const getVilniusDate = () => {
    const now = new Date();
    const vilniusTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return new Date(vilniusTime.getFullYear(), vilniusTime.getMonth(), vilniusTime.getDate());
  };

  const currentVilniusDate = getVilniusDate();

  const activeReservations = reservations
    .filter(r => {
      if (r.status !== 'confirmed') return false;
      const reservationDate = new Date(r.date);
      const reservationDateTime = new Date(r.date + 'T' + r.endTime + ':00');
      
      // Compare dates first
      if (reservationDate > currentVilniusDate) return true; // Future date
      if (reservationDate < currentVilniusDate) return false; // Past date
      
      // Same date - check if end time has passed (in Vilnius timezone)
      const nowInVilnius = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
      return reservationDateTime > nowInVilnius;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateA.getTime() - dateB.getTime(); // Soonest first
    });
  
  const pastReservations = reservations
    .filter(r => {
      if (r.status !== 'confirmed') return false;
      const reservationDate = new Date(r.date);
      const reservationDateTime = new Date(r.date + 'T' + r.endTime + ':00');
      
      // Compare dates first
      if (reservationDate < currentVilniusDate) return true; // Past date
      if (reservationDate > currentVilniusDate) return false; // Future date
      
      // Same date - check if end time has passed (in Vilnius timezone)
      const nowInVilnius = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
      return reservationDateTime <= nowInVilnius;
    })
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
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <TennisBallIcon size={20} className="text-tennis-green-600" />
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
                <TennisBallIcon size={32} className="text-tennis-green-600" />
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
                            {(parseFloat(court.hourlyRate) / 2).toFixed(2)}€/30min.
                          </Badge>
                        </Button>
                      ))}
                    </div>

                    {/* Time Slots */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-gray-600">
                            {selectedDate.toLocaleDateString('lt-LT')} prieinami laikai:
                          </p>
                          {selectedTimeSlots.length > 0 && (
                            <span className="text-xs text-tennis-green-600 font-medium">
                              {selectedTimeSlots.length} pasirinkta
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          Maksimalus rezervacijos laikas: 120 min. (4 intervalai). Intervalai turi būti iš eilės.
                        </p>
                        {selectedTimeSlots.length > 0 && (
                          <p className="text-sm text-tennis-green-600 mb-2">
                            Pasirinkta: {selectedTimeSlots.length}/4 intervalų ({selectedTimeSlots.length * 30} min.)
                          </p>
                        )}
                      </div>
                      
                      <TimeSlotGrid
                        timeSlots={timeSlots}
                        onSlotSelect={(slot) => {
                          if (selectedTimeSlots.includes(slot)) {
                            setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
                          } else {
                            // Check if adding this slot would exceed the 4-slot limit
                            if (selectedTimeSlots.length >= 4) {
                              toast({
                                title: "Viršytas limitas",
                                description: "Maksimaliai galite pasirinkti 4 laiko intervalus (120 min.)",
                                variant: "destructive",
                              });
                              return;
                            }
                            setSelectedTimeSlots(prev => [...prev, slot]);
                          }
                        }}
                        selectedSlots={selectedTimeSlots}
                        selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                        isPublicView={false}
                      />
                    </div>

                    {/* Booking Summary */}
                    {selectedTimeSlots.length > 0 && selectedCourtId && (
                      <Card className="mt-6 bg-tennis-green-50 border-tennis-green-200">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-tennis-green-800 mb-2">Rezervacijos Santrauka</h4>
                          <div className="text-sm text-tennis-green-700 space-y-1">
                            <div><strong>Data:</strong> {selectedDate.toLocaleDateString('lt-LT')}</div>
                            <div><strong>Laikai:</strong> {selectedTimeSlots.sort().join(', ')}</div>
                            <div><strong>Kortas:</strong> {courts.find(c => c.id === selectedCourtId)?.name}</div>
                            <div><strong>Trukmė:</strong> {selectedTimeSlots.length * 30} min.</div>
                            <div><strong>Kaina:</strong> {(() => {
                              const court = courts.find(c => c.id === selectedCourtId);
                              const hourlyRate = parseFloat(court?.hourlyRate || '0');
                              const slotRate = hourlyRate / 2; // 30-minute slot rate
                              return (slotRate * selectedTimeSlots.length).toFixed(2);
                            })()}€</div>
                          </div>
                          <div className="mt-3 mb-3">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTimeSlots([])}
                              className="text-xs"
                            >
                              Išvalyti pasirinkimus
                            </Button>
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
            {user && <ProfileEdit user={{
              id: user.id,
              email: user.email,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              phone: user.phone || undefined,
              isAdmin: user.isAdmin || undefined
            }} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

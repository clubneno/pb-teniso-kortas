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
  // Create date in Vilnius timezone
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const vilniusTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Vilnius"}));
    return new Date(vilniusTime.getFullYear(), vilniusTime.getMonth(), vilniusTime.getDate(), 12, 0, 0);
  });
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

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
    // Generate 90-minute slots starting from 8:00
    let startMinutes = 8 * 60; // 8:00 in minutes
    const endMinutes = 21 * 60 + 30; // 21:30 in minutes (last possible end time)
    
    while (startMinutes < endMinutes) {
      const endSlotMinutes = startMinutes + 90; // Add 90 minutes
      
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endSlotMinutes / 60);
      const endMin = endSlotMinutes % 60;
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      // Check if this slot is reserved for the selected court
      const isReserved = availabilityData.some((slot) => 
        slot.startTime === startTime && slot.endTime === endTime
      );

      // Check how many courts are reserved at this time slot
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
      
      startMinutes += 90; // Move to next 90-minute slot
    }
    return slots;
  };

  const handleReservation = () => {
    if (!selectedCourtId || !selectedTimeSlot) return;

    const selectedCourt = courts.find(c => c.id === selectedCourtId);
    if (!selectedCourt) return;

    const [startTime] = selectedTimeSlot.split('-');
    // Calculate end time by adding 90 minutes
    const startHour = parseInt(startTime.split(':')[0]);
    const startMin = parseInt(startTime.split(':')[1]);
    const totalStartMinutes = startHour * 60 + startMin;
    const totalEndMinutes = totalStartMinutes + 90;
    const endHour = Math.floor(totalEndMinutes / 60);
    const endMin = totalEndMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const reservationData = {
      courtId: selectedCourtId,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      startTime,
      endTime,
      totalPrice: (parseFloat(selectedCourt.hourlyRate) * 1.5).toString(), // 90 minutes = 1.5 hours
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

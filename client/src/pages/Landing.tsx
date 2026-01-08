import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Calendar from "@/components/Calendar";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { useSEO } from "@/hooks/useSEO";
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
import TennisBallIcon from "@/components/TennisBallIcon";
import { pageVariants, staggerContainer, staggerItem, fadeIn, glassCardHover } from "@/lib/animations";

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
  // SEO optimization for landing page
  useSEO({
    title: "PB teniso kortas - Teniso kortų rezervacijos Lietuvoje",
    description: "Rezervuokite teniso kortus greitai ir patogiai. PB teniso kortas siūlo modernius teniso kortus su 90 minučių rezervacijos sistema. Peržiūrėkite laisvus laikus ir rezervuokite iš karto.",
    canonical: "/",
    keywords: "teniso kortai, rezervacijos, tenisas, sportas, Lietuva, teniso klubas, kortų nuoma, PB teniso kortas",
    ogTitle: "PB teniso kortas - Profesionalūs teniso kortai Lietuvoje",
    ogDescription: "Modernus teniso klubas su patogiu rezervacijų susistemai. Rezervuokite 90 minučių teniso kortų sesijas online.",
  });

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
  const { data: availabilityData = [], isLoading: availabilityLoading } = useQuery<{startTime: string; endTime: string; type?: 'reservation' | 'maintenance'}[]>({
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
      
      // Check if this slot overlaps with any unavailable period (reservation or maintenance)
      const isReserved = availabilityData.some((period) => {
        // Check if time slots overlap and it's a reservation
        return period.type === 'reservation' && !(endTime <= period.startTime || startTime >= period.endTime);
      });

      const isMaintenance = availabilityData.some((period) => {
        // Check if time slots overlap and it's maintenance
        return period.type === 'maintenance' && !(endTime <= period.startTime || startTime >= period.endTime);
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
        isMaintenance,
        totalReservations: allReservationsAtThisTime.length,
        reservedCourts: reservedCourts,
      });
      
      startMinutes += 30; // Move to next 30-minute slot
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-tennis-green-700 via-tennis-green-600 to-tennis-green-700 relative overflow-hidden">
      {/* Animated background mesh */}
      <div className="fixed inset-0 glass-mesh-bg opacity-60 pointer-events-none" />

      {/* Floating decorative orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-20 left-10 w-64 h-64 rounded-full bg-tennis-yellow/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-1/2 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-20 left-1/4 w-72 h-72 rounded-full bg-tennis-green-500/30 blur-3xl pointer-events-none"
      />

      {/* Navigation - Glass Effect */}
      <nav className="sticky top-0 z-50 backdrop-blur-[16px] bg-white/10 border-b border-white/20 shadow-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 shadow-glass-sm">
                <TennisBallIcon size={20} className="text-tennis-yellow" />
              </div>
              <span className="text-xl font-bold text-white drop-shadow-lg">PB teniso kortas</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <Button
                variant="glass"
                onClick={() => window.location.href = '/prisijungimas'}
                className="font-medium"
              >
                <LogIn size={16} className="mr-2" />
                Prisijungti
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>
      {/* Hero Section with Court Image */}
      <div className="relative text-white py-20 md:py-32 overflow-hidden">
        {/* Background Image */}
        <img
          src="/images/court-hero.jpg"
          alt="Tennis court"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Glass overlay on image */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-b from-tennis-green-700/60 via-tennis-green-600/50 to-tennis-green-700/70" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            {/* Glass Card for Hero Content */}
            <motion.div
              variants={staggerItem}
              className="inline-block backdrop-blur-[12px] bg-white/10 border border-white/20 rounded-3xl p-8 md:p-12 shadow-glass-lg"
            >
              <motion.h1
                variants={staggerItem}
                className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg"
              >
                Rezervuokite PB teniso kortą
              </motion.h1>
              <motion.p
                variants={staggerItem}
                className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto drop-shadow"
              >
                Rinkitės datą, laiką, rezervuokite PB kortą ir mėgaukitės žaidimu.
              </motion.p>
              <motion.div
                variants={staggerItem}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  size="lg"
                  variant="glassGreen"
                  onClick={() => window.location.href = '/prisijungimas'}
                  className="font-bold text-lg shadow-glow-green animate-glow-pulse"
                >
                  <CalendarIcon size={20} className="mr-2" />
                  Rezervuoti Dabar
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      {/* Public Schedule View */}
      <div className="relative py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Korto užimtumas</h2>
            <p className="text-xl text-white/80">Peržiūrėkite laisvus laikus (reikia prisijungti, kad rezervuotumėte)</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card variant="glassDark" className="shadow-glass-lg">
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
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
                    >
                      {courts.map((court) => (
                        <motion.div
                          key={court.id}
                          variants={staggerItem}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedCourtId(court.id)}
                          className={`
                            relative p-4 rounded-xl border cursor-pointer transition-all duration-300 backdrop-blur-[8px]
                            ${selectedCourtId === court.id
                              ? "bg-[rgba(76,175,80,0.4)] border-[rgba(76,175,80,0.6)] shadow-glow-green"
                              : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30 hover:shadow-glass"}
                          `}
                        >
                          {/* Selection Indicator */}
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-all
                            ${selectedCourtId === court.id
                              ? "bg-tennis-yellow border-tennis-yellow shadow-glow-yellow"
                              : "border-white/40 bg-white/10"}
                          `}>
                            {selectedCourtId === court.id && (
                              <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>

                          {/* Court Info */}
                          <div className="text-white">
                            <h4 className="font-semibold text-lg mb-1">{court.name}</h4>
                            <p className="text-sm text-white/70 mb-2">{court.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-tennis-yellow font-bold text-lg drop-shadow">
                                {(parseFloat(court.hourlyRate) / 2).toFixed(2)}€/30min.
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Time Slots */}
                    <div className="border-t border-white/20 pt-6">
                      <h4 className="text-lg font-semibold mb-4 text-white">
                        {formatDate(selectedDate)}
                      </h4>

                      <TimeSlotGrid
                        timeSlots={timeSlots}
                        onSlotSelect={() => {}}
                        selectedSlots={[]}
                        selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                        isPublicView={true}
                      />

                      <div className="mt-6 text-center">
                        <Button
                          size="lg"
                          variant="glassGreen"
                          onClick={() => window.location.href = '/prisijungimas'}
                          className="font-bold shadow-glow-green hover:scale-105 transition-transform"
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
          </motion.div>
        </div>
      </div>
      {/* Footer */}
      <footer className="relative mt-16 backdrop-blur-[12px] bg-white/10 border-t border-white/20 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 shadow-glass-sm">
                  <TennisBallIcon size={18} className="text-tennis-yellow" />
                </div>
                <span className="text-lg font-bold">PB teniso kortas</span>
              </div>
              <p className="text-white/70">Moderni PB teniso korto rezervacijos sistema Jūsų patogumui.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-tennis-yellow">Kontaktai</h4>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-center gap-2">
                  <span>📞</span> +370 686 63751
                </li>
                <li className="flex items-center gap-2">
                  <span>📍</span> Skyplaičių g. 15, Plungė
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-tennis-yellow">Darbo laikas</h4>
              <ul className="space-y-2 text-white/70">
                <li>Pirmadienį - Penktadienį: 8:00-22:00</li>
                <li>Šeštadienį - Sekmadienį: 9:00-21:00</li>
              </ul>
            </div>
          </motion.div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>© 2025 PB teniso kortas. Visos teisės saugomos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

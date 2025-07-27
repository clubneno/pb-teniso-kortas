import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  BarChart3, 
  Calendar, 
  Users, 
  Settings, 

  LogOut,
  Edit,
  Trash2,
  UserPlus,
  Search,
  CalendarCheck,
  Euro,
  TrendingDown,
  TrendingUp,
  Activity,
  ToggleLeft,
  ToggleRight,
  Plus,
  Wrench
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DatePicker from "@/components/DatePicker";
import ConfirmationModal from "@/components/ConfirmationModal";
import TennisBallIcon from "@/components/TennisBallIcon";
import TimeSlotGrid from "@/components/TimeSlotGrid";

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
  court: {
    id: number;
    name: string;
    hourlyRate: string;
  };
}

interface UserWithStats {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin: boolean;
  createdAt: string;
  totalReservations: number;
  lastReservation?: string;
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  
  // SEO optimization for admin page
  useSEO({
    title: "Administracijos panelė - PB teniso kortas",
    description: "Administracijos valdymo panelė teniso kortų rezervacijų sistemai. Tvarkykite kortus, rezervacijas ir vartotojus.",
    canonical: "/admin",
    keywords: "administracija, valdymas, rezervacijos valdymas, kortų valdymas, admin panel",
    ogTitle: "Admin valdymas - PB teniso kortas",
    ogDescription: "Pilnas teniso kortų rezervacijų sistemos administracijos valdymas.",
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartDateFrom, setChartDateFrom] = useState("");
  const [chartDateTo, setChartDateTo] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDestructive: false
  });
  const [createReservationModal, setCreateReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    userId: "",
    courtId: "",
    date: "",
  });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    isAdmin: false
  });
  const [operatingHours, setOperatingHours] = useState({
    weekdays: { start: "08:00", end: "22:00" },
    weekends: { start: "09:00", end: "21:00" }
  });
  
  const [pricing, setPricing] = useState({
    slotRate: "0.00" // 30-minute slot rate
  });
  
  // Maintenance state
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    courtId: "",
    date: "",
    description: ""
  });
  const [selectedMaintenanceSlots, setSelectedMaintenanceSlots] = useState<string[]>([]);
  
  // Email testing state
  const [showEmailTestModal, setShowEmailTestModal] = useState(false);
  const [emailTestForm, setEmailTestForm] = useState({
    email: "",
    type: "confirmation"
  });
  const { toast } = useToast();

  const { data: adminReservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/admin/reservations", statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      
      const response = await fetch(`/api/admin/reservations?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      
      const data = await response.json();
      
      // Sort reservations chronologically: earliest dates first, earliest times first within same day
      return data.sort((a: ReservationWithDetails, b: ReservationWithDetails) => {
        // First compare by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime(); // Earliest date first
        }
        
        // If dates are equal, compare by start time
        const timeA = a.startTime.split(':').map(num => parseInt(num));
        const timeB = b.startTime.split(':').map(num => parseInt(num));
        
        const minutesA = timeA[0] * 60 + timeA[1];
        const minutesB = timeB[0] * 60 + timeB[1];
        
        return minutesA - minutesB; // Earliest time first
      });
    },
    retry: false,
  });

  const { data: adminUsers = [], isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Maintenance periods query
  const { data: maintenancePeriods = [] } = useQuery({
    queryKey: ['/api/admin/maintenance'],
    queryFn: async () => {
      const response = await fetch('/api/admin/maintenance');
      if (!response.ok) throw new Error('Failed to fetch maintenance periods');
      return response.json();
    },
    retry: false,
  });

  // Fetch courts
  const { data: courts = [], isLoading: courtsLoading } = useQuery<any[]>({
    queryKey: ["/api/courts"],
  });

  // Initialize pricing state when courts data is loaded
  useEffect(() => {
    if (courts.length > 0 && courts[0].hourlyRate) {
      // Convert hourly rate to 30-minute slot rate (hourlyRate / 2)
      const slotRate = (parseFloat(courts[0].hourlyRate) / 2).toFixed(2);
      setPricing({
        slotRate: slotRate
      });
    }
  }, [courts]);

  // Fetch availability for selected date and court
  const { data: availability = [], isLoading: availabilityLoading } = useQuery<any[]>({
    queryKey: [`/api/courts/${reservationForm.courtId}/availability`, reservationForm.date],
    queryFn: async () => {
      if (!reservationForm.courtId || !reservationForm.date) return [];
      const response = await fetch(`/api/courts/${reservationForm.courtId}/availability?date=${reservationForm.date}`);
      return response.json();
    },
    enabled: !!reservationForm.date && !!reservationForm.courtId,
  });

  // Fetch availability for maintenance modal
  const { data: maintenanceAvailability = [], isLoading: maintenanceAvailabilityLoading } = useQuery<any[]>({
    queryKey: [`/api/courts/${maintenanceForm.courtId}/availability`, maintenanceForm.date],
    queryFn: async () => {
      if (!maintenanceForm.courtId || !maintenanceForm.date) return [];
      const response = await fetch(`/api/courts/${maintenanceForm.courtId}/availability?date=${maintenanceForm.date}`);
      return response.json();
    },
    enabled: !!maintenanceForm.date && !!maintenanceForm.courtId,
  });

  // Generate time slots for maintenance modal
  const generateMaintenanceTimeSlots = () => {
    if (!maintenanceForm.courtId || !maintenanceForm.date) return [];
    
    const slots = [];
    let startMinutes = 8 * 60; // 8:00 in minutes
    const endMinutes = 22 * 60; // 22:00 in minutes
    
    while (startMinutes < endMinutes) {
      const endSlotMinutes = startMinutes + 30;
      
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endSlotMinutes / 60);
      const endMin = endSlotMinutes % 60;
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      // Check if this slot overlaps with any unavailable period
      const isUnavailable = maintenanceAvailability.some((period) => {
        return !(endTime <= period.startTime || startTime >= period.endTime);
      });

      slots.push({
        startTime,
        endTime,
        timeDisplay: startTime,
        isUnavailable,
        timeRange: `${startTime}-${endTime}`
      });
      
      startMinutes += 30;
    }
    return slots;
  };

  const maintenanceTimeSlots = generateMaintenanceTimeSlots();

  // Email test mutation
  const emailTestMutation = useMutation({
    mutationFn: async (data: { type: string; email: string }) => {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowEmailTestModal(false);
      setEmailTestForm({ email: "", type: "confirmation" });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Testas el. laiškas sėkmingai išsiųstas",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko išsiųsti testo el. laiško",
        variant: "destructive",
      });
    }
  });

  const handleMaintenanceSlotSelect = (timeRange: string) => {
    setSelectedMaintenanceSlots(prev => {
      if (prev.includes(timeRange)) {
        return prev.filter(slot => slot !== timeRange);
      } else {
        return [...prev, timeRange].sort();
      }
    });
  };

  // Helper functions for weekly calculations
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const thisWeekStart = getWeekStart(new Date());
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  // All weekly stats
  const thisWeekReservations = adminReservations.filter(r => {
    const reservationDate = new Date(r.date);
    return reservationDate >= thisWeekStart && reservationDate <= thisWeekEnd;
  });

  const thisWeekUsers = adminUsers.filter(u => {
    const createdDate = new Date(u.createdAt);
    return createdDate >= thisWeekStart && createdDate <= thisWeekEnd;
  });

  const thisWeekRevenue = thisWeekReservations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + parseFloat(r.totalPrice), 0);

  const thisWeekCancellations = thisWeekReservations.filter(r => r.status === 'cancelled').length;
  const thisWeekCancellationRate = thisWeekReservations.length > 0 ? 
    Math.round((thisWeekCancellations / thisWeekReservations.length) * 100) : 0;

  // Calculate maintenance percentage for this week
  const calculateThisWeekMaintenancePercentage = () => {
    if (!maintenancePeriods || maintenancePeriods.length === 0) return "0";
    
    // Get all maintenance periods for this week
    const thisWeekMaintenance = maintenancePeriods.filter((maintenance: any) => {
      const maintenanceDate = new Date(maintenance.date);
      return maintenanceDate >= thisWeekStart && maintenanceDate <= thisWeekEnd;
    });
    
    if (thisWeekMaintenance.length === 0) return "0";
    
    // Calculate total maintenance minutes for the week
    let totalMaintenanceMinutes = 0;
    thisWeekMaintenance.forEach((maintenance: any) => {
      const startTime = maintenance.startTime.split(':');
      const endTime = maintenance.endTime.split(':');
      const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
      const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
      totalMaintenanceMinutes += (endMinutes - startMinutes);
    });
    
    // Calculate total available court time for the week (7 days × 14 hours × 60 minutes × number of courts)
    const operatingHoursPerDay = 14; // 8:00-22:00
    const daysInWeek = 7;
    const totalAvailableMinutes = operatingHoursPerDay * 60 * daysInWeek * courts.length;
    
    if (totalAvailableMinutes === 0) return "0";
    
    const maintenancePercentage = (totalMaintenanceMinutes / totalAvailableMinutes) * 100;
    return maintenancePercentage.toFixed(0);
  };

  const thisWeekMaintenancePercentage = calculateThisWeekMaintenancePercentage();

  // Calculate court usage for this week
  const thisWeekConfirmedReservations = thisWeekReservations.filter(r => r.status === 'confirmed');
  const totalBookedHours = thisWeekConfirmedReservations.reduce((sum, r) => {
    const start = new Date(`2000-01-01T${r.startTime}:00`);
    const end = new Date(`2000-01-01T${r.endTime}:00`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  // Assuming courts open 8AM-10PM (14 hours) with 2 courts = 28 hours per day * 7 days = 196 hours per week
  const availableHoursPerWeek = 14 * 2 * 7; // 196 hours
  const thisWeekCourtUsage = Math.round((totalBookedHours / availableHoursPerWeek) * 100);

  // Generate chart data based on date filters or default range
  const generateChartData = () => {
    const startDate = chartDateFrom ? new Date(chartDateFrom) : (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 2); // Default to 2 months ago
      return date;
    })();
    
    const endDate = chartDateTo ? new Date(chartDateTo) : new Date();
    
    const weeks = [];
    let currentWeek = getWeekStart(startDate);
    
    while (currentWeek <= endDate) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(currentWeek.getDate() + 6);
      
      const weekReservations = adminReservations.filter(r => {
        const reservationDate = new Date(r.date);
        return reservationDate >= currentWeek && reservationDate <= weekEnd;
      });
      
      const confirmedReservations = weekReservations.filter(r => r.status === 'confirmed');
      const cancelledReservations = weekReservations.filter(r => r.status === 'cancelled');
      
      const weekBookedHours = confirmedReservations.reduce((sum, r) => {
        const start = new Date(`2000-01-01T${r.startTime}:00`);
        const end = new Date(`2000-01-01T${r.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      
      const weekUsage = Math.round((weekBookedHours / availableHoursPerWeek) * 100);
      const weekCancellationRate = weekReservations.length > 0 ? 
        Math.round((cancelledReservations.length / weekReservations.length) * 100) : 0;
      
      const weekRevenue = confirmedReservations.reduce((sum, r) => sum + parseFloat(r.totalPrice), 0);
      
      weeks.push({
        week: `${currentWeek.getDate()}/${currentWeek.getMonth() + 1}`,
        usage: weekUsage,
        cancellation: weekCancellationRate,
        revenue: weekRevenue,
        reservations: confirmedReservations.length,
        newUsers: adminUsers.filter(u => {
          const createdDate = new Date(u.createdAt);
          return createdDate >= currentWeek && createdDate <= weekEnd;
        }).length
      });
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    return weeks;
  };

  const chartData = generateChartData();

  // Mutation to update reservation status
  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/admin/reservations/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Rezervacijos būsena sėkmingai atnaujinta"
      });
    },
    onError: (error) => {
      toast({
        title: "Klaida",
        description: "Nepavyko atnaujinti rezervacijos būsenos",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete reservation
  const deleteReservationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Rezervacija sėkmingai ištrinta"
      });
    },
    onError: (error) => {
      toast({
        title: "Klaida",
        description: "Nepavyko ištrinti rezervacijos",
        variant: "destructive"
      });
    }
  });

  const handleToggleStatus = (reservation: ReservationWithDetails) => {
    const newStatus = reservation.status === 'confirmed' ? 'cancelled' : 'confirmed';
    const statusText = newStatus === 'confirmed' ? 'patvirtinti' : 'atšaukti';
    const userName = `${reservation.user.firstName} ${reservation.user.lastName}`;
    const dateTime = `${new Date(reservation.date).toLocaleDateString('lt-LT')} ${reservation.startTime}-${reservation.endTime}`;
    
    setConfirmModal({
      isOpen: true,
      title: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} rezervaciją`,
      message: `Ar tikrai norite ${statusText} rezervaciją vartotojo ${userName} (${dateTime})?`,
      onConfirm: () => {
        updateReservationMutation.mutate({ id: reservation.id, status: newStatus });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: newStatus === 'cancelled'
    });
  };

  const handleDeleteReservation = (reservation: ReservationWithDetails) => {
    const userName = `${reservation.user.firstName} ${reservation.user.lastName}`;
    const dateTime = `${new Date(reservation.date).toLocaleDateString('lt-LT')} ${reservation.startTime}-${reservation.endTime}`;
    
    setConfirmModal({
      isOpen: true,
      title: "Ištrinti rezervaciją",
      message: `Ar tikrai norite visiškai ištrinti rezervaciją vartotojo ${userName} (${dateTime})? Šis veiksmas negrįžtamas.`,
      onConfirm: () => {
        deleteReservationMutation.mutate(reservation.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  // Mutation to create reservation for user
  const createReservationMutation = useMutation({
    mutationFn: async (reservationData: any) => {
      const response = await apiRequest("POST", `/api/admin/reservations`, reservationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      setCreateReservationModal(false);
      setReservationForm({
        userId: "",
        courtId: "",
        date: "",
      });
      setSelectedTimeSlots([]);
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Rezervacija sėkmingai sukurta"
      });
    },
    onError: (error) => {
      toast({
        title: "Klaida",
        description: "Nepavyko sukurti rezervacijos",
        variant: "destructive"
      });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateUserModal(false);
      setUserForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        isAdmin: false
      });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Naudotojas sėkmingai sukurtas",
      });
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko sukurti naudotojo",
        variant: "destructive"
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!editingUserId) throw new Error("No user selected for editing");
      const res = await apiRequest("PATCH", `/api/admin/users/${editingUserId}`, userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUserModal(false);
      setEditingUserId(null);
      setUserForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        isAdmin: false
      });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Naudotojo duomenys atnaujinti",
      });
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko atnaujinti naudotojo",
        variant: "destructive"
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Naudotojas pašalintas",
      });
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko pašalinti naudotojo",
        variant: "destructive"
      });
    }
  });

  const updateCourtPricingMutation = useMutation({
    mutationFn: async (pricingData: { hourlyRate: string }) => {
      if (courts.length === 0) throw new Error("No courts found");
      
      const res = await apiRequest("PATCH", `/api/admin/courts/${courts[0].id}`, {
        hourlyRate: pricingData.hourlyRate
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Kortų kaina atnaujinta sėkmingai",
      });
    },
    onError: (error) => {
      console.error("Error updating pricing:", error);
      toast({
        title: "Klaida",
        description: "Nepavyko atnaujinti kainos",
        variant: "destructive"
      });
    }
  });

  const handleCreateUser = () => {
    if (!userForm.email || !userForm.password || !userForm.firstName || !userForm.lastName || !userForm.phone) {
      toast({
        title: "Klaida",
        description: "Užpildykite visus privalomus laukus",
        variant: "destructive"
      });
      return;
    }

    createUserMutation.mutate(userForm);
  }

  // Maintenance mutations
  const createMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceData: any) => {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create maintenance period');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reservations'] });
      setShowMaintenanceModal(false);
      setMaintenanceForm({ courtId: "", date: "", description: "" });
      setSelectedMaintenanceSlots([]);
      
      const message = data.cancelledReservations > 0 
        ? `Tvarkymo darbai sukurti. Atšauktos ${data.cancelledReservations} konfliktuojančios rezervacijos.`
        : "Tvarkymo darbai sėkmingai sukurti";
        
      toast({
        title: "Pakeitimas išsaugotas",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Klaida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/maintenance/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete maintenance period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courts'] });
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Tvarkymo darbai sėkmingai pašalinti",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Klaida",  
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateMaintenance = () => {
    if (!maintenanceForm.courtId || !maintenanceForm.date || selectedMaintenanceSlots.length === 0) {
      toast({
        title: "Klaida",
        description: "Prašome pasirinkti kortą, datą ir bent vieną laiko intervalą",
        variant: "destructive",
      });
      return;
    }

    // Sort slots and get continuous time range
    const sortedSlots = selectedMaintenanceSlots.sort();
    const startTime = sortedSlots[0].split('-')[0];
    const endTime = sortedSlots[sortedSlots.length - 1].split('-')[1];

    createMaintenanceMutation.mutate({
      courtId: parseInt(maintenanceForm.courtId),
      date: maintenanceForm.date,
      startTime: startTime,
      endTime: endTime,
      description: maintenanceForm.description || null,
    });
  };

  const handleDeleteMaintenance = (id: number, description: string, date: string, timeRange: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Pašalinti tvarkymo darbus",
      message: `Ar tikrai norite pašalinti tvarkymo darbus "${description}" (${date} ${timeRange})?`,
      onConfirm: () => {
        deleteMaintenanceMutation.mutate(id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };;

  const handleEditUser = (user: UserWithStats) => {
    setEditingUserId(user.id);
    setUserForm({
      email: user.email || "",
      password: "", // Don't pre-fill password for security
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      isAdmin: user.isAdmin
    });
    setEditUserModal(true);
  };

  const handleUpdateUser = () => {
    if (!userForm.email || !userForm.firstName || !userForm.lastName || !userForm.phone) {
      toast({
        title: "Klaida",
        description: "Užpildykite visus privalomus laukus",
        variant: "destructive"
      });
      return;
    }

    // Don't send password if it's empty (user doesn't want to change it)
    const updateData: any = { ...userForm };
    if (!updateData.password) {
      delete updateData.password;
    }

    updateUserMutation.mutate(updateData);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Pašalinti naudotoją",
      message: `Ar tikrai norite pašalinti naudotoją "${userName}"? Galimi pašalinti tik naudotojai be aktyvių rezervacijų. Visos praeities rezervacijos bus pašalintos. Šis veiksmas negrįžtamas.`,
      onConfirm: () => {
        deleteUserMutation.mutate(userId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  // Validation function for admin reservation creation
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

  const handleCreateReservation = () => {
    if (!reservationForm.userId || !reservationForm.courtId || !reservationForm.date || selectedTimeSlots.length === 0) {
      toast({
        title: "Klaida",
        description: "Užpildykite visus laukus ir pasirinkite bent vieną laiko intervalą",
        variant: "destructive"
      });
      return;
    }

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

    // Sort selected time slots to ensure they are in chronological order
    const sortedSlots = [...selectedTimeSlots].sort();
    
    // Get the start time from the first slot and end time from the last slot
    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];
    
    const [startTime] = firstSlot.split('-');
    const [, endTime] = lastSlot.split('-');

    const selectedCourt = courts.find(court => court.id.toString() === reservationForm.courtId);
    const hourlyRate = parseFloat(selectedCourt?.hourlyRate || "0");
    
    // Calculate total duration and price (each slot is 30 minutes = 0.5 hours)
    const totalSlots = selectedTimeSlots.length;
    const totalHours = totalSlots * 0.5;
    const totalPrice = (hourlyRate * totalHours).toFixed(2);

    createReservationMutation.mutate({
      userId: reservationForm.userId,
      courtId: parseInt(reservationForm.courtId),
      date: reservationForm.date,
      startTime: startTime,
      endTime: endTime,
      totalPrice: totalPrice,
      status: "confirmed"
    });
  };

  // Helper function to check if reservation is in the past
  const isReservationPast = (date: string, endTime: string): boolean => {
    const reservationDateTime = new Date(`${date}T${endTime}:00`);
    const now = new Date();
    
    // Convert to Europe/Vilnius timezone for accurate comparison
    const vilniusOffset = 2 * 60; // UTC+2 (or UTC+3 in summer, but simplified)
    const localTime = new Date(now.getTime() + (vilniusOffset * 60 * 1000));
    
    return reservationDateTime < localTime;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Prieiga uždrausta</h1>
              <p className="mt-4 text-sm text-gray-600">
                Neturite administratoriaus teisių.
              </p>
            </div>
          </CardContent>
        </Card>
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
                onClick={() => window.location.href = '/api/logout'}
              >
                <LogOut size={16} className="mr-2" />
                Atsijungti
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-tennis-green-100 rounded-full flex items-center justify-center">
                <TennisBallIcon size={24} className="text-tennis-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administratoriaus panelė</h1>
                <p className="text-gray-600">Valdykite rezervacijas ir naudotojus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <BarChart3 size={16} className="mr-2" />
              Apžvalga
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <Calendar size={16} className="mr-2" />
              Rezervacijos
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Settings size={16} className="mr-2" />
              Tvarkymo darbai
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users size={16} className="mr-2" />
              Naudotojai
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings size={16} className="mr-2" />
              Nustatymai
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <h2 className="text-xl font-semibold">Sistemos Apžvalga</h2>
            
            {/* Stats Cards */}
            <div className="grid md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Nauji Naudotojai</p>
                      <p className="text-2xl font-bold text-green-800">{thisWeekUsers.length}</p>
                      <p className="text-xs text-gray-500">Šią savaitę</p>
                    </div>
                    <Users className="text-green-600" size={32} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">Savaitės Pajamos</p>
                      <p className="text-2xl font-bold text-yellow-800">{thisWeekRevenue.toFixed(0)}€</p>
                      <p className="text-xs text-gray-500">Šią savaitę</p>
                    </div>
                    <Euro className="text-yellow-600" size={32} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Kortų Užimtumas</p>
                      <p className="text-2xl font-bold text-purple-800">{thisWeekCourtUsage}%</p>
                      <p className="text-xs text-gray-500">Šią savaitę</p>
                    </div>
                    <TennisBallIcon size={32} className="text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-sm font-medium">Atšaukimų Dažnis</p>
                      <p className="text-2xl font-bold text-red-800">{thisWeekCancellationRate}%</p>
                      <p className="text-xs text-gray-500">Šią savaitę</p>
                    </div>
                    <TrendingDown className="text-red-600" size={32} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Tvarkymo Darbai</p>
                      <p className="text-2xl font-bold text-orange-800">{thisWeekMaintenancePercentage}%</p>
                      <p className="text-xs text-gray-500">Šią savaitę</p>
                    </div>
                    <Wrench className="text-orange-600" size={32} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Filters */}
            <Card className="mt-8">
              <CardContent className="p-4">
                <div className="flex items-end gap-4">
                  <h3 className="font-medium pb-2">Grafikų Filtrai:</h3>
                  <div className="flex gap-4">
                    <div>
                      <Label htmlFor="chart-date-from">Data nuo</Label>
                      <DatePicker
                        id="chart-date-from"
                        value={chartDateFrom}
                        onChange={setChartDateFrom}
                        className="w-40"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <div>
                      <Label htmlFor="chart-date-to">Data iki</Label>
                      <DatePicker
                        id="chart-date-to"
                        value={chartDateTo}
                        onChange={setChartDateTo}
                        className="w-40"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setChartDateFrom("");
                          setChartDateTo("");
                        }}
                      >
                        Išvalyti
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Kortų Užimtumas ir Atšaukimai
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        `${value}%`, 
                        name === 'usage' ? 'Kortų Užimtumas' : 'Atšaukimų Dažnis'
                      ]} />
                      <Line 
                        type="monotone" 
                        dataKey="usage" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="usage"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cancellation" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="cancellation"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Savaitinės Pajamos ir Rezervacijos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value, name, props) => {
                        if (name === 'revenue') return [`${value}€`, 'Pajamos'];
                        if (name === 'reservations') return [`${value}`, 'Rezervacijos'];
                        return [value, name];
                      }} />
                      <Bar 
                        yAxisId="left"
                        dataKey="revenue" 
                        fill="#eab308" 
                        name="revenue"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="reservations" 
                        fill="#22c55e" 
                        name="reservations"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Rezervacijų Valdymas</h2>
              <Button 
                onClick={() => setCreateReservationModal(true)}
                className="bg-tennis-green-500 hover:bg-tennis-green-600"
              >
                <Plus size={16} className="mr-2" />
                Sukurti Rezervaciją
              </Button>
            </div>
            
            {/* Filter Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Data nuo</Label>
                    <DatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <Label>Data iki</Label>
                    <DatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <Label>Būsena</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Visos</SelectItem>
                        <SelectItem value="confirmed">Patvirtinta</SelectItem>
                        <SelectItem value="cancelled">Atšaukta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reservations Table */}
            <Card>
              <CardContent className="p-0">
                {reservationsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tennis-green-600 mx-auto"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naudotojas</TableHead>
                        <TableHead>Data ir Laikas</TableHead>
                        <TableHead>Kortas</TableHead>
                        <TableHead>Būsena</TableHead>
                        <TableHead>Kaina</TableHead>
                        <TableHead>Veiksmai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminReservations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Nerasta rezervacijų pagal pasirinktus filtrus
                          </TableCell>
                        </TableRow>
                      ) : (
                        adminReservations.map((reservation) => {
                          const isPast = isReservationPast(reservation.date, reservation.endTime);
                          return (
                          <TableRow 
                            key={reservation.id}
                            className={isPast ? "bg-gray-50 opacity-75" : ""}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {reservation.user.firstName} {reservation.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reservation.user.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{new Date(reservation.date).toLocaleDateString('lt-LT')}</div>
                                <div className="text-sm text-gray-500">
                                  {reservation.startTime}-{reservation.endTime}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{reservation.court.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  reservation.status === 'confirmed' ? 'default' : 'destructive'
                                }
                              >
                                {reservation.status === 'confirmed' ? 'Patvirtinta' : 'Atšaukta'}
                              </Badge>
                            </TableCell>
                            <TableCell>{reservation.totalPrice}€</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant={reservation.status === 'confirmed' ? "default" : "outline"}
                                  onClick={() => handleToggleStatus(reservation)}
                                  disabled={updateReservationMutation.isPending}
                                  title={reservation.status === 'confirmed' ? 'Atšaukti rezervaciją' : 'Patvirtinti rezervaciją'}
                                  className={`${reservation.status === 'confirmed' 
                                    ? 'bg-tennis-green-500 hover:bg-tennis-green-600 text-white' 
                                    : 'hover:bg-gray-50'}`}
                                >
                                  {reservation.status === 'confirmed' ? (
                                    <ToggleRight size={14} />
                                  ) : (
                                    <ToggleLeft size={14} />
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteReservation(reservation)}
                                  disabled={deleteReservationMutation.isPending}
                                  title="Ištrinti rezervaciją"
                                  className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Naudotojų Valdymas</h2>
              <Button 
                className="bg-tennis-green-500 hover:bg-tennis-green-600"
                onClick={() => setCreateUserModal(true)}
              >
                <UserPlus size={16} className="mr-2" />
                Pridėti Naudotoją
              </Button>
            </div>

            {/* User Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Ieškoti pagal vardą, pavardę arba el. paštą..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tennis-green-600 mx-auto"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naudotojas</TableHead>
                        <TableHead>Kontaktai</TableHead>
                        <TableHead>Registracijos Data</TableHead>
                        <TableHead>Rezervacijos</TableHead>
                        <TableHead>Būsena</TableHead>
                        <TableHead>Veiksmai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers
                        .filter(user => 
                          !searchTerm || 
                          `${user.firstName} ${user.lastName} ${user.email}`
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                <Users size={20} className="text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">ID: {user.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{user.email}</div>
                              <div className="text-sm text-gray-500">{user.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString('lt-LT')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{user.totalReservations} rezervacijos</div>
                              {user.lastReservation && (
                                <div className="text-sm text-gray-500">
                                  Paskutinė: {new Date(user.lastReservation).toLocaleDateString('lt-LT')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "destructive" : "default"}>
                              {user.isAdmin ? "Administratorius" : "Aktyvus"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tvarkymo Darbų Valdymas</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowEmailTestModal(true)}
                >
                  <Calendar size={16} className="mr-2" />
                  Testuoti El. Paštą
                </Button>
                <Button 
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => setShowMaintenanceModal(true)}
                >
                  <Plus size={16} className="mr-2" />
                  Sukurti Tvarkymo Darbus
                </Button>
              </div>
            </div>

            {/* Maintenance Periods Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kortas</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Laikas</TableHead>
                      <TableHead>Aprašymas</TableHead>
                      <TableHead>Veiksmai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenancePeriods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Tvarkymo darbai neplanuoti
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenancePeriods.map((maintenance: any) => (
                        <TableRow key={maintenance.id}>
                          <TableCell>
                            <div className="font-medium">{maintenance.court?.name || `Kortas #${maintenance.courtId}`}</div>
                          </TableCell>
                          <TableCell>
                            {new Date(maintenance.date).toLocaleDateString('lt-LT')}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {maintenance.startTime} - {maintenance.endTime}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {maintenance.description || "Nenurodyta"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteMaintenance(
                                maintenance.id, 
                                maintenance.description || "Tvarkymo darbai",
                                new Date(maintenance.date).toLocaleDateString('lt-LT'),
                                `${maintenance.startTime}-${maintenance.endTime}`
                              )}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <h2 className="text-xl font-semibold mb-6">Sistemos Nustatymai</h2>
            
            <div className="max-w-4xl space-y-8">
              {/* Court Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Kortų Nustatymai</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Kortų skaičius</Label>
                      <Input 
                        type="number" 
                        value={courts.length} 
                        readOnly
                        className="bg-gray-50" 
                      />
                    </div>
                    <div>
                      <Label>30min. kaina (€)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={pricing.slotRate}
                        onChange={(e) => setPricing(prev => ({ ...prev, slotRate: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    {/* Workdays Schedule */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 text-gray-700">Darbo dienos (Pirmadienis - Penktadienis)</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Darbo pradžia</Label>
                          <Input 
                            type="time" 
                            value={operatingHours.weekdays.start}
                            onChange={(e) => setOperatingHours(prev => ({
                              ...prev,
                              weekdays: { ...prev.weekdays, start: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Darbo pabaiga</Label>
                          <Input 
                            type="time" 
                            value={operatingHours.weekdays.end}
                            onChange={(e) => setOperatingHours(prev => ({
                              ...prev,
                              weekdays: { ...prev.weekdays, end: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Weekend Schedule */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 text-gray-700">Savaitgaliai (Šeštadienis - Sekmadienis)</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Darbo pradžia</Label>
                          <Input 
                            type="time" 
                            value={operatingHours.weekends.start}
                            onChange={(e) => setOperatingHours(prev => ({
                              ...prev,
                              weekends: { ...prev.weekends, start: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Darbo pabaiga</Label>
                          <Input 
                            type="time" 
                            value={operatingHours.weekends.end}
                            onChange={(e) => setOperatingHours(prev => ({
                              ...prev,
                              weekends: { ...prev.weekends, end: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex gap-4">
                <Button 
                  className="bg-tennis-green-500 hover:bg-tennis-green-600"
                  onClick={() => {
                    // Convert 30-minute slot rate to hourly rate for database storage
                    const hourlyRate = (parseFloat(pricing.slotRate) * 2).toFixed(2);
                    updateCourtPricingMutation.mutate({
                      hourlyRate: hourlyRate
                    });
                  }}
                  disabled={updateCourtPricingMutation.isPending}
                >
                  <Settings size={16} className="mr-2" />
                  {updateCourtPricingMutation.isPending ? "Išsaugoma..." : "Išsaugoti Nustatymus"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOperatingHours({
                      weekdays: { start: "08:00", end: "22:00" },
                      weekends: { start: "09:00", end: "21:00" }
                    });
                    setPricing({
                      slotRate: courts.length > 0 ? (parseFloat(courts[0].hourlyRate) / 2).toFixed(2) : "0.00"
                    });
                  }}
                >
                  Atkurti Nustatymus
                </Button>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        isLoading={updateReservationMutation.isPending || deleteReservationMutation.isPending || deleteUserMutation.isPending || deleteMaintenanceMutation.isPending}
      />
      {/* Create Reservation Modal */}
      {createReservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-xl max-h-[95vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sukurti Rezervaciją</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateReservationModal(false)}
                  className="h-6 w-6 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1">
              <div>
                <Label htmlFor="user-select">Naudotojas</Label>
                <Select
                  value={reservationForm.userId}
                  onValueChange={(value) => setReservationForm(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite naudotoją" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="court-select">Kortas</Label>
                <Select
                  value={reservationForm.courtId}
                  onValueChange={(value) => setReservationForm(prev => ({ ...prev, courtId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite kortą" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court: any) => (
                      <SelectItem key={court.id} value={court.id.toString()}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-input">Data</Label>
                <DatePicker
                  value={reservationForm.date}
                  onChange={(date: string) => setReservationForm(prev => ({ 
                    ...prev, 
                    date: date
                  }))}
                  placeholder="Pasirinkite datą"
                />
              </div>

              {availabilityLoading && reservationForm.date && reservationForm.courtId && (
                <div className="text-center text-sm text-gray-500 py-2">
                  Tikrinama prieinamumas...
                </div>
              )}

              {reservationForm.date && reservationForm.courtId && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label>Laiko intervalai</Label>
                    {selectedTimeSlots.length > 0 && (
                      <span className="text-xs text-tennis-green-600 font-medium">
                        {selectedTimeSlots.length} pasirinkta
                      </span>
                    )}
                  </div>
                  
                  <TimeSlotGrid
                    timeSlots={(() => {
                      // Determine if selected date is weekend or weekday
                      let operatingStartTime = "08:00";
                      let operatingEndTime = "22:00";
                      
                      const selectedDate = new Date(reservationForm.date);
                      const dayOfWeek = selectedDate.getDay(); // 0=Sunday, 6=Saturday
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      if (isWeekend) {
                        operatingStartTime = operatingHours.weekends.start;
                        operatingEndTime = operatingHours.weekends.end;
                      } else {
                        operatingStartTime = operatingHours.weekdays.start;
                        operatingEndTime = operatingHours.weekdays.end;
                      }
                      
                      // Parse operating hours
                      const startHour = parseInt(operatingStartTime.split(':')[0]);
                      const endHour = parseInt(operatingEndTime.split(':')[0]);
                      
                      // Generate 30-minute slots within operating hours
                      const startMinutes = startHour * 60;
                      const endMinutes = endHour * 60;
                      const slots = [];
                      
                      for (let currentMinutes = startMinutes; currentMinutes + 30 <= endMinutes; currentMinutes += 30) {
                        const currentStartHour = Math.floor(currentMinutes / 60);
                        const currentStartMin = currentMinutes % 60;
                        const currentEndMinutes = currentMinutes + 30;
                        const currentEndHour = Math.floor(currentEndMinutes / 60);
                        const currentEndMin = currentEndMinutes % 60;
                        
                        const currentStartTime = `${currentStartHour.toString().padStart(2, '0')}:${currentStartMin.toString().padStart(2, '0')}`;
                        const currentEndTime = `${currentEndHour.toString().padStart(2, '0')}:${currentEndMin.toString().padStart(2, '0')}`;
                        
                        // Check if this 30-minute slot conflicts with existing reservations
                        const isReserved = availability.some((reservation: any) => {
                          // Check if time slots overlap
                          return !(currentEndTime <= reservation.startTime || currentStartTime >= reservation.endTime);
                        });
                        
                        slots.push({
                          startTime: currentStartTime,
                          endTime: currentEndTime,
                          timeDisplay: currentStartTime,
                          isReserved,
                        });
                      }
                      return slots;
                    })()}
                    onSlotSelect={(slot) => {
                      setSelectedTimeSlots(prev => 
                        prev.includes(slot) 
                          ? prev.filter(s => s !== slot)
                          : [...prev, slot]
                      );
                    }}
                    selectedSlots={selectedTimeSlots}
                    selectedDate={reservationForm.date}
                    isPublicView={false}
                  />
                  
                  {selectedTimeSlots.length > 0 && (
                    <div className="mt-4 p-3 bg-tennis-green-50 border border-tennis-green-200 rounded-lg">
                      <h4 className="font-medium text-tennis-green-800 mb-2">Rezervacijos Santrauka</h4>
                      <div className="text-sm text-tennis-green-700 space-y-1">
                        <div><strong>Laikai:</strong> {selectedTimeSlots.sort().join(', ')}</div>
                        <div><strong>Trukmė:</strong> {selectedTimeSlots.length * 30} min.</div>
                        <div><strong>Kaina:</strong> {(() => {
                          const court = courts.find(c => c.id.toString() === reservationForm.courtId);
                          const hourlyRate = parseFloat(court?.hourlyRate || '0');
                          const slotRate = hourlyRate / 2; // 30-minute slot rate
                          return (slotRate * selectedTimeSlots.length).toFixed(2);
                        })()}€</div>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTimeSlots([])}
                        className="mt-2 text-xs"
                      >
                        Išvalyti pasirinkimus
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateReservationModal(false)}
                  disabled={createReservationMutation.isPending}
                >
                  Atšaukti
                </Button>
                <Button
                  onClick={handleCreateReservation}
                  disabled={createReservationMutation.isPending}
                  className="bg-tennis-green-500 hover:bg-tennis-green-600"
                >
                  {createReservationMutation.isPending ? "Kuriama..." : "Sukurti Rezervaciją"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Create User Modal */}
      {createUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sukurti Naudotoją</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateUserModal(false)}
                  className="h-6 w-6 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">El. paštas *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="vardas@pavyzdys.lt"
                />
              </div>

              <div>
                <Label htmlFor="password">Slaptažodis *</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Įveskite slaptažodį"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vardas *</Label>
                  <Input
                    id="firstName"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Vardas"
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Pavardė *</Label>
                  <Input
                    id="lastName"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Pavardė"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Telefonas *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+370 600 00000"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={userForm.isAdmin}
                  onChange={(e) => setUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isAdmin" className="text-sm">
                  Administratoriaus teisės
                </Label>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateUserModal(false)}
                  disabled={createUserMutation.isPending}
                >
                  Atšaukti
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="bg-tennis-green-500 hover:bg-tennis-green-600"
                >
                  {createUserMutation.isPending ? "Kuriamas..." : "Sukurti Naudotoją"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Edit User Modal */}
      {editUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Redaguoti Naudotoją</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditUserModal(false);
                    setEditingUserId(null);
                    setUserForm({
                      email: "",
                      password: "",
                      firstName: "",
                      lastName: "",
                      phone: "",
                      isAdmin: false
                    });
                  }}
                  className="h-6 w-6 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-email">El. paštas *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="vardas@pavyzdys.lt"
                />
              </div>

              <div>
                <Label htmlFor="edit-password">Slaptažodis</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Palikite tuščią, jei nekeičiate"
                />
                <p className="text-xs text-gray-500 mt-1">Palikite tuščią, jei nenorite keisti slaptažodžio</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">Vardas *</Label>
                  <Input
                    id="edit-firstName"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Vardas"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-lastName">Pavardė *</Label>
                  <Input
                    id="edit-lastName"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Pavardė"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-phone">Telefonas *</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+370 600 00000"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isAdmin"
                  checked={userForm.isAdmin}
                  onChange={(e) => setUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-isAdmin" className="text-sm">
                  Administratoriaus teisės
                </Label>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditUserModal(false);
                    setEditingUserId(null);
                    setUserForm({
                      email: "",
                      password: "",
                      firstName: "",
                      lastName: "",
                      phone: "",
                      isAdmin: false
                    });
                  }}
                  disabled={updateUserMutation.isPending}
                >
                  Atšaukti
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                  className="bg-tennis-green-500 hover:bg-tennis-green-600"
                >
                  {updateUserMutation.isPending ? "Atnaujinama..." : "Atnaujinti"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sukurti Tvarkymo Darbus</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="h-6 w-6 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="court">Kortas *</Label>
                <Select 
                  value={maintenanceForm.courtId} 
                  onValueChange={(value) => setMaintenanceForm(prev => ({ ...prev, courtId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite kortą" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court: any) => (
                      <SelectItem key={court.id} value={court.id.toString()}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Data *</Label>
                <DatePicker
                  value={maintenanceForm.date}
                  onChange={(value) => setMaintenanceForm(prev => ({ ...prev, date: value }))}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              {/* Time Slot Selection */}
              {maintenanceForm.courtId && maintenanceForm.date && (
                <div>
                  <Label>Laiko intervalai *</Label>
                  {maintenanceAvailabilityLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {maintenanceTimeSlots.map((slot) => (
                        <button
                          key={slot.timeRange}
                          type="button"
                          onClick={() => !slot.isUnavailable && handleMaintenanceSlotSelect(slot.timeRange)}
                          disabled={slot.isUnavailable}
                          className={`
                            p-2 text-xs rounded border text-center transition-colors
                            ${slot.isUnavailable 
                              ? "bg-red-200 text-red-800 border-red-300 cursor-not-allowed opacity-60" 
                              : selectedMaintenanceSlots.includes(slot.timeRange)
                                ? "bg-yellow-600 text-white border-yellow-700"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-yellow-50 hover:border-yellow-400"
                            }
                          `}
                        >
                          {slot.timeDisplay}
                          <br />
                          <span className="text-xs opacity-75">
                            {slot.isUnavailable ? "Užimta" : "Laisva"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedMaintenanceSlots.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Pasirinkta: {selectedMaintenanceSlots.length} intervalų ({selectedMaintenanceSlots[0]?.split('-')[0]} - {selectedMaintenanceSlots[selectedMaintenanceSlots.length - 1]?.split('-')[1]})
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="description">Aprašymas</Label>
                <Input
                  id="description"
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Trumpas aprašymas (neprivaloma)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="flex-1"
                >
                  Atšaukti
                </Button>
                <Button
                  onClick={handleCreateMaintenance}
                  disabled={createMaintenanceMutation.isPending}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                >
                  {createMaintenanceMutation.isPending ? "Kuriama..." : "Sukurti"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Test Modal */}
      {showEmailTestModal && (
        <Dialog open={showEmailTestModal} onOpenChange={setShowEmailTestModal}>
          <DialogContent className="max-w-md" aria-describedby="email-test-description">
            <DialogHeader>
              <DialogTitle>Testuoti El. Paštą</DialogTitle>
            </DialogHeader>
            <p id="email-test-description" className="text-sm text-gray-600 mb-4">
              Išsiųskite testos el. laišką norėdami peržiūrėti šablono dizainą
            </p>
            <div className="space-y-4">
              <div>
                <Label>El. pašto adresas</Label>
                <Input
                  value={emailTestForm.email}
                  onChange={(e) => setEmailTestForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="test@example.com"
                  type="email"
                />
              </div>
              <div>
                <Label>El. laiško tipas</Label>
                <Select 
                  value={emailTestForm.type} 
                  onValueChange={(value) => setEmailTestForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmation">Rezervacijos patvirtinimas</SelectItem>
                    <SelectItem value="update">Rezervacijos pakeitimas</SelectItem>
                    <SelectItem value="cancellation">Rezervacijos atšaukimas</SelectItem>
                    <SelectItem value="maintenance">Tvarkymo darbai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => emailTestMutation.mutate(emailTestForm)}
                  disabled={!emailTestForm.email || emailTestMutation.isPending}
                  className="flex-1"
                >
                  {emailTestMutation.isPending ? "Siunčiama..." : "Siųsti"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailTestModal(false)}
                  disabled={emailTestMutation.isPending}
                >
                  Atšaukti
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

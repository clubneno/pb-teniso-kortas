import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Volleyball,
  LogOut,
  Edit,
  Trash2,
  UserPlus,
  Search,
  CalendarCheck,
  Euro,
  TrendingDown,
  TrendingUp,
  Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DatePicker from "@/components/DatePicker";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartDateFrom, setChartDateFrom] = useState("");
  const [chartDateTo, setChartDateTo] = useState("");
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
      
      return response.json();
    },
    retry: false,
  });

  const { data: adminUsers = [], isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

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
    
    if (confirm(`Ar tikrai norite ${statusText} šią rezervaciją?`)) {
      updateReservationMutation.mutate({ id: reservation.id, status: newStatus });
    }
  };

  const handleDeleteReservation = (reservation: ReservationWithDetails) => {
    if (confirm(`Ar tikrai norite ištrinti rezervaciją ${reservation.user.firstName} ${reservation.user.lastName} (${new Date(reservation.date).toLocaleDateString('lt-LT')} ${reservation.startTime})?`)) {
      deleteReservationMutation.mutate(reservation.id);
    }
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
              <div className="w-10 h-10 bg-tennis-green-600 rounded-full flex items-center justify-center">
                <Volleyball className="text-white" size={20} />
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
                <Volleyball className="text-tennis-green-600" size={24} />
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 size={16} className="mr-2" />
              Apžvalga
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <Calendar size={16} className="mr-2" />
              Rezervacijos
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
            <div className="grid md:grid-cols-4 gap-6">
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
                    <Volleyball className="text-purple-600" size={32} />
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
                                  variant="outline"
                                  onClick={() => handleToggleStatus(reservation)}
                                  disabled={updateReservationMutation.isPending}
                                  title={reservation.status === 'confirmed' ? 'Atšaukti rezervaciją' : 'Patvirtinti rezervaciją'}
                                >
                                  <Edit size={14} />
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
              <Button className="bg-tennis-green-500 hover:bg-tennis-green-600">
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
                              <Button size="sm" variant="outline">
                                <Edit size={14} />
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
                      <Input type="number" defaultValue="2" />
                    </div>
                    <div>
                      <Label>Valandos kaina (€)</Label>
                      <Input type="number" defaultValue="25" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Darbo pradžia</Label>
                      <Input type="time" defaultValue="08:00" />
                    </div>
                    <div>
                      <Label>Darbo pabaiga</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex gap-4">
                <Button className="bg-tennis-green-500 hover:bg-tennis-green-600">
                  <Settings size={16} className="mr-2" />
                  Išsaugoti Nustatymus
                </Button>
                <Button variant="outline">
                  Atkurti Nustatymus
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Trash2 } from "lucide-react";

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

interface ReservationCardProps {
  reservation: ReservationWithDetails;
  showActions?: boolean;
  isPast?: boolean;
}

export default function ReservationCard({ reservation, showActions = false, isPast = false }: ReservationCardProps) {
  const { toast } = useToast();

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      await apiRequest("DELETE", `/api/reservations/${reservationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sėkmė!",
        description: "Rezervacija sėkmingai atšaukta. Patvirtinimo el. laiškas išsiųstas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
    },
    onError: (error) => {
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
        description: "Nepavyko atšaukti rezervacijos. Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Patvirtinta</Badge>;
      case 'pending':
        return <Badge variant="secondary">Laukiama</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Atšaukta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancel = () => {
    if (window.confirm('Ar tikrai norite atšaukti šią rezervaciją?')) {
      cancelReservationMutation.mutate(reservation.id);
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isPast ? 'bg-gray-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className={`font-medium ${isPast ? 'text-gray-700' : 'text-gray-900'}`}>
              {formatDate(reservation.date)}
            </div>
            <div className={`text-sm ${isPast ? 'text-gray-500' : 'text-gray-600'}`}>
              {reservation.startTime}-{reservation.endTime} | {reservation.court.name}
            </div>
            <div className="mt-1">
              {getStatusBadge(reservation.status)}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${isPast ? 'text-gray-700' : 'text-gray-900'}`}>
              {reservation.totalPrice}€
            </div>
            {showActions && !isPast && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                >
                  <Edit size={14} className="mr-1" />
                  Keisti
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={cancelReservationMutation.isPending}
                >
                  <Trash2 size={14} className="mr-1" />
                  {cancelReservationMutation.isPending ? "Atšaukiama..." : "Atšaukti"}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {reservation.notes && (
          <div className={`mt-3 text-sm ${isPast ? 'text-gray-500' : 'text-gray-600'} italic`}>
            Pastabos: {reservation.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Trash2 } from "lucide-react";

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
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      await apiRequest("DELETE", `/api/reservations/${reservationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Rezervacija sėkmingai atšaukta. Patvirtinimo el. laiškas išsiųstas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
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
        return <Badge className="bg-green-500/30 text-green-200 border border-green-400/40">Patvirtinta</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/30 text-red-200 border border-red-400/40">Atšaukta</Badge>;
      default:
        return <Badge className="bg-white/20 text-white/80 border border-white/30">{status}</Badge>;
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    cancelReservationMutation.mutate(reservation.id);
    setShowCancelDialog(false);
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Card variant={isPast ? "glassDark" : "glass"} className={`${isPast ? 'opacity-70' : ''}`}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className={`font-medium ${isPast ? 'text-white/70' : 'text-white'}`}>
                  {formatDate(reservation.date)}
                </div>
                <div className={`text-sm ${isPast ? 'text-white/50' : 'text-white/70'}`}>
                  {reservation.startTime}-{reservation.endTime} | {reservation.court.name}
                </div>
                <div className="mt-1">
                  {getStatusBadge(reservation.status)}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium text-tennis-yellow ${isPast ? 'opacity-70' : ''}`}>
                  {reservation.totalPrice}€
                </div>
                {showActions && !isPast && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="glassDark"
                      className="text-red-300 border-red-400/30 hover:bg-red-500/20"
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
              <div className={`mt-3 text-sm ${isPast ? 'text-white/40' : 'text-white/60'} italic`}>
                Pastabos: {reservation.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="backdrop-blur-[16px] bg-white/20 border border-white/30 shadow-glass-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Atšaukti rezervaciją</AlertDialogTitle>
            <AlertDialogDescription className="text-white/80">
              Ar tikrai norite atšaukti šią rezervaciją?
              <br />
              <br />
              <strong className="text-white">Data:</strong> {formatDate(reservation.date)}
              <br />
              <strong className="text-white">Laikas:</strong> {reservation.startTime}-{reservation.endTime}
              <br />
              <strong className="text-white">Kortas:</strong> {reservation.court.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Ne, grįžti</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-500/60 hover:bg-red-500/80 text-white border border-red-400/40"
            >
              Taip, atšaukti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

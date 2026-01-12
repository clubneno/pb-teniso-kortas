import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Save, X, Trash2, AlertTriangle } from "lucide-react";
import ConfirmationModal from "@/components/ConfirmationModal";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin?: boolean;
}

interface ProfileEditProps {
  user?: User;
}

export default function ProfileEdit({ user }: ProfileEditProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/profile");
    },
    onSuccess: () => {
      toast({
        title: "Paskyra ištrinta",
        description: "Jūsų paskyra sėkmingai ištrinta.",
      });
      // Redirect to home page after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
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
        description: error.message || "Nepavyko ištrinti paskyros. Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Pakeitimas išsaugotas",
        description: "Profilis sėkmingai atnaujintas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        description: "Nepavyko atnaujinti profilio. Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profilio Redagavimas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName">Vardas</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Pavardė</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">El. paštas</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">El. pašto keisti negalima</p>
            </div>

            <div>
              <Label htmlFor="phone">Telefono numeris</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="mt-1"
                placeholder="+370 600 12345"
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                type="submit" 
                className="bg-tennis-green-500 hover:bg-tennis-green-600"
                disabled={updateProfileMutation.isPending}
              >
                <Save size={16} className="mr-2" />
                {updateProfileMutation.isPending ? "Išsaugoma..." : "Išsaugoti Pakeitimus"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleReset}
              >
                <X size={16} className="mr-2" />
                Atšaukti
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Paskyros ištrynimas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Pašalinus paskyrą, visi duomenys bus negrįžtamai ištrinti.
          </p>
          <Button
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteAccountMutation.isPending}
          >
            <Trash2 size={16} className="mr-2" />
            {deleteAccountMutation.isPending ? "Trinama..." : "Ištrinti Paskyrą"}
          </Button>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteAccountMutation.mutate();
          setShowDeleteConfirm(false);
        }}
        title="Ištrinti paskyrą?"
        message="Ar tikrai norite ištrinti savo paskyrą? Šis veiksmas yra negrįžtamas ir visi jūsų duomenys bus pašalinti."
        isDestructive={true}
        isLoading={deleteAccountMutation.isPending}
      />
    </div>
  );
}

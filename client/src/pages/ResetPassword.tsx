import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import TennisBallIcon from "@/components/TennisBallIcon";
import { useToast } from "@/hooks/use-toast";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Slaptažodis turi būti bent 6 simbolių"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Slaptažodžiai nesutampa",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (!resetToken) {
      setIsValidToken(false);
      setIsLoading(false);
      return;
    }

    setToken(resetToken);
    
    // Validate token with backend
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/validate-reset-token?token=${resetToken}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          toast({
            title: "Klaida",
            description: data.message || "Netinkama arba pasibaigusi nuoroda",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsValidToken(false);
        toast({
          title: "Klaida",
          description: "Nepavyko patikrinti nuorodos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [toast]);

  const handleResetPassword = async (data: ResetPasswordData) => {
    if (!token) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Sėkmė",
          description: "Slaptažodis sėkmingai pakeistas",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/prisijungimas");
        }, 3000);
      } else {
        toast({
          title: "Klaida",
          description: result.message || "Nepavyko pakeisti slaptažodžio",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: "Nepavyko pakeisti slaptažodžio",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-tennis-green-600" />
              <p className="mt-4 text-gray-600">Tikrinama nuoroda...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <TennisBallIcon size={20} className="text-tennis-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">PB teniso kortas</h1>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isSuccess ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Slaptažodis pakeistas
                    </>
                  ) : isValidToken === false ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      Netinkama nuoroda
                    </>
                  ) : (
                    "Naujas slaptažodis"
                  )}
                </CardTitle>
                <CardDescription>
                  {isSuccess ? (
                    "Jūsų slaptažodis sėkmingai pakeistas. Nukreipiame į prisijungimo puslapį..."
                  ) : isValidToken === false ? (
                    "Nuoroda netinkama arba jos galiojimas pasibaigė"
                  ) : (
                    "Įveskite naują slaptažodį savo paskyriai"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSuccess ? (
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
                    <p className="text-gray-600 mb-4">
                      Galite prisijungti naudodami naują slaptažodį
                    </p>
                    <Button onClick={() => setLocation("/prisijungimas")} className="w-full">
                      Eiti į prisijungimą
                    </Button>
                  </div>
                ) : isValidToken === false ? (
                  <div className="text-center">
                    <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
                    <p className="text-gray-600 mb-4">
                      Nuoroda galioja tik 1 valandą. Pabandykite atkurti slaptažodį dar kartą.
                    </p>
                    <Button onClick={() => setLocation("/prisijungimas")} variant="outline" className="w-full">
                      Grįžti į prisijungimą
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Naujas slaptažodis</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pakartokite slaptažodį</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Saugumo patarimai:</strong> Naudokite stiprų slaptažodį su raidėmis, skaičiais ir simboliais.
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Keičiamas slaptažodis...
                          </>
                        ) : (
                          "Pakeisti slaptažodį"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
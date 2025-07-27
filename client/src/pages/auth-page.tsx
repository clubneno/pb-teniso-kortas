import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema, forgotPasswordSchema, type LoginData, type RegisterData, type ForgotPasswordData } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import TennisBallIcon from "@/components/TennisBallIcon";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  
  // SEO optimization for auth page
  useSEO({
    title: "Prisijungimas ir registracija - PB teniso kortas",
    description: "Prisijunkite prie PB teniso kortų rezervacijos sistemos arba užregistruokitės naują paskyrą. Greitai ir saugiai valdykite savo teniso kortų rezervacijas.",
    canonical: "/prisijungimas",
    keywords: "prisijungimas, registracija, teniso kortas, paskyra, rezervacijos",
    ogTitle: "Prisijungimas - PB teniso kortas",
    ogDescription: "Prisijunkite prie teniso kortų rezervacijos sistemos ir pradėkite rezervuoti kortus šiandien.",
  });

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Slaptažodžio atkūrimo klaida");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sėkmė",
        description: data.message,
      });
      setShowForgotPassword(false);
      forgotPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Klaida",
        description: error.message || "Nepavyko išsiųsti atkūrimo instrukcijų",
        variant: "destructive",
      });
    },
  });

  // Redirect if already authenticated
  if (user && !isLoading) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  const handleForgotPassword = (data: ForgotPasswordData) => {
    forgotPasswordMutation.mutate(data);
  };

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
              <p className="text-gray-600 dark:text-gray-400">
                Prisijunkite prie savo paskyros arba sukurkite naują
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Prisijungimas</TabsTrigger>
                <TabsTrigger value="register">Registracija</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Prisijungimas</CardTitle>
                    <CardDescription>
                      Įveskite savo duomenis, kad prisijungtumėte
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>El. paštas</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="jonas@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slaptažodis</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Prisijungiama...
                            </>
                          ) : (
                            "Prisijungti"
                          )}
                        </Button>
                        
                        <div className="text-center mt-4">
                          <Button
                            type="button"
                            variant="link"
                            className="text-sm text-tennis-green-600 hover:text-tennis-green-700"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            Pamiršote slaptažodį?
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Registracija</CardTitle>
                    <CardDescription>
                      Sukurkite naują paskyrą rezervacijoms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vardas</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jonas" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pavardė</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jonaitis" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>El. paštas</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="jonas@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefono numeris *</FormLabel>
                              <FormControl>
                                <Input placeholder="+370 6XX XXXXX" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slaptažodis</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Registruojamasi...
                            </>
                          ) : (
                            "Registruotis"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md mx-auto shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowForgotPassword(false)}
                        className="h-8 w-8"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <CardTitle>Slaptažodžio atkūrimas</CardTitle>
                        <CardDescription className="mt-1">
                          Įveskite savo el. paštą, kuriuo registravotės
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...forgotPasswordForm}>
                      <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                        <FormField
                          control={forgotPasswordForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>El. paštas</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="jonas@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Kaip tai veikia:</strong> Išsiųsime jums el. laišką su nuoroda slaptažodžio atkūrimui. 
                            Nuoroda galioja 1 valandą.
                          </p>
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowForgotPassword(false)}
                            disabled={forgotPasswordMutation.isPending}
                            className="flex-1"
                          >
                            Atšaukti
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={forgotPasswordMutation.isPending}
                          >
                            {forgotPasswordMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Siunčiama...
                              </>
                            ) : (
                              "Siųsti instrukcijas"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
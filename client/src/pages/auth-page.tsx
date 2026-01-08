import { useState } from "react";
import { motion } from "framer-motion";
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
import { staggerContainer, staggerItem } from "@/lib/animations";

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
        title: "Užklausa sėkminga",
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
    <div className="min-h-screen bg-gradient-to-br from-tennis-green-700 via-tennis-green-600 to-tennis-green-700 relative overflow-hidden">
      {/* Animated background mesh */}
      <div className="fixed inset-0 glass-mesh-bg opacity-60 pointer-events-none" />

      {/* Floating decorative orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-20 right-20 w-64 h-64 rounded-full bg-tennis-yellow/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-20 left-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto w-full"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex items-center justify-center gap-3 mb-4"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 shadow-glass animate-glow-pulse">
                  <TennisBallIcon size={24} className="text-tennis-yellow" />
                </div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">PB teniso kortas</h1>
              </motion.div>
              <p className="text-white/80">
                Prisijunkite prie savo paskyros arba sukurkite naują
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 backdrop-blur-[8px] bg-white/10 border border-white/20 rounded-lg p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-glass-sm text-white/70 rounded-md transition-all"
                >
                  Prisijungimas
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-glass-sm text-white/70 rounded-md transition-all"
                >
                  Registracija
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card variant="glass" className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-white">Prisijungimas</CardTitle>
                    <CardDescription className="text-white/70">
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
                              <FormLabel className="text-white/90">El. paštas</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="jonas@example.com"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-300" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/90">Slaptažodis</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-300" />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          variant="glassGreen"
                          className="w-full font-semibold"
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
                            className="text-sm text-tennis-yellow hover:text-tennis-yellow/80"
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
                <Card variant="glass" className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-white">Registracija</CardTitle>
                    <CardDescription className="text-white/70">
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
                                <FormLabel className="text-white/90">Vardas</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Jonas"
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white/90">Pavardė</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Jonaitis"
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/90">El. paštas</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="jonas@example.com"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-300" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/90">Telefono numeris *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+370 6XX XXXXX"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-300" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/90">Slaptažodis</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-300" />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          variant="glassGreen"
                          className="w-full font-semibold"
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Card variant="glass" className="w-full max-w-md mx-auto shadow-glass-lg">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="glassDark"
                          size="icon"
                          onClick={() => setShowForgotPassword(false)}
                          className="h-8 w-8"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <CardTitle className="text-white">Slaptažodžio atkūrimas</CardTitle>
                          <CardDescription className="mt-1 text-white/70">
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
                                <FormLabel className="text-white/90">El. paštas</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="jonas@example.com"
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                              </FormItem>
                            )}
                          />

                          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3">
                            <p className="text-sm text-white/80">
                              <strong className="text-white">Kaip tai veikia:</strong> Išsiųsime jums el. laišką su nuoroda slaptažodžio atkūrimui.
                              Nuoroda galioja 1 valandą.
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button
                              type="button"
                              variant="glassDark"
                              onClick={() => setShowForgotPassword(false)}
                              disabled={forgotPasswordMutation.isPending}
                              className="flex-1"
                            >
                              Atšaukti
                            </Button>
                            <Button
                              type="submit"
                              variant="glassGreen"
                              className="flex-1"
                              disabled={forgotPasswordMutation.isPending}
                            >
                              {forgotPasswordMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Siunčiama...
                                </>
                              ) : (
                                "Siųsti"
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
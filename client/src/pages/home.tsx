import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Dumbbell, Trophy, Footprints, LogOut, List } from "lucide-react";
import { FormCheck } from "@/components/form-check";
import { HealthKitSettings } from "@/components/healthkit-settings";
import { EntryList } from "@/components/entry-list";
import { healthKitService } from "@/services/healthkit";
import { Capacitor } from "@capacitor/core";
import { apiRequest } from "@/lib/queryClient";

type PushupEntry = {
  id: number;
  count: number;
  date: string;
};

type WalkEntry = {
  id: number;
  miles: number;
  date: string;
};

// Helper to parse date without timezone shift
const parseLocalDate = (dateString: string): Date => {
  // Extract just the date portion (YYYY-MM-DD) and create local date
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
};

type PushupFormData = {
  count: number;
  date: string;
};

type WalkFormData = {
  miles: number;
  date: string;
};

type ViewType = 'daily' | 'weekly' | 'monthly';

export default function Home() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [view, setView] = useState<ViewType>('daily');
  const [walkView, setWalkView] = useState<ViewType>('daily');

  const { data: pushups = [], refetch } = useQuery<PushupEntry[]>({
    queryKey: ["/api/pushups"],
  });

  const { data: walks = [], refetch: refetchWalks } = useQuery<WalkEntry[]>({
    queryKey: ["/api/walks"],
  });

  const addEntry = useMutation({
    mutationFn: async (data: PushupFormData) => {
      const res = await apiRequest("POST", "/api/pushups", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      refetch();
      toast({ title: "Success!", description: "Pushup entry added" });

      // Reset form immediately
      form.reset({
        count: '' as unknown as number,
        date: format(new Date(), "yyyy-MM-dd"),
      });

      // Sync to HealthKit in background (don't await)
      if (Capacitor.getPlatform() === 'ios') {
        healthKitService.getAutoSyncEnabled().then(autoSyncEnabled => {
          if (autoSyncEnabled) {
            const entryDate = variables.date ? new Date(variables.date) : new Date();
            healthKitService.writePushupWorkout(variables.count, entryDate)
              .then(() => toast({ title: "Synced to Apple Health", description: `${variables.count} pushups logged` }))
              .catch(() => {}); // Silently fail
          }
        }).catch(() => {});
      }
    },
    onError: (error) => {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to add pushup entry",
        variant: "destructive"
      });
    }
  });

  const addWalkEntry = useMutation({
    mutationFn: async (data: WalkFormData) => {
      const res = await apiRequest("POST", "/api/walks", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      refetchWalks();
      toast({ title: "Success!", description: "Walk entry added" });

      // Reset form immediately
      walkForm.reset({
        miles: '' as unknown as number,
        date: format(new Date(), "yyyy-MM-dd"),
      });

      // Sync to HealthKit in background (don't await)
      if (Capacitor.getPlatform() === 'ios') {
        healthKitService.getAutoSyncEnabled().then(autoSyncEnabled => {
          if (autoSyncEnabled) {
            const entryDate = variables.date ? new Date(variables.date) : new Date();
            healthKitService.writeWalkingDistance(variables.miles, entryDate)
              .then(() => toast({ title: "Synced to Apple Health", description: `${variables.miles} miles logged` }))
              .catch(() => {}); // Silently fail
          }
        }).catch(() => {});
      }
    },
    onError: (error) => {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to add walk entry",
        variant: "destructive"
      });
    }
  });

  const form = useForm<PushupFormData>({
    defaultValues: {
      count: undefined as unknown as number,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const walkForm = useForm<WalkFormData>({
    defaultValues: {
      miles: undefined as unknown as number,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const [totalPushups, dailyPushupAverage] = useMemo(() => {
    if (!pushups?.length) return [0, 0];

    const total = pushups.reduce((acc, entry) => acc + entry.count, 0);
    const days = new Set(pushups.map((entry) => format(parseLocalDate(entry.date), "yyyy-MM-dd"))).size;
    return [total, Math.round(total / Math.max(days, 1))];
  }, [pushups]);

  const [totalMiles, dailyMilesAverage] = useMemo(() => {
    if (!walks?.length) return [0, 0];

    const total = walks.reduce((acc, entry) => acc + entry.miles, 0);
    const days = new Set(walks.map((entry) => format(parseLocalDate(entry.date), "yyyy-MM-dd"))).size;
    return [total.toFixed(1), (total / Math.max(days, 1)).toFixed(1)];
  }, [walks]);

  const chartData = useMemo(() => {
    const sortedPushups = [...pushups].sort((a, b) => 
      parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );

    if (view === 'daily') {
      return sortedPushups.reduce((acc, entry) => {
        const dateKey = format(parseLocalDate(entry.date), "MM/dd");
        const existingDay = acc.find(item => item.date === dateKey);

        if (existingDay) {
          existingDay.count += entry.count;
        } else {
          acc.push({
            date: dateKey,
            count: entry.count
          });
        }
        return acc;
      }, [] as Array<{date: string, count: number}>);
    }

    const aggregatedData = sortedPushups.reduce((acc, entry) => {
      const date = parseLocalDate(entry.date);
      let key: string;

      if (view === 'weekly') {
        const weekStart = startOfWeek(date);
        key = format(weekStart, "MM/dd");
      } else {
        const monthStart = startOfMonth(date);
        key = format(monthStart, "MMM yyyy");
      }

      if (!acc[key]) {
        acc[key] = { total: 0 };
      }
      acc[key].total += entry.count;
      return acc;
    }, {} as Record<string, { total: number }>);

    return Object.entries(aggregatedData).map(([date, data]) => ({
      date,
      count: data.total
    }));
  }, [pushups, view]);

  const walkChartData = useMemo(() => {
    const sortedWalks = [...walks].sort((a, b) => 
      parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );

    if (walkView === 'daily') {
      return sortedWalks.reduce((acc, entry) => {
        const dateKey = format(parseLocalDate(entry.date), "MM/dd");
        const existingDay = acc.find(item => item.date === dateKey);

        if (existingDay) {
          existingDay.miles += entry.miles;
        } else {
          acc.push({
            date: dateKey,
            miles: entry.miles
          });
        }
        return acc;
      }, [] as Array<{date: string, miles: number}>);
    }

    const aggregatedData = sortedWalks.reduce((acc, entry) => {
      const date = parseLocalDate(entry.date);
      let key: string;

      if (walkView === 'weekly') {
        const weekStart = startOfWeek(date);
        key = format(weekStart, "MM/dd");
      } else {
        const monthStart = startOfMonth(date);
        key = format(monthStart, "MMM yyyy");
      }

      if (!acc[key]) {
        acc[key] = { total: 0 };
      }
      acc[key].total += entry.miles;
      return acc;
    }, {} as Record<string, { total: number }>);

    return Object.entries(aggregatedData).map(([date, data]) => ({
      date,
      miles: data.total
    }));
  }, [walks, walkView]);

  return (
    <div className="fixed inset-0 bg-gray-50/50 overflow-y-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="relative h-[50vh] sm:h-[50vh] w-full mb-12 overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]"></div>
        <div className="absolute right-0 top-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-l-full -skew-x-12 translate-x-20"></div>
        </div>
        <div className="absolute top-4 right-4 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {user?.username || "Logout"}
          </Button>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 w-full max-w-4xl px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <img 
            src="/images/bitmoji.jpeg" 
            alt="Bitmoji Hero"
            className="h-32 sm:h-40 w-auto object-contain rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300"
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white text-center leading-tight">
            Bole Fitness Tracker
          </h1>
          <p className="text-lg sm:text-xl text-white/90 font-medium tracking-wide max-w-2xl text-center">
            Transform your body, transform your life
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        <header className="text-center space-y-3 mb-10">
          <div className="h-8">
            {(() => {
              const phrases = [
                "Push harder than yesterday",
                "Every rep counts",
                "Transform your body, transform your life",
                "Strong mind, stronger body",
                "Progress is progress, no matter how small"
              ];
              const [index, setIndex] = useState(0);

              useEffect(() => {
                const timer = setInterval(() => {
                  setIndex(i => (i + 1) % phrases.length);
                }, 3000);
                return () => clearInterval(timer);
              }, []);

              return (
                <p
                  key={index}
                  className="text-muted-foreground text-sm sm:text-base animate-fade-in-out"
                >
                  {phrases[index]}
                </p>
              );
            })()}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <Card className="md:min-h-[350px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Dumbbell className="h-5 w-5" />
                Log Pushups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  onSubmit={form.handleSubmit(async (data) => {
    const count = parseInt(data.count.toString(), 10);
    if (!isNaN(count) && count > 0) {
      const submission = {
        count,
        date: data.date || format(new Date(), "yyyy-MM-dd")
      };
      try {
        await addEntry.mutateAsync(submission);
        await refetch();
        toast({ title: "Success!", description: `Added ${count} pushups` });
        form.reset({
          count: undefined as unknown as number,
          date: format(new Date(), "yyyy-MM-dd")
        });
      } catch (error) {
        console.error("Submission error:", error);
        toast({
          title: "Error",
          description: "Failed to add pushups",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Invalid input",
        description: "Please enter a number greater than 0",
        variant: "destructive"
      });
    }
  })} 
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Number of Pushups</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            className="text-lg h-12" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            className="text-lg h-12" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold"
                    disabled={addEntry.isPending}
                  >
                    {addEntry.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="md:min-h-[350px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-5 w-5" />
                Pushup Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{totalPushups}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Total Pushups</div>
                </div>
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{dailyPushupAverage}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Daily Average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:min-h-[350px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Footprints className="h-5 w-5" />
                Log Walk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...walkForm}>
                <form 
                  onSubmit={walkForm.handleSubmit(async (data) => {
                    const miles = parseFloat(data.miles.toString());
                    if (!isNaN(miles) && miles > 0) {
                      try {
                        await addWalkEntry.mutateAsync({
                          miles,
                          date: data.date || format(new Date(), "yyyy-MM-dd")
                        });
                        walkForm.reset({
                          miles: undefined as unknown as number,
                          date: format(new Date(), "yyyy-MM-dd")
                        });
                      } catch (error) {
                        console.error("Submission error:", error);
                      }
                    } else {
                      toast({ 
                        title: "Invalid input", 
                        description: "Please enter a number greater than 0",
                        variant: "destructive"
                      });
                    }
                  })} 
                  className="space-y-6"
                >
                  <FormField
                    control={walkForm.control}
                    name="miles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Miles Walked</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            className="text-lg h-12" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walkForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            className="text-lg h-12" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold"
                    disabled={addWalkEntry.isPending}
                  >
                    {addWalkEntry.isPending ? "Adding..." : "Add Walk"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="md:min-h-[350px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-5 w-5" />
                Walk Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center p-6 bg-green-500/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{totalMiles}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Total Miles</div>
                </div>
                <div className="text-center p-6 bg-green-500/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{dailyMilesAverage}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Daily Average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <FormCheck />
          </div>

          {/* HealthKit Settings - only shows on iOS */}
          <div className="md:col-span-2">
            <HealthKitSettings />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6 lg:mt-8">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Dumbbell className="h-5 w-5" />
                Pushup Progress
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={view === 'daily' ? 'default' : 'outline'}
                  onClick={() => setView('daily')}
                  size="sm"
                  className="text-sm"
                >
                  Daily
                </Button>
                <Button
                  variant={view === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setView('weekly')}
                  size="sm"
                  className="text-sm"
                >
                  Weekly
                </Button>
                <Button
                  variant={view === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setView('monthly')}
                  size="sm"
                  className="text-sm"
                >
                  Monthly
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Footprints className="h-5 w-5" />
                Walk Progress
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={walkView === 'daily' ? 'default' : 'outline'}
                  onClick={() => setWalkView('daily')}
                  size="sm"
                  className="text-sm"
                >
                  Daily
                </Button>
                <Button
                  variant={walkView === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setWalkView('weekly')}
                  size="sm"
                  className="text-sm"
                >
                  Weekly
                </Button>
                <Button
                  variant={walkView === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setWalkView('monthly')}
                  size="sm"
                  className="text-sm"
                >
                  Monthly
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={walkChartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="miles" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: "#22c55e" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entry History */}
        <div className="grid gap-6 md:grid-cols-2 mt-6 lg:mt-8">
          <EntryList
            title="Pushup History"
            icon={<List className="h-5 w-5" />}
            entries={pushups}
            type="pushups"
            onDelete={() => refetch()}
          />
          <EntryList
            title="Walk History"
            icon={<List className="h-5 w-5" />}
            entries={walks}
            type="walks"
            onDelete={() => refetchWalks()}
          />
        </div>
      </div>
    </div>
  );
}
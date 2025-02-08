import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, startOfMonth, parse, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Trophy } from "lucide-react";
import { FormCheck } from "@/components/form-check";

type PushupEntry = {
  id: number;
  count: number;
  date: string;
};

type FormData = {
  count: number;
  date: string;
};

type ViewType = 'daily' | 'weekly' | 'monthly';

export default function Home() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewType>('daily');

  const { data: pushups = [], refetch } = useQuery<PushupEntry[]>({
    queryKey: ["pushups"],
    queryFn: async () => {
      const response = await fetch("/api/pushups");
      if (!response.ok) {
        throw new Error("Failed to fetch pushups");
      }
      const data = await response.json();
      console.log("Fetched pushups:", data);
      return data;
    }
  });

  const addEntry = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Sending data:", data);
      const res = await fetch("/api/pushups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add entry");
      const result = await res.json();
      console.log("Response:", result);
      return result;
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Success!", description: "Pushup entry added" });
      form.reset({ 
        count: 0,
        date: format(new Date(), "yyyy-MM-dd")
      });
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

  const form = useForm<FormData>({
    defaultValues: {
      count: 0,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const [totalPushups, dailyAverage] = useMemo(() => {
    if (!pushups?.length) return [0, 0];

    const total = pushups.reduce((acc, entry) => acc + entry.count, 0);
    const days = new Set(pushups.map((entry) => format(new Date(entry.date), "yyyy-MM-dd"))).size;
    return [total, Math.round(total / Math.max(days, 1))];
  }, [pushups]);

  const chartData = useMemo(() => {
    const sortedPushups = [...pushups].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (view === 'daily') {
      return sortedPushups.reduce((acc, entry) => {
        const dateKey = format(new Date(entry.date), "MM/dd");
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
      const date = new Date(entry.date);
      let key: string;

      if (view === 'weekly') {
        const weekStart = startOfWeek(date);
        key = format(weekStart, "MM/dd");
      } else {
        const monthStart = startOfMonth(date);
        key = format(monthStart, "MMM yyyy");
      }

      if (!acc[key]) {
        acc[key] = { total: 0, count: 0 };
      }
      acc[key].total += entry.count;
      acc[key].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(aggregatedData).map(([date, data]) => ({
      date,
      count: Math.round(data.total / data.count), // Average per period
    }));
  }, [pushups, view]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="relative h-48 sm:h-64 w-full mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30"></div>
        <img 
          src="/images/bitmoji.jpeg" 
          alt="Bitmoji Hero"
          className="absolute inset-0 w-full h-full object-contain z-10"
          style={{ objectPosition: 'center' }}
        />
      </div>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        <header className="text-center space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Bole Pushup Tracker
          </h1>
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
      console.log("Submitting pushup entry:", { count, date: data.date });
      const submission = {
        count,
        date: data.date || format(new Date(), "yyyy-MM-dd")
      };
      console.log("Submitting:", submission);
      try {
        const result = await addEntry.mutateAsync(submission);
        console.log("Server response:", result);
        await refetch();
        toast({ title: "Success!", description: `Added ${count} pushups` });
      } catch (error) {
        console.error("Submission error:", error);
        toast({ 
          title: "Error",
          description: "Failed to add pushups",
          variant: "destructive"
        });
      }
      form.reset({
        count: 0,
        date: format(new Date(), "yyyy-MM-dd")
      });
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
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{totalPushups}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Total Pushups</div>
                </div>
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{dailyAverage}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-2">Daily Average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <FormCheck />
          </div>
        </div>

        <Card className="mt-6 lg:mt-8">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg sm:text-xl">Progress Chart</CardTitle>
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
            <div className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
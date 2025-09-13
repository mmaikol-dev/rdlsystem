"use client";

import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head } from "@inertiajs/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, DownloadIcon } from "lucide-react";

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Generate Report", href: "/report" },
];

interface OrdersFilterCardProps {
  merchants: string[];
}

export default function OrdersFilterCard({ merchants }: OrdersFilterCardProps) {
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
      });
      
  const [merchant, setMerchant] = useState<string | null>(null);
  const [status, setStatus] = useState<string[]>([]);

  const statuses = [
    "Pending",
    "Delivered",
    "Cancelled",
    "Rescheduled",
    "Scheduled",
    "Dispatched",
    "Followup",
    "Returned",
  ];

  const toggleStatus = (s: string) => {
    setStatus((prev) =>
      prev.includes(s) ? prev.filter((st) => st !== s) : [...prev, s]
    );
  };

  const generateReport = () => {
    const params = new URLSearchParams();
  
    if (merchant) params.append("merchant", merchant);
    if (status.length) status.forEach((s) => params.append("statuses[]", s));
    if (dateRange.from) params.append("from", dateRange.from.toISOString());
    if (dateRange.to) params.append("to", dateRange.to.toISOString());
  
    // Create download link
    const link = document.createElement("a");
    link.href = `/report/download?${params.toString()}`;
    link.setAttribute("download", "orders_report.xlsx"); // hint for filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Orders Filter" />

      <div className="p-6">
        <Card className="w-full shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Delivery Date Range */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Delivery Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Select a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                        setDateRange({
                          from: range?.from || null,
                          to: range?.to || null,
                        });
                      }}
                      numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Merchant Dropdown */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Merchant</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {merchant || "Select Merchant"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {merchants.map((m) => (
                          <CommandItem
                            key={m}
                            onSelect={() => setMerchant(m)}
                          >
                            {m}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status Multi-select */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <Button
                    key={s}
                    variant={status.includes(s) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatus(s)}
                    className="flex items-center gap-1"
                  >
                    {status.includes(s) && <Check className="h-4 w-4" />}
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDateRange({});
                  setMerchant(null);
                  setStatus([]);
                }}
              >
                Clear
              </Button>
              <Button onClick={generateReport}>
                Generate <DownloadIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

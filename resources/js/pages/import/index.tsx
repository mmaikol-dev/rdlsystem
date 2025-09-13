"use client";

import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, usePage, router } from "@inertiajs/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandInput } from "@/components/ui/command";
import { UploadIcon, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Import Orders", href: "/orders/import" },
];

interface Sheet {
  id: number;
  sheet_id: string;
  sheet_name: string;
  store_name: string;
  country: string;
}

export default function ImportOrdersCard() {
  // ✅ Get sheets from Laravel
  const { props } = usePage<{ sheets: Sheet[] }>();
  const sheets = props.sheets || [];

  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [sheetName, setSheetName] = useState(""); // user enters manually
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const clearForm = () => {
    setSelectedSheet(null);
    setSheetName("");
    setFile(null);
  };

  const handleImport = () => {
    if (!file) {
      alert("Please upload a CSV/Excel file.");
      return;
    }
    if (!selectedSheet) {
      alert("Please select a sheet (merchant).");
      return;
    }
    if (!sheetName.trim()) {
      alert("Please enter a Sheet Name.");
      return;
    }

    const formData = new FormData();
    formData.append("country", selectedSheet.country);
    formData.append("merchant", selectedSheet.sheet_name);
    formData.append("sheet_id", selectedSheet.sheet_id);
    formData.append("sheet_name", sheetName); // ✅ user input, not auto-filled
    formData.append("store_name", selectedSheet.store_name);
    formData.append("file", file);

    router.post("/orders/import", formData, {
      onSuccess: () => {
        alert("✅ Import completed successfully!");
        clearForm();
      },
      onError: (errors) => {
        console.error(errors);
        alert("❌ Error importing orders");
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Import Orders" />

      <div className="p-6">
        <Card className="w-full shadow-lg rounded-2xl max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Import Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Merchant Dropdown (Sheets) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Merchant</label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedSheet ? selectedSheet.sheet_name : "Select Merchant"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[250px]">
                  <Command>
                    <CommandInput placeholder="Search merchant..." />
                    <CommandList>
                      <CommandGroup>
                        {sheets.length > 0 ? (
                          sheets.map((sheet) => (
                            <CommandItem
                              key={sheet.id}
                              value={sheet.sheet_name}
                              onSelect={() => {
                                setSelectedSheet(sheet);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSheet?.id === sheet.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {sheet.sheet_name}
                            </CommandItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No merchants found
                          </div>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Country (auto-fill) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input
                value={selectedSheet?.country || ""}
                readOnly
                placeholder="Auto-filled from selection"
              />
            </div>

            {/* Sheet ID (auto-fill) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Sheet ID</label>
              <Input
                value={selectedSheet?.sheet_id || ""}
                readOnly
                placeholder="Auto-filled from selection"
              />
            </div>

            {/* Sheet Name (manual input) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Sheet Name</label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Enter sheet name manually"
              />
            </div>

            {/* Store Name (auto-fill) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Store Name</label>
              <Textarea
                value={selectedSheet?.store_name || ""}
                readOnly
                placeholder="Auto-filled from selection"
              />
            </div>

            {/* File Upload */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Upload File (CSV/Excel)</label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={clearForm}>
                Clear
              </Button>
              <Button onClick={handleImport}>
                Import <UploadIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

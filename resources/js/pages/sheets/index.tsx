"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Edit, Trash2, Plus, EyeIcon, X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import * as React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Sheets', href: '/sheets' },
];

interface Sheet {
  id: number;
  sheet_id: string;
  sheet_name: string;
  shopify_name: string;
  access_token: string;
  country: string;
  cc_agents: string;
  sku: string;
}

interface SheetDataDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
}

function SheetDataDrawer({ open, onOpenChange, sheetId }: SheetDataDrawerProps) {
  const [sheetData, setSheetData] = React.useState<string[][]>([]);
  const [availableSheets, setAvailableSheets] = React.useState<string[]>([]);
  const [activeSheet, setActiveSheet] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const fetchData = (sheetName?: string) => {
    setLoading(true);
    const url = sheetName
      ? `/sheets/${sheetId}/view?sheetName=${encodeURIComponent(sheetName)}`
      : `/sheets/${sheetId}/view`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSheetData(data.sheetData || []);
        setAvailableSheets(data.availableSheets || []);
        setActiveSheet(sheetName || data.availableSheets?.[0] || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open, sheetId]);

  const handlePrev = () => {
    if (!availableSheets.length) return;
    const idx = availableSheets.indexOf(activeSheet);
    if (idx > 0) {
      fetchData(availableSheets[idx - 1]);
    }
  };

  const handleNext = () => {
    if (!availableSheets.length) return;
    const idx = availableSheets.indexOf(activeSheet);
    if (idx < availableSheets.length - 1) {
      fetchData(availableSheets[idx + 1]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`
          w-full sm:max-w-full 
          ${isFullScreen ? 'h-screen' : 'h-[95vh]'}
          flex flex-col p-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <div>
              <SheetTitle className="text-lg">Sheet Data</SheetTitle>
              <SheetDescription className="text-sm">
                Navigating: {activeSheet || 'Loading...'}
              </SheetDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="h-8"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={availableSheets.indexOf(activeSheet) <= 0}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <Select
                value={activeSheet}
                onValueChange={(value) => fetchData(value)}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={availableSheets.indexOf(activeSheet) >= availableSheets.length - 1}
                className="h-8"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {availableSheets.length > 0 && (
                <>
                  Sheet {availableSheets.indexOf(activeSheet) + 1} of {availableSheets.length}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table Content - Flex container to fill remaining space */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading sheet data...</p>
              </div>
            </div>
          ) : sheetData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">No data found in this sheet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-2">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {sheetData[0].map((header, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border"
                        >
                          <div className="truncate max-w-[200px]" title={header}>
                            {header}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sheetData.slice(1).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 text-sm border"
                          >
                            <div className="truncate max-w-[200px]" title={cell}>
                              {cell}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  Showing {sheetData.length - 1} rows • {sheetData[0]?.length || 0} columns
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SheetsView() {
  const { sheets } = usePage<{ sheets: Sheet[] }>().props;

  const [filter, setFilter] = React.useState('');
  const [editingSheet, setEditingSheet] = React.useState<Sheet | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<Sheet>>({});
  const [deletingSheet, setDeletingSheet] = React.useState<Sheet | null>(null);
  const [creatingSheet, setCreatingSheet] = React.useState(false);
  const [createValues, setCreateValues] = React.useState<Partial<Sheet>>({});
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false);
  const [viewSheetId, setViewSheetId] = React.useState<string | null>(null);

  const filteredSheets = React.useMemo(() => {
    if (!sheets) return [];
    return sheets.filter((sheet) =>
      (sheet.sheet_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (sheet.shopify_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (sheet.country?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [sheets, filter]);

  const handleEditOpen = (sheet: Sheet) => {
    setEditingSheet(sheet);
    setEditValues(sheet);
  };

  const handleEditSave = () => {
    if (!editingSheet) return;
    router.put(`/sheets/${editingSheet.id}`, editValues, {
      onSuccess: () => setEditingSheet(null),
    });
  };

  const handleDelete = () => {
    if (!deletingSheet) return;
    router.delete(`/sheets/${deletingSheet.id}`, {
      onSuccess: () => setDeletingSheet(null),
    });
  };

  const handleCreateSave = () => {
    router.post(`/sheets`, createValues, {
      onSuccess: () => {
        setCreatingSheet(false);
        setCreateValues({});
      },
    });
  };

  const openSheetView = (sheetId: string) => {
    setViewSheetId(sheetId);
    setViewDrawerOpen(true);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Sheets" />

      <div className="flex flex-col gap-4 p-4">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-4">
          <Input
            placeholder="Filter sheets by name, Shopify, or country"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
          />
          {!["operations", "finance", "callcenter1", ""].includes(usePage().props.auth.user.roles) && (
            <Button
              size="sm"
              onClick={() => setCreatingSheet(true)}
              className="flex items-center gap-1"
            >
              <Plus size={16} /> Create New Sheet
            </Button>
          )}
        </div>

        {/* Sheets Grid */}
        {filteredSheets.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No sheets available.
          </div>
        ) : (
          <div className="grid gap-4 auto-rows-min grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {filteredSheets.map((sheet) => (
              <Card
                key={sheet.id}
                className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-2"
              >
                <CardHeader>
                  <CardDescription className="text-xs text-muted-foreground truncate" title={sheet.sheet_id}>
                    Sheet ID: {sheet.sheet_id}
                  </CardDescription>
                  <CardTitle className="truncate text-sm" title={sheet.sheet_name}>
                    {sheet.sheet_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground truncate" title={sheet.shopify_name}>
                    Shopify: {sheet.shopify_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-xs overflow-hidden">
                  {[
                    { label: 'Country', value: sheet.country },
                    { label: 'CC Agents', value: sheet.cc_agents },
                    { label: 'SKU', value: sheet.sku },
                    { label: 'Access Token', value: sheet.access_token, isTruncate: true }
                  ].map((item, index) => (
                    <div key={`${sheet.id}-info-${index}`} className="truncate">
                      <strong>{item.label}:</strong>{' '}
                      {item.isTruncate ? (
                        <span className="truncate" title={item.value}>{item.value}</span>
                      ) : (
                        item.value || '-'
                      )}
                    </div>
                  ))}
                </CardContent>
                <div className="flex gap-2 justify-end p-2 flex-wrap">
                  {!["operations", "finance", "callcenter1", ""].includes(usePage().props.auth.user.roles) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEditOpen(sheet)}>
                        <Edit size={16} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingSheet(sheet)}>
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSheetView(sheet.sheet_id)}
                    className="flex items-center gap-1"
                  >
                    <EyeIcon size={16} />
                    View Data
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Sheet Modal */}
      <Dialog open={creatingSheet} onOpenChange={(open) => !open && setCreatingSheet(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Sheet</DialogTitle>
            <DialogDescription>Fill in the details for the new sheet below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {['sheet_id', 'sheet_name', 'shopify_name', 'country', 'sku', 'access_token'].map((field) => (
              <Input
                key={field}
                value={(createValues as any)[field] || ''}
                onChange={(e) => setCreateValues({ ...createValues, [field]: e.target.value })}
                placeholder={field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            ))}
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={6}
              placeholder={`{\n  "Sheet3": ["agent1","agent2"],\n  "Sheet4": ["agent1","agent6"]\n}`}
              value={createValues.cc_agents || ''}
              onChange={(e) => setCreateValues({ ...createValues, cc_agents: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreatingSheet(false)}>Cancel</Button>
            <Button onClick={handleCreateSave}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingSheet} onOpenChange={(open) => !open && setEditingSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sheet</DialogTitle>
            <DialogDescription>Update the sheet information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {['sheet_id', 'sheet_name', 'shopify_name', 'country', 'sku', 'access_token'].map((field) => (
              <Input
                key={field}
                value={(editValues as any)[field] || ''}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                placeholder={field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            ))}
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={6}
              placeholder={`{\n  "Sheet3": ["agent1","agent2"],\n  "Sheet4": ["agent1","agent6"]\n}`}
              value={editValues.cc_agents || '{\n  "sheetname": ["agent","agent"]\n}'}
              onChange={(e) => setEditValues({ ...editValues, cc_agents: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingSheet(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingSheet} onOpenChange={(open) => !open && setDeletingSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingSheet?.sheet_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingSheet(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sheet Data Drawer */}
      {viewSheetId && (
        <SheetDataDrawer
          open={viewDrawerOpen}
          onOpenChange={setViewDrawerOpen}
          sheetId={viewSheetId}
        />
      )}
    </AppLayout>
  );
}
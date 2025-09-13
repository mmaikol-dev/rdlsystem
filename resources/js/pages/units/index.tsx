"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import { Trash, Edit, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { toast } from "sonner";

interface Unit {
  id: number;
  name: string;
  slug: string;
  short_code: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  units: Unit[];
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Units", href: "/units" },
];

export default function Units({ units }: Props) {
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newUnit, setNewUnit] = useState({ name: "", short_code: "" });
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);

  const { flash } = usePage().props as { flash?: { success?: string } };

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
  }, [flash]);

  const handleCreate = () => {
    router.post("/units", newUnit, {
      preserveScroll: true,
      onSuccess: () => {
        setShowCreate(false);
        setNewUnit({ name: "", short_code: "" });
        toast.success("Unit created successfully");
      },
    });
  };

  const handleUpdate = () => {
    if (!editUnit) return;
    router.put(
      `/units/${editUnit.id}`,
      { name: editUnit.name, short_code: editUnit.short_code },
      {
        preserveScroll: true,
        onSuccess: () => {
          setShowEdit(false);
          setEditUnit(null);
          toast.success("Unit updated successfully");
        },
        onError: (errors) => {
          toast.error("Update failed: " + Object.values(errors).join(", "));
        },
      }
    );
  };

  const handleDelete = () => {
    if (deleteUnitId === null) return;
    router.delete(`/units/${deleteUnitId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setDeleteUnitId(null);
        toast.success("Unit deleted successfully");
      },
      onError: (errors) => {
        toast.error("Delete failed: " + Object.values(errors).join(", "));
      },
    });
  };

  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Units" />

      <div className="flex flex-col gap-2 p-4">
        {/* Filter & Create Button */}
        <div  className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-4">
          <Input
            placeholder="Filter units..."
            
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
                        {!["operations","finance", "callcenter1",""].includes(usePage().props.auth.user.roles) && (
    <>
          <Button onClick={() => setShowCreate(true)} variant="default">
            <Plus className="mr-2 h-4 w-4" /> Create Unit
          </Button>
          </>)}
        </div>

        {/* Units as Cards */}
        {filteredUnits.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No units found.
          </div>
        ) : (
          <div className="grid gap-4 auto-rows-min grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredUnits.map((unit) => (
              <Card
                key={unit.id}
                className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-2"
              >
                <CardHeader>
                  <CardTitle className="truncate text-sm" title={unit.name}>
                    {unit.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Code: {unit.short_code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-xs">
                  <div>
                    <strong>Slug:</strong> {unit.slug}
                  </div>
                  <div>
                    <strong>Created:</strong>{" "}
                    {new Date(unit.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
                <div className="flex gap-2 justify-end p-2 flex-wrap">
                {!["operations","finance", "callcenter1",""].includes(usePage().props.auth.user.roles) && (
    <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditUnit(unit);
                      setShowEdit(true);
                    }}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteUnitId(unit.id);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash size={16} />
                  </Button>
                  </>
  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Unit</DialogTitle>
            <DialogDescription>
              Enter the unit name and short code to create a new unit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Input
              placeholder="Unit Name"
              value={newUnit.name}
              onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
            />
            <Input
              placeholder="Short Code"
              value={newUnit.short_code}
              onChange={(e) =>
                setNewUnit({ ...newUnit, short_code: e.target.value })
              }
            />
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update the unit name and short code.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Input
              placeholder="Unit Name"
              value={editUnit?.name || ""}
              onChange={(e) =>
                setEditUnit(
                  editUnit ? { ...editUnit, name: e.target.value } : null
                )
              }
            />
            <Input
              placeholder="Short Code"
              value={editUnit?.short_code || ""}
              onChange={(e) =>
                setEditUnit(
                  editUnit ? { ...editUnit, short_code: e.target.value } : null
                )
              }
            />
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this unit?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

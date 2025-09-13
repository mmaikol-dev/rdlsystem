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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

interface Category {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Categories", href: "/categories" },
];

export default function Categories({ categories }: Props) {
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newCategory, setNewCategory] = useState({ name: "" });
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const { flash } = usePage().props as { flash?: { success?: string } };

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
  }, [flash]);

  const handleCreate = () => {
    router.post("/categories", newCategory, {
      preserveScroll: true,
      onSuccess: () => {
        setShowCreate(false);
        setNewCategory({ name: "" });
        toast.success("Category created successfully");
      },
    });
  };

  const handleUpdate = () => {
    if (!editCategory) return;

    router.put(`/categories/${editCategory.id}`, { name: editCategory.name }, {
      preserveScroll: true,
      onSuccess: () => {
        setShowEdit(false);
        setEditCategory(null);
        toast.success("Category updated successfully");
      },
    });
  };

  const handleDelete = () => {
    if (deleteCategoryId === null) return;

    router.delete(`/categories/${deleteCategoryId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setDeleteCategoryId(null);
        toast.success("Category deleted successfully");
      },
    });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Categories" />

      <div className="flex flex-col gap-4 p-4">
        {/* Filter & Create */}
        <div className="flex justify-between items-center gap-2">
          <Input
            placeholder="Filter categories..."
            className="w-1/3"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button onClick={() => setShowCreate(true)} variant="default">
            <Plus className="mr-2 h-4 w-4" /> Create Category
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.created_at}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditCategory(cat);
                          setShowEdit(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteCategoryId(cat.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Enter the category name to create a new category.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Input
              placeholder="Category Name"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
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
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Input
              placeholder="Category Name"
              value={editCategory?.name || ""}
              onChange={(e) =>
                setEditCategory(
                  editCategory ? { ...editCategory, name: e.target.value } : null
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
              Are you sure you want to delete this category?
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

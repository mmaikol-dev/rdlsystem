"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { PlusCircleIcon, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CategoriesIndex() {
    const { categories } = usePage().props as any;

    const [openCategoryModal, setOpenCategoryModal] = useState(false);
    const [drawerDirection, setDrawerDirection] = useState<"right" | "bottom">("bottom");
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_active: true,
    });

    useEffect(() => {
        const handleResize = () => {
            setDrawerDirection(window.innerWidth >= 768 ? "right" : "bottom");
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const openCreateModal = () => {
        setIsEditing(false);
        setSelectedCategory(null);
        setFormData({ name: "", description: "", is_active: true });
        setOpenCategoryModal(true);
    };

    const openEditModal = (category: any) => {
        setIsEditing(true);
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            description: category.description || "",
            is_active: category.is_active,
        });
        setOpenCategoryModal(true);
    };

    const handleSubmit = () => {
        if (isEditing && selectedCategory) {
            router.put(`/reqcategories/${selectedCategory.id}`, formData);
        } else {
            router.post("/reqcategories", formData);
        }
        setOpenCategoryModal(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({ name: "", description: "", is_active: true });
        setIsEditing(false);
        setSelectedCategory(null);
    };

    const confirmDelete = (category: any) => {
        setCategoryToDelete(category);
        setDeleteDialogOpen(true);
    };

    const handleDelete = () => {
        if (categoryToDelete) {
            router.delete(`/requisition-categories/${categoryToDelete.id}`);
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
        }
    };

    const breadcrumbs = [
        { title: "Requisition Categories", href: "/requisition-categories" },
        { title: "Manage", href: "#" },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Requisition Categories" />

            <div className="flex items-center justify-between gap-2 p-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-800">Requisition Categories</h1>

                <Button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 text-white"
                >
                    <PlusCircleIcon className="w-4 h-4" />
                    New Category
                </Button>
            </div>

            {/* Table Section */}
            <div className="p-4 sm:p-6 overflow-x-auto">
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Requisitions Count</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories?.length > 0 ? (
                                    categories.map((category: any, index: number) => (
                                        <TableRow key={category.id} className="hover:bg-gray-50">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {category.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {category.requisitions_count || 0} requisitions
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={category.is_active ? "default" : "secondary"}>
                                                    {category.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {new Date(category.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditModal(category)}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => confirmDelete(category)}
                                                        className="flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                                            No categories found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create/Edit Category Drawer */}
            <Drawer open={openCategoryModal} onOpenChange={setOpenCategoryModal} direction={drawerDirection}>
                <DrawerContent
                    className={`
            md:max-w-[600px] w-full h-[90vh] md:h-screen
            md:right-0 md:left-auto md:rounded-l-2xl
            flex flex-col overflow-hidden bg-white
          `}
                >
                    <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
                        <DrawerTitle className="text-xl font-bold text-gray-800">
                            {isEditing ? 'Edit Category' : 'Create New Category'}
                        </DrawerTitle>
                        <DrawerDescription className="text-sm text-muted-foreground">
                            {isEditing ? 'Update the category information below.' : 'Fill in the details to create a new category.'}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
                        <Card className="shadow-sm">
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Category Name *</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter category name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Enter category description"
                                        rows={4}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                        Active Category
                                    </label>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DrawerFooter className="border-t bg-white sticky bottom-0 z-10 flex justify-end gap-2 py-4 px-4 sm:px-6">
                        <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
                        <Button onClick={handleSubmit} className="text-white">
                            {isEditing ? 'Update Category' : 'Create Category'}
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the category "{categoryToDelete?.name}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
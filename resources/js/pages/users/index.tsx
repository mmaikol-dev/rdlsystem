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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import * as React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Users', href: '/users' },
];

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  email_verified_at?: string | null;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  roles?: string;
  photo?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { users } = usePage<{ users: User[] }>().props;

  const [filter, setFilter] = React.useState('');
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [creatingUser, setCreatingUser] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
  const [formValues, setFormValues] = React.useState<Partial<User> & { password?: string; password_confirmation?: string }>({});

  // Filter users
  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter((u) =>
      (u.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (u.username?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [users, filter]);

  // Create user
  const handleCreate = () => {
    const payload: any = { ...formValues };

    // convert email_verified_at format
    if (payload.email_verified_at) {
      payload.email_verified_at = payload.email_verified_at.replace('T', ' ') + ':00';
    }

    // Default password if empty
    if (!payload.password) {
      payload.password = 'password123';
      payload.password_confirmation = 'password123';
    }

    router.post('/users', payload, {
      preserveState: true,
      onSuccess: () => {
        setCreatingUser(false);
        setFormValues({});
        router.reload({ only: ['users'] });
      },
      onError: (errors) => console.log(errors),
    });
  };

  // Edit user
  const handleEditSave = () => {
    if (!editingUser) return;

    const payload: any = { ...formValues };

    if (payload.email_verified_at) {
      payload.email_verified_at = payload.email_verified_at.replace('T', ' ') + ':00';
    }

    // Only send password if filled
    if (!payload.password) {
      delete payload.password;
      delete payload.password_confirmation;
    }

    router.put(`/users/${editingUser.id}`, payload, {
      preserveState: true,
      onSuccess: () => {
        setEditingUser(null);
        setFormValues({});
        router.reload({ only: ['users'] });
      },
      onError: (errors) => console.log(errors),
    });
  };

  // Delete user
  const handleDelete = () => {
    if (!deletingUser) return;
  
    router.post(`/users/${deletingUser.id}`, { _method: 'DELETE' }, {
      preserveState: true,
      onSuccess: () => {
        setDeletingUser(null);
        router.reload({ only: ['users'] });
      },
      onError: (errors) => console.log(errors),
    });
  };

  
  

  const fields: { name: string; label: string; type?: string }[] = [
    { name: 'username', label: 'Username' },
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'email_verified_at', label: 'Email Verified At', type: 'datetime-local' },
    { name: 'password', label: 'Password', type: 'password' },
    { name: 'password_confirmation', label: 'Confirm Password', type: 'password' },
    { name: 'store_name', label: 'Store Name' },
    { name: 'store_address', label: 'Store Address' },
    { name: 'store_phone', label: 'Store Phone' },
    { name: 'store_email', label: 'Store Email', type: 'email' },
    { name: 'roles', label: 'Roles' },
    { name: 'photo', label: 'Photo URL' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Users" />

      <div className="flex flex-col gap-4 p-4">
        {/* Filter & Create */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <Input
            placeholder="Filter users..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
          />
                        {!["operations","finance", "callcenter1",""].includes(usePage().props.auth.user.roles) && (
    <>
          <Button
            variant="default"
            className="flex items-center gap-2"
            onClick={() => {
              setCreatingUser(true);
              setFormValues({});
            }}
          >
            <Plus size={16} /> Create User
          </Button>
          </>)}
        </div>

        {/* User Cards */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="grid gap-4 auto-rows-min grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-2">
                <CardHeader>
                  <CardTitle className="truncate text-sm">{user.name} ({user.username})</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground truncate">{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-xs overflow-hidden">
                  {[
                    { label: 'Email Verified At', value: user.email_verified_at },
                    { label: 'Store Name', value: user.store_name },
                    { label: 'Store Address', value: user.store_address },
                    { label: 'Store Phone', value: user.store_phone },
                    { label: 'Store Email', value: user.store_email },
                    { label: 'Roles', value: user.roles },
                    { label: 'Photo', value: user.photo },
                    { label: 'Created At', value: user.created_at },
                  ].map((item, index) => (
                    <div key={`${user.id}-info-${index}`} className="truncate">
                      <strong>{item.label}:</strong> {item.value || '-'}
                    </div>
                  ))}
                </CardContent>
                <div className="flex gap-2 justify-end p-2 flex-wrap">
  {!["operations","finance", "callcenter1"].includes(usePage().props.auth.user.roles) && (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setEditingUser(user); setFormValues(user); }}
      >
        <Edit size={16} />
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setDeletingUser(user)}
      >
        <Trash2 size={16} />
      </Button>
    </>
  )}
</div>


              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={creatingUser || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingUser(false);
            setEditingUser(null);
            setFormValues({});
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{creatingUser ? 'Create User' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {creatingUser ? 'Enter new user details.' : 'Update user details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {fields.map((field) => {
              if (!creatingUser && (field.name === 'password' || field.name === 'password_confirmation')) return null;

              return (
                <Input
                  key={field.name}
                  type={field.type || 'text'}
                  value={(formValues as any)[field.name] || ''}
                  onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                  placeholder={field.label}
                />
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setCreatingUser(false); setEditingUser(null); }}>Cancel</Button>
            <Button onClick={creatingUser ? handleCreate : handleEditSave}>
              {creatingUser ? 'Create' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

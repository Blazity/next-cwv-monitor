'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { createUserSchema } from '@/app/server/domain/users/create/types';
import { createUserAction } from '@/app/server/actions/users/create-user';
import { CustomInput } from '@/components/custom-input';
import { toast } from 'sonner';

export function CreateUserBtn() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const methods = useForm({
    resolver: arktypeResolver(createUserSchema),
    mode: 'onChange',
    reValidateMode: 'onSubmit',
    defaultValues: {
      email: '',
      name: '',
      role: 'member' as const
    }
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { isValid }
  } = methods;

  const { field } = useController({ control, name: 'role' });

  const onSubmit = handleSubmit(async (data) => {
    startTransition(async () => {
      const { success, message } = await createUserAction(data);
      if (success) {
        toast.success('User created successfully!');
        methods.reset();
        setIsDialogOpen(false);
      } else {
        toast.error(message ?? 'Failed to create user. Please try again.');
      }
    });
  });

  const handleTogle = (value: boolean) => {
    if (value === true) {
      methods.reset();
    }
    setIsDialogOpen(value);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleTogle}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="mb-4">
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. An invitation email will be sent to set up their password.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
          >
            <CustomInput type="text" placeholder="John" label="Name" {...register('name')} />
            <CustomInput type="email" placeholder="john@example.com" label="Email" {...register('email')} />
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member" defaultChecked>
                    User
                  </SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleTogle(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isPending}>
                {isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

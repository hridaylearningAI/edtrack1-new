'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StudentForm } from './student-form';
import { Student, StudentCreate, StudentUpdate } from '@/lib/api';
import { Plus, Edit, UserPlus } from 'lucide-react';

interface AddStudentDialogProps {
  onStudentAdded: (student: StudentCreate) => void;
}

export function AddStudentDialog({ onStudentAdded }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data: StudentCreate) => {
    try {
      await onStudentAdded(data);
      setOpen(false);
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Fill in the details to add a new student to the system. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <StudentForm
          mode="create"
          onSubmitCreate={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditStudentDialogProps {
  student: Student;
  onStudentUpdated: (student: StudentUpdate & { id: number }) => void;
  trigger?: React.ReactNode;
}

export function EditStudentDialog({ student, onStudentUpdated, trigger }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data: StudentUpdate) => {
    try {
      await onStudentUpdated({ ...data, id: student.id });
      setOpen(false);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Student
          </DialogTitle>
          <DialogDescription>
            Update the student information below. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <StudentForm
          student={student}
          mode="edit"
          onSubmitUpdate={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

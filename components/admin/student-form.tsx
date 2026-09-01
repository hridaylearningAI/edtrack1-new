'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Student, StudentCreate, StudentUpdate } from '@/lib/api';
import { X, Save, UserPlus } from 'lucide-react';

interface StudentFormProps {
  mode: 'create' | 'edit';
  student?: Student;
  onSubmitCreate?: (data: StudentCreate) => Promise<void>;
  onSubmitUpdate?: (data: StudentUpdate) => Promise<void>;
  onCancel: () => void;
}

export function StudentForm({ student, onSubmitCreate, onSubmitUpdate, onCancel, mode }: StudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    address: student?.address || '',
    date_of_birth: student?.date_of_birth || '',
    grade: student?.grade || '',
    enrollment_date: student?.enrollment_date || '',
    status: student?.status || 'active',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Clean up the data before submission
      const cleanData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : undefined,
        grade: formData.grade || undefined,
        enrollment_date: formData.enrollment_date ? new Date(formData.enrollment_date).toISOString().split('T')[0] : undefined,
        status: formData.status || 'active',
      };
      
      if (mode === 'create') {
        // For create, ensure all required fields are present
        const createData: StudentCreate = {
          name: cleanData.name,
          email: cleanData.email,
          phone: cleanData.phone,
          address: cleanData.address,
          date_of_birth: cleanData.date_of_birth,
          grade: cleanData.grade,
          enrollment_date: cleanData.enrollment_date,
          status: cleanData.status,
        };
        if (onSubmitCreate) {
          await onSubmitCreate(createData);
        }
      } else {
        // For update, only include changed fields
        const updateData: StudentUpdate = {};
        if (cleanData.name !== student?.name) updateData.name = cleanData.name;
        if (cleanData.email !== student?.email) updateData.email = cleanData.email;
        if (cleanData.phone !== student?.phone) updateData.phone = cleanData.phone;
        if (cleanData.address !== student?.address) updateData.address = cleanData.address;
        if (cleanData.date_of_birth !== student?.date_of_birth) updateData.date_of_birth = cleanData.date_of_birth;
        if (cleanData.grade !== student?.grade) updateData.grade = cleanData.grade;
        if (cleanData.enrollment_date !== student?.enrollment_date) updateData.enrollment_date = cleanData.enrollment_date;
        if (cleanData.status !== student?.status) updateData.status = cleanData.status;
        
        if (onSubmitUpdate) {
          await onSubmitUpdate(updateData);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'create' ? (
            <>
              <UserPlus className="h-5 w-5" />
              Add New Student
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Edit Student
            </>
          )}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Fill in the details to add a new student to the system'
            : 'Update the student information below'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
                rows={3}
              />
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Academic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => handleInputChange('grade', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="C+">C+</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="C-">C-</SelectItem>
                    <SelectItem value="D+">D+</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="D-">D-</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="I">I (Incomplete)</SelectItem>
                    <SelectItem value="W">W (Withdrawn)</SelectItem>
                    <SelectItem value="AU">AU (Audit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollment_date">Enrollment Date</Label>
                <Input
                  id="enrollment_date"
                  type="date"
                  value={formData.enrollment_date}
                  onChange={(e) => handleInputChange('enrollment_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Student' : 'Update Student'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

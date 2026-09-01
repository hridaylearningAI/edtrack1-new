"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  GraduationCap,
  Users,
  Star,
  Clock,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Award,
  Loader2,
} from "lucide-react"
import { useTrainers } from "@/lib/hooks/useTrainers"
import { useAssessments } from "@/lib/hooks/useAssessments"
import { useCourses } from "@/lib/hooks/useCourses"
import { apiClient, EligibleClerkUserForTrainer, Trainer, TrainerCreate, TrainerUpdate } from "@/lib/api"
import { Assessment, AssessmentCreate, AssessmentUpdate } from "@/lib/api"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Active":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          Active
        </Badge>
      )
    case "On Leave":
      return <Badge variant="secondary">On Leave</Badge>
    case "Inactive":
      return <Badge variant="outline">Inactive</Badge>
    case "Draft":
      return <Badge variant="outline">Draft</Badge>
    case "Completed":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          Completed
        </Badge>
      )
    case "Archived":
      return <Badge variant="secondary">Archived</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case "Quiz":
      return "text-chart-1"
    case "Project":
      return "text-chart-2"
    case "Assignment":
      return "text-chart-4"
    default:
      return "text-muted-foreground"
  }
}

export default function TrainersAssessmentsPage() {
  const { trainers, loading: trainersLoading, createTrainer, updateTrainer, deleteTrainer } = useTrainers()
  const { assessments, loading: assessmentsLoading, createAssessment, updateAssessment, deleteAssessment } = useAssessments()
  const { courses } = useCourses()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [assessmentSearchTerm, setAssessmentSearchTerm] = useState("")
  const [isTrainerDialogOpen, setIsTrainerDialogOpen] = useState(false)
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [isViewingTrainer, setIsViewingTrainer] = useState(false)
  const [isViewingAssessment, setIsViewingAssessment] = useState(false)

  const [clerkUsers, setClerkUsers] = useState<EligibleClerkUserForTrainer[]>([])
  const [clerkUsersLoading, setClerkUsersLoading] = useState(false)
  const [clerkUsersError, setClerkUsersError] = useState<string | null>(null)
  const [selectedClerkUserId, setSelectedClerkUserId] = useState<string>("")

  // Trainer form state
  const [trainerForm, setTrainerForm] = useState<TrainerCreate>({
    name: "",
    email: "",
    specialization: "",
    experience: "",
    status: "Active",
    join_date: new Date().toISOString().split('T')[0],
    avatar: "",
    qualifications: [],
    courses_teaching: [],
  })

  // Assessment form state
  const [assessmentForm, setAssessmentForm] = useState<AssessmentCreate>({
    title: "",
    course_id: undefined,
    course_name: "",
    trainer_id: undefined,
    trainer_name: "",
    type: "Quiz",
    duration: "",
    total_questions: 0,
    passing_score: 0,
    description: "",
    instructions: "",
    status: "Draft",
  })

  // Calculate statistics
  const activeTrainers = trainers.filter((t) => t.status === "Active").length
  const totalStudents = trainers.reduce((acc, t) => acc + (t.students_assigned || 0), 0)
  const averageRating = trainers.length > 0 
    ? (trainers.reduce((acc, t) => acc + (t.rating || 0), 0) / trainers.length).toFixed(1)
    : "0.0"
  const totalAssessments = assessments.length

  // Filter trainers
  const filteredTrainers = useMemo(() => {
    return trainers.filter((trainer) =>
      searchTerm === "" ||
      trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trainer.specialization && trainer.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [trainers, searchTerm])

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) =>
      assessmentSearchTerm === "" ||
      assessment.title.toLowerCase().includes(assessmentSearchTerm.toLowerCase()) ||
      (assessment.course_name && assessment.course_name.toLowerCase().includes(assessmentSearchTerm.toLowerCase())) ||
      (assessment.trainer_name && assessment.trainer_name.toLowerCase().includes(assessmentSearchTerm.toLowerCase()))
    )
  }, [assessments, assessmentSearchTerm])

  // Handlers
  const handleCreateTrainer = () => {
    setSelectedTrainer(null)
    setSelectedClerkUserId("")
    setClerkUsersError(null)
    setClerkUsers([])
    setTrainerForm({
      name: "",
      email: "",
      specialization: "",
      experience: "",
      status: "Active",
      join_date: new Date().toISOString().split('T')[0],
      avatar: "",
      qualifications: [],
      courses_teaching: [],
    })
    setIsTrainerDialogOpen(true)
  }

  const handleEditTrainer = (trainer: Trainer) => {
    setSelectedTrainer(trainer)
    setSelectedClerkUserId("")
    setTrainerForm({
      name: trainer.name,
      email: trainer.email,
      specialization: trainer.specialization || "",
      experience: trainer.experience || "",
      status: trainer.status,
      join_date: trainer.join_date || new Date().toISOString().split('T')[0],
      avatar: trainer.avatar || "",
      qualifications: trainer.qualifications || [],
      courses_teaching: trainer.courses_teaching || [],
    })
    setIsTrainerDialogOpen(true)
  }

  useEffect(() => {
    // Only fetch eligible clerk users for dropdown when we open "Add New Trainer".
    if (!isTrainerDialogOpen || selectedTrainer) return

    let cancelled = false

    ;(async () => {
      setClerkUsersLoading(true)
      setClerkUsersError(null)
      try {
        const res = await apiClient.getEligibleClerkUsersForTrainers({ limit: 200 })
        if (cancelled) return
        setClerkUsers(res.data || [])
      } catch (err: any) {
        if (cancelled) return
        console.error("Failed to fetch eligible Clerk users:", err)
        setClerkUsersError(err?.message || "Failed to fetch Clerk users")
      } finally {
        if (cancelled) return
        setClerkUsersLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isTrainerDialogOpen, selectedTrainer])

  const handleSaveTrainer = async () => {
    if (!trainerForm.name || !trainerForm.email) {
      return
    }

    if (selectedTrainer) {
      await updateTrainer(selectedTrainer.id, trainerForm as TrainerUpdate)
    } else {
      await createTrainer(trainerForm)
    }
    setIsTrainerDialogOpen(false)
  }

  const handleDeleteTrainer = async (id: number) => {
    if (confirm("Are you sure you want to delete this trainer?")) {
      await deleteTrainer(id)
    }
  }

  const handleCreateAssessment = () => {
    setSelectedAssessment(null)
    setAssessmentForm({
      title: "",
      course_id: undefined,
      course_name: "",
      trainer_id: undefined,
      trainer_name: "",
      type: "Quiz",
      duration: "",
      total_questions: 0,
      passing_score: 0,
      description: "",
      instructions: "",
      status: "Draft",
    })
    setIsAssessmentDialogOpen(true)
  }

  const handleEditAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setAssessmentForm({
      title: assessment.title,
      course_id: assessment.course_id,
      course_name: assessment.course_name || "",
      trainer_id: assessment.trainer_id,
      trainer_name: assessment.trainer_name || "",
      type: assessment.type,
      duration: assessment.duration || "",
      total_questions: assessment.total_questions,
      passing_score: assessment.passing_score,
      description: assessment.description || "",
      instructions: assessment.instructions || "",
      status: assessment.status,
    })
    setIsAssessmentDialogOpen(true)
  }

  const handleSaveAssessment = async () => {
    if (!assessmentForm.title || !assessmentForm.type) {
      return
    }

    if (selectedAssessment) {
      await updateAssessment(selectedAssessment.id, assessmentForm as AssessmentUpdate)
    } else {
      await createAssessment(assessmentForm)
    }
    setIsAssessmentDialogOpen(false)
  }

  const handleDeleteAssessment = async (id: number) => {
    if (confirm("Are you sure you want to delete this assessment?")) {
      await deleteAssessment(id)
    }
  }

  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Trainers & Assessments</h2>
            <p className="text-muted-foreground mt-2">Manage trainers and course assessments</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCreateTrainer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Trainer
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleCreateAssessment}>
              <FileText className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{activeTrainers}</div>
                  <p className="text-xs text-muted-foreground">Active Trainers</p>
                </div>
                <GraduationCap className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground">Students Assigned</p>
                </div>
                <Users className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{averageRating}</div>
                  <p className="text-xs text-muted-foreground">Average Rating</p>
                </div>
                <Star className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalAssessments}</div>
                  <p className="text-xs text-muted-foreground">Total Assessments</p>
                </div>
                <FileText className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trainers & Assessments */}
        <Tabs defaultValue="trainers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trainers">Trainers</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="trainers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trainer Management</CardTitle>
                <CardDescription>Manage trainer profiles and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search trainers..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {trainersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading trainers...</span>
                  </div>
                ) : filteredTrainers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm ? "No trainers found matching your search" : "No trainers yet"}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trainer</TableHead>
                          <TableHead>Specialization</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Courses</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrainers.map((trainer) => (
                          <TableRow key={trainer.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={trainer.avatar || "/placeholder.svg"} alt={trainer.name} />
                                  <AvatarFallback>
                                    {trainer.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">{trainer.name}</div>
                                  <div className="text-sm text-muted-foreground">{trainer.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {trainer.specialization ? (
                                <Badge variant="outline">{trainer.specialization}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {trainer.experience ? (
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {trainer.experience}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Star className="mr-1 h-3 w-3 text-chart-4 fill-current" />
                                <span className="font-medium">{trainer.rating?.toFixed(1) || "0.0"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">{trainer.students_assigned || 0}</div>
                                <div className="text-xs text-muted-foreground">assigned</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {trainer.courses_teaching?.length || 0} course{(trainer.courses_teaching?.length || 0) !== 1 ? "s" : ""}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(trainer.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTrainer(trainer)
                                    setIsViewingTrainer(true)
                                  }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditTrainer(trainer)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Trainer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteTrainer(trainer.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Trainer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Management</CardTitle>
                <CardDescription>Create and manage course assessments and evaluations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search assessments..." 
                      className="pl-10"
                      value={assessmentSearchTerm}
                      onChange={(e) => setAssessmentSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {assessmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading assessments...</span>
                  </div>
                ) : filteredAssessments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {assessmentSearchTerm ? "No assessments found matching your search" : "No assessments yet"}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assessment</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Trainer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Avg Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssessments.map((assessment) => (
                          <TableRow key={assessment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{assessment.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {assessment.total_questions} question{assessment.total_questions !== 1 ? "s" : ""} •{" "}
                                  {assessment.passing_score}% to pass
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {assessment.course_name ? (
                                <Badge variant="outline">{assessment.course_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{assessment.trainer_name || "-"}</div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getTypeColor(assessment.type)}`}>{assessment.type}</span>
                            </TableCell>
                            <TableCell>
                              {assessment.duration ? (
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {assessment.duration}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">{assessment.students_attempted || 0}</div>
                                <div className="text-xs text-muted-foreground">students</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Award className="mr-1 h-3 w-3 text-chart-3" />
                                <span className="font-medium">{assessment.average_score?.toFixed(1) || "0.0"}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedAssessment(assessment)
                                    setIsViewingAssessment(true)
                                  }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Assessment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditAssessment(assessment)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Assessment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteAssessment(assessment.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Assessment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Trainer Dialog */}
      <Dialog open={isTrainerDialogOpen} onOpenChange={setIsTrainerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTrainer ? "Edit Trainer" : "Add New Trainer"}</DialogTitle>
            <DialogDescription>
              {selectedTrainer ? "Update trainer information" : "Create a new trainer profile"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedTrainer ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Clerk User *</Label>
                  <Select
                    value={selectedClerkUserId}
                    onValueChange={(value: string) => {
                      setSelectedClerkUserId(value)
                      const picked = clerkUsers.find((u) => u.id === value)
                      setTrainerForm({
                        ...trainerForm,
                        name: picked?.fullName || "",
                        email: picked?.email || "",
                        avatar: picked?.avatarUrl || "",
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={clerkUsersLoading ? "Loading Clerk users..." : "Select a Clerk user"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clerkUsersLoading ? (
                        <SelectItem value="__loading__" disabled>
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </span>
                        </SelectItem>
                      ) : clerkUsersError ? (
                        <SelectItem value="__error__" disabled>
                          {clerkUsersError}
                        </SelectItem>
                      ) : clerkUsers.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No eligible users found
                        </SelectItem>
                      ) : (
                        clerkUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName} ({u.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={trainerForm.name}
                  onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                  placeholder="Trainer name"
                  disabled={!selectedTrainer}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={trainerForm.email}
                  onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })}
                  placeholder="trainer@example.com"
                  disabled={!selectedTrainer}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={trainerForm.specialization}
                  onChange={(e) => setTrainerForm({ ...trainerForm, specialization: e.target.value })}
                  placeholder="e.g., Web Development"
                />
              </div>
              <div>
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={trainerForm.experience}
                  onChange={(e) => setTrainerForm({ ...trainerForm, experience: e.target.value })}
                  placeholder="e.g., 8 years"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={trainerForm.status}
                  onValueChange={(value: any) => setTrainerForm({ ...trainerForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="join_date">Join Date</Label>
                <Input
                  id="join_date"
                  type="date"
                  value={trainerForm.join_date}
                  onChange={(e) => setTrainerForm({ ...trainerForm, join_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={trainerForm.avatar}
                onChange={(e) => setTrainerForm({ ...trainerForm, avatar: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div>
              <Label htmlFor="qualifications">Qualifications (comma-separated)</Label>
              <Input
                id="qualifications"
                value={(trainerForm.qualifications || []).join(", ")}
                onChange={(e) => setTrainerForm({ 
                  ...trainerForm, 
                  qualifications: e.target.value.split(",").map(q => q.trim()).filter(q => q) 
                })}
                placeholder="M.S. Computer Science, AWS Certified"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsTrainerDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTrainer} disabled={!trainerForm.name || !trainerForm.email}>
                {selectedTrainer ? "Update" : "Create"} Trainer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Dialog */}
      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssessment ? "Edit Assessment" : "Create New Assessment"}</DialogTitle>
            <DialogDescription>
              {selectedAssessment ? "Update assessment details" : "Create a new course assessment"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                placeholder="Assessment title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={assessmentForm.type}
                  onValueChange={(value: any) => setAssessmentForm({ ...assessmentForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quiz">Quiz</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                    <SelectItem value="Exam">Exam</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={assessmentForm.status}
                  onValueChange={(value: any) => setAssessmentForm({ ...assessmentForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select
                  value={assessmentForm.course_id?.toString() || ""}
                  onValueChange={(value) => {
                    const course = courses.find(c => c.id.toString() === value)
                    setAssessmentForm({ 
                      ...assessmentForm, 
                      course_id: value ? parseInt(value) : undefined,
                      course_name: course?.title || ""
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="trainer">Trainer</Label>
                <Select
                  value={assessmentForm.trainer_id?.toString() || ""}
                  onValueChange={(value) => {
                    const trainer = trainers.find(t => t.id.toString() === value)
                    setAssessmentForm({ 
                      ...assessmentForm, 
                      trainer_id: value ? parseInt(value) : undefined,
                      trainer_name: trainer?.name || ""
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Trainer</SelectItem>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id.toString()}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={assessmentForm.duration}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, duration: e.target.value })}
                  placeholder="e.g., 30 minutes"
                />
              </div>
              <div>
                <Label htmlFor="total_questions">Total Questions</Label>
                <Input
                  id="total_questions"
                  type="number"
                  value={assessmentForm.total_questions}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, total_questions: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="passing_score">Passing Score (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  value={assessmentForm.passing_score}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, passing_score: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assessmentForm.description}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                placeholder="Assessment description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={assessmentForm.instructions}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, instructions: e.target.value })}
                placeholder="Assessment instructions"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssessmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAssessment} disabled={!assessmentForm.title || !assessmentForm.type}>
                {selectedAssessment ? "Update" : "Create"} Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Trainer Dialog */}
      {selectedTrainer && (
        <Dialog open={isViewingTrainer} onOpenChange={setIsViewingTrainer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTrainer.name}</DialogTitle>
              <DialogDescription>Trainer Profile Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedTrainer.avatar || "/placeholder.svg"} alt={selectedTrainer.name} />
                  <AvatarFallback>
                    {selectedTrainer.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedTrainer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTrainer.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Specialization</Label>
                  <p className="text-sm">{selectedTrainer.specialization || "-"}</p>
                </div>
                <div>
                  <Label>Experience</Label>
                  <p className="text-sm">{selectedTrainer.experience || "-"}</p>
                </div>
                <div>
                  <Label>Rating</Label>
                  <p className="text-sm">{selectedTrainer.rating?.toFixed(1) || "0.0"}</p>
                </div>
                <div>
                  <Label>Students Assigned</Label>
                  <p className="text-sm">{selectedTrainer.students_assigned || 0}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTrainer.status)}</div>
                </div>
                <div>
                  <Label>Join Date</Label>
                  <p className="text-sm">{selectedTrainer.join_date ? new Date(selectedTrainer.join_date).toLocaleDateString() : "-"}</p>
                </div>
              </div>
              {selectedTrainer.qualifications && selectedTrainer.qualifications.length > 0 && (
                <div>
                  <Label>Qualifications</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTrainer.qualifications.map((qual, index) => (
                      <Badge key={index} variant="outline">{qual}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Assessment Dialog */}
      {selectedAssessment && (
        <Dialog open={isViewingAssessment} onOpenChange={setIsViewingAssessment}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedAssessment.title}</DialogTitle>
              <DialogDescription>Assessment Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="text-sm">{selectedAssessment.type}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAssessment.status)}</div>
                </div>
                <div>
                  <Label>Course</Label>
                  <p className="text-sm">{selectedAssessment.course_name || "-"}</p>
                </div>
                <div>
                  <Label>Trainer</Label>
                  <p className="text-sm">{selectedAssessment.trainer_name || "-"}</p>
                </div>
                <div>
                  <Label>Duration</Label>
                  <p className="text-sm">{selectedAssessment.duration || "-"}</p>
                </div>
                <div>
                  <Label>Total Questions</Label>
                  <p className="text-sm">{selectedAssessment.total_questions}</p>
                </div>
                <div>
                  <Label>Passing Score</Label>
                  <p className="text-sm">{selectedAssessment.passing_score}%</p>
                </div>
                <div>
                  <Label>Students Attempted</Label>
                  <p className="text-sm">{selectedAssessment.students_attempted || 0}</p>
                </div>
                <div>
                  <Label>Average Score</Label>
                  <p className="text-sm">{selectedAssessment.average_score?.toFixed(1) || "0.0"}%</p>
                </div>
              </div>
              {selectedAssessment.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{selectedAssessment.description}</p>
                </div>
              )}
              {selectedAssessment.instructions && (
                <div>
                  <Label>Instructions</Label>
                  <p className="text-sm">{selectedAssessment.instructions}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

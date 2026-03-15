"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  visibility: z.enum(["public", "private"]),
  description_html: z.string().min(1, "Description is required"),
  requirements_text: z.string().min(1, "Requirements are required"),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  defaultValues?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  loading?: boolean;
  submitLabel?: string;
}

export function JobForm({ defaultValues, onSubmit, loading, submitLabel = "Create Job" }: JobFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      employment_type: "full_time",
      visibility: "public",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">Job Title</Label>
        <Input id="title" placeholder="e.g. Senior Frontend Engineer" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input id="department" placeholder="e.g. Engineering" {...register("department")} />
          {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g. Remote, New York" {...register("location")} />
          {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            value={watch("employment_type")}
            onValueChange={(v) => setValue("employment_type", v as JobFormData["employment_type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            value={watch("visibility")}
            onValueChange={(v) => setValue("visibility", v as JobFormData["visibility"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Job Description</Label>
        <Textarea
          id="description"
          rows={8}
          placeholder="Describe the role, responsibilities, and what a typical day looks like..."
          {...register("description_html")}
        />
        {errors.description_html && (
          <p className="text-sm text-destructive">{errors.description_html.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          rows={6}
          placeholder="List the required skills, experience, and qualifications..."
          {...register("requirements_text")}
        />
        {errors.requirements_text && (
          <p className="text-sm text-destructive">{errors.requirements_text.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Salary Range (optional)</Label>
        <div className="grid grid-cols-3 gap-3">
          <Input
            type="number"
            placeholder="Min"
            {...register("salary_min", { valueAsNumber: true })}
          />
          <Input
            type="number"
            placeholder="Max"
            {...register("salary_max", { valueAsNumber: true })}
          />
          <Input placeholder="USD" {...register("salary_currency")} />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

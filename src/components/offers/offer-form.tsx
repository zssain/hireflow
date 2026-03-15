"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OfferFormData {
  candidate_name: string;
  job_title: string;
  salary: string;
  joining_date: string;
}

interface OfferFormProps {
  defaultValues?: Partial<OfferFormData>;
  onSubmit: (data: OfferFormData) => void;
  loading?: boolean;
}

export function OfferForm({ defaultValues, onSubmit, loading }: OfferFormProps) {
  const { register, handleSubmit } = useForm<OfferFormData>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Candidate Name</Label>
        <Input {...register("candidate_name", { required: true })} />
      </div>
      <div className="space-y-2">
        <Label>Job Title</Label>
        <Input {...register("job_title", { required: true })} />
      </div>
      <div className="space-y-2">
        <Label>Salary</Label>
        <Input placeholder="e.g. $120,000/year" {...register("salary", { required: true })} />
      </div>
      <div className="space-y-2">
        <Label>Joining Date</Label>
        <Input type="date" {...register("joining_date", { required: true })} />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Offer"}</Button>
    </form>
  );
}

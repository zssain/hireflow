from fastapi import APIRouter, Request, HTTPException
from app.core.firebase import col, get_db
from app.core.utils import generate_id, generate_public_id
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

router = APIRouter()


@router.post("")
async def seed_data(request: Request):
    try:
        body = await request.json()
        tenant_id = body.get("tenant_id")
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Missing tenant_id")

        db = get_db()
        batch = db.batch()

        # Get existing admin membership for this tenant
        membership_snap = (
            col("memberships")
            .where("tenant_id", "==", tenant_id)
            .where("role", "==", "admin")
            .limit(1)
            .get()
        )
        admin_membership_id = membership_snap[0].to_dict()["membership_id"] if membership_snap else "unknown"

        # Get default pipeline template
        template_snap = (
            col("pipeline_templates")
            .where("tenant_id", "==", tenant_id)
            .limit(1)
            .get()
        )

        stages = (
            template_snap[0].to_dict()["stages"]
            if template_snap
            else [
                {"stage_id": "applied", "name": "Applied", "order": 0},
                {"stage_id": "screening", "name": "Screening", "order": 1},
                {"stage_id": "interview", "name": "Interview", "order": 2},
                {"stage_id": "offer", "name": "Offer", "order": 3},
                {"stage_id": "hired", "name": "Hired", "order": 4},
            ]
        )

        template_id = template_snap[0].to_dict()["template_id"] if template_snap else "default"

        # === MOCK JOBS ===
        mock_jobs = [
            {
                "title": "Senior Frontend Engineer",
                "department": "Engineering",
                "location": "Remote",
                "type": "full_time",
                "salary": {"min": 140000, "max": 180000, "currency": "USD"},
                "desc": "We're looking for a senior frontend engineer to lead our React/Next.js stack. You'll architect new features, mentor junior developers, and drive performance improvements.",
                "reqs": "5+ years React experience\nTypeScript proficiency\nNext.js expertise\nTailwind CSS\nState management (Zustand/Redux)\nTesting (Jest, Cypress)\nCI/CD experience",
            },
            {
                "title": "Product Designer",
                "department": "Design",
                "location": "New York, NY",
                "type": "full_time",
                "salary": {"min": 120000, "max": 160000, "currency": "USD"},
                "desc": "Join our design team to create beautiful, intuitive interfaces for our hiring platform. Work closely with engineering and product to ship delightful experiences.",
                "reqs": "4+ years product design\nFigma expertise\nDesign systems experience\nUser research skills\nPrototyping\nAccessibility knowledge",
            },
            {
                "title": "Backend Engineer",
                "department": "Engineering",
                "location": "San Francisco, CA",
                "type": "full_time",
                "salary": {"min": 150000, "max": 200000, "currency": "USD"},
                "desc": "Build scalable APIs and microservices powering our hiring platform. Work with Node.js, Firebase, and cloud infrastructure.",
                "reqs": "5+ years backend development\nNode.js/TypeScript\nFirebase or cloud databases\nREST/GraphQL API design\nDocker/Kubernetes\nAWS/GCP experience",
            },
            {
                "title": "Marketing Intern",
                "department": "Marketing",
                "location": "Remote",
                "type": "intern",
                "salary": None,
                "desc": "Help us grow our brand presence and create content that resonates with HR professionals and startup founders.",
                "reqs": "Currently enrolled in university\nStrong writing skills\nSocial media knowledge\nCreative thinking\nSelf-motivated",
            },
            {
                "title": "DevOps Engineer",
                "department": "Engineering",
                "location": "Remote",
                "type": "contract",
                "salary": {"min": 160000, "max": 200000, "currency": "USD"},
                "desc": "Design and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems. Ensure 99.9% uptime for our SaaS platform.",
                "reqs": "4+ years DevOps experience\nAWS/GCP\nTerraform/Pulumi\nDocker/Kubernetes\nCI/CD (GitHub Actions)\nMonitoring (Datadog/Grafana)",
            },
        ]

        job_ids = []

        for job in mock_jobs:
            job_id = generate_id("job")
            pipeline_id = generate_id("pl")
            public_id = generate_public_id()
            job_ids.append(job_id)

            batch.set(col("job_pipelines").document(pipeline_id), {
                "pipeline_id": pipeline_id,
                "tenant_id": tenant_id,
                "job_id": job_id,
                "name": "Default Pipeline",
                "stages": stages,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

            job_data = {
                "job_id": job_id,
                "tenant_id": tenant_id,
                "public_id": public_id,
                "title": job["title"],
                "department": job["department"],
                "location": job["location"],
                "employment_type": job["type"],
                "description_html": f"<p>{job['desc']}</p>",
                "requirements_text": job["reqs"],
                "visibility": "public",
                "status": "open",
                "pipeline_template_id": template_id,
                "pipeline_id": pipeline_id,
                "recruiter_owner_membership_id": admin_membership_id,
                "hiring_manager_membership_ids": [],
                "published_at": SERVER_TIMESTAMP,
                "created_by_membership_id": admin_membership_id,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            }
            if job["salary"]:
                job_data["salary_range"] = job["salary"]
            batch.set(col("jobs").document(job_id), job_data)

        # === MOCK CANDIDATES & APPLICATIONS ===
        mock_candidates = [
            {"name": "Sarah Chen", "email": "sarah.chen@email.com", "phone": "+1-555-0101", "skills": ["React", "TypeScript", "Next.js", "Tailwind"], "years": 6},
            {"name": "Marcus Johnson", "email": "marcus.j@email.com", "phone": "+1-555-0102", "skills": ["React", "Vue", "JavaScript", "CSS"], "years": 4},
            {"name": "Emily Rodriguez", "email": "emily.r@email.com", "phone": "+1-555-0103", "skills": ["Figma", "Sketch", "User Research", "Prototyping"], "years": 5},
            {"name": "Alex Kim", "email": "alex.kim@email.com", "phone": "+1-555-0104", "skills": ["Node.js", "Python", "AWS", "Docker", "PostgreSQL"], "years": 7},
            {"name": "Priya Patel", "email": "priya.p@email.com", "phone": "+1-555-0105", "skills": ["React", "Angular", "TypeScript", "GraphQL"], "years": 3},
            {"name": "James O'Brien", "email": "james.ob@email.com", "phone": "+1-555-0106", "skills": ["Terraform", "Kubernetes", "AWS", "CI/CD", "Linux"], "years": 5},
            {"name": "Lisa Wang", "email": "lisa.wang@email.com", "phone": "+1-555-0107", "skills": ["React", "Next.js", "TypeScript", "Testing"], "years": 8},
            {"name": "David Nakamura", "email": "david.n@email.com", "phone": "+1-555-0108", "skills": ["Figma", "Design Systems", "CSS", "Animation"], "years": 6},
            {"name": "Fatima Hassan", "email": "fatima.h@email.com", "phone": "+1-555-0109", "skills": ["Node.js", "Firebase", "MongoDB", "REST APIs"], "years": 4},
            {"name": "Ryan Cooper", "email": "ryan.c@email.com", "phone": "+1-555-0110", "skills": ["Content Writing", "Social Media", "SEO", "Analytics"], "years": 1},
            {"name": "Aisha Mohammed", "email": "aisha.m@email.com", "phone": "+1-555-0111", "skills": ["React", "TypeScript", "Zustand", "Cypress"], "years": 5},
            {"name": "Tom Wilson", "email": "tom.w@email.com", "phone": "+1-555-0112", "skills": ["AWS", "GCP", "Docker", "Monitoring", "Python"], "years": 6},
        ]

        assignments = [
            {"candidate_idx": 0, "job_idx": 0, "stage": "interview", "score": 88},
            {"candidate_idx": 1, "job_idx": 0, "stage": "screening", "score": 72},
            {"candidate_idx": 4, "job_idx": 0, "stage": "applied", "score": 65},
            {"candidate_idx": 6, "job_idx": 0, "stage": "offer", "score": 92},
            {"candidate_idx": 10, "job_idx": 0, "stage": "screening", "score": 78},
            {"candidate_idx": 2, "job_idx": 1, "stage": "interview", "score": 85},
            {"candidate_idx": 7, "job_idx": 1, "stage": "screening", "score": 76},
            {"candidate_idx": 3, "job_idx": 2, "stage": "interview", "score": 90},
            {"candidate_idx": 8, "job_idx": 2, "stage": "applied", "score": 58},
            {"candidate_idx": 9, "job_idx": 3, "stage": "applied", "score": 45},
            {"candidate_idx": 5, "job_idx": 4, "stage": "screening", "score": 82},
            {"candidate_idx": 11, "job_idx": 4, "stage": "applied", "score": 70},
        ]

        for assignment in assignments:
            c = mock_candidates[assignment["candidate_idx"]]
            candidate_id = generate_id("cand")
            application_id = generate_id("app")
            score = assignment["score"]
            job_idx = assignment["job_idx"]

            stage_obj = None
            for s in stages:
                if s["stage_id"] == assignment["stage"]:
                    stage_obj = s
                    break
            if not stage_obj:
                stage_obj = stages[0]

            batch.set(col("candidates").document(candidate_id), {
                "candidate_id": candidate_id,
                "tenant_id": tenant_id,
                "name": c["name"],
                "email": c["email"],
                "phone": c["phone"],
                "linkedin_url": "",
                "dedupe_keys": {
                    "email_lower": c["email"].lower(),
                    "phone_normalized": "".join(ch for ch in c["phone"] if ch.isdigit()),
                },
                "master_profile": {
                    "skills": c["skills"],
                    "years_experience": c["years"],
                },
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

            batch.set(col("applications").document(application_id), {
                "application_id": application_id,
                "tenant_id": tenant_id,
                "candidate_id": candidate_id,
                "candidate_name": c["name"],
                "candidate_email": c["email"],
                "job_id": job_ids[job_idx],
                "job_title": mock_jobs[job_idx]["title"],
                "source_type": "careers_page",
                "source_ref": "",
                "current_stage_id": stage_obj["stage_id"],
                "current_stage_name": stage_obj["name"],
                "status": "active",
                "score_total": score,
                "score_status": "processed",
                "parse_status": "processed",
                "recruiter_owner_membership_id": admin_membership_id,
                "hiring_manager_membership_ids": [],
                "manual_review_required": score < 60,
                "last_activity_at": SERVER_TIMESTAMP,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

            # Create processing result
            processing_id = generate_id("proc")
            skills = c["skills"]
            job_title = mock_jobs[job_idx]["title"]
            strength_label = "strong" if score >= 80 else ("moderate" if score >= 60 else "limited")
            fit_label = "well-suited" if score >= 70 else "partially relevant"

            batch.set(col("application_processing").document(processing_id), {
                "processing_id": processing_id,
                "tenant_id": tenant_id,
                "application_id": application_id,
                "parse_status": "processed",
                "parse_confidence": 0.9 if score > 70 else 0.6,
                "manual_review_required": score < 60,
                "parse_error_code": None,
                "parse_error_message": None,
                "rule_score": {
                    "skills": round(score * 0.4),
                    "experience": round(score * 0.25),
                    "keywords": round(score * 0.2),
                    "education": round(score * 0.1),
                    "bonus": round(score * 0.05),
                    "total": score,
                },
                "ai_summary": f"{c['name']} shows {strength_label} alignment with the {job_title} role. Their {', '.join(skills[:3])} experience is {fit_label} for this position.",
                "strengths": [f"Strong {s} expertise" for s in skills[:3]],
                "gaps": ["Could benefit from more experience in the specific domain"] if score < 80 else [],
                "raw_extracted_text": "",
                "structured_data": {
                    "name": c["name"],
                    "email": c["email"],
                    "phone": c["phone"],
                    "skills": skills,
                    "experience": [{"company": "Previous Co", "title": "Engineer", "duration_text": f"{c['years']} years"}],
                    "education": [{"degree": "B.S. Computer Science", "institution": "University", "year": 2020}],
                },
                "reprocess_count": 0,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

        batch.commit()

        return {
            "seeded": {
                "jobs": len(mock_jobs),
                "candidates": len(assignments),
                "applications": len(assignments),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "Seed failed")

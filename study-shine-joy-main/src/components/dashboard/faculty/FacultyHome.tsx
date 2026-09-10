import { useState, useEffect } from "react";
import { Loader, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { type Course, type Submission, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn, StatusPill } from "../../shared/UIPrimitives";

export function FacultyHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const coursesRes = await api.getCourses();
        if (coursesRes.success && coursesRes.data) {
          const all = Array.isArray(coursesRes.data) ? coursesRes.data : [];
          setCourses(all.filter(c => c.status?.toUpperCase() !== "REJECTED"));
        }

        const submissionsRes = await api.getSubmissions();
        if (submissionsRes.success && submissionsRes.data) {
          setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data.slice(0, 4) : []);
        }
      } catch (error) {
        console.error("Error fetching faculty data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeCourses = courses.filter((c) => c.status?.toUpperCase() === "APPROVED").length;
  const totalStudents = courses.reduce((acc, c) => acc + (c.studentCount || 0), 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name || "Faculty"} 👋`}
        subtitle="Your teaching at a glance."
        action={
          <Btn onClick={() => navigate({ to: "/dashboard/faculty/courses" })}>
            <Plus className="h-4 w-4" /> New course
          </Btn>
        }
      />
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Active courses", value: activeCourses },
          { label: "Pending submissions", value: submissions.length },
          { label: "Students taught", value: totalStudents },
        ].map((s) => (
          <Card key={s.label}>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-3xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold">My courses</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3"
                >
                  <div>
                    <div className="font-medium">{c.name || c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.studentCount || 0} students enrolled
                    </div>
                  </div>
                  <StatusPill status={c.status || "PENDING"} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No courses yet</div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-lg font-bold">Recent submissions</h3>
          {submissions.length > 0 ? (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3"
                >
                  <div>
                    <div className="font-medium">{s.studentName || "Student"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.assignmentTitle || `Assignment #${s.assignmentId}`} ·{" "}
                      {new Date(s.submittedAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  {s.marks !== undefined && s.marks >= 0 ? (
                    <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-bold text-success-foreground">
                      {s.marks}/100
                    </span>
                  ) : (
                    <Btn variant="soft" className="px-3 py-1 text-xs">
                      Evaluate
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No submissions yet</div>
          )}
        </Card>
      </div>
    </>
  );
}

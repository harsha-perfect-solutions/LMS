import { useState, useEffect } from "react";
import { type Course, api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FileText } from "lucide-react";
import { PageHeader, Card, Btn, StatusPill } from "../../shared/UIPrimitives";

export function AdminCourses() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === "admin@example.com";
  const hodBranch = currentUser?.branch || "";

  const [courses, setCourses] = useState<Course[]>([]);

  const fetchCourses = async () => {
    const res = await api.getCourses();
    if (res.success && res.data) {
      const allPending = Array.isArray(res.data)
        ? res.data.filter((course) => course.status?.toUpperCase() === "PENDING")
        : [];

      const scopedPending = (!isSuperAdmin && hodBranch)
        ? allPending.filter((c) => !c.branch || c.branch === "ALL" || c.branch === hodBranch)
        : allPending;

      setCourses(scopedPending);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleApprove = async (courseId: number) => {
    const res = await api.approveCourse(courseId.toString());
    if (res.success) await fetchCourses();
  };

  const handleReject = async (courseId: number) => {
    const reason = window.prompt("Reason for rejection", "Needs revision") || "Needs revision";
    const res = await api.rejectCourse(courseId.toString(), reason);
    if (res.success) await fetchCourses();
  };

  return (
    <>
      <PageHeader 
        title={!isSuperAdmin && hodBranch ? `Course Approvals (${hodBranch} Department)` : "Course approvals"} 
        subtitle={!isSuperAdmin && hodBranch ? `Review course registration proposals submitted by ${hodBranch} department faculty.` : "Review courses submitted by faculty."} 
      />
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg font-bold">{course.title} ({course.code})</div>
                <div className="text-xs text-muted-foreground mb-2">
                  Submitted by {course.facultyName || "Faculty"}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[10px] uppercase font-bold tracking-wider mb-2">
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Dept: {course.branch || "ALL"}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    {course.year || "ALL Years"}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    {course.sem || "ALL Sems"}
                  </span>
                  <span className="text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                    Sec: {course.section || "ALL"}
                  </span>
                </div>
              </div>
              <StatusPill status={course.status || "PENDING"} />
            </div>

            {course.pdfUrl && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 p-2.5 text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Course PDF Attached
                </span>
                <a
                  href={`${API_BASE_URL.replace("/api", "")}${course.pdfUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-500 hover:underline"
                >
                  View PDF &rarr;
                </a>
              </div>
            )}

            {course.description && (
              <p className="mt-2 text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-xl border border-border">
                <strong>Description:</strong> {course.description}
              </p>
            )}

            {course.content && (
              <div className="mt-2 text-xs bg-primary/5 p-2.5 rounded-xl border border-primary/20">
                <strong className="text-primary block mb-1">Extracted PDF Syllabus Text:</strong>
                <p className="text-muted-foreground whitespace-pre-line max-h-32 overflow-y-auto">{course.content}</p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Btn
                variant="soft"
                className="px-3 py-1 text-xs"
                onClick={() => handleApprove(course.id)}
              >
                Approve
              </Btn>
              <button
                onClick={() => handleReject(course.id)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-secondary"
              >
                Reject
              </button>
            </div>
          </Card>
        ))}
        {courses.length === 0 && (
          <div className="md:col-span-2 py-12 text-center text-muted-foreground">
            No courses pending approval at the moment.
          </div>
        )}
      </div>
    </>
  );
}

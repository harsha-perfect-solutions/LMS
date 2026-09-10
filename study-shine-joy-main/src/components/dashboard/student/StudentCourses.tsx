import { useState, useEffect } from "react";
import {
  Loader,
  Search,
  PlayCircle,
  FileText,
  Youtube,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  Layers,
  FileQuestion,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Clock,
  Award,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { type Course, type Quiz, type Assignment, api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn } from "../../shared/UIPrimitives";
import { DynamicCourseCard } from "../../shared/DisplayCards";
import { StudentQuizzes } from "./StudentQuizzes";
import { StudentAssignments } from "./StudentAssignments";
import { CourseDiscussionForum } from "../shared/CourseDiscussionForum";

type CourseTab = "modules" | "quizzes" | "assignments" | "discussion" | "analytics";

export function StudentCourses() {
  const { user } = useAuth();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [myAttemptedQuizIds, setMyAttemptedQuizIds] = useState<number[]>([]);
  const [mySubmittedAssignIds, setMySubmittedAssignIds] = useState<number[]>([]);
  const [allCourseContentMap, setAllCourseContentMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [mainTab, setMainTab] = useState<"enrolled" | "explore">("enrolled");
  useEffect(() => {
    // Purge legacy un-scoped quiz and assignment completion keys from localStorage
    try {
      Object.keys(localStorage).forEach((key) => {
        if (
          (key.startsWith("quiz_completed_") && !key.match(/^quiz_completed_\d+_\d+$/)) ||
          (key.startsWith("assignment_submitted_") && !key.match(/^assignment_submitted_\d+_\d+$/))
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses();
      let courses: Course[] = [];
      if (res.success && res.data) {
        courses = Array.isArray(res.data) ? res.data : [];
        setAllCourses(courses);
      }

      // Fetch quizzes, assignments, and student attempts/submissions to compute real-time progress
      const quizRes = await api.getQuizzes();
      if (quizRes.success && quizRes.data) {
        setAllQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
      }

      const assignRes = await api.getAssignments();
      if (assignRes.success && assignRes.data) {
        setAllAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
      }

      const myAttRes = await api.getMyQuizAttempts();
      if (myAttRes.success && Array.isArray(myAttRes.data)) {
        const qIds = myAttRes.data.map((att: any) => Number(att.quizId)).filter(Boolean);
        setMyAttemptedQuizIds(qIds);
      }

      const subsRes = await api.getSubmissions();
      if (subsRes.success && Array.isArray(subsRes.data)) {
        const aIds = subsRes.data.map((sub: any) => Number(sub.assignmentId)).filter(Boolean);
        setMySubmittedAssignIds(aIds);
      }

      // Fetch exact content files for enrolled courses to ensure matching module item counts
      const contentMap: Record<number, any[]> = {};
      for (const c of courses) {
        try {
          const cRes = await api.getCourseContent(c.id.toString());
          if (cRes.success && Array.isArray(cRes.data)) {
            contentMap[c.id] = cRes.data;
          }
        } catch (e) {
          // ignore error
        }
      }
      setAllCourseContentMap(contentMap);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmEnroll = window.confirm("Are you sure you want to enroll in this course?");
    if (!confirmEnroll) return;

    try {
      const res = await api.enrollCourse(courseId.toString());
      if (res.success) {
        await fetchCourses();
        alert("Successfully enrolled in the course!");
      } else {
        alert("Enrollment failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isEnrolled = (c: Course) => {
    if (!user || !c || !c.enrolledStudentIds) return false;
    const uId = user.userId || user.id;
    if (!uId) return false;
    return Array.isArray(c.enrolledStudentIds) && c.enrolledStudentIds.some((id) => String(id) === String(uId));
  };

  // Compute real-time dynamic course progress percentage using identical module structure
  const getRealtimeCourseProgress = (c: Course) => {
    const cIdStr = c.id.toString();
    const cContent = allCourseContentMap[c.id] || [];
    const cQuizzes = allQuizzes.filter((q: any) => String(q.courseId) === cIdStr);
    const cAssigns = allAssignments.filter((a: any) => String(a.courseId) === cIdStr);

    const unified: any[] = [];
    if (c.pdfUrl) {
      unified.push({ itemType: "SYLLABUS_PDF", id: 999999 });
    }
    cContent.forEach((f) => {
      unified.push({ itemType: "FILE", id: f.id });
    });
    cQuizzes.forEach((q) => {
      unified.push({ itemType: "QUIZ", id: q.id });
    });
    cAssigns.forEach((a) => {
      unified.push({ itemType: "ASSIGNMENT", id: a.id });
    });

    if (unified.length === 0) return 0;

    let completed = 0;
    unified.forEach((item) => {
      if (item.itemType === "SYLLABUS_PDF" || item.itemType === "FILE") {
        if (c.completedContentIds?.includes(item.id)) {
          completed++;
        }
      } else if (item.itemType === "QUIZ") {
        if (myAttemptedQuizIds.includes(item.id) || (user?.id && Boolean(localStorage.getItem(`quiz_completed_${user.id}_${item.id}`)))) {
          completed++;
        }
      } else if (item.itemType === "ASSIGNMENT") {
        if (mySubmittedAssignIds.includes(item.id) || (user?.id && Boolean(localStorage.getItem(`assignment_submitted_${user.id}_${item.id}`)))) {
          completed++;
        }
      }
    });

    return Math.min(100, Math.max(0, Math.round((completed / unified.length) * 100)));
  };

  const myCourses = allCourses
    .filter(isEnrolled)
    .filter(
      (c) =>
        (c.name || c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const matchesStudentProfileClient = (c: Course) => {
    if (!user) return true;
    if (c.branch && c.branch !== "ALL" && user.branch) {
      if (c.branch.toLowerCase() !== user.branch.toLowerCase()) return false;
    }
    if (c.year && c.year !== "ALL" && user.year) {
      if (c.year.toLowerCase() !== user.year.toLowerCase()) return false;
    }
    if (c.sem && c.sem !== "ALL" && user.sem) {
      const cSem = c.sem.toLowerCase();
      const uSem = user.sem.toLowerCase();
      if (cSem !== uSem && !cSem.includes(uSem) && !uSem.includes(cSem)) return false;
    }
    if (c.section && c.section !== "ALL" && user.section) {
      const cSec = c.section.toUpperCase();
      const uSec = user.section.toUpperCase();
      if (cSec !== uSec && cSec !== `SECTION ${uSec}` && !cSec.endsWith(uSec)) return false;
    }
    return true;
  };

  const exploreCourses = allCourses
    .filter((c) => c.status?.toUpperCase() === "APPROVED" && !isEnrolled(c))
    .filter(matchesStudentProfileClient)
    .filter(
      (c) =>
        (c.name || c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (selectedCourse) {
    return (
      <StudentCourseWorkspace
        course={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          fetchCourses();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Course Management"
        subtitle="Manage enrolled courses and explore new courses."
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search courses…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        }
      />

      {/* 2 MAIN TABS BAR (Enrolled Courses vs Explore New Courses Side-by-Side) */}
      <div className="border-b border-border bg-card rounded-2xl shadow-sm p-1.5 mb-6">
        <nav className="flex w-full items-center justify-between">
          <button
            onClick={() => setMainTab("enrolled")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all rounded-xl relative ${
              mainTab === "enrolled"
                ? "bg-primary-soft text-primary shadow-sm"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <BookOpen className={`h-4 w-4 ${mainTab === "enrolled" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Enrolled Courses</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-extrabold">
              {myCourses.length} active
            </span>
            {mainTab === "enrolled" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => setMainTab("explore")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all rounded-xl relative ${
              mainTab === "explore"
                ? "bg-primary-soft text-primary shadow-sm"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Search className={`h-4 w-4 ${mainTab === "explore" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Explore New Courses</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
              {exploreCourses.length} available
            </span>
            {mainTab === "explore" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: ENROLLED COURSES */}
      {mainTab === "enrolled" && (
        <section>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myCourses.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {myCourses.map((c) => (
                <div key={c.id} onClick={() => setSelectedCourse(c)} className="cursor-pointer relative group">
                  <DynamicCourseCard course={{ ...c, progress: getRealtimeCourseProgress(c) }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="text-sm font-bold text-foreground mb-1">No Enrolled Courses Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                You haven't enrolled in any courses yet. Switch to "Explore New Courses" tab to enroll!
              </p>
              <button
                onClick={() => setMainTab("explore")}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-glow hover:bg-primary/90 transition"
              >
                Explore New Courses &rarr;
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: EXPLORE NEW COURSES */}
      {mainTab === "explore" && (
        <section>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : exploreCourses.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {exploreCourses.map((c) => (
                <div key={c.id} className="relative group">
                  <DynamicCourseCard course={c} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-2xl z-10">
                    <button
                      className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black shadow-xl hover:scale-105 transition transform"
                      onClick={(e) => handleEnroll(c.id, e)}
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="text-sm font-bold text-foreground mb-1">No New Courses Available</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No new courses available to explore right now. All available courses are enrolled!
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/* ========================================================================= */
/* STUDENT DETAILED COURSE WORKSPACE (4 TABS SPREAD ACROSS THE SCREEN)       */
/* ========================================================================= */
function StudentCourseWorkspace({ course: initialCourse, onBack }: { course: Course; onBack: () => void }) {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course>(initialCourse);
  const [activeTab, setActiveTab] = useState<CourseTab>("modules");
  const [contentList, setContentList] = useState<any[]>([]);
  const [quizzesList, setQuizzesList] = useState<Quiz[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<Assignment[]>([]);
  const [completedQuizIds, setCompletedQuizIds] = useState<number[]>([]);
  const [submittedAssignIds, setSubmittedAssignIds] = useState<number[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [myQuizAttempts, setMyQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch course specific materials, quizzes, and assignments
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        setLoading(true);
        const cIdStr = course.id.toString();

        // 1. Fetch Course Content Files
        const contentRes = await api.getCourseContent(cIdStr);
        if (contentRes.success && contentRes.data) {
          setContentList(Array.isArray(contentRes.data) ? contentRes.data : []);
        }

        // 2. Fetch Quizzes for this course and check student attempts
        const quizRes = await api.getQuizzes();
        const attemptedQIds: number[] = [];
        if (quizRes.success && quizRes.data) {
          const allQuizzes = Array.isArray(quizRes.data) ? quizRes.data : [];
          const cQuizzes = allQuizzes.filter((q: any) => String(q.courseId) === cIdStr);
          setQuizzesList(cQuizzes);

          // Fetch student's own attempts directly from DB
          const myAttemptsRes = await api.getMyQuizAttempts();
          if (myAttemptsRes.success && Array.isArray(myAttemptsRes.data)) {
            setMyQuizAttempts(myAttemptsRes.data);
            myAttemptsRes.data.forEach((att: any) => {
              if (att.quizId) {
                attemptedQIds.push(Number(att.quizId));
                if (user?.id) localStorage.setItem(`quiz_completed_${user.id}_${att.quizId}`, "true");
              }
            });
          }

          cQuizzes.forEach((q: any) => {
            if (user?.id && localStorage.getItem(`quiz_completed_${user.id}_${q.id}`) && !attemptedQIds.includes(q.id)) {
              attemptedQIds.push(q.id);
            }
          });
        }
        setCompletedQuizIds(attemptedQIds);

        // 3. Fetch Assignments for this course and student's submissions
        const assignRes = await api.getAssignments();
        const subsRes = await api.getSubmissions();
        const submittedAIds: number[] = [];
        let userSubs: any[] = [];

        if (subsRes.success && Array.isArray(subsRes.data)) {
          userSubs = subsRes.data;
          setMySubmissions(userSubs);
          userSubs.forEach((sub: any) => {
            if (sub.assignmentId) {
              submittedAIds.push(Number(sub.assignmentId));
              if (user?.id) localStorage.setItem(`assignment_submitted_${user.id}_${sub.assignmentId}`, "true");
            }
          });
        }

        if (assignRes.success && assignRes.data) {
          const allAssign = Array.isArray(assignRes.data) ? assignRes.data : [];
          const cAssigns = allAssign.filter((a: any) => String(a.courseId) === cIdStr);
          setAssignmentsList(cAssigns);

          cAssigns.forEach((a: any) => {
            if (user?.id && localStorage.getItem(`assignment_submitted_${user.id}_${a.id}`) && !submittedAIds.includes(a.id)) {
              submittedAIds.push(a.id);
            }
          });
        }
        setSubmittedAssignIds(submittedAIds);
      } catch (err) {
        console.error("Error loading course workspace:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [course.id]);

  // Refetch submissions & quiz attempts when switching to analytics tab
  useEffect(() => {
    if (activeTab === "analytics") {
      const refreshAnalytics = async () => {
        try {
          const [subsRes, myAttemptsRes] = await Promise.all([
            api.getSubmissions(),
            api.getMyQuizAttempts()
          ]);
          if (subsRes.success && Array.isArray(subsRes.data)) {
            setMySubmissions(subsRes.data);
          }
          if (myAttemptsRes.success && Array.isArray(myAttemptsRes.data)) {
            setMyQuizAttempts(myAttemptsRes.data);
          }
        } catch (e) {
          console.error("Failed to refresh analytics scores:", e);
        }
      };
      refreshAnalytics();
    }
  }, [activeTab]);

  const handleMarkComplete = async (contentId: number) => {
    if (course.completedContentIds?.includes(contentId)) return;
    try {
      const res = await api.markContentComplete(course.id.toString(), contentId.toString());
      if (res.success && res.data?.course) {
        setCourse(res.data.course);
      } else {
        // Fallback local completion update
        setCourse((prev) => ({
          ...prev,
          completedContentIds: [...(prev.completedContentIds || []), contentId],
        }));
      }
    } catch (err) {
      console.error("Failed to mark content as complete:", err);
      setCourse((prev) => ({
        ...prev,
        completedContentIds: [...(prev.completedContentIds || []), contentId],
      }));
    }
  };

  // Combine files, quizzes, and assignments into a single sequential list for Tab 1 (Content / Modules)
  const unifiedModules: any[] = [];

  // Add course PDF syllabus if available
  if (course.pdfUrl) {
    unifiedModules.push({
      itemType: "SYLLABUS_PDF",
      id: 999999,
      title: `${course.title || course.name} Official Syllabus PDF`,
      subText: "PDF Syllabus Document",
      link: `${API_BASE_URL.replace("/api", "")}${course.pdfUrl}`,
    });
  }

  // Add course materials (videos/PDFs)
  contentList.forEach((f) => {
    unifiedModules.push({
      itemType: "FILE",
      id: f.id,
      title: f.name,
      subText: f.type === "youtube" ? "YouTube Video Resource" : f.type === "video" ? "Media Video" : "PDF Document",
      type: f.type,
      link: f.link,
    });
  });

  // Add published quizzes
  quizzesList.forEach((q) => {
    unifiedModules.push({
      itemType: "QUIZ",
      id: q.id,
      quizObj: q,
      title: `${q.title} (Published Quiz)`,
      subText: `${q.totalQuestions || q.questions?.length || 0} Questions · ${q.totalMarks || 20} Marks · ${q.timeLimit || 15} Mins`,
    });
  });

  // Add published assignments
  assignmentsList.forEach((a) => {
    const formattedDeadline = a.deadline
      ? new Date(a.deadline).toLocaleDateString()
      : a.createdAt
      ? new Date(a.createdAt).toLocaleDateString()
      : "28/08/2026";

    unifiedModules.push({
      itemType: "ASSIGNMENT",
      id: a.id,
      assignObj: a,
      title: `${a.title} (Published Assignment)`,
      subText: `Due: ${formattedDeadline} · ${a.totalMarks || 100} Marks`,
    });
  });

  // Helper to check if a specific item in unifiedModules is genuinely completed by THIS student
  const isItemCompleted = (item: any) => {
    if (item.itemType === "SYLLABUS_PDF" || item.itemType === "FILE") {
      return Boolean(item.id && course.completedContentIds?.includes(item.id));
    }
    if (item.itemType === "QUIZ") {
      return Boolean(
        completedQuizIds.includes(item.id) ||
        (user?.id && localStorage.getItem(`quiz_completed_${user.id}_${item.id}`))
      );
    }
    if (item.itemType === "ASSIGNMENT") {
      return Boolean(
        submittedAssignIds.includes(item.id) ||
        (user?.id && localStorage.getItem(`assignment_submitted_${user.id}_${item.id}`))
      );
    }
    return false;
  };

  // Dynamic progress calculation based strictly on actual completed items
  const totalModuleItems = unifiedModules.length;
  const completedModuleItems = unifiedModules.filter((item) => isItemCompleted(item)).length;
  const dynamicProgress = totalModuleItems > 0
    ? Math.round((completedModuleItems / totalModuleItems) * 100)
    : (course.progress || 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Btn variant="soft" onClick={onBack} className="rounded-xl px-4 py-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Btn>
      </div>

      {/* Course Banner Info Header with Dynamic Progress */}
      <Card className="bg-gradient-to-r from-primary/5 via-card to-card border-primary/20 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {course.code || "COURSE"}
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">
                ENROLLED
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">{course.title || course.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {course.description || "Course materials, quizzes, assignments, and analytics."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm font-bold text-primary">{dynamicProgress}% Complete</span>
            <div className="h-2.5 w-36 overflow-hidden rounded-full bg-secondary border border-border">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${dynamicProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 4 WORKSPACE TAB NAVIGATION SPREAD ACROSS THE SCREEN */}
      <div className="border-b border-border bg-card rounded-2xl shadow-sm p-1.5">
        <nav className="flex w-full items-center justify-between">
          {[
            { id: "modules" as CourseTab, label: "Content / Modules", icon: Layers },
            { id: "quizzes" as CourseTab, label: "Quizzes", icon: FileQuestion },
            { id: "assignments" as CourseTab, label: "Assignments", icon: ClipboardList },
            { id: "discussion" as CourseTab, label: "Discussion Forum", icon: MessageSquare },
            { id: "analytics" as CourseTab, label: "Analytics", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all rounded-xl relative ${
                  isActive
                    ? "bg-primary-soft text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: CONTENT / MODULES */}
      {activeTab === "modules" && (
        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <h3 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-primary" /> Course Materials & Modules
            </h3>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-md">
              {unifiedModules.length} Items ({completedModuleItems} Completed)
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : unifiedModules.length > 0 ? (
            <div className="space-y-3">
              {unifiedModules.map((item, idx) => {
                const seqNum = String(idx + 1).padStart(2, "0");
                const isDone = isItemCompleted(item);

                if (item.itemType === "SYLLABUS_PDF" || item.itemType === "FILE") {
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                          : "border-border bg-card hover:bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center">{seqNum}</span>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-500"
                              : item.type === "youtube"
                              ? "bg-red-500/10 text-red-500"
                              : item.type === "video"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : item.type === "youtube" ? (
                            <Youtube className="h-5 w-5" />
                          ) : item.type === "video" ? (
                            <PlayCircle className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {item.title}
                            {isDone && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                                <CheckCircle2 className="h-3 w-3" /> Completed
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.subText}</div>
                        </div>
                      </div>

                      <a
                        href={
                          item.link && item.link.startsWith("http")
                            ? item.link
                            : item.link
                            ? `${API_BASE_URL.replace("/api", "")}${item.link}`
                            : "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => item.id && handleMarkComplete(item.id)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition shadow-sm ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {isDone
                          ? "View Again ✓"
                          : item.type === "pdf" || item.itemType === "SYLLABUS_PDF"
                          ? "View PDF"
                          : "Open Media"}
                      </a>
                    </div>
                  );
                }

                if (item.itemType === "QUIZ") {
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                          : "border-border bg-card hover:bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center">{seqNum}</span>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-display font-extrabold text-lg ${
                            isDone ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/20 text-primary"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : "Q"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground flex items-center gap-2">
                            {item.title}
                            {isDone ? (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                                Attempted & Completed ✓
                              </span>
                            ) : (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                Published Quiz
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{item.subText}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("quizzes")}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                            : "bg-primary text-white shadow-glow hover:bg-primary/90"
                        }`}
                      >
                        {isDone ? "View Quiz Results →" : "Take Quiz →"}
                      </button>
                    </div>
                  );
                }

                if (item.itemType === "ASSIGNMENT") {
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                          : "border-border bg-card hover:bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center">{seqNum}</span>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-display font-extrabold text-lg ${
                            isDone ? "bg-emerald-500/20 text-emerald-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : "A"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground flex items-center gap-2">
                            {item.title}
                            {isDone ? (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                                Submitted ✓
                              </span>
                            ) : (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                Published Assignment
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{item.subText}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("assignments")}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                            : "bg-primary text-white shadow-glow hover:bg-primary/90"
                        }`}
                      >
                        {isDone ? "View Submission →" : "View Assignment →"}
                      </button>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No content, quizzes, or assignments uploaded for this course yet.
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: QUIZZES */}
      {activeTab === "quizzes" && (
        <Card className="p-6 shadow-soft">
          <StudentQuizzes course={course} />
        </Card>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <Card className="p-6 shadow-soft">
          <StudentAssignments course={course} />
        </Card>
      )}

      {/* TAB 4: DISCUSSION FORUM */}
      {activeTab === "discussion" && (
        <CourseDiscussionForum course={course} />
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Card 1: Assignment Performance Analytics */}
          <Card className="p-6 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-5 w-5 text-primary" /> Assignment Performance Analytics
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your score performance across assignments in {course.title || course.name}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Course Completion: {dynamicProgress}%
              </span>
            </div>

            {/* Performance Bar Chart */}
            <div className="h-72 w-full pt-2">
              {(() => {
                const studentSubmittedAssignments = assignmentsList
                  .map((a) => {
                    const sub = mySubmissions.find((s: any) => 
                      String(s.assignmentId || s.assignment_id || s.AssignmentId) === String(a.id)
                    );
                    const isSubmitted =
                      Boolean(sub) ||
                      submittedAssignIds.includes(a.id) ||
                      Boolean(user?.id && localStorage.getItem(`assignment_submitted_${user.id}_${a.id}`));

                    const rawMarks = sub?.marks ?? sub?.score ?? sub?.grade;
                    const hasGradedMarks = sub && sub.status === "GRADED" && rawMarks !== undefined && rawMarks !== null && rawMarks !== "" && Number(rawMarks) >= 0;
                    const marks = hasGradedMarks ? Number(rawMarks) : 0;
                    const isGraded = hasGradedMarks;

                    return {
                      ...a,
                      isSubmitted,
                      isGraded,
                      marks,
                    };
                  })
                  .filter((a) => a.isSubmitted);

                if (studentSubmittedAssignments.length === 0) {
                  return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-semibold text-foreground">No submitted assignment grades yet.</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Submit your assignments in the "Assignments" tab to view your score performance analytics after faculty evaluation.
                      </p>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={studentSubmittedAssignments.map((a, idx) => {
                        const name = a.title.toLowerCase().includes("assignment")
                          ? `Assignment ${idx + 1}`
                          : a.title.length > 18
                          ? `${a.title.slice(0, 18)}...`
                          : a.title;
                        return {
                          name,
                          fullName: a.title,
                          marks: a.marks,
                          totalMarks: a.totalMarks || 100,
                          isGraded: a.isGraded,
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1">
                                <div className="font-bold text-foreground">{data.fullName}</div>
                                <div className="text-primary font-bold text-sm">
                                  {data.isGraded
                                    ? `Score: ${data.marks} / ${data.totalMarks} Marks`
                                    : `Submitted (Pending Evaluation)`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="marks" fill="var(--color-primary)" radius={[8, 8, 0, 0]} maxBarSize={55} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </Card>

          {/* Card 2: Quiz Performance Analytics */}
          <Card className="p-6 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
                  <FileQuestion className="h-5 w-5 text-emerald-500" /> Quiz Performance Analytics
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your score performance across attempted quizzes in {course.title || course.name}
                </p>
              </div>
            </div>

            {/* Quiz Performance Bar Chart */}
            <div className="h-72 w-full pt-2">
              {(() => {
                const attemptedQuizzes = quizzesList
                  .map((q) => {
                    const att = myQuizAttempts.find((a: any) => String(a.quizId) === String(q.id));
                    const isDone = Boolean(
                      att ||
                      completedQuizIds.includes(q.id) ||
                      (user?.id && localStorage.getItem(`quiz_completed_${user.id}_${q.id}`))
                    );
                    const marks = att && typeof att.marks === "number" ? Number(att.marks) : (typeof q.marks === "number" ? Number(q.marks) : 0);

                    return {
                      ...q,
                      isDone,
                      marks,
                    };
                  })
                  .filter((q) => q.isDone);

                if (attemptedQuizzes.length === 0) {
                  return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                      <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-semibold text-foreground">No attempted quiz performance records yet.</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Take your course quizzes in the "Quizzes" tab to view your score performance analytics.
                      </p>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attemptedQuizzes.map((q, idx) => {
                        const name = q.title.toLowerCase().includes("quiz")
                          ? `Quiz ${idx + 1}`
                          : q.title.length > 18
                          ? `${q.title.slice(0, 18)}...`
                          : q.title;
                        return {
                          name,
                          fullName: q.title,
                          marks: q.marks,
                          totalMarks: q.totalMarks || 20,
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 20]} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1">
                                <div className="font-bold text-foreground">{data.fullName}</div>
                                <div className="text-primary font-bold text-sm">
                                  Score: {data.marks} / {data.totalMarks} Marks
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="marks" fill="var(--color-primary)" radius={[8, 8, 0, 0]} maxBarSize={55} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

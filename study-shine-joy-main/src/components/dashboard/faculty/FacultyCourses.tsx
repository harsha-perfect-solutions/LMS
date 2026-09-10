import { useState, useEffect } from "react";
import {
  Loader,
  BookOpen,
  X,
  FileText,
  Upload,
  Download,
  PlayCircle,
  Youtube,
  Plus,
  ArrowLeft,
  Users,
  FileCheck,
  ClipboardList,
  FileQuestion,
  CalendarCheck,
  Megaphone,
  MessageSquare,
  BarChart3,
  Layers,
  CloudUpload,
  AlertTriangle
} from "lucide-react";
import { type Course, api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn, StatusPill } from "../../shared/UIPrimitives";
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

// Sub-module components for tabbed course workspace
import { FacultyQuizzes } from "./FacultyQuizzes";
import { FacultyAssignments } from "./FacultyAssignments";
import { FacultySubmissions } from "./FacultySubmissions";
import { FacultyAttendance } from "./FacultyAttendance";
import { FacultyAnnouncements } from "./FacultyAnnouncements";
import { CourseDiscussionForum } from "../shared/CourseDiscussionForum";

type ContentType = "UPLOAD_VIDEO" | "YOUTUBE_URL" | "PDF_NOTES";
type CourseTab = "modules" | "quizzes" | "assignments" | "submissions" | "attendance" | "announcements" | "discussion" | "analytics";

export function FacultyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal dialog states
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);

  // New Course form states
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [branch, setBranch] = useState(user?.branch || "CSE");
  const [year, setYear] = useState("3rd Year");
  const [sem, setSem] = useState("5th Sem");
  const [section, setSection] = useState("Section A");
  const [regulation, setRegulation] = useState("VR23");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submittingCourse, setSubmittingCourse] = useState(false);

  const getSemestersForYear = (selectedYear: string) => {
    switch (selectedYear) {
      case "1st Year":
        return ["1st Sem", "2nd Sem"];
      case "2nd Year":
        return ["3rd Sem", "4th Sem"];
      case "3rd Year":
        return ["5th Sem", "6th Sem"];
      case "4th Year":
        return ["7th Sem", "8th Sem"];
      default:
        return ["1st Sem", "2nd Sem"];
    }
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    const availableSems = getSemestersForYear(newYear);
    setSem(availableSems[0]);
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setPdfFile(null);
      setPdfError(null);
      return;
    }
    const fileNameLower = file.name.toLowerCase();
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";

    if (!isPdf) {
      setPdfFile(null);
      e.target.value = "";
      const errMsg = "Upload only .pdf format files for Course Content syllabus.";
      setPdfError(errMsg);
      alert(`🚫 ${errMsg}`);
      return;
    }

    setPdfFile(file);
    setPdfError(null);
  };

  // Selected course workspace state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<CourseTab>("modules");
  const [courseContents, setCourseContents] = useState<any[]>([]);
  const [courseQuizzes, setCourseQuizzes] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [allQuizAttempts, setAllQuizAttempts] = useState<any[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [isAddQuizOpen, setIsAddQuizOpen] = useState(false);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);

  // Upload Content form states inside course
  const [contentType, setContentType] = useState<ContentType>("UPLOAD_VIDEO");
  const [contentName, setContentName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentFileError, setContentFileError] = useState<string | null>(null);
  const [uploadingContent, setUploadingContent] = useState(false);

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType);
    setContentFile(null);
    setContentFileError(null);
  };

  const handleContentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setContentFile(null);
      setContentFileError(null);
      return;
    }
    const fileNameLower = file.name.toLowerCase();

    if (contentType === "UPLOAD_VIDEO") {
      const isVideo =
        fileNameLower.endsWith(".mp4") ||
        fileNameLower.endsWith(".webm") ||
        fileNameLower.endsWith(".mkv") ||
        fileNameLower.endsWith(".avi") ||
        fileNameLower.endsWith(".mov") ||
        fileNameLower.endsWith(".m4v") ||
        file.type.startsWith("video/");

      if (!isVideo) {
        setContentFile(null);
        e.target.value = "";
        const errMsg = "Upload only valid video format files (.mp4, .webm, .mkv, .avi, .mov).";
        setContentFileError(errMsg);
        alert(`🚫 ${errMsg}`);
        return;
      }
    }

    if (contentType === "PDF_NOTES") {
      const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";
      if (!isPdf) {
        setContentFile(null);
        e.target.value = "";
        const errMsg = "Upload only .pdf format files for PDF Document / Notes.";
        setContentFileError(errMsg);
        alert(`🚫 ${errMsg}`);
        return;
      }
    }

    setContentFile(file);
    setContentFileError(null);
  };

  // Enrolled Students Modal state
  const [isEnrolledModalOpen, setIsEnrolledModalOpen] = useState(false);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState<any[]>([]);
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false);

  const handleOpenEnrolledModal = async () => {
    if (!selectedCourse) return;
    setIsEnrolledModalOpen(true);
    setLoadingEnrolledStudents(true);
    try {
      const res = await api.getCourseStudents(selectedCourse.id.toString());
      if (res.success && Array.isArray(res.data)) {
        setEnrolledStudentsList(res.data);
      } else {
        setEnrolledStudentsList([]);
      }
    } catch (err) {
      console.error("Error fetching enrolled students:", err);
      setEnrolledStudentsList([]);
    } finally {
      setLoadingEnrolledStudents(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses();
      if (res.success && res.data) {
        const facultyId = Number(user?.userId || user?.id || 0);
        setCourses(
          Array.isArray(res.data)
            ? res.data.filter(
                (course) =>
                  (course.facultyId === facultyId || user?.role === "admin") &&
                  course.status?.toUpperCase() !== "REJECTED"
              )
            : []
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user?.id, user?.userId, user?.role]);

  // Fetch content files for the selected course
  const fetchCourseContents = async (courseId: number) => {
    try {
      setContentsLoading(true);
      const res = await api.getCourseContent(courseId.toString());
      if (res.success && res.data) {
        setCourseContents(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Error fetching course contents:", err);
    } finally {
      setContentsLoading(false);
    }
  };

  // Fetch published quizzes for the selected course
  const fetchCourseQuizzes = async (courseId: number) => {
    try {
      const res = await api.getQuizzes();
      if (res.success && res.data) {
        const allQuizzes = Array.isArray(res.data) ? res.data : [];
        setCourseQuizzes(allQuizzes.filter((q: any) => String(q.courseId) === String(courseId)));
      }
    } catch (err) {
      console.error("Error fetching course quizzes:", err);
    }
  };

  // Fetch published assignments for the selected course
  const fetchCourseAssignments = async (courseId: number) => {
    try {
      const res = await api.getAssignments();
      if (res.success && res.data) {
        const allAssignments = Array.isArray(res.data) ? res.data : [];
        setCourseAssignments(allAssignments.filter((a: any) => String(a.courseId) === String(courseId)));
      }
    } catch (err) {
      console.error("Error fetching course assignments:", err);
    }
  };

  useEffect(() => {
    if (selectedCourse && activeTab === "analytics") {
      const loadAnalyticsData = async () => {
        try {
          // 1. Fetch latest quizzes for the selected course
          const quizzesRes = await api.getQuizzes();
          const loadedQuizzes = quizzesRes.success && Array.isArray(quizzesRes.data)
            ? quizzesRes.data.filter((q: any) => String(q.courseId) === String(selectedCourse.id))
            : courseQuizzes;
          if (quizzesRes.success && Array.isArray(quizzesRes.data)) {
            setCourseQuizzes(loadedQuizzes);
          }

          // 2. Fetch latest assignments for the selected course
          const assignRes = await api.getAssignments();
          if (assignRes.success && Array.isArray(assignRes.data)) {
            setCourseAssignments(
              assignRes.data.filter((a: any) => String(a.courseId) === String(selectedCourse.id))
            );
          }

          // 3. Fetch all assignment submissions
          const subsRes = await api.getSubmissions();
          if (subsRes.success && subsRes.data) {
            setAllSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
          }

          // 4. Fetch quiz attempts: try getAllQuizAttempts first, fallback to per-quiz getQuizAttempts
          let combinedAttempts: any[] = [];
          const allAttemptsRes = await api.getAllQuizAttempts();
          if (allAttemptsRes.success && Array.isArray(allAttemptsRes.data) && allAttemptsRes.data.length > 0) {
            combinedAttempts = allAttemptsRes.data;
          }

          // Fallback or augment with per-quiz attempts to guarantee all student attempt records are captured
          if (loadedQuizzes.length > 0) {
            const attemptPromises = loadedQuizzes.map((q: any) => api.getQuizAttempts(q.id.toString()));
            const attemptResults = await Promise.all(attemptPromises);
            attemptResults.forEach((res) => {
              if (res.success && Array.isArray(res.data)) {
                res.data.forEach((att: any) => {
                  if (!combinedAttempts.some((existing: any) => String(existing.id) === String(att.id))) {
                    combinedAttempts.push(att);
                  }
                });
              }
            });
          }

          setAllQuizAttempts(combinedAttempts);
        } catch (err) {
          console.error("Error loading faculty analytics:", err);
        }
      };

      loadAnalyticsData();
    }
  }, [selectedCourse, activeTab]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab("modules");
    setIsAddContentOpen(false);
    setIsAddQuizOpen(false);
    setIsAddAssignmentOpen(false);
    fetchCourseContents(course.id);
    fetchCourseQuizzes(course.id);
    fetchCourseAssignments(course.id);
  };

  const handleCreateCourse = async () => {
    if (!title || !code) {
      alert("Please enter both Course Title and Course Code.");
      return;
    }
    if (!pdfFile) {
      alert("Please upload the official Course Content PDF file.");
      return;
    }

    try {
      setSubmittingCourse(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("code", code);
      formData.append("description", description);
      formData.append("branch", branch || "ALL");
      formData.append("year", year || "ALL");
      formData.append("sem", sem || "ALL");
      formData.append("section", section || "ALL");
      formData.append("regulation", regulation || "ALL");
      formData.append("pdf", pdfFile);

      const res = await api.createCourse(formData);
      if (res.success) {
        setTitle("");
        setCode("");
        setDescription("");
        setBranch(user?.branch || "CSE");
        setYear("3rd Year");
        setSem("5th Sem");
        setSection("Section A");
        setRegulation("VR23");
        setPdfFile(null);
        setPdfError(null);
        setIsAddCourseOpen(false);
        await fetchCourses();
        alert("Course created and PDF syllabus processed successfully!");
      } else {
        alert("Failed to create course: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error creating course:", err);
      alert("Error creating course: " + err.message);
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleAddContentSubmit = async () => {
    if (!selectedCourse) return;
    if (!contentName) {
      alert("Please enter a title for the content.");
      return;
    }

    setUploadingContent(true);
    try {
      if (contentType === "YOUTUBE_URL") {
        if (!youtubeUrl) {
          alert("Please enter a valid YouTube URL.");
          setUploadingContent(false);
          return;
        }
        const res = await api.submitContentLink(selectedCourse.id.toString(), {
          name: contentName,
          url: youtubeUrl,
        });
        if (res.success) {
          setContentName("");
          setYoutubeUrl("");
          setIsAddContentOpen(false);
          await fetchCourseContents(selectedCourse.id);
        } else {
          alert("Failed to add YouTube link: " + res.error);
        }
      } else {
        if (!contentFile) {
          alert("Please select a file to upload.");
          setUploadingContent(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", contentFile);
        formData.append("name", contentName);
        formData.append("type", contentType === "UPLOAD_VIDEO" ? "video" : "pdf");

        const res = await api.uploadCourseContent(selectedCourse.id.toString(), formData);
        if (res.success) {
          setContentName("");
          setContentFile(null);
          setContentFileError(null);
          setIsAddContentOpen(false);
          await fetchCourseContents(selectedCourse.id);
        } else {
          alert("Upload failed: " + res.error);
        }
      }
    } catch (err: any) {
      console.error("Content upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingContent(false);
    }
  };

  // Dynamic Top Action Button config
  const getTopButtonLabel = () => {
    switch (activeTab) {
      case "quizzes":
        return "Add Quiz";
      case "assignments":
        return "Add Assignment";
      case "submissions":
        return "Grade Submission";
      case "attendance":
        return "Mark Attendance";
      case "announcements":
        return "Add Announcement";
      case "discussion":
        return "Post Discussion Topic";
      default:
        return "Add Content";
    }
  };

  const handleTopButtonClick = () => {
    if (activeTab === "quizzes") {
      setIsAddQuizOpen(true);
    } else if (activeTab === "assignments") {
      setIsAddAssignmentOpen(true);
    } else if (activeTab === "announcements") {
      setIsAddAnnouncementOpen(true);
    } else {
      setIsAddContentOpen(true);
    }
  };

  const handleTabChange = (tabId: CourseTab) => {
    setActiveTab(tabId);
  };

  // =========================================================================
  // DETAILED COURSE WORKSPACE VIEW (When a course card is opened)
  // =========================================================================
  if (selectedCourse) {
    return (
      <div className="space-y-6">
        {/* Top Header & Navigation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn variant="soft" onClick={() => setSelectedCourse(null)} className="rounded-xl px-4 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </Btn>
          {activeTab !== "attendance" && activeTab !== "announcements" && activeTab !== "discussion" && (
            <Btn onClick={handleTopButtonClick} className="text-xs font-bold shadow-glow">
              <Plus className="h-4 w-4" /> {getTopButtonLabel()}
            </Btn>
          )}
        </div>

        {/* Course Banner Info Header */}
        <Card className="bg-gradient-to-r from-primary/5 via-card to-card border-primary/20 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {selectedCourse.code}
                </span>
                <StatusPill status={selectedCourse.status || "APPROVED"} />
                {selectedCourse.pdfUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <FileText className="h-3 w-3" /> PDF Syllabus Attached
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold font-display text-foreground">{selectedCourse.title}</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{selectedCourse.description}</p>
            </div>
            <button
              onClick={handleOpenEnrolledModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
              title="Click to view list of enrolled students"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>{(selectedCourse.enrolledStudentIds || []).length || selectedCourse.studentCount || 0} Enrolled Students (Click to View)</span>
            </button>
          </div>
        </Card>

        {/* Sub-Modules Tabs Bar */}
        <div className="border-b border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pb-1 w-full">
            {[
              { id: "modules", label: "Content / Modules", icon: Layers },
              { id: "quizzes", label: "Quizzes", icon: FileQuestion },
              { id: "assignments", label: "Assignments & Correction", icon: ClipboardList },
              { id: "attendance", label: "Attendance", icon: CalendarCheck },
              { id: "announcements", label: "Announcements", icon: Megaphone },
              { id: "discussion", label: "Discussion Forum", icon: MessageSquare },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as CourseTab)}
                  className={`flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-3 text-[13px] font-semibold rounded-t-xl transition text-center border-b-2 w-full ${
                    active
                      ? "border-primary text-primary bg-primary/10 shadow-sm"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === "modules" && (
          <Card className="p-6 shadow-soft">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" /> Course Materials & Modules
              </h3>
              <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                {(selectedCourse.pdfUrl ? 1 : 0) + courseContents.length + courseQuizzes.length + courseAssignments.length} Items
              </span>
            </div>

            <div className="space-y-4">
              {/* Item #01: Course Syllabus PDF */}
              {selectedCourse.pdfUrl && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 transition hover:bg-emerald-500/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-xs">
                        01
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-500" />
                          Official Course Syllabus & Master Content PDF
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded during course creation. Download to view complete course outline and syllabus notes.
                        </p>
                      </div>
                    </div>

                    <a
                      href={`${API_BASE_URL}${selectedCourse.pdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-600 transition"
                    >
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </a>
                  </div>
                </div>
              )}

              {/* Uploaded Video/PDF Materials */}
              {courseContents.map((content: any, idx: number) => {
                const seqNum = String((selectedCourse.pdfUrl ? 1 : 0) + idx + 1).padStart(2, "0");
                return (
                  <div
                    key={content.id}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                          {seqNum}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            {content.type === "UPLOAD_VIDEO" && <PlayCircle className="h-4 w-4 text-primary" />}
                            {content.type === "YOUTUBE_URL" && <Youtube className="h-4 w-4 text-red-500" />}
                            {content.type === "PDF_NOTES" && <FileText className="h-4 w-4 text-emerald-500" />}
                            {content.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {content.type.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {content.fileUrl && (
                        <a
                          href={`${API_BASE_URL}${content.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> View / Download
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quizzes List */}
              {courseQuizzes.map((quiz: any, idx: number) => {
                const seqNum = String((selectedCourse.pdfUrl ? 1 : 0) + courseContents.length + idx + 1).padStart(2, "0");
                return (
                  <div
                    key={`quiz-${quiz.id}`}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:border-emerald-500/40 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                          {seqNum}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <FileQuestion className="h-4 w-4 text-emerald-500" />
                            {quiz.title} (Published Quiz)
                          </h4>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {quiz.questions?.length || quiz.totalQuestions || 5} Questions • {quiz.totalMarks || 20} Marks
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTabChange("quizzes")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-600 transition"
                      >
                        View Quiz &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Assignments List */}
              {courseAssignments.map((assign: any, idx: number) => {
                const seqNum = String((selectedCourse.pdfUrl ? 1 : 0) + courseContents.length + courseQuizzes.length + idx + 1).padStart(2, "0");
                return (
                  <div
                    key={`assign-${assign.id}`}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                          {seqNum}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            {assign.title} (Published Assignment)
                          </h4>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            Due: {assign.dueDate || "No deadline"} • {assign.totalMarks || 100} Marks
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTabChange("assignments")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90 transition"
                      >
                        View Assignment &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}

              {!selectedCourse.pdfUrl && courseContents.length === 0 && courseQuizzes.length === 0 && courseAssignments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                  No content files uploaded yet. Click "+ Add Content" at the top to add study resources.
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "quizzes" && (
          <FacultyQuizzes
            course={selectedCourse}
            isAddQuizOpen={isAddQuizOpen}
            onCloseModal={() => setIsAddQuizOpen(false)}
            onQuizCreated={() => {
              fetchCourseContents(selectedCourse.id);
              fetchCourseQuizzes(selectedCourse.id);
              fetchCourseAssignments(selectedCourse.id);
            }}
          />
        )}
        {activeTab === "assignments" && (
          <FacultyAssignments
            course={selectedCourse}
            isAddAssignmentOpen={isAddAssignmentOpen}
            onCloseModal={() => setIsAddAssignmentOpen(false)}
            onAssignmentCreated={() => {
              fetchCourseContents(selectedCourse.id);
              fetchCourseQuizzes(selectedCourse.id);
              fetchCourseAssignments(selectedCourse.id);
            }}
          />
        )}
        {activeTab === "attendance" && <FacultyAttendance course={selectedCourse} />}
        {activeTab === "announcements" && (
          <FacultyAnnouncements
            course={selectedCourse}
            isAddAnnouncementOpen={isAddAnnouncementOpen}
            onCloseModal={() => setIsAddAnnouncementOpen(false)}
            onAnnouncementCreated={() => {
              fetchCourseContents(selectedCourse.id);
            }}
          />
        )}
        {activeTab === "discussion" && (
          <CourseDiscussionForum course={selectedCourse} />
        )}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <Card className="p-6 shadow-soft">
              <h3 className="text-base font-bold mb-4 font-display flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" /> Course Overview Metrics
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="text-xs text-muted-foreground font-semibold">Total Enrolled</div>
                  <div className="text-2xl font-bold text-primary mt-1">{selectedCourse.studentCount || 0} Students</div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="text-xs text-muted-foreground font-semibold font-display">Total Course Materials</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {(selectedCourse.pdfUrl ? 1 : 0) + courseContents.length + courseQuizzes.length + courseAssignments.length} Items
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="text-xs text-muted-foreground font-semibold">Course Status</div>
                  <div className="text-2xl font-bold text-emerald-500 mt-1">{selectedCourse.status || "APPROVED"}</div>
                </div>
              </div>
            </Card>

            {/* Assignments Average Score Bar Chart */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-5 w-5 text-primary" /> Assignment Average Scores Analytics
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Class performance breakdown across published course assignments.
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {courseAssignments.length} Published Assignments
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                {(() => {
                  const chartData = courseAssignments
                    .map((a) => {
                      const assignSubs = allSubmissions.filter((s: any) => String(s.assignmentId) === String(a.id));
                      const graded = assignSubs.filter((s: any) => typeof s.marks === "number" && s.marks >= 0);
                      const avgScore = graded.length > 0
                        ? Math.round(graded.reduce((acc: number, cur: any) => acc + Number(cur.marks), 0) / graded.length)
                        : 0;

                      return {
                        name: a.title.length > 16 ? `${a.title.slice(0, 16)}...` : a.title,
                        fullName: a.title,
                        avgScore: avgScore,
                        totalMarks: a.totalMarks || 100,
                        submissionsCount: assignSubs.length,
                        gradedCount: graded.length,
                        isGraded: graded.length > 0,
                      };
                    })
                    .filter((item) => item.isGraded);

                  if (chartData.length === 0) {
                    return (
                      <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold text-foreground">No graded assignment submissions yet.</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Grade student assignment submissions in the "Assignments & Correction" tab to view real class score analytics.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                    Average Score: {data.avgScore} / {data.totalMarks} Marks
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    {data.gradedCount} Graded Student Submission(s)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgScore" radius={[8, 8, 0, 0]} maxBarSize={55}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "var(--color-primary)" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </Card>

            {/* Quiz Average Scores Bar Chart */}
            <Card className="p-6 shadow-soft space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
                    <FileQuestion className="h-5 w-5 text-emerald-500" /> Quiz Average Scores Analytics
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Class performance breakdown across attempted course quizzes.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  {courseQuizzes.length} Published Quizzes
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                {(() => {
                  const quizChartData = courseQuizzes
                    .map((q) => {
                      const quizAttempts = allQuizAttempts.filter((att: any) => String(att.quizId) === String(q.id));
                      const latestAttemptsMap = new Map();
                      quizAttempts.forEach((att: any) => {
                        const sId = String(att.studentId);
                        if (!latestAttemptsMap.has(sId)) {
                          latestAttemptsMap.set(sId, att);
                        }
                      });
                      const uniqueAttempts = Array.from(latestAttemptsMap.values());
                      const gradedMarks = uniqueAttempts.map((att: any) => {
                        const isMalpractice = Boolean(att.malpractice || (att.tabSwitches && Number(att.tabSwitches) > 0));
                        return isMalpractice ? 0 : Number(att.marks || 0);
                      });
                      const avgScore = gradedMarks.length > 0
                        ? Math.round(gradedMarks.reduce((acc, cur) => acc + cur, 0) / gradedMarks.length)
                        : 0;
                      const totalMarks = Number(q.totalMarks || 20);

                      return {
                        name: q.title.length > 16 ? `${q.title.slice(0, 16)}...` : q.title,
                        fullName: q.title,
                        avgScore: avgScore,
                        totalMarks: totalMarks,
                        attemptsCount: uniqueAttempts.length,
                        hasAttempts: uniqueAttempts.length > 0,
                      };
                    })
                    .filter((item) => item.hasAttempts);

                  if (quizChartData.length === 0) {
                    return (
                      <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold text-foreground">No attempted quiz performance records yet.</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Once enrolled students attempt course quizzes in the "Quizzes" tab, class score averages will automatically calculate and display here.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quizChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                  <div className="text-emerald-500 font-bold text-sm">
                                    Class Average Score: {data.avgScore} / {data.totalMarks} Marks
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    {data.attemptsCount} Student Attempt(s)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgScore" radius={[8, 8, 0, 0]} maxBarSize={55}>
                          {quizChartData.map((_, index) => (
                            <Cell key={`cell-quiz-${index}`} fill={index % 2 === 0 ? "#10b981" : "var(--color-primary)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* UPLOAD CONTENT DIALOG BOX / MODAL OVERLAY (Matches Screenshot #3) */}
        {/* ========================================================================= */}
        {isAddContentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold font-display text-foreground">Upload content</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage course materials (Videos, PDF notes, YouTube links).
                  </p>
                </div>
                <button
                  onClick={() => setIsAddContentOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* SELECT COURSE (Read Only) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Select Course
                  </label>
                  <input
                    readOnly
                    value={`${selectedCourse.title} (${selectedCourse.code})`}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold text-foreground cursor-not-allowed outline-none"
                  />
                </div>

                {/* CONTENT TYPE */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => handleContentTypeChange(e.target.value as ContentType)}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                  >
                    <option value="UPLOAD_VIDEO">01. Upload Video</option>
                    <option value="PDF_NOTES">02. PDF Document / Notes</option>
                    <option value="YOUTUBE_URL">03. YouTube Video Link</option>
                  </select>
                </div>

                {/* CONTENT TITLE */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Content Title *
                  </label>
                  <input
                    value={contentName}
                    onChange={(e) => setContentName(e.target.value)}
                    placeholder="e.g. Introduction to React"
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                  />
                </div>

                {/* FILE / YOUTUBE INPUT */}
                {contentType === "YOUTUBE_URL" ? (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      YouTube Link URL *
                    </label>
                    <input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      {contentType === "UPLOAD_VIDEO" ? "Video File (.mp4, .webm, .mkv, .avi, .mov) *" : "PDF File (.pdf Only) *"}
                    </label>
                    <div className={`flex items-center gap-3 rounded-xl border ${contentFileError ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-card'} px-3 py-2 text-sm`}>
                      <input
                        type="file"
                        accept={contentType === "UPLOAD_VIDEO" ? "video/*,.mp4,.webm,.mkv,.avi,.mov" : "application/pdf,.pdf"}
                        onChange={handleContentFileSelect}
                        className="w-full text-xs text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground hover:file:bg-secondary/80"
                      />
                    </div>

                    {/* Explicit Red Error Box directly below file input */}
                    {contentFileError && (
                      <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/15 p-3 rounded-xl border border-destructive/30 shadow-sm animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        <span>{contentFileError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <div className="flex justify-center pt-3">
                  <Btn
                    onClick={handleAddContentSubmit}
                    disabled={uploadingContent}
                    className="px-8 py-3 text-sm font-semibold rounded-full min-w-[220px] justify-center shadow-glow"
                  >
                    {uploadingContent ? "Uploading Content..." : "Add Course Content"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ENROLLED STUDENTS LIST MODAL (INSIDE COURSE WORKSPACE) */}
        {isEnrolledModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Enrolled Students List
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students enrolled in {selectedCourse.title} ({selectedCourse.code})
                  </p>
                </div>
                <button
                  onClick={() => setIsEnrolledModalOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingEnrolledStudents ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudentsList.length > 0 ? (
                    enrolledStudentsList.map((st: any) => (
                      <div key={st.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3.5 hover:bg-secondary/30 transition">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-sm">
                            {st.name ? st.name[0].toUpperCase() : "S"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{st.name}</div>
                            <div className="text-xs text-muted-foreground">{st.email}</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-500">
                          Active Enrolled ✓
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
                      No enrolled students found for this course yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN COURSE MANAGEMENT VIEW (Card List + Add New Course Modal)
  // =========================================================================
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl text-foreground">Course Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create, teach, and manage your courses and learning resources.
          </p>
        </div>
        <Btn onClick={() => setIsAddCourseOpen(true)} className="rounded-xl px-4 py-2.5 text-xs font-bold shadow-glow">
          <Plus className="h-4 w-4" /> Add New Course
        </Btn>
      </div>

      {/* Your Created Courses (Card Grid) */}
      <section>
        <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-primary" /> Your Created Courses
          </h3>
          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md">
            {courses.length} Courses
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course.id}
                onClick={() => handleSelectCourse(course)}
                className="group relative cursor-pointer border border-border bg-card p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {course.code || "COURSE"}
                    </span>
                    <StatusPill status={course.status || "APPROVED"} />
                  </div>

                  {/* Branch, Year, Sem, Section & Regulation Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[10px] uppercase font-bold tracking-wider">
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

                  <h4 className="font-display text-lg font-bold group-hover:text-primary transition line-clamp-1">
                    {course.title}
                  </h4>

                  {course.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    {course.pdfUrl ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                        <FileText className="h-3.5 w-3.5" /> PDF Syllabus Attached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                        No PDF
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                      <Users className="h-3.5 w-3.5" /> {course.studentCount || 0} Students
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                    Manage Course Workspace &rarr;
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h4 className="text-base font-bold text-foreground mb-1">No courses created yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Click "+ Add New Course" above to create your first teaching course and upload its PDF syllabus.
            </p>
            <Btn onClick={() => setIsAddCourseOpen(true)} className="rounded-xl px-4 py-2 text-xs">
              <Plus className="h-4 w-4" /> Add New Course
            </Btn>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* CREATE NEW COURSE DIALOG BOX / MODAL OVERLAY (Matches Screenshot #1 & #2) */}
      {/* ========================================================================= */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-lg font-bold font-display flex items-center gap-2 text-foreground">
                <BookOpen className="h-5 w-5 text-primary" /> Create New Course
              </h3>
              <button
                onClick={() => setIsAddCourseOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Course Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title (e.g., Java Programming Course)"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Course Code *
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Course code (e.g., JAVA101)"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                />
              </div>

              {/* Target Department Branch */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Department / Branch *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["CSE", "AI & ML", "AI & DS", "IT", "ECE", "EEE", "MECH", "CIVIL"].map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBranch(b)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                        branch === b
                          ? "bg-primary text-primary-foreground shadow-sm scale-105"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Courses submitted for <strong>{branch}</strong> will route directly to the <strong>{branch} HOD</strong> for approval.
                </p>
              </div>

              {/* Target Academic Year */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Academic Year *
                </label>
                <select
                  value={year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40 transition"
                >
                  <option value="1st Year">1st Year (1st & 2nd Sem)</option>
                  <option value="2nd Year">2nd Year (3rd & 4th Sem)</option>
                  <option value="3rd Year">3rd Year (5th & 6th Sem)</option>
                  <option value="4th Year">4th Year (7th & 8th Sem)</option>
                </select>
              </div>

              {/* Target Semester (Dynamic options based on selected year) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Semester * <span className="text-[10px] text-primary font-normal">(Dynamic for {year})</span>
                </label>
                <select
                  value={sem}
                  onChange={(e) => setSem(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40 transition"
                >
                  {getSemestersForYear(year).map((sOption) => (
                    <option key={sOption} value={sOption}>
                      {sOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Section */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Section *
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40 transition"
                >
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                </select>
              </div>

              {/* Academic Regulation Input */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Academic Regulation
                </label>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40 transition"
                >
                  <option value="VR23">VR23</option>
                  <option value="VR21">VR21</option>
                  <option value="AR23">AR23</option>
                  <option value="AR21">AR21</option>
                  <option value="R20">R20</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description & Overview
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Course Description & Overview"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                />
              </div>

              {/* PDF Syllabus Upload Box (Strict PDF Validation & Red Warning Banner) */}
              <div className="sm:col-span-2 space-y-2">
                <div
                  className={`rounded-2xl border-2 border-dashed ${
                    pdfError
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10"
                  } p-6 text-center transition group`}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    id="modal-course-pdf-upload"
                    onChange={handlePdfSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="modal-course-pdf-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <CloudUpload
                      className={`h-9 w-9 ${
                        pdfError ? "text-destructive" : "text-primary"
                      } mb-2 group-hover:scale-110 transition-transform`}
                    />
                    <span className="text-sm font-bold text-foreground">
                      {pdfFile ? `📄 Attached PDF: ${pdfFile.name}` : "Upload Course Content (PDF File Only)"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 max-w-md">
                      {pdfFile
                        ? `Size: ${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB · Strictly PDF document ready`
                        : "Click to select the official course syllabus PDF document (.pdf). Non-PDF formats are strictly rejected."}
                    </span>
                  </label>
                </div>

                {/* Explicit Red Error Box directly below Upload Dropzone */}
                {pdfError && (
                  <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/15 p-3 rounded-xl border border-destructive/30 shadow-sm animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    <span>{pdfError}</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 pt-2">
                <Btn
                  onClick={handleCreateCourse}
                  disabled={submittingCourse}
                  className="w-full py-3 text-sm font-semibold rounded-xl justify-center text-center"
                >
                  {submittingCourse ? "Processing PDF & Creating Course..." : "Create course"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENROLLED STUDENTS LIST MODAL */}
      {isEnrolledModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Enrolled Students List
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Students enrolled in {selectedCourse.title} ({selectedCourse.code})
                </p>
              </div>
              <button
                onClick={() => setIsEnrolledModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingEnrolledStudents ? (
              <div className="flex justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {enrolledStudentsList.length > 0 ? (
                  enrolledStudentsList.map((st: any) => (
                    <div key={st.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3.5 hover:bg-secondary/30 transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-sm">
                          {st.name ? st.name[0].toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{st.name}</div>
                          <div className="text-xs text-muted-foreground">{st.email}</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-500">
                        Active Enrolled ✓
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
                    No enrolled students found for this course yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

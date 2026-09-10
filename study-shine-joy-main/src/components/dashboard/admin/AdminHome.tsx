import { useState, useEffect } from "react";
import { Loader, HelpCircle, FileCheck, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { type Course, type AdminStats, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn } from "../../shared/UIPrimitives";

export function AdminHome() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === "admin@example.com";
  const hodBranch = currentUser?.branch || "";

  const [stats, setStats] = useState<{ label: string; value: number | string; delta: string }[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{
    quizzes: any[];
    assignments: any[];
    attendance: any[];
    stats: {
      totalQuizModules: number;
      quizAvg: number;
      completedQuizzesCount: number;
      totalAssignments: number;
      assignmentAvg: number;
      totalSubmissionsCount: number;
      overallAttendanceRate: number;
      totalAttendanceSessions: number;
    };
  }>({
    quizzes: [],
    assignments: [],
    attendance: [],
    stats: {
      totalQuizModules: 0,
      quizAvg: 0,
      completedQuizzesCount: 0,
      totalAssignments: 0,
      assignmentAvg: 0,
      totalSubmissionsCount: 0,
      overallAttendanceRate: 0,
      totalAttendanceSessions: 0,
    }
  });

  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Drilldown Selected States
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);

  const handleQuizClick = (data: any) => {
    if (selectedQuiz) return;
    if (!data) return;
    const item = data.payload || (data.activePayload && data.activePayload[0] && data.activePayload[0].payload) || (data.period ? data : null);
    if (item && item.period) {
      setSelectedQuiz(item);
    }
  };

  const handleAssignmentClick = (data: any) => {
    if (selectedAssignment) return;
    if (!data) return;
    const item = data.payload || (data.activePayload && data.activePayload[0] && data.activePayload[0].payload) || (data.period ? data : null);
    if (item && item.period) {
      setSelectedAssignment(item);
    }
  };

  const handleAttendanceClick = (data: any) => {
    if (selectedAttendance) return;
    if (!data) return;
    const item = data.payload || (data.activePayload && data.activePayload[0] && data.activePayload[0].payload) || (data.period ? data : null);
    if (item && item.period) {
      setSelectedAttendance(item);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, coursesRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getCourses(),
        api.getUsers()
      ]);

      let scopedUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      if (!isSuperAdmin && hodBranch) {
        scopedUsers = scopedUsers.filter((u: any) => u.branch === hodBranch);
      }

      if (statsRes.success && statsRes.data) {
        const data = statsRes.data as AdminStats;
        const totalUCount = scopedUsers.length || data.totalUsers;
        const activeUCount = scopedUsers.filter((u: any) => u.active).length || data.activeUsers;

        setStats([
          { label: "Department Users", value: totalUCount, delta: `${activeUCount} active` },
          {
            label: "Active Courses",
            value: data.approvedCourses,
            delta: "Active",
          },
          {
            label: "Total Assignments",
            value: data.totalAssignments,
            delta: `${data.totalSubmissions} submissions`,
          },
          { label: "System Health", value: "98%", delta: "Stable" },
        ]);
      }

      if (coursesRes.success && coursesRes.data) {
        const rawCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        const pendingOnly = rawCourses.filter((course) => course.status?.toUpperCase() === "PENDING");
        const scopedPending = (!isSuperAdmin && hodBranch)
          ? pendingOnly.filter((c) => !c.branch || c.branch === "ALL" || c.branch === hodBranch)
          : pendingOnly;
        setCourses(scopedPending);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await api.getEnrollmentTrend("overall");
      if (res.success && res.data) {
        let rawQuizzes = Array.isArray(res.data.quizzes) ? res.data.quizzes : [];
        let rawAssignments = Array.isArray(res.data.assignments) ? res.data.assignments : [];
        let rawAttendance = Array.isArray(res.data.attendance) ? res.data.attendance : [];

        if (!isSuperAdmin && hodBranch) {
          rawQuizzes = rawQuizzes.filter((q: any) => !q.branch || q.branch === "ALL" || q.branch === hodBranch);
          rawAssignments = rawAssignments.filter((a: any) => !a.branch || a.branch === "ALL" || a.branch === hodBranch);
          rawAttendance = rawAttendance.filter((at: any) => !at.branch || at.branch === "ALL" || at.branch === hodBranch);
        }

        setAnalyticsData({
          quizzes: rawQuizzes,
          assignments: rawAssignments,
          attendance: rawAttendance,
          stats: res.data.stats || {
            totalQuizModules: 0,
            quizAvg: 0,
            completedQuizzesCount: 0,
            totalAssignments: 0,
            assignmentAvg: 0,
            totalSubmissionsCount: 0,
            overallAttendanceRate: 0,
            totalAttendanceSessions: 0,
          }
        });
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnalyticsData();
  }, []);

  const handleApprove = async (courseId: number) => {
    const res = await api.approveCourse(courseId.toString());
    if (res.success) await fetchData();
  };

  const handleReject = async (courseId: number) => {
    const res = await api.rejectCourse(courseId.toString(), "Rejected by admin");
    if (res.success) await fetchData();
  };

  return (
    <>
      <PageHeader title="System overview" subtitle="Real-time live analytics for Quizzes, Assignments, and Attendance." />

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="mt-1 font-display text-3xl font-bold">{stat.value}</div>
            <div className="mt-1 text-xs text-success-foreground">{stat.delta}</div>
          </Card>
        ))}
      </div>

      {/* 3 REAL BAR CHARTS GRID (DYNAMIC OVERALL ANALYTICS & DRILLDOWN) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* GRAPH 1: QUIZZES ANALYTICS BAR CHART */}
        <Card className="space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-500" /> Quiz Modules Analytics
              </h3>
              {selectedQuiz ? (
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-xs font-bold hover:bg-amber-600"
                >
                  ← Back
                </button>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                  {analyticsData.stats.totalQuizModules || analyticsData.quizzes.length} Modules
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedQuiz ? `Student marks for "${selectedQuiz.period}"` : "Average marks per quiz module. Click bar for student breakdown."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-center flex-1 border border-amber-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedQuiz ? "Module Avg" : "Overall Avg Quiz"}</div>
              <div className="text-xl font-extrabold text-amber-500">{selectedQuiz ? `${selectedQuiz.quizAvg}%` : `${analyticsData.stats.quizAvg}%`}</div>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-center flex-1 border border-purple-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedQuiz ? "Attempts" : "Total Attempts"}</div>
              <div className="text-xl font-extrabold text-purple-500">{selectedQuiz ? (selectedQuiz.individualItems?.length || 0) : analyticsData.stats.completedQuizzesCount}</div>
            </div>
          </div>

          {/* Bar Chart 1 */}
          <div className="h-72 w-full pt-2">
            {analyticsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : selectedQuiz && (!selectedQuiz.individualItems || selectedQuiz.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-amber-500/30 rounded-xl p-4 text-center">
                <div className="text-xs font-bold text-foreground">No student attempts for "{selectedQuiz.period}".</div>
                <button onClick={() => setSelectedQuiz(null)} className="mt-2 text-xs text-amber-500 underline font-bold">← Back to All Modules</button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedQuiz ? selectedQuiz.individualItems : analyticsData.quizzes}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(e) => handleQuizClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="period" stroke="var(--color-muted-foreground)" tick={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      selectedQuiz ? `${val}% (${item.payload.rawMarks || 0}/${selectedQuiz.totalMarks || 20} marks)` : `${val}%`,
                      selectedQuiz ? "Student Score" : "Avg Quiz Score"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar 
                    dataKey="quizAvg" 
                    name={selectedQuiz ? `Student Score (%)` : "Avg Quiz Score (%) [Click bar to view]"} 
                    fill="#f59e0b" 
                    radius={[6, 6, 0, 0]} 
                    className="cursor-pointer"
                    onClick={(entry) => handleQuizClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* GRAPH 2: ASSIGNMENTS ANALYTICS BAR CHART */}
        <Card className="space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-500" /> Assignment Analytics
              </h3>
              {selectedAssignment ? (
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-xs font-bold hover:bg-emerald-600"
                >
                  ← Back
                </button>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                  {analyticsData.stats.totalAssignments || analyticsData.assignments.length} Assignments
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedAssignment ? `Student marks for "${selectedAssignment.period}"` : "Average marks per assignment. Click bar for student breakdown."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-center flex-1 border border-emerald-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedAssignment ? "Module Avg" : "Overall Assignment Avg"}</div>
              <div className="text-xl font-extrabold text-emerald-500">{selectedAssignment ? `${selectedAssignment.assignmentAvg}%` : `${analyticsData.stats.assignmentAvg}%`}</div>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-center flex-1 border border-indigo-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedAssignment ? "Submissions" : "Total Submissions"}</div>
              <div className="text-xl font-extrabold text-indigo-500">{selectedAssignment ? (selectedAssignment.individualItems?.length || 0) : analyticsData.stats.totalSubmissionsCount}</div>
            </div>
          </div>

          {/* Bar Chart 2 */}
          <div className="h-72 w-full pt-2">
            {analyticsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-5 w-5 animate-spin text-emerald-500" />
              </div>
            ) : selectedAssignment && (!selectedAssignment.individualItems || selectedAssignment.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-emerald-500/30 rounded-xl p-4 text-center">
                <div className="text-xs font-bold text-foreground">No submissions for "{selectedAssignment.period}".</div>
                <button onClick={() => setSelectedAssignment(null)} className="mt-2 text-xs text-emerald-500 underline font-bold">← Back to All Assignments</button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedAssignment ? selectedAssignment.individualItems : analyticsData.assignments}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(e) => handleAssignmentClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="period" stroke="var(--color-muted-foreground)" tick={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      selectedAssignment ? `${val}% (${item.payload.rawMarks || 0}/${selectedAssignment.totalMarks || 100} marks)` : `${val}%`,
                      selectedAssignment ? "Student Marks" : "Avg Assignment Marks"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar 
                    dataKey="assignmentAvg" 
                    name={selectedAssignment ? `Student Marks (%)` : "Avg Assignment Marks (%) [Click bar to view]"} 
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]} 
                    className="cursor-pointer"
                    onClick={(entry) => handleAssignmentClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* GRAPH 3: ATTENDANCE ANALYTICS BAR CHART */}
        <Card className="space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-sky-500" /> Attendance Analytics
              </h3>
              {selectedAttendance ? (
                <button
                  onClick={() => setSelectedAttendance(null)}
                  className="rounded-full bg-sky-500 text-white px-2.5 py-0.5 text-xs font-bold hover:bg-sky-600"
                >
                  ← Back
                </button>
              ) : (
                <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-500">
                  {analyticsData.stats.overallAttendanceRate}% Rate
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedAttendance ? `Student attendance for date "${selectedAttendance.period}"` : "Overall student attendance percentage. Click bar for breakdown."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 text-center flex-1 border border-sky-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedAttendance ? "Session Rate" : "Overall Rate"}</div>
              <div className="text-xl font-extrabold text-sky-500">{selectedAttendance ? `${selectedAttendance.attendanceRate}%` : `${analyticsData.stats.overallAttendanceRate}%`}</div>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-center flex-1 border border-blue-500/20">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{selectedAttendance ? "Students Marked" : "Total Sessions"}</div>
              <div className="text-xl font-extrabold text-blue-500">{selectedAttendance ? (selectedAttendance.individualItems?.length || 0) : analyticsData.stats.totalAttendanceSessions}</div>
            </div>
          </div>

          {/* Bar Chart 3 */}
          <div className="h-72 w-full pt-2">
            {analyticsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-5 w-5 animate-spin text-sky-500" />
              </div>
            ) : selectedAttendance && (!selectedAttendance.individualItems || selectedAttendance.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-sky-500/30 rounded-xl p-4 text-center">
                <div className="text-xs font-bold text-foreground">No records for date "{selectedAttendance.period}".</div>
                <button onClick={() => setSelectedAttendance(null)} className="mt-2 text-xs text-sky-500 underline font-bold">← Back to All Dates</button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedAttendance ? selectedAttendance.individualItems : analyticsData.attendance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(e) => handleAttendanceClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="period" stroke="var(--color-muted-foreground)" tick={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any) => [
                      selectedAttendance ? (val > 0 ? "PRESENT (100%)" : "ABSENT (0%)") : `${val}%`,
                      selectedAttendance ? "Attendance Status" : "Attendance Rate"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar 
                    dataKey="attendanceRate" 
                    name={selectedAttendance ? `Student Attendance` : "Attendance Rate (%) [Click bar to view]"} 
                    fill="#0284c7" 
                    radius={[6, 6, 0, 0]} 
                    className="cursor-pointer"
                    onClick={(entry) => handleAttendanceClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Department Pending Course Approvals (For Branch HODs) */}
      {!isSuperAdmin && hodBranch && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Pending Course Approvals ({hodBranch} Department)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review course registration proposals submitted by {hodBranch} faculty.
                </p>
              </div>
              {courses.length > 0 && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {courses.length} Pending Approval
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-border bg-secondary/40 p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-foreground">{course.title} ({course.code})</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Faculty: {course.facultyName || "Faculty"}</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Btn
                        variant="soft"
                        className="px-3 py-1 text-xs flex-1 justify-center font-bold"
                        onClick={() => handleApprove(course.id)}
                      >
                        Approve Course
                      </Btn>
                      <button
                        onClick={() => handleReject(course.id)}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-secondary flex-1 text-center"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground col-span-full italic">
                    No pending course registration approvals for {hodBranch} department.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

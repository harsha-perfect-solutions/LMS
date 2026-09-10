import { useState, useEffect, useMemo } from "react";
import { Loader, HelpCircle, FileCheck, CalendarCheck, Download } from "lucide-react";
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card } from "../../shared/UIPrimitives";

export function AdminReports() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === "admin@example.com";
  const hodBranch = currentUser?.branch || "";

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
  
  // Drilldown Selected States
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);

  // Quiz Filter States (Default: "Overall" or hodBranch)
  const [quizYearFilter, setQuizYearFilter] = useState("Overall");
  const [quizBranchFilter, setQuizBranchFilter] = useState(hodBranch || "Overall");
  const [quizSemFilter, setQuizSemFilter] = useState("Overall");
  const [quizRegulationFilter, setQuizRegulationFilter] = useState("Overall");

  // Assignment Filter States (Default: "Overall" or hodBranch)
  const [assignmentYearFilter, setAssignmentYearFilter] = useState("Overall");
  const [assignmentBranchFilter, setAssignmentBranchFilter] = useState(hodBranch || "Overall");
  const [assignmentSemFilter, setAssignmentSemFilter] = useState("Overall");
  const [assignmentRegulationFilter, setAssignmentRegulationFilter] = useState("Overall");

  // Attendance Filter States (Default: "Overall" or hodBranch)
  const [attendanceYearFilter, setAttendanceYearFilter] = useState("Overall");
  const [attendanceBranchFilter, setAttendanceBranchFilter] = useState(hodBranch || "Overall");
  const [attendanceSemFilter, setAttendanceSemFilter] = useState("Overall");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("Overall");

  useEffect(() => {
    if (!isSuperAdmin && hodBranch) {
      setQuizBranchFilter(hodBranch);
      setAssignmentBranchFilter(hodBranch);
      setAttendanceBranchFilter(hodBranch);
    }
  }, [isSuperAdmin, hodBranch]);

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

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        const res = await api.getEnrollmentTrend("overall");
        if (res.success && res.data) {
          setAnalyticsData({
            quizzes: Array.isArray(res.data.quizzes) ? res.data.quizzes : [],
            assignments: Array.isArray(res.data.assignments) ? res.data.assignments : [],
            attendance: Array.isArray(res.data.attendance) ? res.data.attendance : [],
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
        console.error("Error fetching reports analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, []);

  // Filtered Quizzes & Dynamic Calculations
  const filteredQuizzes = useMemo(() => {
    return analyticsData.quizzes.filter((q) => {
      if (quizYearFilter !== "Overall" && q.year !== quizYearFilter) return false;
      if (quizBranchFilter !== "Overall" && q.branch !== quizBranchFilter) return false;
      if (quizSemFilter !== "Overall" && q.sem !== quizSemFilter) return false;
      if (quizRegulationFilter !== "Overall" && q.regulation !== quizRegulationFilter) return false;
      return true;
    });
  }, [analyticsData.quizzes, quizYearFilter, quizBranchFilter, quizSemFilter, quizRegulationFilter]);

  const quizAvgScore = useMemo(() => {
    if (selectedQuiz) return selectedQuiz.quizAvg;
    if (filteredQuizzes.length === 0) return 0;
    const total = filteredQuizzes.reduce((acc, curr) => acc + (curr.quizAvg || 0), 0);
    return Math.round(total / filteredQuizzes.length);
  }, [selectedQuiz, filteredQuizzes]);

  const quizTotalAttempts = useMemo(() => {
    if (selectedQuiz) return selectedQuiz.individualItems?.length || 0;
    return filteredQuizzes.reduce((acc, curr) => acc + (curr.completedAttempts || 0), 0);
  }, [selectedQuiz, filteredQuizzes]);

  const quizModulesTracked = useMemo(() => {
    if (selectedQuiz) return selectedQuiz.totalMarks || 20;
    return filteredQuizzes.length;
  }, [selectedQuiz, filteredQuizzes]);

  // Filtered Assignments & Dynamic Calculations
  const filteredAssignments = useMemo(() => {
    return analyticsData.assignments.filter((a) => {
      if (assignmentYearFilter !== "Overall" && a.year !== assignmentYearFilter) return false;
      if (assignmentBranchFilter !== "Overall" && a.branch !== assignmentBranchFilter) return false;
      if (assignmentSemFilter !== "Overall" && a.sem !== assignmentSemFilter) return false;
      if (assignmentRegulationFilter !== "Overall" && a.regulation !== assignmentRegulationFilter) return false;
      return true;
    });
  }, [analyticsData.assignments, assignmentYearFilter, assignmentBranchFilter, assignmentSemFilter, assignmentRegulationFilter]);

  const assignmentAvgScore = useMemo(() => {
    if (selectedAssignment) return selectedAssignment.assignmentAvg;
    if (filteredAssignments.length === 0) return 0;
    const total = filteredAssignments.reduce((acc, curr) => acc + (curr.assignmentAvg || 0), 0);
    return Math.round(total / filteredAssignments.length);
  }, [selectedAssignment, filteredAssignments]);

  const assignmentTotalSubmissions = useMemo(() => {
    if (selectedAssignment) return selectedAssignment.individualItems?.length || 0;
    return filteredAssignments.reduce((acc, curr) => acc + (curr.totalSubmissions || 0), 0);
  }, [selectedAssignment, filteredAssignments]);

  const assignmentModulesTracked = useMemo(() => {
    if (selectedAssignment) return selectedAssignment.totalMarks || 100;
    return filteredAssignments.length;
  }, [selectedAssignment, filteredAssignments]);

  // Filtered Attendance & Dynamic Calculations
  const availableAttendanceDates = useMemo(() => {
    const dates = analyticsData.attendance.map((a) => a.period).filter(Boolean);
    return Array.from(new Set(dates));
  }, [analyticsData.attendance]);

  const filteredAttendance = useMemo(() => {
    return analyticsData.attendance.filter((att) => {
      if (attendanceYearFilter !== "Overall" && att.year !== attendanceYearFilter) return false;
      if (attendanceBranchFilter !== "Overall" && att.branch !== attendanceBranchFilter) return false;
      if (attendanceSemFilter !== "Overall" && att.sem !== attendanceSemFilter) return false;
      if (attendanceDateFilter !== "Overall" && att.period !== attendanceDateFilter) return false;
      return true;
    });
  }, [analyticsData.attendance, attendanceYearFilter, attendanceBranchFilter, attendanceSemFilter, attendanceDateFilter]);

  const attendanceAvgRate = useMemo(() => {
    if (selectedAttendance) return selectedAttendance.attendanceRate;
    if (filteredAttendance.length === 0) return 0;
    const total = filteredAttendance.reduce((acc, curr) => acc + (curr.attendanceRate || 0), 0);
    return Math.round(total / filteredAttendance.length);
  }, [selectedAttendance, filteredAttendance]);

  const attendanceTotalSessionsCount = useMemo(() => {
    if (selectedAttendance) return selectedAttendance.individualItems?.length || 0;
    return filteredAttendance.length;
  }, [selectedAttendance, filteredAttendance]);

  // CSV Export Utility Functions
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sanitizeCSVField = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const exportQuizCSV = () => {
    let csv = "";
    if (selectedQuiz) {
      csv += `Quiz Title: ${selectedQuiz.period}\n`;
      csv += `Max Marks: ${selectedQuiz.totalMarks || 20}\n`;
      csv += `Average Score (%): ${selectedQuiz.quizAvg}%\n\n`;
      csv += "Student Name,Percentage (%),Raw Marks,Max Marks\n";
      (selectedQuiz.individualItems || []).forEach((item: any) => {
        csv += `${sanitizeCSVField(item.period)},${item.quizAvg || 0},${item.rawMarks || 0},${selectedQuiz.totalMarks || 20}\n`;
      });
      downloadCSV(`Quiz_Breakdown_${(selectedQuiz.period || "Quiz").replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`, csv);
    } else {
      csv += "Quiz Module Title,Year,Branch,Semester,Regulation,Average Score (%),Completed Attempts\n";
      filteredQuizzes.forEach((q: any) => {
        csv += `${sanitizeCSVField(q.period)},${sanitizeCSVField(q.year || "Overall")},${sanitizeCSVField(q.branch || "Overall")},${sanitizeCSVField(q.sem || "Overall")},${sanitizeCSVField(q.regulation || "Overall")},${q.quizAvg || 0},${q.completedAttempts || 0}\n`;
      });
      downloadCSV(`Quiz_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const exportAssignmentCSV = () => {
    let csv = "";
    if (selectedAssignment) {
      csv += `Assignment Title: ${selectedAssignment.period}\n`;
      csv += `Total Marks: ${selectedAssignment.totalMarks || 100}\n`;
      csv += `Average Score (%): ${selectedAssignment.assignmentAvg}%\n\n`;
      csv += "Student Name,Percentage (%),Raw Marks,Max Marks\n";
      (selectedAssignment.individualItems || []).forEach((item: any) => {
        csv += `${sanitizeCSVField(item.period)},${item.assignmentAvg || 0},${item.rawMarks || 0},${selectedAssignment.totalMarks || 100}\n`;
      });
      downloadCSV(`Assignment_Breakdown_${(selectedAssignment.period || "Assignment").replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`, csv);
    } else {
      csv += "Assignment Title,Year,Branch,Semester,Regulation,Average Score (%),Total Submissions\n";
      filteredAssignments.forEach((a: any) => {
        csv += `${sanitizeCSVField(a.period)},${sanitizeCSVField(a.year || "Overall")},${sanitizeCSVField(a.branch || "Overall")},${sanitizeCSVField(a.sem || "Overall")},${sanitizeCSVField(a.regulation || "Overall")},${a.assignmentAvg || 0},${a.totalSubmissions || 0}\n`;
      });
      downloadCSV(`Assignment_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const exportAttendanceCSV = () => {
    let csv = "";
    if (selectedAttendance) {
      csv += `Session Date: ${selectedAttendance.period}\n`;
      csv += `Attendance Rate (%): ${selectedAttendance.attendanceRate}%\n\n`;
      csv += "Student Name,Attendance Status,Percentage (%)\n";
      (selectedAttendance.individualItems || []).forEach((item: any) => {
        const isPresent = item.attendanceRate > 0;
        csv += `${sanitizeCSVField(item.period)},${isPresent ? "PRESENT" : "ABSENT"},${item.attendanceRate || 0}%\n`;
      });
      downloadCSV(`Attendance_Breakdown_${(selectedAttendance.period || "Attendance").replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`, csv);
    } else {
      csv += "Session Date,Year,Branch,Semester,Attendance Rate (%)\n";
      filteredAttendance.forEach((att: any) => {
        csv += `${sanitizeCSVField(att.period)},${sanitizeCSVField(att.year || "Overall")},${sanitizeCSVField(att.branch || "Overall")},${sanitizeCSVField(att.sem || "Overall")},${att.attendanceRate || 0}\n`;
      });
      downloadCSV(`Attendance_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const exportAllReportsCSV = () => {
    let csv = "=== LMS COMPREHENSIVE ANALYTICS REPORT ===\n";
    csv += `Generated On: ${new Date().toLocaleString()}\n\n`;

    csv += "--- QUIZ MODULES PERFORMANCE ---\n";
    csv += "Quiz Module Title,Year,Branch,Semester,Regulation,Average Score (%),Completed Attempts\n";
    filteredQuizzes.forEach((q: any) => {
      csv += `${sanitizeCSVField(q.period)},${sanitizeCSVField(q.year || "Overall")},${sanitizeCSVField(q.branch || "Overall")},${sanitizeCSVField(q.sem || "Overall")},${sanitizeCSVField(q.regulation || "Overall")},${q.quizAvg || 0},${q.completedAttempts || 0}\n`;
    });

    csv += "\n--- ASSIGNMENTS PERFORMANCE ---\n";
    csv += "Assignment Title,Year,Branch,Semester,Regulation,Average Score (%),Total Submissions\n";
    filteredAssignments.forEach((a: any) => {
      csv += `${sanitizeCSVField(a.period)},${sanitizeCSVField(a.year || "Overall")},${sanitizeCSVField(a.branch || "Overall")},${sanitizeCSVField(a.sem || "Overall")},${sanitizeCSVField(a.regulation || "Overall")},${a.assignmentAvg || 0},${a.totalSubmissions || 0}\n`;
    });

    csv += "\n--- ATTENDANCE SESSION ANALYTICS ---\n";
    csv += "Session Date,Year,Branch,Semester,Attendance Rate (%)\n";
    filteredAttendance.forEach((att: any) => {
      csv += `${sanitizeCSVField(att.period)},${sanitizeCSVField(att.year || "Overall")},${sanitizeCSVField(att.branch || "Overall")},${sanitizeCSVField(att.sem || "Overall")},${att.attendanceRate || 0}\n`;
    });

    downloadCSV(`LMS_Master_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <>
      <PageHeader 
        title="Reports & Analytics" 
        subtitle="Comprehensive detailed report for Quizzes, Assignments, and Attendance." 
        action={
          <button
            onClick={exportAllReportsCSV}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-4 py-2.5 shadow-md transition-all transform active:scale-95 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Full CSV Report
          </button>
        }
      />

      <div className="mt-6 space-y-8">
        {/* FULL PAGE MODULE 1: QUIZ MODULES ANALYTICS */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-amber-500" /> Quiz Modules Performance Analytics
              </h2>

              <div className="flex items-center gap-3">
                {selectedQuiz ? (
                  <button
                    onClick={() => setSelectedQuiz(null)}
                    className="rounded-full bg-amber-500 text-white px-4 py-1.5 text-xs font-bold shadow hover:bg-amber-600 transition"
                  >
                    ← Back to All Quiz Modules
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border">
                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Year:</span>
                      <select
                        value={quizYearFilter}
                        onChange={(e) => setQuizYearFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Branch:</span>
                      <select
                        value={(!isSuperAdmin && hodBranch) ? hodBranch : quizBranchFilter}
                        onChange={(e) => setQuizBranchFilter(e.target.value)}
                        disabled={!isSuperAdmin && !!hodBranch}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer disabled:opacity-80"
                      >
                        {(!isSuperAdmin && hodBranch) ? (
                          <option value={hodBranch}>{hodBranch}</option>
                        ) : (
                          <>
                            <option value="Overall">Overall</option>
                            <option value="CSE">CSE</option>
                            <option value="AI & ML">AI & ML</option>
                            <option value="AI & DS">AI & DS</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Sem:</span>
                      <select
                        value={quizSemFilter}
                        onChange={(e) => setQuizSemFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="Sem 1">Sem 1</option>
                        <option value="Sem 2">Sem 2</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Regulation:</span>
                      <select
                        value={quizRegulationFilter}
                        onChange={(e) => setQuizRegulationFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="R20">R20</option>
                        <option value="R22">R22</option>
                        <option value="R23">R23</option>
                      </select>
                    </div>
                  </div>
                )}
                <button
                  onClick={exportQuizCSV}
                  className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
                  title={selectedQuiz ? "Download Student Quiz Score Breakdown CSV" : "Download Quiz Analytics CSV"}
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedQuiz 
                ? `Viewing individual student scores for "${selectedQuiz.period}"`
                : "Real-time student attempt records & scaled percentage averages per quiz module across the entire LMS platform. Click any bar to view individual student scores."
              }
            </p>
          </div>

          {/* 3 TOP MODULE STAT CARDS ACROSS THE PAGE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-amber-500/10 p-5 border border-amber-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedQuiz ? "Module Avg Score" : "Overall Avg Quiz Score"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-amber-500">
                {quizAvgScore}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedQuiz ? `Selected: ${selectedQuiz.period}` : "Scaled to 100% based on total max marks"}
              </div>
            </div>

            <div className="rounded-2xl bg-purple-500/10 p-5 border border-purple-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedQuiz ? "Students Attempted" : "Total Quiz Attempts"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-purple-500">
                {quizTotalAttempts}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedQuiz ? "Student submissions recorded" : "Completed attempts submitted by students"}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-5 border border-emerald-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedQuiz ? "Quiz Max Marks" : "Quiz Modules Tracked"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-600">
                {quizModulesTracked}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedQuiz ? "Maximum total marks for this quiz" : "Active quiz modules evaluated"}
              </div>
            </div>
          </div>

          {/* EXPANSIVE FULL-PAGE BAR CHART FOR QUIZZES */}
          <div className="h-[400px] w-full pt-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : selectedQuiz && (!selectedQuiz.individualItems || selectedQuiz.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-amber-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No individual student attempts recorded yet for "{selectedQuiz.period}".</div>
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="mt-4 rounded-full bg-amber-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-amber-600"
                >
                  ← Back to All Quiz Modules
                </button>
              </div>
            ) : !selectedQuiz && filteredQuizzes.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-amber-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No quiz modules match the selected filter criteria.</div>
                <button
                  onClick={() => {
                    setQuizYearFilter("Overall");
                    setQuizBranchFilter("Overall");
                    setQuizSemFilter("Overall");
                    setQuizRegulationFilter("Overall");
                  }}
                  className="mt-4 rounded-full bg-amber-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-amber-600"
                >
                  Reset Filters to Overall
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={selectedQuiz ? selectedQuiz.individualItems : filteredQuizzes} 
                  margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
                  onClick={(e) => handleQuizClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis 
                    dataKey="period" 
                    stroke="var(--color-muted-foreground)" 
                    fontSize={12} 
                    tickLine={false} 
                    tickFormatter={(v: string) => (v && v.length > 28 ? `${v.substring(0, 25)}...` : v)}
                  />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      selectedQuiz ? `${val}% (${item.payload.rawMarks || 0} / ${selectedQuiz.totalMarks || 20} marks)` : `${val}%`,
                      selectedQuiz ? "Student Score" : "Average Quiz Score"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", padding: "10px 14px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                  <Bar 
                    dataKey="quizAvg" 
                    name={selectedQuiz ? `Student Score (%) for ${selectedQuiz.period}` : "Avg Quiz Score (%) [Click bar to view student breakdown]"} 
                    fill="#f59e0b" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={70} 
                    className="cursor-pointer"
                    onClick={(entry) => handleQuizClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* FULL PAGE MODULE 2: ASSIGNMENT ANALYTICS */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-emerald-500" /> Assignment Performance Analytics
              </h2>

              <div className="flex items-center gap-3">
                {selectedAssignment ? (
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="rounded-full bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold shadow hover:bg-emerald-600 transition"
                  >
                    ← Back to All Assignments
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border">
                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Year:</span>
                      <select
                        value={assignmentYearFilter}
                        onChange={(e) => setAssignmentYearFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Branch:</span>
                      <select
                        value={(!isSuperAdmin && hodBranch) ? hodBranch : assignmentBranchFilter}
                        onChange={(e) => setAssignmentBranchFilter(e.target.value)}
                        disabled={!isSuperAdmin && !!hodBranch}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer disabled:opacity-80"
                      >
                        {(!isSuperAdmin && hodBranch) ? (
                          <option value={hodBranch}>{hodBranch}</option>
                        ) : (
                          <>
                            <option value="Overall">Overall</option>
                            <option value="CSE">CSE</option>
                            <option value="AI & ML">AI & ML</option>
                            <option value="AI & DS">AI & DS</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Sem:</span>
                      <select
                        value={assignmentSemFilter}
                        onChange={(e) => setAssignmentSemFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="Sem 1">Sem 1</option>
                        <option value="Sem 2">Sem 2</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Regulation:</span>
                      <select
                        value={assignmentRegulationFilter}
                        onChange={(e) => setAssignmentRegulationFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="R20">R20</option>
                        <option value="R22">R22</option>
                        <option value="R23">R23</option>
                      </select>
                    </div>
                  </div>
                )}
                <button
                  onClick={exportAssignmentCSV}
                  className="flex items-center gap-1.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
                  title={selectedAssignment ? "Download Student Assignment Score Breakdown CSV" : "Download Assignment Analytics CSV"}
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedAssignment 
                ? `Viewing individual student submission marks for "${selectedAssignment.period}"`
                : "Real-time student assignment submissions & graded percentage averages across all assignments. Click any bar to view individual student marks."
              }
            </p>
          </div>

          {/* 3 TOP MODULE STAT CARDS ACROSS THE PAGE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-emerald-500/10 p-5 border border-emerald-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedAssignment ? "Assignment Avg Score" : "Overall Assignment Avg"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-500">
                {assignmentAvgScore}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedAssignment ? `Selected: ${selectedAssignment.period}` : "Average marks scored across submissions"}
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-500/10 p-5 border border-indigo-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedAssignment ? "Student Submissions" : "Total Submissions Received"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-indigo-500">
                {assignmentTotalSubmissions}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedAssignment ? "Submissions for this assignment" : "Evaluated student assignment files"}
              </div>
            </div>

            <div className="rounded-2xl bg-blue-500/10 p-5 border border-blue-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedAssignment ? "Assignment Max Marks" : "Assignments Created"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-blue-600">
                {assignmentModulesTracked}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedAssignment ? "Maximum total marks for assignment" : "Total assignments in system"}
              </div>
            </div>
          </div>

          {/* EXPANSIVE FULL-PAGE BAR CHART FOR ASSIGNMENTS */}
          <div className="h-[400px] w-full pt-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : selectedAssignment && (!selectedAssignment.individualItems || selectedAssignment.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No individual student submissions recorded yet for "{selectedAssignment.period}".</div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="mt-4 rounded-full bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-emerald-600"
                >
                  ← Back to All Assignments
                </button>
              </div>
            ) : !selectedAssignment && filteredAssignments.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No assignments match the selected filter criteria.</div>
                <button
                  onClick={() => {
                    setAssignmentYearFilter("Overall");
                    setAssignmentBranchFilter("Overall");
                    setAssignmentSemFilter("Overall");
                    setAssignmentRegulationFilter("Overall");
                  }}
                  className="mt-4 rounded-full bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-emerald-600"
                >
                  Reset Filters to Overall
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={selectedAssignment ? selectedAssignment.individualItems : filteredAssignments} 
                  margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
                  onClick={(e) => handleAssignmentClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis 
                    dataKey="period" 
                    stroke="var(--color-muted-foreground)" 
                    fontSize={12} 
                    tickLine={false} 
                    tickFormatter={(v: string) => (v && v.length > 28 ? `${v.substring(0, 25)}...` : v)}
                  />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      selectedAssignment ? `${val}% (${item.payload.rawMarks || 0} / ${selectedAssignment.totalMarks || 100} marks)` : `${val}%`,
                      selectedAssignment ? "Student Marks" : "Average Assignment Marks"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", padding: "10px 14px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                  <Bar 
                    dataKey="assignmentAvg" 
                    name={selectedAssignment ? `Student Marks (%) for ${selectedAssignment.period}` : "Avg Assignment Marks (%) [Click bar to view student breakdown]"} 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={70} 
                    className="cursor-pointer"
                    onClick={(entry) => handleAssignmentClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* FULL PAGE MODULE 3: ATTENDANCE ANALYTICS */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <CalendarCheck className="h-6 w-6 text-sky-500" /> Attendance Session Analytics
              </h2>

              <div className="flex items-center gap-3">
                {selectedAttendance ? (
                  <button
                    onClick={() => setSelectedAttendance(null)}
                    className="rounded-full bg-sky-500 text-white px-4 py-1.5 text-xs font-bold shadow hover:bg-sky-600 transition"
                  >
                    ← Back to All Session Dates
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border">
                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Year:</span>
                      <select
                        value={attendanceYearFilter}
                        onChange={(e) => setAttendanceYearFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Branch:</span>
                      <select
                        value={(!isSuperAdmin && hodBranch) ? hodBranch : attendanceBranchFilter}
                        onChange={(e) => setAttendanceBranchFilter(e.target.value)}
                        disabled={!isSuperAdmin && !!hodBranch}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer disabled:opacity-80"
                      >
                        {(!isSuperAdmin && hodBranch) ? (
                          <option value={hodBranch}>{hodBranch}</option>
                        ) : (
                          <>
                            <option value="Overall">Overall</option>
                            <option value="CSE">CSE</option>
                            <option value="AI & ML">AI & ML</option>
                            <option value="AI & DS">AI & DS</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Sem:</span>
                      <select
                        value={attendanceSemFilter}
                        onChange={(e) => setAttendanceSemFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        <option value="Sem 1">Sem 1</option>
                        <option value="Sem 2">Sem 2</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                      <span className="text-muted-foreground font-semibold">Date:</span>
                      <select
                        value={attendanceDateFilter}
                        onChange={(e) => setAttendanceDateFilter(e.target.value)}
                        className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="Overall">Overall</option>
                        {availableAttendanceDates.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <button
                  onClick={exportAttendanceCSV}
                  className="flex items-center gap-1.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
                  title={selectedAttendance ? "Download Student Attendance Breakdown CSV" : "Download Attendance Analytics CSV"}
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedAttendance
                ? `Viewing individual student attendance records for Date "${selectedAttendance.period}"`
                : "Real-time student attendance percentages across recorded lecture dates. Click any bar to view individual student attendance."
              }
            </p>
          </div>

          {/* 3 TOP MODULE STAT CARDS ACROSS THE PAGE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-sky-500/10 p-5 border border-sky-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedAttendance ? "Session Attendance Rate" : "Overall Attendance Rate"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-sky-500">
                {attendanceAvgRate}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedAttendance ? `Session Date: ${selectedAttendance.period}` : "Platform-wide attendance record"}
              </div>
            </div>

            <div className="rounded-2xl bg-blue-500/10 p-5 border border-blue-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedAttendance ? "Students Marked" : "Total Unique Sessions"}
              </div>
              <div className="mt-2 text-4xl font-extrabold text-blue-500">
                {attendanceTotalSessionsCount}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selectedAttendance ? "Student attendance records for this date" : "Recorded lecture date sessions"}
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-500/10 p-5 border border-indigo-500/20 flex flex-col justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance Status</div>
              <div className="mt-2 text-4xl font-extrabold text-indigo-500">Active</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Live session recording status</div>
            </div>
          </div>

          {/* EXPANSIVE FULL-PAGE BAR CHART FOR ATTENDANCE */}
          <div className="h-[400px] w-full pt-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : selectedAttendance && (!selectedAttendance.individualItems || selectedAttendance.individualItems.length === 0) ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-sky-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No individual student attendance records found for "{selectedAttendance.period}".</div>
                <button
                  onClick={() => setSelectedAttendance(null)}
                  className="mt-4 rounded-full bg-sky-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-sky-600"
                >
                  ← Back to All Session Dates
                </button>
              </div>
            ) : !selectedAttendance && filteredAttendance.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center border border-dashed border-sky-500/30 rounded-2xl p-6 text-center">
                <div className="text-base font-bold text-foreground">No attendance sessions match the selected filter criteria.</div>
                <button
                  onClick={() => {
                    setAttendanceYearFilter("Overall");
                    setAttendanceBranchFilter("Overall");
                    setAttendanceSemFilter("Overall");
                    setAttendanceDateFilter("Overall");
                  }}
                  className="mt-4 rounded-full bg-sky-500 text-white px-4 py-2 text-xs font-bold shadow hover:bg-sky-600"
                >
                  Reset Filters to Overall
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={selectedAttendance ? selectedAttendance.individualItems : filteredAttendance} 
                  margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
                  onClick={(e) => handleAttendanceClick(e)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      selectedAttendance ? (val > 0 ? "PRESENT (100%)" : "ABSENT (0%)") : `${val}%`,
                      selectedAttendance ? "Attendance Status" : "Attendance Rate"
                    ]}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", padding: "10px 14px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                  <Bar 
                    dataKey="attendanceRate" 
                    name={selectedAttendance ? `Student Attendance for ${selectedAttendance.period}` : "Attendance Rate (%) [Click bar to view student breakdown]"} 
                    fill="#0284c7" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={70} 
                    className="cursor-pointer"
                    onClick={(entry) => handleAttendanceClick(entry)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

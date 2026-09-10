import { useState, useEffect } from "react";
import { ShieldCheck, GraduationCap, Users, UserCheck, UserX, Search, CheckCircle2, XCircle } from "lucide-react";
import { type AdminUser, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn, StatusPill } from "../../shared/UIPrimitives";

type RoleFilter = "ALL" | "ADMIN" | "FACULTY" | "STUDENT";

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === "admin@example.com";
  const hodBranch = currentUser?.branch || "";

  const [usersData, setUsersData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("Overall");
  const [branchFilter, setBranchFilter] = useState("Overall");
  const [semFilter, setSemFilter] = useState("Overall");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res.success && res.data) {
        setUsersData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: number) => {
    const res = await api.approveUser(userId.toString());
    if (res.success) await fetchUsers();
  };

  const handleReject = async (userId: number) => {
    const res = await api.rejectUser(userId.toString());
    if (res.success) await fetchUsers();
  };

  // Scope user data for department HOD vs Super Admin
  const scopedUsers = (isSuperAdmin || !hodBranch)
    ? usersData
    : usersData.filter((u: any) => u.branch === hodBranch);

  // Counts by role
  const totalCount = scopedUsers.length;
  const adminUsers = scopedUsers.filter((u) => u.role?.toUpperCase() === "ADMIN");
  const facultyUsers = scopedUsers.filter((u) => u.role?.toUpperCase() === "FACULTY");
  const studentUsers = scopedUsers.filter((u) => u.role?.toUpperCase() === "STUDENT");

  const getSemOptionsForYear = (yr: string) => {
    if (yr === "1st Year") return ["Overall", "1st Sem", "2nd Sem"];
    if (yr === "2nd Year") return ["Overall", "3rd Sem", "4th Sem"];
    if (yr === "3rd Year") return ["Overall", "5th Sem", "6th Sem"];
    if (yr === "4th Year") return ["Overall", "7th Sem", "8th Sem"];
    return ["Overall", "1st Sem", "2nd Sem", "3rd Sem", "4th Sem", "5th Sem", "6th Sem", "7th Sem", "8th Sem"];
  };

  const handleYearFilterChange = (newYear: string) => {
    setYearFilter(newYear);
    const validSemOptions = getSemOptionsForYear(newYear);
    if (!validSemOptions.includes(semFilter)) {
      setSemFilter("Overall");
    }
  };

  // Filtered users for table
  const filteredUsers = scopedUsers
    .filter((u: any) => {
      if (selectedRole !== "ALL" && u.role?.toUpperCase() !== selectedRole) return false;
      if (yearFilter !== "Overall" && u.year !== yearFilter) return false;
      if (branchFilter !== "Overall" && u.branch !== branchFilter) return false;
      if (semFilter !== "Overall") {
        const uSem = (u.sem || "").toLowerCase();
        const fSem = semFilter.toLowerCase();
        if (uSem !== fSem && !uSem.includes(fSem) && !fSem.includes(uSem)) return false;
      }
      return true;
    })
    .filter(
      (u: any) =>
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.rollNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.facultyId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.hodId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.role || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const roleCardConfigs = [
    {
      role: "ADMIN" as RoleFilter,
      title: "Admin Users",
      count: adminUsers.length,
      subtitle: "System Administrators",
      icon: ShieldCheck,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
    {
      role: "FACULTY" as RoleFilter,
      title: "Faculty Members",
      count: facultyUsers.length,
      subtitle: "Course Instructors",
      icon: GraduationCap,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
    {
      role: "STUDENT" as RoleFilter,
      title: "Student Users",
      count: studentUsers.length,
      subtitle: "Enrolled Learners",
      icon: Users,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header & Total Members Counter Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approve, manage and monitor user accounts across the LMS platform.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-2.5 flex items-center gap-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Members</div>
            <div className="text-xl font-bold text-primary font-display">{totalCount} Users Registered</div>
          </div>
        </div>
      </div>

      {/* 3 ROLE CATEGORY CARDS */}
      <div className="grid gap-5 md:grid-cols-3">
        {roleCardConfigs.map((cfg) => {
          const Icon = cfg.icon;
          const isSelected = selectedRole === cfg.role;

          return (
            <Card
              key={cfg.role}
              onClick={() => setSelectedRole(isSelected ? "ALL" : cfg.role)}
              className={`p-5 cursor-pointer transition-all duration-200 border-2 relative overflow-hidden ${
                isSelected
                  ? `border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20 scale-[1.02]`
                  : "border-border bg-card hover:border-primary/40 hover:shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.bgColor} ${cfg.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isSelected ? "Filter Active ✓" : "Click to Filter"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">{cfg.title}</h3>
                  <div className="font-display text-2xl font-extrabold text-foreground">
                    {cfg.count} <span className="text-xs font-semibold text-muted-foreground">members</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
              </div>

              {isSelected && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                  <div className="absolute transform rotate-45 bg-primary text-white text-[9px] font-bold py-0.5 right-[-35px] top-[15px] w-[120px] text-center shadow">
                    SELECTED
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* MEMBERS LIST TABLE CARD */}
      <Card className="p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedRole === "ALL"
                ? `All Platform Members (${filteredUsers.length})`
                : `${selectedRole} Members List (${filteredUsers.length})`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedRole === "ALL"
                ? "Showing all registered users. Click any card above to filter by role."
                : `Filtered to display registered ${selectedRole.toLowerCase()} accounts.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Inline Filter Controls: Year, Branch, Sem */}
            <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-2xl border border-border">
              <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border text-xs font-medium">
                <span className="text-muted-foreground font-semibold">Year:</span>
                <select
                  value={yearFilter}
                  onChange={(e) => handleYearFilterChange(e.target.value)}
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
                  value={(!isSuperAdmin && hodBranch) ? hodBranch : branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
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
                  value={semFilter}
                  onChange={(e) => setSemFilter(e.target.value)}
                  className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  {getSemOptionsForYear(yearFilter).map((semOpt) => (
                    <option key={semOpt} value={semOpt}>
                      {semOpt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(selectedRole !== "ALL" || yearFilter !== "Overall" || branchFilter !== "Overall" || semFilter !== "Overall") && (
              <button
                onClick={() => {
                  setSelectedRole("ALL");
                  setYearFilter("Overall");
                  setBranchFilter("Overall");
                  setSemFilter("Overall");
                }}
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search by name, email, roll no, or staff ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-full border border-border bg-card py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/40 w-56"
              />
            </div>
          </div>
        </div>

        {/* Members List Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-bold">
                  <th className="pb-3 font-semibold">User Details</th>
                  <th className="pb-3 font-semibold">ID / Roll No</th>
                  <th className="pb-3 font-semibold">Role & Branch</th>
                  <th className="pb-3 font-semibold">Academic Info</th>
                  <th className="pb-3 font-semibold">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((entry: any) => {
                  const roleStr = entry.role?.toUpperCase() || "USER";
                  const roleBadgeClass =
                    roleStr === "ADMIN"
                      ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      : roleStr === "FACULTY"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

                  const displayId =
                    roleStr === "STUDENT"
                      ? entry.rollNo || "N/A"
                      : roleStr === "FACULTY"
                      ? entry.facultyId || "N/A"
                      : entry.hodId || "N/A";

                  return (
                    <tr key={entry.id} className="border-b border-border/50 transition hover:bg-secondary/30">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold font-display text-sm shrink-0">
                            {entry.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{entry.name}</div>
                            <div className="text-[11px] text-muted-foreground">{entry.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-mono text-[11px] font-bold text-foreground">
                        {displayId}
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase ${roleBadgeClass}`}>
                            {roleStr}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-lg">
                            {entry.branch || "General"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        {roleStr === "STUDENT" ? (
                          <div className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
                            <span className="font-semibold text-primary">{entry.year || "1st Year"}</span> • 
                            <span>{entry.sem || "1st Sem"}</span> • 
                            <span className="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-bold">Sec {entry.section || "A"}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Department Staff</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <StatusPill status={entry.active ? "Active" : "Rejected"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground italic">
            No users found matching the selected filter.
          </div>
        )}
      </Card>
    </div>
  );
}

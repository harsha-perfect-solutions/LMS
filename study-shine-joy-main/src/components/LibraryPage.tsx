import { useState, useEffect, useMemo } from "react";
import { 
  Book, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Download, 
  Plus, 
  Search, 
  Trash2,
  Loader,
  Filter,
  User,
  Upload,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Image,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { type Resource, api } from "@/lib/api";
import { PageHeader, Card, Btn } from "./shared/UIPrimitives";
import { toast } from "sonner";

function HighlightText({ text, search }: { text: string; search: string }) {
  if (!search.trim() || !text) return <>{text}</>;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-300/50 dark:bg-amber-400/35 text-foreground font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatFileUrl(url?: string): string {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8082";
  const baseUrl = apiBase.replace(/\/api\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function LibraryPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PDF" | "DOC" | "VIDEO" | "LINK">("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [regulationFilter, setRegulationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showAddModal, setShowAddModal] = useState(false);

  // New Resource Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"PDF" | "DOC" | "VIDEO" | "LINK">("PDF");
  const [category, setCategory] = useState("ALL");
  const [branch, setBranch] = useState("ALL");
  const [regulation, setRegulation] = useState("ALL");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (newType: "PDF" | "DOC" | "VIDEO" | "LINK") => {
    setType(newType);
    setFileError(null);
    if (newType === "PDF" || newType === "DOC") {
      setUploadMode("file");
    } else {
      setUploadMode("url");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }
    const fileNameLower = file.name.toLowerCase();
    const isWordDoc = fileNameLower.endsWith(".doc") || fileNameLower.endsWith(".docx");
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";

    if (type === "PDF" && !isPdf) {
      setSelectedFile(null);
      e.target.value = "";
      const errMsg = "Upload only .pdf format files for PDF resources.";
      setFileError(errMsg);
      toast.error(`🚫 ${errMsg}`, { duration: 5000 });
      return;
    }

    if (type === "DOC" && !isWordDoc) {
      setSelectedFile(null);
      e.target.value = "";
      const errMsg = "Upload only .doc or .docx format files for MS Word resources.";
      setFileError(errMsg);
      toast.error(`🚫 ${errMsg}`, { duration: 5000 });
      return;
    }

    if (!isPdf && !isWordDoc) {
      setSelectedFile(null);
      e.target.value = "";
      const errMsg = "Upload only .pdf or .doc/.docx format files.";
      setFileError(errMsg);
      toast.error(`🚫 ${errMsg}`, { duration: 5000 });
      return;
    }

    setSelectedFile(file);
    setFileError(null);
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      setCoverError(null);
      return;
    }
    const fileNameLower = file.name.toLowerCase();
    const isImage =
      fileNameLower.endsWith(".jpg") ||
      fileNameLower.endsWith(".jpeg") ||
      fileNameLower.endsWith(".png") ||
      fileNameLower.endsWith(".webp") ||
      file.type.startsWith("image/");

    if (!isImage) {
      setCoverFile(null);
      setCoverPreview(null);
      e.target.value = "";
      const errMsg = "Upload only image format files (.jpg, .jpeg, .png, .webp) for book cover.";
      setCoverError(errMsg);
      toast.error(`🚫 ${errMsg}`);
      return;
    }

    setCoverFile(file);
    setCoverError(null);
    setCoverPreview(URL.createObjectURL(file));
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.getResources({ branch: branchFilter, regulation: regulationFilter });
      if (res.success && res.data) {
        setResources(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      toast.error("Failed to load library resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [branchFilter, regulationFilter]);

  const resetForm = () => {
    setShowAddModal(false);
    setTitle("");
    setDescription("");
    setUrl("");
    setSelectedFile(null);
    setFileError(null);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverError(null);
    setCategory("ALL");
    setBranch("ALL");
    setRegulation("ALL");
    setType("PDF");
    setUploadMode("file");
  };

  const handleAdd = async () => {
    if (!title.trim()) return toast.error("Title is required");

    // File Upload Mode for PDF / MS Word Document
    if ((type === "PDF" || type === "DOC") && uploadMode === "file") {
      if (!selectedFile) {
        return toast.error(`Please select a ${type === "PDF" ? "PDF (.pdf)" : "MS Word (.doc, .docx)"} file to upload`);
      }
      const fileNameLower = selectedFile.name.toLowerCase();
      const isWordDoc = fileNameLower.endsWith(".doc") || fileNameLower.endsWith(".docx");
      const isPdf = fileNameLower.endsWith(".pdf") || selectedFile.type === "application/pdf";

      if (type === "PDF" && !isPdf) {
        return toast.error("Only PDF files (.pdf) are allowed for PDF Resource Type");
      }
      if (type === "DOC" && !isWordDoc) {
        return toast.error("Only Microsoft Word files (.doc, .docx) are allowed for MS Word Resource Type");
      }

      try {
        setSubmitting(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("type", type);
        formData.append("category", category || "General");
        formData.append("branch", branch || "ALL");
        formData.append("regulation", regulation || "ALL");
        formData.append("file", selectedFile);
        if (coverFile) {
          formData.append("coverImage", coverFile);
        }

        const res = await api.createResource(formData);
        if (res.success) {
          if (res.data?.status === "PENDING_APPROVAL" || res.data?.isApproved === false) {
            toast.info("Resource exceeds 50MB! Uploaded successfully and submitted for Admin Approval.", { duration: 6000 });
          } else {
            toast.success("Resource file uploaded & added to library!");
          }
          resetForm();
          fetchResources();
        } else {
          toast.error(res.error || "Failed to upload resource file");
        }
      } catch (error) {
        toast.error("Error uploading resource file");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // URL Mode for Video / Link or Cloud URL
    if (!url.trim()) {
      return toast.error(type === "VIDEO" ? "Video URL is required" : "Resource URL is required");
    }

    try {
      setSubmitting(true);
      if (coverFile) {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("type", type);
        formData.append("url", url);
        formData.append("category", category || "General");
        formData.append("branch", branch || "ALL");
        formData.append("regulation", regulation || "ALL");
        formData.append("coverImage", coverFile);

        const res = await api.createResource(formData);
        if (res.success) {
          toast.success("Resource added to library!");
          resetForm();
          fetchResources();
        } else {
          toast.error(res.error || "Failed to add resource");
        }
      } else {
        const res = await api.createResource({
          title,
          description,
          url,
          type,
          category,
          branch: branch || "ALL",
          regulation: regulation || "ALL",
        });
        if (res.success) {
          toast.success("Resource added to library!");
          resetForm();
          fetchResources();
        } else {
          toast.error(res.error || "Failed to add resource");
        }
      }
    } catch (error) {
      toast.error("Error adding resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this resource?")) return;
    const res = await api.deleteResource(id);
    if (res.success) {
      toast.success("Resource removed");
      fetchResources();
    }
  };

  const handleUpdateStatus = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await api.updateResourceStatus(id, status);
      if (res.success) {
        toast.success(status === "APPROVED" ? "Resource approved and published!" : "Resource rejected and removed.");
        fetchResources();
      } else {
        toast.error(res.error || "Failed to update resource status");
      }
    } catch (error) {
      toast.error("Error updating resource status");
    }
  };

  const getFacultyName = (r: Resource) => {
    return r.facultyName || r.faculty?.name || "Faculty Member";
  };

  const sortedFiltered = useMemo(() => {
    return resources
      .filter((r) => {
        const searchQuery = search.toLowerCase().trim();
        const facName = getFacultyName(r).toLowerCase();
        const crsName = (r.courseName || r.course?.title || "").toLowerCase();
        const titleText = (r.title || "").toLowerCase();
        const catText = (r.category || "").toLowerCase();
        const descText = (r.description || "").toLowerCase();
        const branchText = (r.branch || "ALL").toLowerCase();
        const regText = (r.regulation || "ALL").toLowerCase();

        const matchesSearch =
          !searchQuery ||
          titleText.includes(searchQuery) ||
          crsName.includes(searchQuery) ||
          catText.includes(searchQuery) ||
          facName.includes(searchQuery) ||
          descText.includes(searchQuery) ||
          branchText.includes(searchQuery) ||
          regText.includes(searchQuery);

        const rType = (r.type || "").toUpperCase();
        const matchesType = typeFilter === "ALL" || rType === typeFilter;

        const rYear = (r.category || r.courseName || "").toUpperCase();
        const matchesYear =
          yearFilter === "ALL" ||
          rYear === yearFilter.toUpperCase() ||
          (yearFilter === "1ST YEAR" && (rYear.includes("1ST") || rYear.includes("1"))) ||
          (yearFilter === "2ND YEAR" && (rYear.includes("2ND") || rYear.includes("2"))) ||
          (yearFilter === "3RD YEAR" && (rYear.includes("3RD") || rYear.includes("3"))) ||
          (yearFilter === "4TH YEAR" && (rYear.includes("4TH") || rYear.includes("4")));

        const rBranch = (r.branch || "ALL").toUpperCase();
        const matchesBranch =
          branchFilter === "ALL" || rBranch === branchFilter.toUpperCase();

        const rReg = (r.regulation || "ALL").toUpperCase();
        const matchesReg =
          regulationFilter === "ALL" || rReg === regulationFilter.toUpperCase();

        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "PENDING"
            ? r.status === "PENDING_APPROVAL" || r.isApproved === false
            : r.status === "APPROVED" || r.isApproved !== false;

        return matchesSearch && matchesType && matchesYear && matchesBranch && matchesReg && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return dateB - dateA;
      });
  }, [resources, search, typeFilter, yearFilter, branchFilter, regulationFilter, statusFilter]);

  // Reset to page 1 whenever search or filter options change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, yearFilter, branchFilter, regulationFilter, statusFilter]);

  const totalPages = Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE) || 1;
  const paginatedResources = sortedFiltered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getIcon = (type: string) => {
    const t = (type || "").toUpperCase();
    switch (t) {
      case "VIDEO":
        return <Video className="h-5 w-5" />;
      case "LINK":
        return <LinkIcon className="h-5 w-5" />;
      case "DOC":
        return <FileText className="h-5 w-5" />;
      case "PDF":
        return <Book className="h-5 w-5" />;
      default:
        return <Book className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const t = (type || "").toUpperCase();
    switch (t) {
      case "VIDEO":
        return "Video Link";
      case "LINK":
        return "External Link";
      case "DOC":
        return "MS Word Document";
      case "PDF":
        return "PDF Document";
      default:
        return "PDF Document";
    }
  };

  const isUserAdmin = (user?.role || "").toUpperCase() === "ADMIN";
  const isUserFaculty = (user?.role || "").toUpperCase() === "FACULTY";

  return (
    <>
      <PageHeader
        title="Library"
        subtitle="Access and share learning materials, books, and resources by branch and regulation."
        action={
          (isUserFaculty || isUserAdmin) && (
            <Btn onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /> Add Resource
            </Btn>
          )
        }
      />

      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center text-muted-foreground">
            <Search className="h-5 w-5" />
          </div>
          <input
            placeholder="Search by title, branch, regulation, course, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* Filters: Type, Branch, Regulation, Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm min-w-[150px]">
            <Filter className="h-4 w-4 text-primary shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground uppercase"
            >
              <option value="ALL" className="bg-card text-foreground">
                All Types ({resources.length})
              </option>
              <option value="PDF" className="bg-card text-foreground">
                PDFs
              </option>
              <option value="DOC" className="bg-card text-foreground">
                MS Word Docs
              </option>
              <option value="VIDEO" className="bg-card text-foreground">
                Videos
              </option>
              <option value="LINK" className="bg-card text-foreground">
                Links
              </option>
            </select>
          </div>

          {/* Target Year Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm min-w-[140px]">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground uppercase"
            >
              <option value="ALL" className="bg-card text-foreground">
                All Years
              </option>
              <option value="1ST YEAR" className="bg-card text-foreground">
                1st Year
              </option>
              <option value="2ND YEAR" className="bg-card text-foreground">
                2nd Year
              </option>
              <option value="3RD YEAR" className="bg-card text-foreground">
                3rd Year
              </option>
              <option value="4TH YEAR" className="bg-card text-foreground">
                4th Year
              </option>
            </select>
          </div>

          {/* Branch Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm min-w-[150px]">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground uppercase"
            >
              <option value="ALL" className="bg-card text-foreground">
                All Branches
              </option>
              <option value="CSE" className="bg-card text-foreground">
                CSE
              </option>
              <option value="ECE" className="bg-card text-foreground">
                ECE
              </option>
              <option value="EEE" className="bg-card text-foreground">
                EEE
              </option>
              <option value="MECH" className="bg-card text-foreground">
                MECH
              </option>
              <option value="CIVIL" className="bg-card text-foreground">
                CIVIL
              </option>
              <option value="IT" className="bg-card text-foreground">
                IT
              </option>
              <option value="AI&DS" className="bg-card text-foreground">
                AI&DS
              </option>
            </select>
          </div>

          {/* Regulation Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm min-w-[160px]">
            <select
              value={regulationFilter}
              onChange={(e) => setRegulationFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground uppercase"
            >
              <option value="ALL" className="bg-card text-foreground">
                All Regulations
              </option>
              <option value="VR23" className="bg-card text-foreground">
                VR23
              </option>
              <option value="VR21" className="bg-card text-foreground">
                VR21
              </option>
              <option value="AR23" className="bg-card text-foreground">
                AR23
              </option>
              <option value="AR21" className="bg-card text-foreground">
                AR21
              </option>
              <option value="R20" className="bg-card text-foreground">
                R20
              </option>
              <option value="R19" className="bg-card text-foreground">
                R19
              </option>
            </select>
          </div>

          {/* Grid / List View Mode Switcher */}
          <div className="flex items-center rounded-2xl border border-border bg-card p-1 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition ${
                viewMode === "grid" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl transition ${
                viewMode === "list" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedFiltered.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedResources.map((r) => {
                const isPending = r.status === "PENDING_APPROVAL" || r.isApproved === false;
                return (
                  <Card key={r.id} className={`group relative flex flex-col justify-between ${isPending ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10' : ''}`}>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold shrink-0 ${
                            (r.type || "").toUpperCase() === "VIDEO"
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : (r.type || "").toUpperCase() === "LINK"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              : (r.type || "").toUpperCase() === "DOC"
                              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}
                        >
                          {getIcon(r.type)}
                          <span>{getTypeLabel(r.type)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 truncate">
                            <User className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">
                              {r.faculty?.role === "ADMIN" || getFacultyName(r).toLowerCase().includes("admin")
                                ? "By: "
                                : "Faculty: "}
                              <HighlightText text={getFacultyName(r)} search={search} />
                            </span>
                          </div>

                          {(isUserAdmin || (isUserFaculty && r.facultyId === Number(user.id))) && (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive shrink-0 p-1"
                              title="Delete Resource"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3.5">
                        {/* Left Column: Category Badges, Title, Description */}
                        <div className="flex-1 min-w-0">
                          {/* Category, Branch & Regulation Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider mb-2">
                            <span className="text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">
                              <HighlightText text={r.courseName || r.category || "General"} search={search} />
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              Branch: {r.branch || "ALL"}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              Reg: {r.regulation || "ALL"}
                            </span>
                          </div>

                          {/* Pending Approval Pill */}
                          {isPending && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 w-fit mb-2">
                              <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Pending Admin Approval (&gt;50MB)</span>
                            </div>
                          )}

                          <h4 className="font-bold text-base line-clamp-1 text-foreground mt-2">
                            <HighlightText text={r.title} search={search} />
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[36px]">
                            <HighlightText text={r.description || "No description provided."} search={search} />
                          </p>
                        </div>

                        {/* Right Column: Book Cover / Thumbnail Image */}
                        <div className="w-24 h-32 shrink-0 rounded-xl overflow-hidden border border-border/80 shadow-sm bg-secondary/40 relative flex flex-col items-center justify-center group-hover:shadow-md transition">
                          {r.coverUrl ? (
                            <img
                              src={formatFileUrl(r.coverUrl)}
                              alt={r.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/80 flex flex-col items-center justify-center p-2 text-center select-none">
                              <Book className="h-7 w-7 text-primary/40 mb-1" />
                              <span className="text-[9px] font-extrabold text-muted-foreground/80 line-clamp-2 uppercase tracking-tighter">
                                {r.courseName || r.category || "BOOK"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          Added {new Date(r.createdAt || "").toLocaleDateString()}
                        </span>
                        <a
                          href={formatFileUrl(r.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                        >
                          <Download className="h-4 w-4" /> Access
                        </a>
                      </div>

                      {/* Admin Approval Quick Action Bar */}
                      {isUserAdmin && isPending && (
                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-amber-500/30">
                          <button
                            onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive text-xs font-bold transition"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View Mode */
            <div className="space-y-3">
              {paginatedResources.map((r) => {
                const isPending = r.status === "PENDING_APPROVAL" || r.isApproved === false;
                return (
                  <Card key={r.id} className={`group relative p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition hover:shadow-soft ${isPending ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10' : ''}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Book Cover / Thumbnail */}
                      <div className="w-14 h-18 shrink-0 rounded-xl overflow-hidden border border-border bg-secondary/40 relative flex flex-col items-center justify-center shadow-xs">
                        {r.coverUrl ? (
                          <img
                            src={formatFileUrl(r.coverUrl)}
                            alt={r.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/80 flex flex-col items-center justify-center p-1 text-center select-none">
                            <Book className="h-5 w-5 text-primary/40 mb-0.5" />
                            <span className="text-[8px] font-extrabold text-muted-foreground/80 line-clamp-1 uppercase tracking-tighter">
                              {r.courseName || r.category || "BOOK"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Main Information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider mb-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold ${
                              (r.type || "").toUpperCase() === "VIDEO"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : (r.type || "").toUpperCase() === "LINK"
                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                : (r.type || "").toUpperCase() === "DOC"
                                ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}
                          >
                            {getIcon(r.type)}
                            <span>{getTypeLabel(r.type)}</span>
                          </span>

                          <span className="text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">
                            <HighlightText text={r.courseName || r.category || "General"} search={search} />
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Branch: {r.branch || "ALL"}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Reg: {r.regulation || "ALL"}
                          </span>
                          {isPending && (
                            <span className="text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                              Pending Approval
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-base text-foreground truncate">
                          <HighlightText text={r.title} search={search} />
                        </h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          <HighlightText text={r.description || "No description provided."} search={search} />
                        </p>

                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="text-primary font-semibold flex items-center gap-1">
                            <User className="h-3 w-3 text-primary shrink-0" />
                            {r.faculty?.role === "ADMIN" || getFacultyName(r).toLowerCase().includes("admin") ? "By: " : "Faculty: "}
                            <HighlightText text={getFacultyName(r)} search={search} />
                          </span>
                          <span>•</span>
                          <span>Added {new Date(r.createdAt || "").toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isUserAdmin && isPending && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive text-xs font-bold transition"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}

                      <a
                        href={formatFileUrl(r.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 px-3.5 py-2 rounded-xl transition shadow-xs"
                      >
                        <Download className="h-4 w-4" /> Access
                      </a>

                      {(isUserAdmin || (isUserFaculty && r.facultyId === Number(user.id))) && (
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg"
                          title="Delete Resource"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Navigation Bar */}
          {sortedFiltered.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground font-medium">
                Showing <span className="font-bold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                <span className="font-bold text-foreground">
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedFiltered.length)}
                </span>{" "}
                of <span className="font-bold text-foreground">{sortedFiltered.length}</span> total uploaded resources
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentPage === page
                            ? "bg-primary text-white shadow-sm"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Book className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-xl font-bold">No resources found</h3>
          <p className="text-muted-foreground max-w-xs mt-2">
            Try adjusting your search, branch, regulation, or status filter to get started.
          </p>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <h3 className="text-xl font-bold text-foreground">Add New Resource</h3>
              <button
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground transition rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selection & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Resource Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="PDF">📄 PDF Document (.pdf)</option>
                    <option value="DOC">📝 MS Word Document (.doc, .docx)</option>
                    <option value="VIDEO">🎥 Video Link</option>
                    <option value="LINK">🔗 External Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Target Year (ALL or Specific)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="ALL">🌐 ALL Years (General)</option>
                    <option value="1st Year">🎓 1st Year</option>
                    <option value="2nd Year">🎓 2nd Year</option>
                    <option value="3rd Year">🎓 3rd Year</option>
                    <option value="4th Year">🎓 4th Year</option>
                  </select>
                </div>
              </div>

              {/* Target Branch & Regulation Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Target Branch (ALL or Specific)
                  </label>
                  <input
                    placeholder="e.g. ALL, CSE, ECE, IT..."
                    value={branch}
                    onChange={(e) => setBranch(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["ALL", "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AI&DS"].map((b) => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setBranch(b)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition ${
                          branch === b
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Academic Regulation (ALL or VR23...)
                  </label>
                  <input
                    placeholder="e.g. ALL, VR23, VR21, AR23..."
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["ALL", "VR23", "VR21", "AR23", "AR21", "R20"].map((reg) => (
                      <button
                        type="button"
                        key={reg}
                        onClick={() => setRegulation(reg)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition ${
                          regulation === reg
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Title *
                </label>
                <input
                  placeholder="Enter resource title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of the material..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Optional Book Cover / Thumbnail Image Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Book Cover / Thumbnail Image (Optional)
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    JPG, JPEG, PNG, WEBP
                  </span>
                </div>

                {coverPreview ? (
                  <div className="relative flex items-center gap-3 p-2.5 rounded-xl border border-border bg-secondary/30">
                    <img
                      src={coverPreview}
                      alt="Book Cover Preview"
                      className="h-14 w-11 object-cover rounded-lg border border-border/80 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">
                        {coverFile?.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {(coverFile?.size ? coverFile.size / 1024 : 0).toFixed(1)} KB • Cover Image selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setCoverError(null);
                      }}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition"
                      title="Remove Cover Image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      className={`flex items-center gap-3 border border-dashed ${
                        coverError
                          ? "border-destructive/60 bg-destructive/5"
                          : "border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40"
                      } rounded-xl p-3 cursor-pointer transition group`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <Image className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground block">
                          Click to select Book Cover / Thumbnail Image
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Supports .jpg, .jpeg, .png, .webp
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                        onChange={handleCoverFileSelect}
                      />
                    </label>

                    {coverError && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{coverError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Upload vs Link Input */}
              {type === "PDF" || type === "DOC" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {type === "PDF" ? "PDF Document File or Cloud Link *" : "MS Word Document File or Cloud Link *"}
                    </label>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setUploadMode("file")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          uploadMode === "file"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {type === "PDF" ? "Upload PDF" : "Upload MS Word"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("url")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          uploadMode === "url"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        Provide Link
                      </button>
                    </div>
                  </div>

                  {uploadMode === "file" ? (
                    <div>
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed ${fileError ? 'border-destructive/60 bg-destructive/5' : 'border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10'} rounded-2xl p-5 cursor-pointer transition text-center group`}>
                        <Upload className={`h-7 w-7 ${fileError ? 'text-destructive' : 'text-primary'} mb-2 group-hover:scale-110 transition-transform`} />
                        {selectedFile ? (
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-foreground block max-w-xs truncate">
                              {selectedFile.name}
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {type === "PDF" ? "PDF" : "MS Word"} file ready
                            </span>
                            {selectedFile.size > 50 * 1024 * 1024 && (
                              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 p-2 rounded-xl border border-amber-500/30">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                                <span>File exceeds 50MB. Submitted for Admin Approval upon upload.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-bold text-foreground block">
                              Click to select {type === "PDF" ? ".pdf" : ".doc / .docx"} file
                            </span>
                            <span className="text-xs text-muted-foreground block mt-0.5">
                              {type === "PDF" ? "Strictly PDF (.pdf) documents" : "Microsoft Word (.doc, .docx) documents"}
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept={type === "PDF" ? ".pdf" : ".doc,.docx"}
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>

                      {/* Explicit Red Error Box directly below Upload Dropzone */}
                      {fileError && (
                        <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/15 p-3 rounded-xl border border-destructive/30 shadow-sm animate-in fade-in slide-in-from-top-1">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                          <span>{fileError}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      placeholder={type === "PDF" ? "e.g. Google Drive PDF URL" : "e.g. Google Drive Word Document URL"}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  )}
                </div>
              ) :
 type === "VIDEO" ? (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Video URL (YouTube or Direct Video Link) *
                  </label>
                  <input
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    External Link / Web URL *
                  </label>
                  <input
                    placeholder="e.g. https://example.com/notes"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Btn variant="ghost" className="flex-1" onClick={resetForm} disabled={submitting}>
                Cancel
              </Btn>
              <Btn className="flex-1" onClick={handleAdd} disabled={submitting}>
                {submitting ? <Loader className="h-4 w-4 animate-spin" /> : "Add to Library"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



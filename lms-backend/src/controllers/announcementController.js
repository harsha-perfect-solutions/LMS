const { Announcement } = require("../models");
const { Op } = require("sequelize");

function parseDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  let s = String(val);
  if (!s.endsWith("Z") && !s.includes("+") && s.includes("T")) {
    s = s + "Z";
  } else if (!s.endsWith("Z") && !s.includes("+") && s.includes(" ")) {
    s = s.replace(" ", "T") + "Z";
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

function serializeAnnouncement(a) {
  const effectiveTimestamp = a.updatedAt || a.createdAt;
  const createdDate = parseDate(effectiveTimestamp);
  const diffMs = Math.max(0, Date.now() - createdDate.getTime());
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let formattedTime = "Just now";

  if (diffMs < 600000) {
    formattedTime = "Just now";
  } else if (diffMin < 60) {
    const tenMinChunk = Math.floor(diffMin / 10) * 10;
    formattedTime = `${tenMinChunk}m ago`;
  } else if (diffHours < 24) {
    formattedTime = `${diffHours}h ago`;
  } else if (diffDays < 30) {
    formattedTime = `${diffDays}d ago`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    formattedTime = `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    formattedTime = `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  }

  return {
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    branch: a.branch || "ALL",
    courseId: a.courseId || null,
    authorName: a.authorName || "Faculty Instructor",
    authorRole: a.authorRole || "FACULTY",
    category: a.category || "ANNOUNCEMENT",
    replies: Array.isArray(a.replies) ? a.replies : [],
    createdAt: createdDate.toISOString(),
    time: formattedTime,
    isNew: diffHours <= 24,
  };
}

exports.getAllAnnouncements = async (req, res) => {
  try {
    const role = String(req.user.role).toUpperCase();
    const isSuperAdmin = req.user.email === "admin@example.com";
    const reqCategory = req.query.category ? String(req.query.category).toUpperCase().trim() : null;
    let whereClause = {};

    if (!isSuperAdmin) {
      const userBranch = req.user.branch || "";
      whereClause.branch = userBranch ? { [Op.in]: ["ALL", userBranch] } : "ALL";
    }

    if (role === "STUDENT") {
      whereClause.audience = { [Op.in]: ["ALL", "STUDENTS", req.user.branch || ""] };
    } else if (role === "FACULTY") {
      whereClause.audience = { [Op.in]: ["ALL", "FACULTY", "STUDENTS", req.user.branch || ""] };
    }

    if (reqCategory) {
      whereClause.category = reqCategory;
    }

    const anns = await Announcement.findAll({
      where: whereClause,
      order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
    });

    return res.json(
      anns.map((a) => {
        const plain = a.toJSON();
        return serializeAnnouncement({
          ...plain,
          createdAt: plain.updatedAt || plain.createdAt,
        });
      })
    );
  } catch (err) {
    console.error("Error fetching announcements:", err);
    return res.status(500).json({ message: "Error fetching announcements" });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { _action, id, title, body, audience, branch, courseId, category, type } = req.body;
    const isSuperAdmin = req.user.email === "admin@example.com";

    // 1. Handle DELETE action explicitly first
    if (_action === "DELETE") {
      const targetId = id || req.body.announcementId;
      if (!targetId) return res.status(400).json({ message: "Announcement ID required" });

      const ann = await Announcement.findByPk(targetId);
      if (!ann) return res.status(404).json({ message: "Announcement not found" });

      await ann.destroy();
      return res.json({ message: "Announcement deleted successfully" });
    }

    // 2. Handle UPDATE action explicitly
    if (_action === "UPDATE" || (id && _action === "EDIT")) {
      const ann = await Announcement.findByPk(id);
      if (!ann) return res.status(404).json({ message: "Announcement not found" });

      const now = new Date();
      await ann.update({
        title: title !== undefined ? title : ann.title,
        body: body !== undefined ? body : ann.body,
        audience: audience ? audience.toString().toUpperCase().trim() : ann.audience,
        category: category ? category.toString().toUpperCase().trim() : ann.category,
        updatedAt: now,
      });

      const updatedAnn = await Announcement.findByPk(id);
      const plain = (updatedAnn || ann).toJSON();
      return res.json(serializeAnnouncement({ ...plain, createdAt: now, updatedAt: now }));
    }

    // 3. Create New Announcement / Broadcast
    let targetBranch = "ALL";
    if (!isSuperAdmin && req.user.branch) {
      // Department HOD or Faculty: Lock target branch to their department!
      targetBranch = req.user.branch;
    } else if (branch) {
      targetBranch = branch;
    } else if (audience && ["CSE", "AI & ML", "AI & DS", "IT", "ECE", "EEE", "MECH", "CIVIL"].includes(audience.toString().trim())) {
      targetBranch = audience.toString().trim();
    }

    const audienceValue = (audience || "ALL").toString().toUpperCase().trim();
    const categoryValue = (category || type || "ANNOUNCEMENT").toString().toUpperCase().trim();
    const defaultAuthorName = req.user ? (req.user.name || req.user.email) : "Instructor";
    const defaultAuthorRole = req.user ? req.user.role : "FACULTY";

    const announcement = await Announcement.create({
      title: title || "Untitled Topic",
      body: body || "",
      audience: audienceValue,
      branch: targetBranch,
      category: categoryValue,
      courseId: courseId ? Number(courseId) : null,
      authorName: req.body.authorName || defaultAuthorName,
      authorRole: req.body.authorRole || defaultAuthorRole,
      replies: [],
    });

    // Notify targeted users in the app
    const { User, Notification } = require("../models");
    if (categoryValue === "ANNOUNCEMENT") {
      let userWhere = { active: true };
      if (targetBranch !== "ALL") {
        userWhere.branch = targetBranch;
      }
      if (audienceValue === "STUDENTS") {
        userWhere.role = "STUDENT";
      } else if (audienceValue === "FACULTY") {
        userWhere.role = "FACULTY";
      }

      const targetUsers = await User.findAll({ where: userWhere, attributes: ["id"] });
      if (targetUsers.length > 0) {
        const notifications = targetUsers.map((u) => ({
          userId: u.id,
          title: `📢 ${targetBranch !== "ALL" ? targetBranch + " Announcement" : "Campus Announcement"}`,
          message: `${title}: ${(body || "").slice(0, 100)}...`,
          type: "INFO",
          isRead: false,
        }));
        await Notification.bulkCreate(notifications);
      }
    }

    return res.status(201).json(serializeAnnouncement(announcement.toJSON()));
  } catch (err) {
    console.error("Error in createAnnouncement handler:", err);
    return res.status(500).json({ message: "Error processing announcement" });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ message: "Reply message body is required" });
    }

    const ann = await Announcement.findByPk(id);
    if (!ann) return res.status(404).json({ message: "Discussion topic not found" });

    const defaultAuthorName = req.user ? (req.user.name || req.user.email) : "User";
    const defaultAuthorRole = req.user ? req.user.role : "STUDENT";

    const existingReplies = Array.isArray(ann.replies) ? ann.replies : [];
    const newReply = {
      id: Date.now(),
      authorName: req.body.authorName || defaultAuthorName,
      authorRole: req.body.authorRole || defaultAuthorRole,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedReplies = [...existingReplies, newReply];
    await ann.update({
      replies: updatedReplies,
      updatedAt: new Date(),
    });

    const refreshed = await Announcement.findByPk(id);
    return res.json(serializeAnnouncement(refreshed.toJSON()));
  } catch (err) {
    console.error("Error adding discussion reply:", err);
    return res.status(500).json({ message: "Error adding reply" });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ message: "Announcement not found" });

    const { title, body, audience } = req.body;
    const now = new Date();
    await ann.update({
      title: title !== undefined ? title : ann.title,
      body: body !== undefined ? body : ann.body,
      audience: audience !== undefined ? audience.toString().toUpperCase().trim() : ann.audience,
      updatedAt: now,
    });

    const updatedAnn = await Announcement.findByPk(req.params.id);
    const plain = (updatedAnn || ann).toJSON();
    return res.json(serializeAnnouncement({ ...plain, createdAt: now, updatedAt: now }));
  } catch (err) {
    console.error("Error updating announcement:", err);
    return res.status(500).json({ message: "Error updating announcement" });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ message: "Announcement not found" });

    await ann.destroy();
    return res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    return res.status(500).json({ message: "Error deleting announcement" });
  }
};

exports.debugAnnouncements = async (req, res) => {
  const role = req.params.role.toUpperCase();
  let whereClause = {};

  if (role === "STUDENT") {
    whereClause = { audience: { [Op.in]: ["ALL", "STUDENTS"] } };
  } else if (role === "FACULTY") {
    whereClause = { audience: { [Op.in]: ["ALL", "FACULTY", "STUDENTS"] } };
  } else if (role === "ADMIN") {
    whereClause = {};
  }

  const anns = await Announcement.findAll({ where: whereClause, order: [["createdAt", "DESC"]] });
  const allAnns = await Announcement.findAll();
  return res.json({
    role_requested: role,
    applied_where: whereClause,
    filtered_results: anns,
    all_results: allAnns,
  });
};

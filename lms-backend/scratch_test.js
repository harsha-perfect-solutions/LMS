const path = require("path");
const { Announcement, Notification, User, sequelize } = require("./src/models");
const { Op } = require("sequelize");

async function testAnnouncementAndNotificationScoping() {
  try {
    console.log("=== Running ALTER TABLE Column Checks ===");
    await sequelize.query('ALTER TABLE "Announcements" ADD COLUMN IF NOT EXISTS "branch" VARCHAR(255) DEFAULT \'ALL\';');
    await sequelize.query('ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "year" VARCHAR(255) DEFAULT \'1st Year\';');
    await sequelize.query('ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "sem" VARCHAR(255) DEFAULT \'1st Sem\';');
    await sequelize.query('ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "section" VARCHAR(255) DEFAULT \'Section A\';');

    // Clean test announcements first
    await Announcement.destroy({ where: { title: { [Op.like]: "%[TEST_SCOPE]%" } } });

    console.log("=== Creating Test Announcements ===");
    // 1. Super Admin Announcement (Global Campus)
    const saAnn = await Announcement.create({
      title: "[TEST_SCOPE] Campus Wide Announcement",
      body: "Important message from Super Admin to all campus students.",
      audience: "ALL",
      branch: "ALL",
      category: "ANNOUNCEMENT",
      authorName: "Super Admin",
      authorRole: "ADMIN"
    });

    // 2. AI & DS Department HOD Announcement
    const aidsAnn = await Announcement.create({
      title: "[TEST_SCOPE] AI & DS Department Notice",
      body: "Notice for AI & DS students only.",
      audience: "ALL",
      branch: "AI & DS",
      category: "ANNOUNCEMENT",
      authorName: "Dr. G. Anita (HOD AI & DS)",
      authorRole: "ADMIN"
    });

    // 3. CSE Department HOD Announcement
    const cseAnn = await Announcement.create({
      title: "[TEST_SCOPE] CSE Department Notice",
      body: "Notice for CSE students only.",
      audience: "ALL",
      branch: "CSE",
      category: "ANNOUNCEMENT",
      authorName: "HOD CSE",
      authorRole: "ADMIN"
    });

    console.log("Test announcements created successfully.");

    console.log("\n=== Testing Announcement Scoping ===");
    
    // Super Admin view test
    const saResults = await Announcement.findAll({
      where: { title: { [Op.like]: "%[TEST_SCOPE]%" } }
    });
    console.log(`Super Admin sees ${saResults.length} test announcements (Expected: 3)`);

    // AI & DS Student view test (req.user.branch = 'AI & DS')
    const aidsStudentBranch = "AI & DS";
    const aidsStudentResults = await Announcement.findAll({
      where: {
        title: { [Op.like]: "%[TEST_SCOPE]%" },
        branch: { [Op.in]: ["ALL", aidsStudentBranch] },
        audience: { [Op.in]: ["ALL", "STUDENTS", aidsStudentBranch] }
      }
    });
    console.log(`AI & DS Student sees ${aidsStudentResults.length} test announcements:`, aidsStudentResults.map(a => a.title));
    const aidsHasCse = aidsStudentResults.some(a => a.title.includes("CSE"));
    console.log(`-> Did AI & DS Student see CSE announcement? ${aidsHasCse ? "YES (LEAK DETECTED!)" : "NO (STRICTLY SCOPED - PERFECT!)"}`);

    // CSE Student view test (req.user.branch = 'CSE')
    const cseStudentBranch = "CSE";
    const cseStudentResults = await Announcement.findAll({
      where: {
        title: { [Op.like]: "%[TEST_SCOPE]%" },
        branch: { [Op.in]: ["ALL", cseStudentBranch] },
        audience: { [Op.in]: ["ALL", "STUDENTS", cseStudentBranch] }
      }
    });
    console.log(`CSE Student sees ${cseStudentResults.length} test announcements:`, cseStudentResults.map(a => a.title));
    const cseHasAids = cseStudentResults.some(a => a.title.includes("AI & DS"));
    console.log(`-> Did CSE Student see AI & DS announcement? ${cseHasAids ? "YES (LEAK DETECTED!)" : "NO (STRICTLY SCOPED - PERFECT!)"}`);

    console.log("\n=== Cleaning Up Test Data ===");
    await Announcement.destroy({ where: { title: { [Op.like]: "%[TEST_SCOPE]%" } } });
    console.log("Test data cleaned up successfully.");

    process.exit(0);
  } catch (err) {
    console.error("Error in test script:", err);
    process.exit(1);
  }
}

testAnnouncementAndNotificationScoping();

const path = require("path");
const { Announcement, Notification, User } = require(path.join(__dirname, "../lms-backend/src/models"));
const { Op } = require("sequelize");

async function checkAnnouncementsAndNotifications() {
  try {
    console.log("=== Checking DB Users ===");
    const usersCount = await User.count();
    console.log(`Total users in DB: ${usersCount}`);

    console.log("\n=== Checking Announcements ===");
    const announcements = await Announcement.findAll({ order: [['createdAt', 'DESC']] });
    console.log(`Total announcements: ${announcements.length}`);
    announcements.forEach(a => {
      console.log(`[ID: ${a.id}] Title: "${a.title}" | Branch: "${a.branch}" | Audience: "${a.audience}" | Author: "${a.authorName}" (${a.authorRole})`);
    });

    console.log("\n=== Checking Notifications Count ===");
    const notifCount = await Notification.count();
    console.log(`Total notifications in DB: ${notifCount}`);

    // Test simulation for Super Admin vs HOD vs Student
    console.log("\n=== Testing Scoping Logic ===");
    
    // 1. Super Admin simulation
    const superAdmin = { email: "admin@example.com", role: "ADMIN", branch: "CSE" };
    const saAnns = await Announcement.findAll({
      order: [['createdAt', 'DESC']]
    });
    console.log(`Super Admin (${superAdmin.email}) sees ${saAnns.length} announcements (ALL campus + all departments)`);

    // 2. AI & DS HOD simulation
    const hodAids = { email: "hod_aids@vignan.ac.in", role: "ADMIN", branch: "AI & DS" };
    const hodAidsAnns = await Announcement.findAll({
      where: { branch: { [Op.in]: ["ALL", "AI & DS"] } },
      order: [['createdAt', 'DESC']]
    });
    console.log(`AI & DS HOD (${hodAids.email}) sees ${hodAidsAnns.length} announcements (ALL campus + AI & DS only)`);

    // 3. CSE Student simulation
    const cseStudent = { email: "student_cse@vignan.ac.in", role: "STUDENT", branch: "CSE" };
    const cseStudentAnns = await Announcement.findAll({
      where: {
        branch: { [Op.in]: ["ALL", "CSE"] },
        audience: { [Op.in]: ["ALL", "STUDENTS", "CSE"] }
      },
      order: [['createdAt', 'DESC']]
    });
    console.log(`CSE Student (${cseStudent.email}) sees ${cseStudentAnns.length} announcements (ALL campus + CSE only)`);

    // 4. AI & DS Student simulation
    const aidsStudent = { email: "student@example.com", role: "STUDENT", branch: "AI & DS" };
    const aidsStudentAnns = await Announcement.findAll({
      where: {
        branch: { [Op.in]: ["ALL", "AI & DS"] },
        audience: { [Op.in]: ["ALL", "STUDENTS", "AI & DS"] }
      },
      order: [['createdAt', 'DESC']]
    });
    console.log(`AI & DS Student (${aidsStudent.email}) sees ${aidsStudentAnns.length} announcements (ALL campus + AI & DS only)`);

    process.exit(0);
  } catch (err) {
    console.error("Error in verification script:", err);
    process.exit(1);
  }
}

checkAnnouncementsAndNotifications();

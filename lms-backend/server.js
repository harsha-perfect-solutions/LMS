require("dotenv").config();
const app = require("./src/app");
const { sequelize, User } = require("./src/models");
const bcrypt = require("bcryptjs");

const PORT = Number(process.env.PORT || 8082);

// Initialization
sequelize.sync({ alter: true }).then(async () => {
  console.log("Database synced");
  
  // Ensure SQLite AttendanceRecords table has the required columns
  try {
    await sequelize.query("ALTER TABLE AttendanceRecords ADD COLUMN periodsConducted INTEGER DEFAULT 1;");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE AttendanceRecords ADD COLUMN periodsAttended INTEGER DEFAULT 1;");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE AttendanceRecords ADD COLUMN status VARCHAR(255) DEFAULT 'PRESENT';");
  } catch (e) {}
  try {
    await sequelize.query("UPDATE AttendanceRecords SET periodsConducted = 1 WHERE periodsConducted IS NULL;");
    await sequelize.query("UPDATE AttendanceRecords SET periodsAttended = 1 WHERE periodsAttended IS NULL AND value > 0;");
  } catch (e) {}

  try {
    await sequelize.query("ALTER TABLE Users ADD COLUMN section VARCHAR(255) DEFAULT 'A';");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE Users ADD COLUMN rollNo VARCHAR(255);");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE Users ADD COLUMN facultyId VARCHAR(255);");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE Users ADD COLUMN hodId VARCHAR(255);");
  } catch (e) {}

  try {
    await sequelize.query("ALTER TABLE Courses ADD COLUMN year VARCHAR(255) DEFAULT 'ALL';");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE Courses ADD COLUMN sem VARCHAR(255) DEFAULT 'ALL';");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE Courses ADD COLUMN section VARCHAR(255) DEFAULT 'ALL';");
  } catch (e) {}

  try {
    await sequelize.query("ALTER TABLE Announcements ADD COLUMN branch VARCHAR(255) DEFAULT 'ALL';");
  } catch (e) {}

  const count = await User.count();
  if (count === 0) {
    try {
      console.log("Database empty. Generating 355 mock users across 8 branches...");
      require("./seed_mock_data");
    } catch (err) {
      console.error("Auto seed failed:", err);
    }
  }
}).catch(err => {
  console.error("Database connection failed", err);
});

app.listen(PORT, () => {
  console.log(`LMS backend is running on http://localhost:${PORT}`);
  console.log("Demo credentials:");
  console.log("  Admin: admin@example.com / password123");
  console.log("  Faculty: faculty@example.com / password123");
  console.log("  Student: student@example.com / password123");
});

const { Course, User } = require("../src/models");
const path = require("path");

async function testCreation() {
  console.log("Testing course creation with path module imported...");
  try {
    const course = await Course.create({
      title: "Data Science Test",
      code: "23DS301",
      description: "Introduction to Data Science",
      branch: "AI & DS",
      year: "1st Year",
      sem: "1st Sem",
      section: "Section A",
      regulation: "VR23",
      facultyId: 1,
      facultyName: "Faculty User",
      status: "PENDING"
    });

    console.log("Course created successfully:", course.id, course.title, course.branch);

    // Verify HOD lookup for AI & DS
    const hod = await User.findOne({ where: { role: "ADMIN", branch: "AI & DS" } });
    console.log("AI & DS HOD mapped:", hod ? hod.email : "Not found");

    await course.destroy();
    console.log("Cleaned up test course!");
    process.exit(0);
  } catch (err) {
    console.error("Course creation failed:", err);
    process.exit(1);
  }
}

testCreation();

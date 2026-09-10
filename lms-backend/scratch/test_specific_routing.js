const { Course, User } = require("../src/models");

async function testSpecificRouting() {
  console.log("=== VERIFYING SPECIFIC ROUTING WITHOUT ALL ===");

  // Create a course targeting 2nd Year, 3rd Sem, Section B
  const course = await Course.create({
    title: "Data Structures & Algorithms",
    code: "CSE201",
    description: "Course strictly for 2nd Year 3rd Sem Sec B",
    branch: "CSE",
    year: "2nd Year",
    sem: "3rd Sem",
    section: "Section B",
    facultyId: 2,
    facultyName: "Dr. A. B. Chaitanya",
    status: "APPROVED"
  });

  const matchingStudent = await User.findOne({
    where: { branch: "CSE", year: "2nd Year", sem: "3rd Sem", section: "B" }
  });

  const wrongSecStudent = await User.findOne({
    where: { branch: "CSE", year: "2nd Year", sem: "3rd Sem", section: "A" }
  });

  function matches(c, st) {
    if (c.branch && c.branch.toUpperCase() !== st.branch.toUpperCase()) return false;
    if (c.year && c.year.toLowerCase() !== st.year.toLowerCase()) return false;
    if (c.sem && c.sem.toLowerCase() !== st.sem.toLowerCase()) return false;
    if (c.section) {
      const cSec = c.section.toUpperCase();
      const stSec = st.section.toUpperCase();
      if (cSec !== stSec && cSec !== `SECTION ${stSec}` && !cSec.endsWith(stSec)) return false;
    }
    return true;
  }

  console.log(`Matching Student (${matchingStudent.email}): ${matches(course, matchingStudent)} (EXPECTED: true)`);
  console.log(`Wrong Section Student (${wrongSecStudent.email}): ${matches(course, wrongSecStudent)} (EXPECTED: false)`);

  await course.destroy();
  console.log("Cleanup complete!");
  process.exit(0);
}

testSpecificRouting();

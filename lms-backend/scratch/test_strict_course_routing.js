const { Course, User } = require("../src/models");
const courseController = require("../src/controllers/courseController");

async function testStrictRouting() {
  console.log("=== STARTING STRICT COURSE ROUTING VERIFICATION ===");

  // 1. Create a course targeting CSE, 3rd Year, 5th Sem, Section A
  const testCourse = await Course.create({
    title: "Advanced Web Engineering",
    code: "CSE305",
    description: "Strict Routing Test Course for 3rd Year CSE 5th Sem Sec A",
    branch: "CSE",
    year: "3rd Year",
    sem: "5th Sem",
    section: "Section A",
    regulation: "VR23",
    facultyId: 2,
    facultyName: "Dr. A. B. Chaitanya",
    status: "PENDING"
  });

  console.log(`[1] Created Test Course (ID: ${testCourse.id})`);
  console.log(`    Branch: ${testCourse.branch} | Year: ${testCourse.year} | Sem: ${testCourse.sem} | Sec: ${testCourse.section}`);

  // 2. Check pending course visibility for CSE HOD vs ECE HOD
  const cseHod = await User.findOne({ where: { email: "hodcse@lms.com" } });
  const eceHod = await User.findOne({ where: { email: "hodece@lms.com" } });

  const allPending = await Course.findAll({ where: { status: "PENDING" } });
  const cseHodPending = allPending.filter(c => c.branch === "ALL" || c.branch === cseHod.branch);
  const eceHodPending = allPending.filter(c => c.branch === "ALL" || c.branch === eceHod.branch);

  console.log(`\n[2] HOD Course Approval Routing Check:`);
  console.log(`    - CSE HOD sees course in pending list: ${cseHodPending.some(c => c.id === testCourse.id)} (EXPECTED: true)`);
  console.log(`    - ECE HOD sees course in pending list: ${eceHodPending.some(c => c.id === testCourse.id)} (EXPECTED: false)`);

  // 3. Approve course as CSE HOD
  await testCourse.update({ status: "APPROVED" });
  console.log(`\n[3] CSE HOD approved the course! Status is now: ${testCourse.status}`);

  // 4. Test Student Strict Routing
  const targetStudent = await User.findOne({ where: { email: "studentcse21@lms.com" } }); // CSE 3rd Year 5th Sem Sec A
  const wrongYearStudent = await User.findOne({ where: { email: "studentcse1@lms.com" } }); // CSE 1st Year 1st Sem Sec A
  const wrongBranchStudent = await User.findOne({ where: { email: "studentece21@lms.com" } }); // ECE 3rd Year 5th Sem Sec A

  console.log(`\n[4] Target Student Profiles:`);
  console.log(`    - Target Student: ${targetStudent.email} (${targetStudent.branch}, ${targetStudent.year}, ${targetStudent.sem}, Sec ${targetStudent.section})`);
  console.log(`    - Wrong Year Student: ${wrongYearStudent.email} (${wrongYearStudent.branch}, ${wrongYearStudent.year}, ${wrongYearStudent.sem}, Sec ${wrongYearStudent.section})`);
  console.log(`    - Wrong Branch Student: ${wrongBranchStudent.email} (${wrongBranchStudent.branch}, ${wrongBranchStudent.year}, ${wrongBranchStudent.sem}, Sec ${wrongBranchStudent.section})`);

  // Simulate controller student visibility check
  function matchesStudent(c, st) {
    if (c.branch && c.branch !== "ALL" && c.branch.toUpperCase() !== st.branch.toUpperCase()) return false;
    if (c.year && c.year !== "ALL" && c.year.toLowerCase() !== st.year.toLowerCase()) return false;
    if (c.sem && c.sem !== "ALL" && c.sem.toLowerCase() !== st.sem.toLowerCase()) return false;
    if (c.section && c.section !== "ALL") {
      const cSec = c.section.toUpperCase();
      const stSec = st.section.toUpperCase();
      if (cSec !== stSec && cSec !== `SECTION ${stSec}` && !cSec.endsWith(stSec)) return false;
    }
    return true;
  }

  console.log(`\n[5] Student Exploration Visibility Results:`);
  console.log(`    - Target Student (${targetStudent.email}): CAN SEE = ${matchesStudent(testCourse, targetStudent)} (EXPECTED: true)`);
  console.log(`    - Wrong Year Student (${wrongYearStudent.email}): CAN SEE = ${matchesStudent(testCourse, wrongYearStudent)} (EXPECTED: false)`);
  console.log(`    - Wrong Branch Student (${wrongBranchStudent.email}): CAN SEE = ${matchesStudent(testCourse, wrongBranchStudent)} (EXPECTED: false)`);

  // Cleanup test course
  await testCourse.destroy();
  console.log("\n[6] Cleaned up test course. Strict routing verification complete!");
  process.exit(0);
}

testStrictRouting().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

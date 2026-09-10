require("dotenv").config();
const { sequelize, User } = require("./src/models");
const bcrypt = require("bcryptjs");

const BRANCHES = [
  { name: "CSE", slug: "cse", code: "CSE", hodName: "Dr. K. V. Ramana" },
  { name: "AI & ML", slug: "aiml", code: "AIML", hodName: "Dr. M. S. R. Prasad" },
  { name: "AI & DS", slug: "aids", code: "AIDS", hodName: "Dr. G. Anita" },
  { name: "IT", slug: "it", code: "IT", hodName: "Dr. P. V. N. Rao" },
  { name: "ECE", slug: "ece", code: "ECE", hodName: "Dr. T. Sudhakar" },
  { name: "EEE", slug: "eee", code: "EEE", hodName: "Dr. N. B. V. Prasad" },
  { name: "MECH", slug: "mech", code: "MECH", hodName: "Dr. B. K. Satyanarayana" },
  { name: "CIVIL", slug: "civil", code: "CIVIL", hodName: "Dr. V. Rajesh" },
];

const SEM_MAP = [
  { year: "1st Year", sem: "1st Sem", yearCode: "24", startIdx: 1 },
  { year: "2nd Year", sem: "3rd Sem", yearCode: "23", startIdx: 11 },
  { year: "3rd Year", sem: "5th Sem", yearCode: "22", startIdx: 21 },
  { year: "4th Year", sem: "7th Sem", yearCode: "21", startIdx: 31 },
];

const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Karthik", "Sneha",
  "Aditya", "Pooja", "Rahul", "Kavya", "Siddharth", "Divya", "Arjun", "Ritu",
  "Varun", "Meera", "Yash", "Ishita", "Manish", "Tanvi", "Abhinav", "Shreya",
  "Nikhil", "Bhavana", "Tarun", "Swati", "Harish", "Deepika", "Pranav", "Lavanya",
  "Sai", "Bhavya", "Gautam", "Sravani", "Ramesh", "Kavitha", "Sanjay", "Anusha"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Rao", "Reddy", "Kumar", "Singh", "Joshi", "Patel",
  "Gupta", "Nair", "Chowdhury", "Deshmukh", "Pillai", "Iyer", "Kulkarni"
];

const FACULTY_NAMES = [
  "Dr. A. B. Chaitanya", "Prof. K. Srilatha", "Dr. V. N. Murthy",
  "Prof. P. Suresh", "Dr. R. K. Varma", "Prof. M. Lakshmi",
  "Dr. S. K. Roy", "Prof. N. Chandrasekhar", "Dr. D. V. Raju",
  "Prof. T. Anjaneyulu", "Dr. G. V. Subbarao", "Prof. K. V. S. N. Raju",
  "Dr. M. V. Ramana", "Prof. B. Sitaram", "Dr. C. H. V. Prasada Rao",
  "Prof. D. Swaroop", "Dr. E. V. Krishna", "Prof. F. G. Hussain",
  "Dr. G. H. R. S. Prasad", "Prof. I. J. K. Rao", "Dr. L. M. N. Swamy",
  "Prof. O. P. Q. Sharma", "Dr. R. S. T. Varma", "Prof. U. V. W. Reddy"
];

async function seedMockData() {
  try {
    console.log("Connecting to the database...");
    await sequelize.authenticate();

    console.log("Syncing database schema (force: true to reset table structures)...");
    await sequelize.sync({ force: true });

    const defaultPassword = bcrypt.hashSync("password123", 10);
    const usersToCreate = [];

    // 1. Global Demo Users
    usersToCreate.push(
      { name: "Admin User", email: "admin@example.com", password: defaultPassword, role: "ADMIN", active: true, isVerified: true, branch: "CSE", hodId: "HODDEMO01" },
      { name: "Faculty User", email: "faculty@example.com", password: defaultPassword, role: "FACULTY", active: true, isVerified: true, branch: "CSE", facultyId: "FACDEMO01" },
      { name: "Student User", email: "student@example.com", password: defaultPassword, role: "STUDENT", active: true, isVerified: true, branch: "CSE", year: "3rd Year", sem: "5th Sem", section: "A", rollNo: "22CSE00" }
    );

    let facNameIdx = 0;

    // 2. Loop through 8 Branches
    for (const b of BRANCHES) {
      const slug = b.slug;

      // HOD (Admin role for department)
      usersToCreate.push({
        name: `${b.hodName} (HOD ${b.name})`,
        email: `hod${slug}@lms.com`,
        password: defaultPassword,
        role: "ADMIN",
        active: true,
        isVerified: true,
        branch: b.name,
        hodId: `HOD${b.code}01`,
      });

      // 3 Faculty per department
      for (let f = 1; f <= 3; f++) {
        const facName = FACULTY_NAMES[facNameIdx % FACULTY_NAMES.length];
        facNameIdx++;
        usersToCreate.push({
          name: `${facName}`,
          email: `faculty${slug}${f}@lms.com`,
          password: defaultPassword,
          role: "FACULTY",
          active: true,
          isVerified: true,
          branch: b.name,
          facultyId: `FAC${b.code}${String(f).padStart(2, "0")}`,
        });
      }

      // 40 Students per branch (10 per year/sem across 4 odd sem groups)
      for (const semInfo of SEM_MAP) {
        let rollCounter = 1;
        
        // 2 Sections (A and B), 5 students each
        for (const section of ["A", "B"]) {
          for (let s = 1; s <= 5; s++) {
            const studentNumberInBranch = semInfo.startIdx + (section === "B" ? 5 : 0) + (s - 1);
            const rollNumber = `${semInfo.yearCode}${b.code}${String(rollCounter).padStart(2, "0")}`;
            
            const fn = FIRST_NAMES[(studentNumberInBranch * 3 + b.name.length) % FIRST_NAMES.length];
            const ln = LAST_NAMES[(studentNumberInBranch * 7) % LAST_NAMES.length];
            const fullName = `${fn} ${ln}`;

            usersToCreate.push({
              name: fullName,
              email: `student${slug}${studentNumberInBranch}@lms.com`,
              password: defaultPassword,
              role: "STUDENT",
              active: true,
              isVerified: true,
              branch: b.name,
              year: semInfo.year,
              sem: semInfo.sem,
              section: section,
              rollNo: rollNumber,
            });

            rollCounter++;
          }
        }
      }
    }

    console.log(`Bulk inserting ${usersToCreate.length} mock users into database...`);
    await User.bulkCreate(usersToCreate);

    console.log("\n=======================================================");
    console.log("Mock data seeding completed successfully!");
    console.log(`Total Users Created: ${usersToCreate.length}`);
    console.log("Structure Breakdown:");
    console.log("  - 3 Global Demo Accounts (admin, faculty, student)");
    console.log("  - 8 HOD Admins (hodcse@lms.com .. hodcivil@lms.com)");
    console.log("  - 24 Department Faculty (facultycse1@lms.com .. facultycivil3@lms.com)");
    console.log("  - 320 Students (studentcse1@lms.com .. studentcivil40@lms.com)");
    console.log("  - 8 Branches: CSE, AI & ML, AI & DS, IT, ECE, EEE, MECH, CIVIL");
    console.log("  - Default password for all users: password123");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding mock data:", error);
    process.exit(1);
  }
}

seedMockData();

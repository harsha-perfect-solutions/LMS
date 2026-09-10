const { User } = require("./src/models");

async function checkStudents() {
  const students = await User.findAll({
    where: { role: "STUDENT" },
    attributes: ['id', 'name', 'email', 'branch', 'year', 'sem', 'section', 'rollNo'],
    limit: 10
  });
  console.log("Sample Students:", JSON.stringify(students, null, 2));
  process.exit(0);
}

checkStudents();

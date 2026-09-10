const { User } = require("./src/models");

async function findMatchingStudents() {
  const students = await User.findAll({
    where: {
      role: "STUDENT",
      branch: "AI & DS",
      year: "1st Year",
      sem: "1st Sem",
      section: "A"
    },
    attributes: ["id", "name", "email", "branch", "year", "sem", "section"]
  });
  console.log("Matching AI & DS 1st Year 1st Sem Sec A Students:", JSON.stringify(students, null, 2));
  process.exit(0);
}

findMatchingStudents();

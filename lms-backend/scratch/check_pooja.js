const { User, Course } = require("./src/models");

async function checkPoojaAndCourse() {
  const student = await User.findOne({ where: { name: "Pooja Kulkarni" } });
  console.log("Pooja Kulkarni details:", JSON.stringify(student, null, 2));

  const pendingCourses = await Course.findAll({ where: { title: "Data science" } });
  console.log("Data science courses in DB:", JSON.stringify(pendingCourses, null, 2));

  process.exit(0);
}

checkPoojaAndCourse();

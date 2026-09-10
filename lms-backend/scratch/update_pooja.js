const { User } = require("./src/models");

async function updatePoojaProfile() {
  const user = await User.findOne({ where: { email: "student@example.com" } });
  if (user) {
    await user.update({
      branch: "AI & DS",
      year: "1st Year",
      sem: "1st Sem",
      section: "A"
    });
    console.log("Updated student@example.com profile to AI & DS, 1st Year, 1st Sem, Sec A");
  }
  process.exit(0);
}

updatePoojaProfile();

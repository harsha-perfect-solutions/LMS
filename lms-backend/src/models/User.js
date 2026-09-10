const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationOtp: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT },
    profilePicture: { type: DataTypes.STRING },
    skills: { type: DataTypes.JSONB, defaultValue: [] },
    socialLinks: { type: DataTypes.JSONB, defaultValue: {} },
    year: { type: DataTypes.STRING, defaultValue: "3rd Year" },
    branch: { type: DataTypes.STRING, defaultValue: "CSE" },
    sem: { type: DataTypes.STRING, defaultValue: "Sem 1" },
    section: { type: DataTypes.STRING, defaultValue: "A" },
    rollNo: { type: DataTypes.STRING },
    facultyId: { type: DataTypes.STRING },
    hodId: { type: DataTypes.STRING },
  });
};

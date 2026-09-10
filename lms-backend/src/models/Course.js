const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Course", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    content: { type: DataTypes.TEXT },
    pdfUrl: { type: DataTypes.STRING },
    facultyId: { type: DataTypes.INTEGER },
    facultyName: { type: DataTypes.STRING },
    branch: { type: DataTypes.STRING, defaultValue: "ALL" },
    regulation: { type: DataTypes.STRING, defaultValue: "ALL" },
    year: { type: DataTypes.STRING, defaultValue: "ALL" },
    sem: { type: DataTypes.STRING, defaultValue: "ALL" },
    section: { type: DataTypes.STRING, defaultValue: "ALL" },
    status: { type: DataTypes.STRING, defaultValue: "PENDING" },
    studentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    enrolledStudentIds: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    progressByStudent: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    rejectionReason: { type: DataTypes.STRING },
  });
};

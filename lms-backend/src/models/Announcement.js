const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Announcement", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT },
    audience: { type: DataTypes.STRING, defaultValue: "ALL" },
    branch: { type: DataTypes.STRING, defaultValue: "ALL" },
    courseId: { type: DataTypes.INTEGER, allowNull: true },
    authorName: { type: DataTypes.STRING, defaultValue: "Faculty Instructor" },
    authorRole: { type: DataTypes.STRING, defaultValue: "FACULTY" },
    category: { type: DataTypes.STRING, defaultValue: "ANNOUNCEMENT" },
    replies: { type: DataTypes.JSON, defaultValue: [] },
  });
};

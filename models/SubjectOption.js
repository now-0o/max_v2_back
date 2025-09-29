const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Subject = require("./Subject");

const SubjectOption = sequelize.define("SubjectOption", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false }, // 화작, 언매, 확통, 미적분, 탐구 과목 등
}, {
  tableName: "subject_options",
  timestamps: false,
});

Subject.hasMany(SubjectOption, { foreignKey: "subjectId" });
SubjectOption.belongsTo(Subject, { foreignKey: "subjectId" });

module.exports = SubjectOption;

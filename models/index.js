const sequelize = require("../config/database");

const School = require("./School");
const Department = require("./Department");
const UserChoice = require("./UserChoice");
const User = require("./User");

const Subject = require("./Subject");
const SubjectOption = require("./SubjectOption");
const ExamScore = require("./ExamScore");

// 기존 관계
School.hasMany(Department, { foreignKey: "schoolId", onDelete: "CASCADE" });
Department.belongsTo(School, { foreignKey: "schoolId" });

User.hasMany(UserChoice, { foreignKey: "userId" });
UserChoice.belongsTo(User, { foreignKey: "userId" });

Department.hasMany(UserChoice, { foreignKey: "departmentId" });
UserChoice.belongsTo(Department, { foreignKey: "departmentId" });

// 새로 추가된 관계는 각 모델 내부에서 이미 설정

module.exports = {
  sequelize,
  School,
  Department,
  UserChoice,
  User,
  Subject,
  SubjectOption,
  ExamScore,
};

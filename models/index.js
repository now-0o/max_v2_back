// models/index.js

const sequelize = require("../config/database");

const School = require("./School");
const Department = require("./Department");
const UserChoice = require("./UserChoice");
const User = require("./User");

const Subject = require("./Subject");
const SubjectOption = require("./SubjectOption");
const ExamScore = require("./ExamScore");

// --- [신규 모델 불러오기] ---
const DepartmentScoreConfig = require("./DepartmentScoreConfig");
const CollegeMaxScore = require("./CollegeMaxScore");
const GradeConversion = require("./GradeConversion");
// -----------------------------


// 1. 기존 관계 유지
// School <-> Department 관계는 Department.js에서 정의됨 (유지)

User.hasMany(UserChoice, { foreignKey: "userId" });
UserChoice.belongsTo(User, { foreignKey: "userId" });

Department.hasMany(UserChoice, { foreignKey: "departmentId" });
UserChoice.belongsTo(Department, { foreignKey: "departmentId" });

// 2. [추가] 새로운 계산 로직 관계 설정
// Department <-> DepartmentScoreConfig (학과별 정규화 기준)
Department.hasMany(DepartmentScoreConfig, { foreignKey: "departmentId", onDelete: "CASCADE" });
DepartmentScoreConfig.belongsTo(Department, { foreignKey: "departmentId" });

// Department <-> GradeConversion (학과별 등급 변환표)
Department.hasMany(GradeConversion, { foreignKey: "departmentId", onDelete: "CASCADE" });
GradeConversion.belongsTo(Department, { foreignKey: "departmentId" });

// CollegeMaxScore는 공통 기준 데이터로, Department와의 직접적인 외래키 관계는 불필요합니다.

module.exports = {
    sequelize,
    School,
    Department,
    UserChoice,
    User,
    Subject,
    SubjectOption,
    ExamScore,
    // --- [신규 모델 Export] ---
    DepartmentScoreConfig,
    CollegeMaxScore,
    GradeConversion
};
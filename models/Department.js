const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./School");

const Department = sequelize.define("Department", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // 학군 (가, 나, 다)
  division: {
    type: DataTypes.ENUM("가", "나", "다"),
    allowNull: true,
  },
  // 지역
  region: {
    type: DataTypes.ENUM(
      "강원",
      "충남",
      "경남",
      "경북",
      "서울",
      "세종",
      "전북",
      "부산",
      "경기",
      "인천",
      "광주",
      "대전",
      "충북",
      "대구",
      "전남",
      "제주"
    ),
    allowNull: true,
  },
  // 형태 (국립, 사립)
  type: {
    type: DataTypes.ENUM("국립", "사립"),
    allowNull: true,
  },
  // 교직이수 여부 (가능, 불가능, 일부가능)
  teacherCertification: {
    type: DataTypes.ENUM("가능", "불가능", "일부가능"),
    allowNull: true,
  },
});

School.hasMany(Department, { foreignKey: "schoolId", onDelete: "CASCADE" });
Department.belongsTo(School, { foreignKey: "schoolId" });

module.exports = Department;

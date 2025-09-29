const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Subject = sequelize.define("Subject", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },     // 국어, 수학, 영어, 탐구
  category: { type: DataTypes.STRING(50), allowNull: false }, // 공통 / 선택
}, {
  tableName: "subjects",
  timestamps: false,
});

module.exports = Subject;

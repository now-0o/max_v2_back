const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DepartmentScoreRule = sequelize.define(
  "DepartmentScoreRule",
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    departmentId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: '연결된 학과 ID'
    },
    subject_group: { 
      type: DataTypes.JSON, 
      allowNull: false,
      comment: '적용 과목 ID 배열 (예: [1, 2] = 국어, 수학)'
    },
    pick_count: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: '선택 과목 개수'
    },
    weight_type: { 
      type: DataTypes.ENUM("FIXED", "RANK"), 
      allowNull: false,
      comment: 'FIXED: 고정비율, RANK: 순위별 비율'
    },
    weights: { 
      type: DataTypes.JSON, 
      allowNull: false,
      comment: '비율 배열 (예: [30, 30] 또는 [50, 30, 20])'
    },
  },
  {
    tableName: "DepartmentScoreRules",
    timestamps: false,
  }
);

module.exports = DepartmentScoreRule;
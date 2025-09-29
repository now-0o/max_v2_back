const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const ExamScore = sequelize.define(
  "ExamScore",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    mode: {
      type: DataTypes.ENUM("before", "after"),
      allowNull: false,
    },
    scores: {
      type: DataTypes.JSON, // 전체 성적을 JSON으로 저장
      allowNull: false,
    },
  },
  {
    tableName: "exam_scores",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["userId", "mode"], // 유저당 before/after 하나씩만
      },
    ],
  }
);

User.hasMany(ExamScore, { foreignKey: "userId" });
ExamScore.belongsTo(User, { foreignKey: "userId" });

module.exports = ExamScore;

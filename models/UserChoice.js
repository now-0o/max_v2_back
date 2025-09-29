const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Department = require("./Department");

const UserChoice = sequelize.define(
    "UserChoice",
    {},
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "departmentId"], // 같은 조합 중복 방지
        },
      ],
    }
  );
  

// 관계 설정
User.hasMany(UserChoice, { foreignKey: "userId" });
UserChoice.belongsTo(User, { foreignKey: "userId" });

Department.hasMany(UserChoice, { foreignKey: "departmentId" });
UserChoice.belongsTo(Department, { foreignKey: "departmentId" });

module.exports = UserChoice;

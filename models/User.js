const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  kakaoId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // 닉네임을 여기 저장
  },
  gender: {
    type: DataTypes.STRING, // "male", "female" 등
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  highschool: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = User;

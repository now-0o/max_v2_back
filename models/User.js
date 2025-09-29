const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");  // ✅ sequelize 인스턴스 import

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  kakaoId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: DataTypes.STRING,
  phone: DataTypes.STRING,
  highschool: DataTypes.STRING,
});

module.exports = User;

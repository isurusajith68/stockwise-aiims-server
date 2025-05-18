const db = require("../models");
const User = db.user;
const Information = db.information;
const bcrypt = require("bcryptjs");

exports.findAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const offset = page * limit;

    const users = await User.findAndCountAll({
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "isActive",
        "createdAt",
        "lastLogin",
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      status: "success",
      message: "Users retrieved successfully",
      data: {
        totalItems: users.count,
        totalPages: Math.ceil(users.count / limit),
        currentPage: page,
        users: users.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.findOne = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "isActive",
        "createdAt",
        "lastLogin",
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: [
        "id",
        "username",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
        "lastLogin",
      ],
      include: [
        {
          model: Information,
          as: "storeInformation",
          attributes: [
            "id",
            "storeName",
            "storePhone",
            "storeEmail",
            "storeAddress",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const updateData = {};
    const updateStoreData = {};

    console.log("req.body", req.body);

    if (req.body.storeInformation?.storeName)
      updateStoreData.storeName = req.body.storeInformation.storeName;
    if (req.body.storeInformation?.storePhone)
      updateStoreData.storePhone = req.body.storeInformation.storePhone;
    if (req.body.storeInformation?.storeAddress)
      updateStoreData.storeAddress = req.body.storeInformation.storeAddress;
    if (req.body.storeInformation?.storeEmail)
      updateStoreData.storeEmail = req.body.storeInformation.storeEmail;

      if (req.body.storeInformation?.storeId) {
        const storeInformation = await Information.findByPk(
          req.body.storeInformation.storeId
        );

        console.log("storeInformation", storeInformation);

        if (!storeInformation) {
          return res.status(404).json({
            status: "error",
            message: "Store information not found",
          });
        }

        await storeInformation.update(updateStoreData);
      }

    if (req.body.username) updateData.username = req.body.username;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.password)
      updateData.password = bcrypt.hashSync(req.body.password, 8);
    if (req.body.role) updateData.role = req.body.role;
    if (req.body.isActive !== undefined)
      updateData.isActive = req.body.isActive;

    await user.update(updateData);

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update error", error);
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    await user.destroy();

    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

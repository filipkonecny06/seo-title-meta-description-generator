"use strict";

/** Removes the unnamed email index duplicated by the explicit unique index. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex("users", "email");
  },

  async down(queryInterface) {
    await queryInterface.addIndex("users", ["email"], {
      unique: true,
      name: "email",
    });
  },
};

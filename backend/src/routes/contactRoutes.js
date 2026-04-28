// src/routes/contactRoutes.js — Feature 22
const express           = require("express");
const router            = express.Router();
const contactController = require("../controllers/contactController");
const { protect }       = require("../middleware/authMiddleware");

router.get("/",    protect, contactController.getContacts);
router.post("/",   protect, contactController.createContact);
router.delete("/:id", protect, contactController.deleteContact);

module.exports = router;

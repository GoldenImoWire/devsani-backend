require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== EMAIL TRANSPORTER =====
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ===== ROUTES =====

// Test route
app.get("/", (req, res) => {
  res.status(200).send("Dev|Sani Backend Running 🚀");
});

// Contact form route
app.post("/send", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate form data
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // ===== Email to YOU =====
    const mailToMe = {
      from: process.env.EMAIL_USER,   // your Gmail
      to: process.env.EMAIL_USER,     // you receive it
      replyTo: email,                 // reply goes to visitor
      subject: `New Message from ${name}`,
      html: `
        <h2>New Portfolio Contact</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailToMe);

    // ===== Auto-reply to visitor =====
    const autoReply = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thanks for contacting me!",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for reaching out! I received your message and will get back to you soon.</p>
        <p>— Dev|Sani</p>
      `,
    };

    await transporter.sendMail(autoReply);

    // Success response
    res.status(200).json({ success: true, message: "Message sent successfully!" });

  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// ===== SERVER START =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
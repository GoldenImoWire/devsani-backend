require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

const app = express();

// =====================
// SECURITY MIDDLEWARE
// =====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// =====================
// CORS CONFIGURATION (FIXED - MORE PERMISSIVE)
// =====================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel domain
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Railway domains
    if (origin.includes('railway.app')) return callback(null, true);
    
    console.log('Allowed origin:', origin);
    return callback(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// =====================
// RATE LIMITING
// =====================
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many messages sent. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================
// EMAIL TRANSPORTER
// =====================
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// =====================
// HEALTH CHECK ROUTE
// =====================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Dev|Sani Backend Running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =====================
// CONTACT ROUTE (ENHANCED)
// =====================
app.post("/send", contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Enhanced validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required fields."
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // Validate name (no special characters, reasonable length)
    if (!validator.isLength(name, { min: 2, max: 50 })) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters."
      });
    }

    // Sanitize inputs
    const sanitizedName = validator.escape(name.trim());
    const sanitizedSubject = subject ? validator.escape(subject.trim()) : 'New Portfolio Contact';
    const sanitizedMessage = validator.escape(message.trim());

    // Check for spam keywords
    const spamKeywords = ['viagra', 'crypto', 'bitcoin', 'earn money', 'click here', 'buy now'];
    const messageLower = sanitizedMessage.toLowerCase();
    const isSpam = spamKeywords.some(keyword => messageLower.includes(keyword));
    
    if (isSpam) {
      return res.status(400).json({
        success: false,
        message: "Message appears to be spam. Please send a legitimate inquiry."
      });
    }

    // Get client info
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Email to YOU (Portfolio Owner)
    await transporter.sendMail({
      from: `"Dev|Sani Portfolio" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `📧 New Contact: ${sanitizedSubject} from ${sanitizedName}`,
      priority: 'high',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
            .value { background: #f5f5f5; padding: 10px; border-radius: 5px; border-left: 4px solid #667eea; }
            .message-box { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #764ba2; white-space: pre-wrap; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
            .meta { background: #e9ecef; padding: 10px; border-radius: 5px; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 New Portfolio Contact</h1>
              <p>You received a new message from your website</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">👤 Name:</span>
                <div class="value">${sanitizedName}</div>
              </div>
              
              <div class="field">
                <span class="label">📧 Email:</span>
                <div class="value">${email}</div>
              </div>
              
              <div class="field">
                <span class="label">📝 Subject:</span>
                <div class="value">${sanitizedSubject}</div>
              </div>
              
              <div class="field">
                <span class="label">💬 Message:</span>
                <div class="message-box">${sanitizedMessage}</div>
              </div>

              <div class="meta">
                <strong>Technical Details:</strong><br>
                IP Address: ${clientIP}<br>
                User Agent: ${userAgent}<br>
                Timestamp: ${new Date().toLocaleString()}
              </div>

              <div class="footer">
                <p>This email was sent automatically from your Dev|Sani Portfolio contact form.</p>
                <p>To reply, simply hit reply or contact: ${email}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Professional Auto-Reply to Sender
    await transporter.sendMail({
      from: `"Dev|Sani" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thanks for reaching out! 🚀",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .greeting { font-size: 24px; margin-bottom: 20px; color: #333; }
            .message { font-size: 16px; line-height: 1.8; color: #555; margin-bottom: 25px; }
            .highlight { background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%); padding: 20px; border-radius: 8px; margin: 25px 0; }
            .social-links { text-align: center; margin: 30px 0; }
            .social-links a { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999; font-size: 14px; }
            .signature { margin-top: 30px; font-style: italic; color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Contacting Me! 👋</h1>
            </div>
            <div class="content">
              <div class="greeting">Hi ${sanitizedName},</div>
              
              <div class="message">
                <p>Thank you for reaching out through my portfolio website! I've received your message regarding <strong>"${sanitizedSubject}"</strong> and wanted to let you know that I'm on it.</p>
                
                <div class="highlight">
                  <strong>What happens next?</strong><br>
                  📧 I'll review your message personally<br>
                  ⏰ Expect a response within 24-48 hours<br>
                  💡 I'll provide a detailed proposal or answer to your inquiry
                </div>

                <p>In the meantime, feel free to explore my recent projects on GitHub or connect with me on LinkedIn. I'm always excited to discuss new opportunities and interesting projects!</p>
              </div>

              <div class="social-links">
                <a href="https://github.com/goldenimowire">GitHub</a> | 
                <a href="https://linkedin.com/in/sani-avdoull-700252284">LinkedIn</a> | 
                <a href="https://devsani-portfolio.vercel.app">Portfolio</a>
              </div>

              <div class="signature">
                <p>Best regards,<br>
                <strong>Dev|Sani</strong><br>
                Full Stack Developer</p>
              </div>

              <div class="footer">
                <p>This is an automated response. Please do not reply to this email.<br>
                For urgent matters, contact me directly at saniavdoull56@gmail.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`✅ Message sent successfully from: ${email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: "Message sent successfully! Check your email for confirmation.",
      data: {
        timestamp: new Date().toISOString(),
        messageId: Math.random().toString(36).substr(2, 9)
      }
    });

  } catch (error) {
    console.error("❌ Send Error:", error);
    
    // Specific error handling
    if (error.code === 'EAUTH') {
      return res.status(500).json({
        success: false,
        message: "Email authentication failed. Please check server configuration."
      });
    }
    
    if (error.code === 'ECONNECTION') {
      return res.status(500).json({
        success: false,
        message: "Connection error. Please try again later."
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =====================
// ERROR HANDLING
// =====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
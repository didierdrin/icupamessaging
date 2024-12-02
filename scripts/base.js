
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "https://seasoned-cuddly-success.glitch.me"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());

// WhatsApp API Credentials
const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
const PHONE_NUMBER_ID = "396791596844039"; //"189923527537354";
const VERSION = "v19.0"; // Latest API version

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Webhook route
app.post("/webhook", (req, res) => {
  console.log("Webhook received:", JSON.stringify(req.body, null, 2));
  res.status(200).send("EVENT_RECEIVED");
});

// Webhook verification
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "icupatoken31"; // Replace with your chosen verify token
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Verification failed!");
    }
  }
});

// Function to format phone number
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

// Function to send a WhatsApp message
async function sendWhatsAppMessage() {
  try {
    const formattedPhone = formatPhoneNumber("+250798922640");
    
    // Simplified message payload
    
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: "welcome_message_icupa",//"welcome_message_icupa", // Replace with your approved template name
        
      }
    };
    
    
    // const payload = {
    //   messaging_product: "whatsapp",
    //   to: formattedPhone,
    //   type: "template",
    //   template: {
    //     name: "hello_world",//"welcome_message_icupa", // Replace with your approved template name
    //     language: {
    //       code: "en_US" // Replace with the appropriate language code
    //     }
    //   }
    // };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;
    console.log('Request URL:', url);

    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: payload
    });

    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    throw error;
  }
}

// Function to test WhatsApp connection
async function testWhatsAppConnection() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${VERSION}/me`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );
    console.log('WhatsApp connection test successful:', response.data);
    return true;
  } catch (error) {
    console.error('WhatsApp connection test failed:', error.response?.data || error.message);
    return false;
  }
}

// Modified schedule function with connection test
const scheduleMessages = async () => {
  console.log('Testing WhatsApp connection...');
  
  const isConnected = await testWhatsAppConnection();
  
  if (!isConnected) {
    console.error('Failed to establish WhatsApp connection. Please check your credentials.');
    return;
  }

  console.log('Starting scheduled messages...');
  
  try {
    await sendWhatsAppMessage();
    
    // Schedule subsequent messages
    setInterval(async () => {
      try {
        await sendWhatsAppMessage();
      } catch (error) {
        console.error('Failed to send scheduled message:', error.message);
      }
    }, 30000 * 3);
  } catch (error) {
    console.error('Initial message sending failed:', error.message);
  }
};

// Route to manually trigger a message
app.post("/api/send-message", async (req, res) => {
  try {
    const result = await sendWhatsAppMessage();
    res.status(200).json({ 
      success: true,
      message: "Message sent successfully!", 
      response: result 
    });
  } catch (error) {
    const errorMessage = error?.response?.data?.error?.message || 
                        error?.message || 
                        "An unknown error occurred";
    
    const statusCode = error?.response?.status || 500;
    
    res.status(statusCode).json({ 
      success: false,
      message: "Failed to send message", 
      error: errorMessage
    });
  }
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message
  });
});

// Start the server and initialize scheduled messages
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  scheduleMessages(); // Start sending scheduled messages
});











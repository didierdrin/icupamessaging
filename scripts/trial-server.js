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
const PHONE_NUMBER_ID = "396791596844039";
const VERSION = "v19.0"; // Latest API version




// // Mock data for testing
const mockGoods = [
  { name: "Red Wine", price: 12000, description: "A fine red wine from France." },
  { name: "White Wine", price: 11000, description: "A crisp white wine with citrus notes." },
  { name: "Whiskey", price: 20000, description: "Aged 12 years, smooth and rich." },
  { name: "Gin", price: 15000, description: "A refreshing gin with botanicals." },
  { name: "Vodka", price: 13000, description: "Premium distilled vodka." }
];


const formatGoodsMessage = (goods, hasMore) => {
  if (!goods.length) {
    return "🚫 No more items in the menu.";
  }

  let message = `📋 *Menu* 📋\n\n`;
  goods.forEach((item, index) => {
    message += `*${index + 1}. ${item.name}*\n`;
    message += `Price: ${item.price}\n`;
    message += `${item.description ? `Description: ${item.description}\n` : ""}\n`;
  });

  if (hasMore) {
    message += "\n➡️ Reply *NEXT* to see more items.";
  } else {
    message += "\n✅ You've reached the end of the menu.";
  }

  return message;
};







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


// In-memory store for tracking sent messages
const sentMessages = new Set();

// Define the welcome message template manually

const WELCOME_MESSAGE_TEMPLATE = {
  type: "text",
  text: formatGoodsMessage(mockGoods, false),
};

// const WELCOME_MESSAGE_TEMPLATE = {
//   type: "text",
//   text: `🌟 *Welcome to ICUPA!* 🌟

// We are thrilled to have you onboard. 🎉

// 🍹 Discover the best soft drinks, liquors and whiskys.

// Let's make your nightlife unforgettable! Cheers to great times! 🍻
  
// 💬 *Stay connected with ICUPA for the best experiences.*`,
// };

// const WELCOME_MESSAGE_TEMPLATE = {
//   type: "text",
//   text: "${formatGoodsMessage}",
// };

// Function to send the manually sendManualWelcomeMessage created message
async function sendWhatsAppMessage() {
  // const formattedPhone = formatPhoneNumber(phone);
  const formattedPhone = formatPhoneNumber("+250798922640"); //("+35677186193"); //("+250798922640");

  // Check if the message was already sent to this phone number
  if (sentMessages.has(formattedPhone)) {
    console.log(`Welcome message already sent to ${formattedPhone}`);
    return { success: true, message: "Message already sent", phone: formattedPhone };
  }

  //  // Generate the message from the mock goods
  //  const hasMore = false; // No pagination for mock data
  //  const message1 = formatGoodsMessage(mockGoods, hasMore);

   
  // Construct the payload
  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: WELCOME_MESSAGE_TEMPLATE.type,
    text: {
      body: WELCOME_MESSAGE_TEMPLATE.text,
    },
  };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    // Mark this phone number as sent
    sentMessages.add(formattedPhone);

    console.log(`Manual welcome message sent to ${formattedPhone}`);
    return { success: true, response: response.data, phone: formattedPhone };
  } catch (error) {
    console.error(`Error sending message to ${formattedPhone}:`, error.response?.data || error.message);
    return {
      success: false,
      message: "Failed to send welcome message",
      phone: formattedPhone,
      error: error.response?.data || error.message,
    };
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
    }, 30000);
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



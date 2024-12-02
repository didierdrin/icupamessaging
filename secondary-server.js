const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const { fetchVendorGoods } = require("./firestoreService");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://seasoned-cuddly-success.glitch.me"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(bodyParser.json());

// WhatsApp API Credentials
const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
const PHONE_NUMBER_ID = "396791596844039";
const VERSION = "v19.0"; // Latest API version

let limited_goods, lastDoc;
let WELCOME_MESSAGE_TEMPLATE = { type: "text", text: "🚫 Menu is loading. Please wait..." };

/**
 * Restructure goods data to match the required format
 * @param {Array} goodies
 * @returns {Array}
 */
const restructureGoods = (goodies) => {
  return goodies.map((item) => ({
    id: item.id,
    stock: item.stock || 0,
    price: item.price || 0,
    vendor: item.vendor || "",
    categories: item.categories || [],
    product: item.product || "",
    createdOn: {
      seconds: item.createdOn?.seconds || 0,
      nanoseconds: item.createdOn?.nanoseconds || 0,
    },
    createdAt: item.createdAt || new Date().toISOString(), // Default to current timestamp if missing
  }));
};

/**
 * Fetch goods and initialize WELCOME_MESSAGE_TEMPLATE
 * @returns {Promise<void>}
 */
const initializeWelcomeMessage = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await fetchVendorGoods({ limitCount: 5 });
      limited_goods = restructureGoods(result.goods);
      lastDoc = result.lastDoc;

      WELCOME_MESSAGE_TEMPLATE.text = formatGoodsMessage(limited_goods, lastDoc !== null);
      // console.log("WELCOME_MESSAGE_TEMPLATE initialized:", WELCOME_MESSAGE_TEMPLATE);

      resolve();
    } catch (error) {
      console.error("Error fetching vendor goods:", error);

      WELCOME_MESSAGE_TEMPLATE.text = "🚫 Unable to load the menu at this time.";
      reject(error);
    }
  });
};

/**
 * Format goods into a WhatsApp message
 * @param {Array} goods
 * @param {boolean} hasMore
 * @returns {string}
 */
const formatGoodsMessage = (goods, hasMore) => {
  if (!goods || !goods.length) {
    return "🚫 No more items in the menu.";
  }

  let message = `📋 *Menu* 📋\n\n`;
  goods.forEach((item, index) => {
    const { product, price, stock, createdAt, vendor, categories } = item;

    message += `*${index + 1}. Product ID:* ${product}\n`;
    message += `Price: ${price}\n`;
    message += `Stock: ${stock}\n`;
    message += `Vendor ID: ${vendor}\n`;
    message += `Categories: ${categories.join(", ")}\n`;
    message += `Created At: ${new Date(createdAt).toLocaleString()}\n\n`;
  });

  if (hasMore) {
    message += "\n➡️ Reply *NEXT* to see more items.";
  } else {
    message += "\n✅ You've reached the end of the menu.";
  }

  return message;
};

// Middleware for request logging
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

// Function to format phone numbers
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

const sentMessages = new Set();

// Send WhatsApp message
const sendWhatsAppMessage = async () => {
  const formattedPhone = formatPhoneNumber("+250798922640");

  if (sentMessages.has(formattedPhone)) {
    console.log(`Welcome message already sent to ${formattedPhone}`);
    return { success: true, message: "Message already sent", phone: formattedPhone };
  }

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
};

// Schedule messages
const scheduleMessages = async () => {
  console.log("Testing WhatsApp connection...");

  try {
    await initializeWelcomeMessage();

    // Send initial message
    await sendWhatsAppMessage();

    // Schedule subsequent messages
    setInterval(async () => {
      try {
        await sendWhatsAppMessage();
      } catch (error) {
        console.error("Failed to send scheduled message:", error.message);
      }
    }, 30000);
  } catch (error) {
    console.error("Initialization failed:", error.message);
  }
};

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  scheduleMessages();
});


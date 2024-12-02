import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import { fetchVendorGoods } from "../firestoreService.js"; // Update to ES module import

console.log(fetchVendorGoods.length);
const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "https://6986-197-157-145-176.ngrok-free.app"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());

// WhatsApp API Credentials
const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
const PHONE_NUMBER_ID = "189923527537354";
const VERSION = "v19.0";

/**
 * Format product data into a WhatsApp message template
 * @param {Array} goods - List of goods
 * @param {boolean} hasMore - If there are more items to fetch
 * @returns {string} - Formatted message
 */
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

/**
 * Send a WhatsApp message
 * @param {string} message - Message text
 */
const sendWhatsAppMessage = async (message) => {
  const phone = "+250798922640"; // Specify the phone number here

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: message },
  };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Message sent to ${phone}`);
    return response.data;
  } catch (error) {
    console.error(`Error sending message to ${phone}:`, error.response?.data || error.message);
    throw error;
  }
};

// Handle user requests for paginated menus
let lastDocId = null;
app.post("/api/send-menu", async (req, res) => {
  try {
    const { goods, lastDoc } = await fetchVendorGoods(5, lastDocId);
    lastDocId = lastDoc;

    const hasMore = goods.length === 5;
    const message = formatGoodsMessage(goods, hasMore);

    await sendWhatsAppMessage(message);
    res.status(200).json({ success: true, message: "Menu sent successfully." });
  } catch (error) {
    console.error("Error sending menu:", error);
    res.status(500).json({ success: false, message: "Failed to send menu." });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const { fetchVendorGoods } = require("../firestoreService.js");



const mockData = [
    {
      id: "5iRRs5I0ImsdKnA4y21n",
      stock: 0,
      price: 5000,
      vendor: "uK5fKfutphmxqGfj1UlX",
      categories: ["eNaPNTY1bD4scTDRwlI6"],
      product: "Dl6nFiMBlt2GZ2OCBqih",
      createdOn: {
        seconds: 1732167177,
        nanoseconds: 657000000,
      },
      createdAt: "2024-11-21T05:32:57.657Z",
    },
    {
      id: "61dsmGjYcOmxMWuuC4Mh",
      stock: 0,
      price: 6000,
      vendor: "uK5fKfutphmxqGfj1UlX",
      categories: ["eNaPNTY1bD4scTDRwlI6"],
      product: "DCTGLNLkLEDuzeowtEME",
      createdOn: {
        seconds: 1732092286,
        nanoseconds: 245000000,
      },
      createdAt: "2024-11-20T08:44:46.245Z",
    },
    {
      id: "67u3Yc5MfMiNWR171yWu",
      stock: 0,
      price: 5000,
      vendor: "uK5fKfutphmxqGfj1UlX",
      categories: ["eNaPNTY1bD4scTDRwlI6"],
      product: "bzpSRNhzTvh4iDIS4CZO",
      createdOn: {
        seconds: 1732167196,
        nanoseconds: 274000000,
      },
      createdAt: "2024-11-21T05:33:16.274Z",
    },
    {
      id: "7JnUUL1J4Bv3rRg3dpzK",
      stock: 0,
      price: 6000,
      vendor: "uK5fKfutphmxqGfj1UlX",
      categories: ["eNaPNTY1bD4scTDRwlI6"],
      product: "GHtNeEsjA7kfrxlUuE16",
      createdOn: {
        seconds: 1732092308,
        nanoseconds: 23000000,
      },
      createdAt: "2024-11-20T08:45:08.023Z",
    },
    {
      id: "8MnY1uOYxsFuAtBy5sVa",
      stock: 0,
      price: 5000,
      vendor: "uK5fKfutphmxqGfj1UlX",
      categories: ["eNaPNTY1bD4scTDRwlI6"],
      product: "0jKquMFMgYBUWcvtHXWu",
      createdOn: {
        seconds: 1732092164,
        nanoseconds: 278000000,
      },
      createdAt: "2024-11-20T08:42:44.278Z",
    },
  ];
  


// let limited_goods, lastDoc;
// (async () => {
//   const result = await fetchVendorGoods({ limitCount: 5 });
//   limited_goods = result.goods;
//   lastDoc = result.lastDoc;
//   console.log(limited_goods);
// })();


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
      const { id, product, price, stock, createdAt, vendor, categories } = item;
  
      message += `*${index + 1}. Product ID:* ${product}\n`;
      message += `Price: ${price}\n`;
      message += `Stock: ${stock}\n`;
      message += `Vendor ID: ${vendor}\n`;
      message += `Categories: ${categories.join(", ")}\n`;
      message += `Created At: ${new Date(createdAt).toLocaleString()}\n`;
      message += `\n`;
    });
  
    if (hasMore) {
      message += "\n➡️ Reply *NEXT* to see more items.";
    } else {
      message += "\n✅ You've reached the end of the menu.";
    }
  
    return message;
  };
  


// /**
//  * Format product data into a WhatsApp message template
//  * @param {Array} goods - List of goods
//  * @param {boolean} hasMore - If there are more items to fetch
//  * @returns {string} - Formatted message
//  */
// const formatGoodsMessage = (goods, hasMore) => {
//   if (!goods.length) {
//     return "🚫 No more items in the menu.";
//   }

//   let message = `📋 *Menu* 📋\n\n`;
//   goods.forEach((item, index) => {
//     message += `*${index + 1}. ${item.name}*\n`;
//     message += `Price: ${item.price}\n`;
//     message += `${item.description ? `Description: ${item.description}\n` : ""}\n`;
//   });

//   if (hasMore) {
//     message += "\n➡️ Reply *NEXT* to see more items.";
//   } else {
//     message += "\n✅ You've reached the end of the menu.";
//   }

//   return message;
// };

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
    const message = formatGoodsMessage(mockData, hasMore);

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






// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios");
// const cors = require("cors");

// const app = express();

// app.use(cors({
//   origin: ["http://localhost:3000", "https://seasoned-cuddly-success.glitch.me"],
//   methods: ["GET", "POST"],
//   credentials: true
// }));

// app.use(bodyParser.json());

// // WhatsApp API Credentials
// const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
// const PHONE_NUMBER_ID = "396791596844039";
// const VERSION = "v19.0"; // Latest API version




// // // Mock data for testing
// const mockGoods = [
//   { name: "Red Wine", price: 12000, description: "A fine red wine from France." },
//   { name: "White Wine", price: 11000, description: "A crisp white wine with citrus notes." },
//   { name: "Whiskey", price: 20000, description: "Aged 12 years, smooth and rich." },
//   { name: "Gin", price: 15000, description: "A refreshing gin with botanicals." },
//   { name: "Vodka", price: 13000, description: "Premium distilled vodka." }
// ];


// const formatGoodsMessage = (goods, hasMore) => {
//   if (!goods.length) {
//     return "🚫 No more items in the menu.";
//   }

//   let message = `📋 *Menu* 📋\n\n`;
//   goods.forEach((item, index) => {
//     message += `*${index + 1}. ${item.name}*\n`;
//     message += `Price: ${item.price}\n`;
//     message += `${item.description ? `Description: ${item.description}\n` : ""}\n`;
//   });

//   if (hasMore) {
//     message += "\n➡️ Reply *NEXT* to see more items.";
//   } else {
//     message += "\n✅ You've reached the end of the menu.";
//   }

//   return message;
// };







// // Add request logging middleware
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`, req.body);
//   next();
// });

// // Webhook route
// app.post("/webhook", (req, res) => {
//   console.log("Webhook received:", JSON.stringify(req.body, null, 2));
//   res.status(200).send("EVENT_RECEIVED");
// });

// // Webhook verification
// app.get("/webhook", (req, res) => {
//   const VERIFY_TOKEN = "icupatoken31"; // Replace with your chosen verify token
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token) {
//     if (mode === "subscribe" && token === VERIFY_TOKEN) {
//       console.log("Webhook verified successfully!");
//       res.status(200).send(challenge);
//     } else {
//       res.status(403).send("Verification failed!");
//     }
//   }
// });

// // Function to format phone number
// const formatPhoneNumber = (phone) => {
//   let cleaned = phone.replace(/[^\d+]/g, '');
//   if (!cleaned.startsWith('+')) {
//     cleaned = '+' + cleaned;
//   }
//   return cleaned;
// };


// // In-memory store for tracking sent messages
// const sentMessages = new Set();

// // Define the welcome message template manually

// const WELCOME_MESSAGE_TEMPLATE = {
//   type: "text",
//   text: formatGoodsMessage(mockGoods, false),
// };

// // const WELCOME_MESSAGE_TEMPLATE = {
// //   type: "text",
// //   text: `🌟 *Welcome to ICUPA!* 🌟

// // We are thrilled to have you onboard. 🎉

// // 🍹 Discover the best soft drinks, liquors and whiskys.

// // Let's make your nightlife unforgettable! Cheers to great times! 🍻
  
// // 💬 *Stay connected with ICUPA for the best experiences.*`,
// // };

// // const WELCOME_MESSAGE_TEMPLATE = {
// //   type: "text",
// //   text: "${formatGoodsMessage}",
// // };

// // Function to send the manually sendManualWelcomeMessage created message
// async function sendWhatsAppMessage() {
//   // const formattedPhone = formatPhoneNumber(phone);
//   const formattedPhone = formatPhoneNumber("+250798922640"); //("+35677186193"); //("+250798922640");

//   // Check if the message was already sent to this phone number
//   if (sentMessages.has(formattedPhone)) {
//     console.log(`Welcome message already sent to ${formattedPhone}`);
//     return { success: true, message: "Message already sent", phone: formattedPhone };
//   }

//   //  // Generate the message from the mock goods
//   //  const hasMore = false; // No pagination for mock data
//   //  const message1 = formatGoodsMessage(mockGoods, hasMore);

   
//   // Construct the payload
//   const payload = {
//     messaging_product: "whatsapp",
//     to: formattedPhone,
//     type: WELCOME_MESSAGE_TEMPLATE.type,
//     text: {
//       body: WELCOME_MESSAGE_TEMPLATE.text,
//     },
//   };

//   const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

//   try {
//     const response = await axios.post(url, payload, {
//       headers: {
//         Authorization: `Bearer ${ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     });

//     // Mark this phone number as sent
//     sentMessages.add(formattedPhone);

//     console.log(`Manual welcome message sent to ${formattedPhone}`);
//     return { success: true, response: response.data, phone: formattedPhone };
//   } catch (error) {
//     console.error(`Error sending message to ${formattedPhone}:`, error.response?.data || error.message);
//     return {
//       success: false,
//       message: "Failed to send welcome message",
//       phone: formattedPhone,
//       error: error.response?.data || error.message,
//     };
//   }
// }

// // Function to test WhatsApp connection
// async function testWhatsAppConnection() {
//   try {
//     const response = await axios.get(
//       `https://graph.facebook.com/${VERSION}/me`,
//       {
//         headers: {
//           'Authorization': `Bearer ${ACCESS_TOKEN}`
//         }
//       }
//     );
//     console.log('WhatsApp connection test successful:', response.data);
//     return true;
//   } catch (error) {
//     console.error('WhatsApp connection test failed:', error.response?.data || error.message);
//     return false;
//   }
// }

// // Modified schedule function with connection test
// const scheduleMessages = async () => {
//   console.log('Testing WhatsApp connection...');
  
//   const isConnected = await testWhatsAppConnection();
  
//   if (!isConnected) {
//     console.error('Failed to establish WhatsApp connection. Please check your credentials.');
//     return;
//   }

//   console.log('Starting scheduled messages...');
  
//   try {
//     await sendWhatsAppMessage();
    
//     // Schedule subsequent messages
//     setInterval(async () => {
//       try {
//         await sendWhatsAppMessage();
//       } catch (error) {
//         console.error('Failed to send scheduled message:', error.message);
//       }
//     }, 30000);
//   } catch (error) {
//     console.error('Initial message sending failed:', error.message);
//   }
// };

// // Route to manually trigger a message
// app.post("/api/send-message", async (req, res) => {
//   try {
//     const result = await sendWhatsAppMessage();
//     res.status(200).json({ 
//       success: true,
//       message: "Message sent successfully!", 
//       response: result 
//     });
//   } catch (error) {
//     const errorMessage = error?.response?.data?.error?.message || 
//                         error?.message || 
//                         "An unknown error occurred";
    
//     const statusCode = error?.response?.status || 500;
    
//     res.status(statusCode).json({ 
//       success: false,
//       message: "Failed to send message", 
//       error: errorMessage
//     });
//   }
// });

// // Health check route
// app.get("/health", (req, res) => {
//   res.status(200).json({ 
//     status: "ok",
//     timestamp: new Date().toISOString()
//   });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Global error handler:', err);
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//     error: err.message
//   });
// });

// // Start the server and initialize scheduled messages
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
//   scheduleMessages(); // Start sending scheduled messages
// });







// --------------------



// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios");
// const cors = require("cors");
// const { fetchVendorGoods } = require("./firestoreService");

// const app = express();

// app.use(cors({
//   origin: ["http://localhost:3000", "https://seasoned-cuddly-success.glitch.me"],
//   methods: ["GET", "POST"],
//   credentials: true
// }));

// app.use(bodyParser.json());

// // WhatsApp API Credentials
// const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
// const PHONE_NUMBER_ID = "396791596844039";
// const VERSION = "v19.0"; // Latest API version


// let limited_goods, lastDoc;
// (async () => {
//   const result = await fetchVendorGoods({ limitCount: 5 });
//   limited_goods = result.goods;
//   lastDoc = result.lastDoc;
// //   console.log(limited_goods);
// })();


// // // Mock data for testing
// const mockData = [
//     {
//       id: "5iRRs5I0ImsdKnA4y21n",
//       stock: 0,
//       price: 5000,
//       vendor: "uK5fKfutphmxqGfj1UlX",
//       categories: ["eNaPNTY1bD4scTDRwlI6"],
//       product: "Dl6nFiMBlt2GZ2OCBqih",
//       createdOn: {
//         seconds: 1732167177,
//         nanoseconds: 657000000,
//       },
//       createdAt: "2024-11-21T05:32:57.657Z",
//     },
//     {
//       id: "61dsmGjYcOmxMWuuC4Mh",
//       stock: 0,
//       price: 6000,
//       vendor: "uK5fKfutphmxqGfj1UlX",
//       categories: ["eNaPNTY1bD4scTDRwlI6"],
//       product: "DCTGLNLkLEDuzeowtEME",
//       createdOn: {
//         seconds: 1732092286,
//         nanoseconds: 245000000,
//       },
//       createdAt: "2024-11-20T08:44:46.245Z",
//     },
//     {
//       id: "67u3Yc5MfMiNWR171yWu",
//       stock: 0,
//       price: 5000,
//       vendor: "uK5fKfutphmxqGfj1UlX",
//       categories: ["eNaPNTY1bD4scTDRwlI6"],
//       product: "bzpSRNhzTvh4iDIS4CZO",
//       createdOn: {
//         seconds: 1732167196,
//         nanoseconds: 274000000,
//       },
//       createdAt: "2024-11-21T05:33:16.274Z",
//     },
//     {
//       id: "7JnUUL1J4Bv3rRg3dpzK",
//       stock: 0,
//       price: 6000,
//       vendor: "uK5fKfutphmxqGfj1UlX",
//       categories: ["eNaPNTY1bD4scTDRwlI6"],
//       product: "GHtNeEsjA7kfrxlUuE16",
//       createdOn: {
//         seconds: 1732092308,
//         nanoseconds: 23000000,
//       },
//       createdAt: "2024-11-20T08:45:08.023Z",
//     },
//     {
//       id: "8MnY1uOYxsFuAtBy5sVa",
//       stock: 0,
//       price: 5000,
//       vendor: "uK5fKfutphmxqGfj1UlX",
//       categories: ["eNaPNTY1bD4scTDRwlI6"],
//       product: "0jKquMFMgYBUWcvtHXWu",
//       createdOn: {
//         seconds: 1732092164,
//         nanoseconds: 278000000,
//       },
//       createdAt: "2024-11-20T08:42:44.278Z",
//     },
//   ];


// const formatGoodsMessage = (goods, hasMore) => {
//     if (!goods.length) {
//       return "🚫 No more items in the menu.";
//     }
  
//     let message = `📋 *Menu* 📋\n\n`;
//     goods.forEach((item, index) => {
//       const { id, product, price, stock, createdAt, vendor, categories } = item;
  
//       message += `*${index + 1}. Product ID:* ${product}\n`;
//       message += `Price: ${price}\n`;
//       message += `Stock: ${stock}\n`;
//       message += `Vendor ID: ${vendor}\n`;
//       message += `Categories: ${categories.join(", ")}\n`;
//       message += `Created At: ${new Date(createdAt).toLocaleString()}\n`;
//       message += `\n`;
//     });
  
//     if (hasMore) {
//       message += "\n➡️ Reply *NEXT* to see more items.";
//     } else {
//       message += "\n✅ You've reached the end of the menu.";
//     }
  
//     return message;
//   };




// // Add request logging middleware
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`, req.body);
//   next();
// });

// // Webhook route
// app.post("/webhook", (req, res) => {
//   console.log("Webhook received:", JSON.stringify(req.body, null, 2));
//   res.status(200).send("EVENT_RECEIVED");
// });

// // Webhook verification
// app.get("/webhook", (req, res) => {
//   const VERIFY_TOKEN = "icupatoken31"; // Replace with your chosen verify token
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token) {
//     if (mode === "subscribe" && token === VERIFY_TOKEN) {
//       console.log("Webhook verified successfully!");
//       res.status(200).send(challenge);
//     } else {
//       res.status(403).send("Verification failed!");
//     }
//   }
// });

// // Function to format phone number
// const formatPhoneNumber = (phone) => {
//   let cleaned = phone.replace(/[^\d+]/g, '');
//   if (!cleaned.startsWith('+')) {
//     cleaned = '+' + cleaned;
//   }
//   return cleaned;
// };


// // In-memory store for tracking sent messages
// const sentMessages = new Set();

// // Define the welcome message template manually


// const WELCOME_MESSAGE_TEMPLATE = {
//   type: "text",
//   text: formatGoodsMessage(mockData, false),
// };


// // Function to send the manually sendManualWelcomeMessage created message
// async function sendWhatsAppMessage() {
//   // const formattedPhone = formatPhoneNumber(phone);
//   const formattedPhone = formatPhoneNumber("+250798922640"); //("+35677186193"); //("+250798922640");

//   // Check if the message was already sent to this phone number
//   if (sentMessages.has(formattedPhone)) {
//     console.log(`Welcome message already sent to ${formattedPhone}`);
//     return { success: true, message: "Message already sent", phone: formattedPhone };
//   }

   
//   // Construct the payload
//   const payload = {
//     messaging_product: "whatsapp",
//     to: formattedPhone,
//     type: WELCOME_MESSAGE_TEMPLATE.type,
//     text: {
//       body: WELCOME_MESSAGE_TEMPLATE.text,
//     },
//   };

//   const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

//   try {
//     const response = await axios.post(url, payload, {
//       headers: {
//         Authorization: `Bearer ${ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     });

//     // Mark this phone number as sent
//     sentMessages.add(formattedPhone);

//     console.log(`Manual welcome message sent to ${formattedPhone}`);
//     return { success: true, response: response.data, phone: formattedPhone };
//   } catch (error) {
//     console.error(`Error sending message to ${formattedPhone}:`, error.response?.data || error.message);
//     return {
//       success: false,
//       message: "Failed to send welcome message",
//       phone: formattedPhone,
//       error: error.response?.data || error.message,
//     };
//   }
// }

// // Function to test WhatsApp connection
// async function testWhatsAppConnection() {
//   try {
//     const response = await axios.get(
//       `https://graph.facebook.com/${VERSION}/me`,
//       {
//         headers: {
//           'Authorization': `Bearer ${ACCESS_TOKEN}`
//         }
//       }
//     );
//     console.log('WhatsApp connection test successful:', response.data);
//     return true;
//   } catch (error) {
//     console.error('WhatsApp connection test failed:', error.response?.data || error.message);
//     return false;
//   }
// }

// // Modified schedule function with connection test
// const scheduleMessages = async () => {
//   console.log('Testing WhatsApp connection...');
  
//   const isConnected = await testWhatsAppConnection();
  
//   if (!isConnected) {
//     console.error('Failed to establish WhatsApp connection. Please check your credentials.');
//     return;
//   }

//   console.log('Starting scheduled messages...');
  
//   try {
//     await sendWhatsAppMessage();
    
//     // Schedule subsequent messages
//     setInterval(async () => {
//       try {
//         await sendWhatsAppMessage();
//       } catch (error) {
//         console.error('Failed to send scheduled message:', error.message);
//       }
//     }, 30000);
//   } catch (error) {
//     console.error('Initial message sending failed:', error.message);
//   }
// };

// // Route to manually trigger a message
// app.post("/api/send-message", async (req, res) => {
//   try {
//     const result = await sendWhatsAppMessage();
//     res.status(200).json({ 
//       success: true,
//       message: "Message sent successfully!", 
//       response: result 
//     });
//   } catch (error) {
//     const errorMessage = error?.response?.data?.error?.message || 
//                         error?.message || 
//                         "An unknown error occurred";
    
//     const statusCode = error?.response?.status || 500;
    
//     res.status(statusCode).json({ 
//       success: false,
//       message: "Failed to send message", 
//       error: errorMessage
//     });
//   }
// });

// // Health check route
// app.get("/health", (req, res) => {
//   res.status(200).json({ 
//     status: "ok",
//     timestamp: new Date().toISOString()
//   });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Global error handler:', err);
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//     error: err.message
//   });
// });

// // Start the server and initialize scheduled messages
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
//   scheduleMessages(); // Start sending scheduled messages
// });



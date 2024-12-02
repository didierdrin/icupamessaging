


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
const PHONE_NUMBER_ID = "396791596844039"; //"189923527537354";//"512935888564619";
const VERSION = "v19.0"; // Latest API version

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Create an array to store replies
let replyList = [];

// Webhook route to capture the replies from the user
app.post("/webhook", (req, res) => {
  console.log("Webhook received:", JSON.stringify(req.body, null, 2));

  // Check if the message is a reply
  const messages = req.body.entry?.[0]?.changes?.[0]?.value?.messages;
  
  if (messages) {
    messages.forEach((message) => {
      if (message.type === "interactive") {
        const reply = message.interactive?.reply;
        
        if (reply) {
          // Store the reply in the replyList
          replyList.push(reply);
          
          // Log the reply
          console.log("Received reply:", reply);
        }
      }
    });
  }
  
  // Respond to Facebook server to confirm receipt of the message
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


const IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/icupa-396da.appspot.com/o/categories%2Fimages%20-%202024-10-06T015220.424.jpg?alt=media&token=de91f4b9-1161-42fb-862a-eec7704a3c6f";




// Function to send a WhatsApp message
async function sendWhatsAppMessage() {
  try {
    const formattedPhone = formatPhoneNumber("+250798922640");
    

   const payload = {
    "messaging_product": "whatsapp",
    "to": formattedPhone,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "header": {
        "type": "text",
        "text": "Product: Beer - $3"
      },
      "body": {
        "text": "You currently have 2 Beers in your cart."
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "increment_beer",
              "title": "Add More"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "decrement_beer",
              "title": "Remove One"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "view_cart",
              "title": "View Cart"
            }
          }
        ]
      }
    }
  };
  





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
  console.log("-----------------------------");
  console.log(replyList);
});









// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios");
// const cors = require("cors");

// const app = express();

// app.use(cors({
//   origin: ["http://localhost:3000", "https://6986-197-157-145-176.ngrok-free.app"],
//   methods: ["GET", "POST"],
//   credentials: true
// }));

// app.use(bodyParser.json());

// // WhatsApp API Credentials
// const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
// const PHONE_NUMBER_ID = "189923527537354";//"512935888564619";
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
//   const VERIFY_TOKEN = "icupatoken2121"; // Replace with your chosen verify token
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





// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios");
// const cors = require("cors");

// const app = express();

// app.use(cors({
//   origin: ["http://localhost:3000", "https://6986-197-157-145-176.ngrok-free.app"],
//   methods: ["GET", "POST"],
//   credentials: true
// }));

// app.use(bodyParser.json());

// // WhatsApp API Credentials
// const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
// const PHONE_NUMBER_ID = "189923527537354";//"512935888564619";
// const VERSION = "v19.0"; // Latest API version

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
//   const VERIFY_TOKEN = "icupatoken2121"; // Replace with your chosen verify token
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


// const WELCOME_MESSAGE_TEMPLATE = {
//   type: "text",
//   text: `🌟 *Welcome to ICUPA!* 🌟

// We are thrilled to have you onboard. 🎉

// 🍹 Discover the best soft drinks, liquors and whiskys.

// Let's make your nightlife unforgettable! Cheers to great times! 🍻
  
// 💬 *Stay connected with ICUPA for the best experiences.*`,
// };

// // Function to send a WhatsApp message
// async function sendWhatsAppMessage() {
//   try {
//     const formattedPhone = formatPhoneNumber("+250798922640");
    
//     // Simplified message payload
//    // Construct the payload
//   const payload = {
//     messaging_product: "whatsapp",
//     to: formattedPhone,
//     type: WELCOME_MESSAGE_TEMPLATE.type,
//     text: {
//       body: WELCOME_MESSAGE_TEMPLATE.text,
//     },
//   };
 
//     // const payload = {
//     //   messaging_product: "whatsapp",
//     //   to: formattedPhone,
//     //   type: "template",
//     //   template: {
//     //     name: "hello_world",//"welcome_message_icupa", // Replace with your approved template name
//     //     language: {
//     //       code: "en_US" // Replace with the appropriate language code
//     //     }
//     //   }
//     // };

//     console.log('Sending payload:', JSON.stringify(payload, null, 2));

//     const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;
//     console.log('Request URL:', url);

//     const response = await axios({
//       method: 'POST',
//       url: url,
//       headers: {
//         'Authorization': `Bearer ${ACCESS_TOKEN}`,
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       },
//       data: payload
//     });

//     console.log('Message sent successfully:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error details:", {
//       status: error.response?.status,
//       statusText: error.response?.statusText,
//       data: error.response?.data,
//       headers: error.response?.headers
//     });
    
//     throw error;
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







// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios");
// const cors = require("cors");

// const app = express();

// app.use(cors({
//   origin: ["http://localhost:3000", "https://6986-197-157-145-176.ngrok-free.app"],
//   methods: ["GET", "POST"],
//   credentials: true
// }));

// app.use(bodyParser.json());

// // WhatsApp API Credentials
// const ACCESS_TOKEN = "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";
// const PHONE_NUMBER_ID = "189923527537354";//"512935888564619";
// const VERSION = "v19.0"; // Latest API version

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
//   const VERIFY_TOKEN = "icupatoken2121"; // Replace with your chosen verify token
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

// // Function to send a WhatsApp message
// async function sendWhatsAppMessage() {
//   try {
//     const formattedPhone = formatPhoneNumber("+250798922640");
    
//     // Simplified message payload
//     const payload = {
//       messaging_product: "whatsapp",
//       to: formattedPhone,
//       type: "template",
//       template: {
//         name: "hello_world",//"welcome_message_icupa", // Replace with your approved template name
//         language: {
//           code: "en_US" // Replace with the appropriate language code
//         }
//       }
//     };

//     console.log('Sending payload:', JSON.stringify(payload, null, 2));

//     const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;
//     console.log('Request URL:', url);

//     const response = await axios({
//       method: 'POST',
//       url: url,
//       headers: {
//         'Authorization': `Bearer ${ACCESS_TOKEN}`,
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       },
//       data: payload
//     });

//     console.log('Message sent successfully:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error details:", {
//       status: error.response?.status,
//       statusText: error.response?.statusText,
//       data: error.response?.data,
//       headers: error.response?.headers
//     });
    
//     throw error;
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







        // const payload = {
        //   messaging_product: "whatsapp",
        //   to: formattedPhone, // Replace with the recipient's phone number
        //   type: "interactive", // Message type is interactive
        //   interactive: {
        //     type: "button", // This specifies the message includes buttons
        //     header: {
        //       type: "image", // The header contains an image
        //       image: {
        //         link: IMAGE_URL, // Replace with your image URL
        //       },
        //     },
        //     body: {
        //       text: ` *Welcome to ICUPA!* 

        // We are thrilled to have you onboard. 🎉

        // 🍹 Discover the best soft drinks, liquors, and whiskys

        //  *Stay connected with ICUPA for the best experiences.*`,
        //     },
        //     footer: {
        //       text: "Tap below to get started!", // Footer text
        //     },
        //     action: {
        //       buttons: [
        //         {
        //           type: "reply", // Button type is a quick reply
        //           reply: {
        //             id: "welcomeone", //"1532505954094165", //"d056b889862899961785", // Flow ID
        //             title: "Shop Now", // Button label
        //           },
        //         },
        //       ],
        //     },
        //   },
        // };


// Needed payload: to send a message_template with a button to initiate a flow. 

      //   const payload = {
      //     messaging_product: "whatsapp",
      //     to: formattedPhone,
      //     type: "template",
      //     template: {
      //         name: "welcomesix",//"welcome_message_icupa", // Replace with your approved template name
      //         language: {
      //             code: "en_US" // Replace with the appropriate language code
      //         },
      //         components: [
      //             {
      //                 type: "button",
      //                 sub_type: "flow",
      //                 index: "0",
      //                 parameters: [
      //                     {
      //                         type: "payload",
      //                         payload: "d056b889862899961785"
      //                     }
      //                 ]
      //             }
      //         ]
      //     }
      // };
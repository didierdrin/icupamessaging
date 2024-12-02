

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
const VERSION = "v19.0";

// Function to format phone number
const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
};

// Function to send a WhatsApp message 
async function sendWhatsAppMessage(phone = "+250798922640") {
    try {
        const formattedPhone = formatPhoneNumber(phone); 
        
        // Catalog payload
        const payload = {
            messaging_product: "whatsapp",
            to: formattedPhone, 
            type: "interactive",
            interactive: {
                type: "list", 
                body: {
                    text: "Welcome to ICUPA! Browse our catalog below:",
                },
                footer: {
                    text: "Tap to view details."
                },
                action: {
                    button: "Shop Now",
                    sections: [
                        {
                            title: "Beer",
                            rows: [
                                { id: "1", title: "Fanta Citron 50 CL", description: "5000 USD - Out of stock" },
                                { id: "2", title: "Turbo King 50 CL", description: "6000 USD - Out of stock" },
                                { id: "4", title: "Heineken 33 CL", description: "6000 USD - Out of stock" },
                                { id: "5", title: "Mützig 65 CL", description: "5000 USD - Out of stock" },
                                { id: "6", title: "Sprite 30 CL", description: "1 USD - Out of stock" },
                                { id: "13", title: "Fanta Pineapple 150 CL", description: "5000 USD - Out of stock" },
                                { id: "25", title: "Primus 50 CL", description: "5000 USD - Out of stock" }
                            ]
                        },
                        {
                            title: "Soft Drinks",
                            rows: [
                                { id: "10", title: "Fanta Pineapple 30 CL", description: "1 USD - Out of stock" },
                                { id: "16", title: "Fanta Orange 30 CL", description: "1 USD - Out of stock" },
                                { id: "29", title: "Coca Cola 30 CL", description: "1 USD - Out of stock" }
                            ]
                        }
                    ]
                }
            }
        };

        // Quantity management payload
        const quantityPayload = {
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

        const cartPayload = {
            "messaging_product": "whatsapp",
            "to": formattedPhone,
            "type": "interactive",
            "interactive": {
              "type": "button",
              "header": { "type": "text", "text": "Your Cart" },
              "body": { "text": "You have:\n- 2 Beers: $6\n- 1 Cocktail: $5\nTotal: $11." },
              "action": {
                "buttons": [
                  { "type": "reply", "reply": { "id": "checkout", "title": "Checkout" } },
                  { "type": "reply", "reply": { "id": "clear_cart", "title": "Clear Cart" } }
                ]
              }
            }
          };

        const paymentPayload = {
            "messaging_product": "whatsapp",
            "to": formattedPhone,
            "type": "interactive",
            "interactive": {
              "type": "button",
              "header": { "type": "text", "text": "Payment Options" },
              "body": { "text": "How would you like to pay?" },
              "action": {
                "buttons": [
                  { "type": "reply", "reply": { "id": "pay_momo", "title": "Mobile Money" } },
                  { "type": "reply", "reply": { "id": "pay_cash", "title": "Pay on Delivery" } }
                ]
              }
            }
          };

        const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

        // Send catalog payload
        const catalogResponse = await axios({
            method: 'POST',
            url: url,
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: payload
        });

        // Wait a moment before sending the second message
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Send quantity management payload
        const quantityResponse = await axios({
            method: 'POST',
            url: url,
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: quantityPayload
        });

        console.log('Catalog message sent successfully:', catalogResponse.data);
        console.log('Quantity management message sent successfully:', quantityResponse.data);

        return {
            catalogResponse: catalogResponse.data,
            quantityResponse: quantityResponse.data
        };
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
    } catch (error) {
        console.error('Initial message sending failed:', error.message);
    }
};

// Route to manually trigger messages
app.post("/api/send-message", async (req, res) => {
    try {
        const { phone } = req.body;
        const result = await sendWhatsAppMessage(phone);
        res.status(200).json({
            success: true,
            message: "Messages sent successfully!",
            response: result
        });
    } catch (error) {
        const errorMessage = error?.response?.data?.error?.message ||
            error?.message ||
            "An unknown error occurred";

        const statusCode = error?.response?.status || 500;

        res.status(statusCode).json({
            success: false,
            message: "Failed to send messages",
            error: errorMessage
        });
    }
});

// Function to get item details based on ID
const getSelectedItemDetails = (itemId) => {
    const allItems = [
        { id: "1", title: "Fanta Citron 50 CL", description: "5000 USD - Out of stock" },
        { id: "2", title: "Turbo King 50 CL", description: "6000 USD - Out of stock" },
        { id: "4", title: "Heineken 33 CL", description: "6000 USD - Out of stock" },
        { id: "5", title: "Mützig 65 CL", description: "5000 USD - Out of stock" },
        { id: "6", title: "Sprite 30 CL", description: "1 USD - Out of stock" },
        { id: "13", title: "Fanta Pineapple 150 CL", description: "5000 USD - Out of stock" },
        { id: "25", title: "Primus 50 CL", description: "5000 USD - Out of stock" }
    ];
    return allItems.find(item => item.id === itemId);
};

// Route to handle user selection from WhatsApp
app.post("/api/handle-selection", async (req, res) => {
    const body = req.body;

    try {
        const { selectedItem } = body; 
        const selectedItemDetails = getSelectedItemDetails(selectedItem);

        if (!selectedItemDetails) {
            res.status(400).json({ message: "Invalid item selected." });
            return;
        }

        const quantityMessage = {
            messaging_product: "whatsapp",
            to: formatPhoneNumber("+250798922640"), 
            text: {
                body: `You selected ${selectedItemDetails.title}. Please enter the quantity you'd like to order:`
            }
        };

        const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;
        await axios.post(url, quantityMessage, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ message: "Quantity request sent." });
    } catch (error) {
        console.error("Error handling selection:", error);
        res.status(500).json({ message: "Error handling selection." });
    }
});

// Route to handle user response for quantity
app.post("/api/handle-quantity", async (req, res) => {
    const body = req.body;

    try {
        const { selectedItem, quantity } = body;

        console.log(`User selected item: ${selectedItem}, Quantity: ${quantity}`);
        res.status(200).json({ message: "Data received and logged." });
    } catch (error) {
        console.error("Error handling quantity:", error);
        res.status(500).json({ message: "Error handling quantity." });
    }
});


// Add health check route
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
const PORT = 5001; // Different port from icupamessaging.js
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    scheduleMessages(); // Start sending scheduled messages
});



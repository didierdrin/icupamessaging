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
    const VERIFY_TOKEN = "icupatoken31"; 
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

        const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;
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


// Route to handle user selection from WhatsApp
app.post("/api/handle-selection", async (req, res) => {
    const body = req.body;

    try {
        const { selectedItem, phone } = body; // Capture selected item and user phone
        const selectedItemDetails = getSelectedItemDetails(selectedItem);

        if (!selectedItemDetails) {
            res.status(400).json({ message: "Invalid item selected." });
            return;
        }

        // Send the quantity selection message
        const quantityMessage = {
            messaging_product: "whatsapp",
            to: formatPhoneNumber(phone),
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: `Product: ${selectedItemDetails.title} - $3`
                },
                body: {
                    text: `You currently have 2 ${selectedItemDetails.title} in your cart.`
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "increment_beer",
                                title: "Add More"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "decrement_beer",
                                title: "Remove One"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "view_cart",
                                title: "View Cart"
                            }
                        }
                    ]
                }
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

// Route to handle user response for quantity
app.post("/api/handle-quantity", async (req, res) => {
    const body = req.body;

    try {
        const { selectedItem, replyId, phone } = body; // Capture the selected item and reply from the user
        console.log(`User selected item: ${selectedItem}, Reply: ${replyId}`);

        // Logic to process the quantity update
        if (replyId === "increment_beer") {
            // Logic to increase the quantity
            console.log("Increasing quantity...");
        } else if (replyId === "decrement_beer") {
            // Logic to decrease the quantity
            console.log("Decreasing quantity...");
        } else if (replyId === "view_cart") {
            // Logic to view the cart
            console.log("Viewing cart...");
        }

        // Respond to the user with the next action or a confirmation
        res.status(200).json({ message: "User response processed." });
    } catch (error) {
        console.error("Error handling quantity:", error);
        res.status(500).json({ message: "Error handling quantity." });
    }
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    scheduleMessages();
});

import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import { firestore } from "./firebaseConfig.js";
import { firestore2 } from "./firebaseConfig2.js"; 
import http from "http";
import https from "https";
import { v4 as uuidv4 } from "uuid";
//import admin from 'firebase-admin';


// Custom HTTP and HTTPS Agents
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
});

// Set longer timeout and more robust connection settings
axios.defaults.timeout = 60000 * 3; // 3 minutes
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://icupamessaging.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(bodyParser.json());

// WhatsApp API Credentials
const ACCESS_TOKEN =
  "EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";//"EAA1kZAGvg8CkBO7CvHgw7vOETU2TPYwnzqBtJMKm08L3u3iaCau2J98glnWGkbx1A80bHrCvRK8lZA4ZB4diboE0ACxtqUOG4bR0LU6uqUWxsd6cRRaDQZBJTJt6LDLZCEMKw4h87ixIhRyTfwoSzphuUMDCVjsQBmOjsWCqn0WhcWTS7UESldlis6OL5fz0Tp7teEsKX8iIWOcoAVZAf3SEF1lfMZD";//"EAAGHrMn6uugBO9xlSTNU1FsbnZB7AnBLCvTlgZCYQDZC8OZA7q3nrtxpxn3VgHiT8o9KbKQIyoPNrESHKZCq2c9B9lvNr2OsT8YDBewaDD1OzytQd74XlmSOgxZAVL6TEQpDT43zZCZBwQg9AZA5QPeksUVzmAqTaoNyIIaaqSvJniVmn6dW1rw88dbZAyR6VZBMTTpjQZDZD";//"EAA1kZAGvg8CkBO24xE3Nh1NvIOrZAHhEt6N1w6LBa0gLxpK3KZCYZBBeFroUunZCYvJhwFgXblw2rsxkRLkAThSSHgmzvO2ArQKq9kvsHkQQSzrK7pYy0bJktsrPzad3XLbpVwgG9WDbz2ZC5DHLtee99GMjqXxM9C3RbZBZALGz7n7dYl6ydJwMYagLADh0TAZCrOC3MiTe7Yq3Tvx4n9pKISPZB5QIsZD";
//const PHONE_NUMBER_ID = "553852214469319"; //"396791596844039";
const VERSION = "v19.0";

// Global in-memory store for user contexts
const userContexts = new Map();
//userContexts.clear()

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Update the plate number validation function
function validatePlateNumber(plateNumber) {
  // More flexible validation
  const cleanedPlateNumber = plateNumber.replace(/\s+/g, "").toUpperCase();

  // Relaxed regex to match various plate number formats
  const plateNumberRegex = /^[A-Z]{2,3}\d{2,4}[A-Z]?$/;

  console.log("Plate Number Validation:", {
    input: plateNumber,
    cleaned: cleanedPlateNumber,
    isValid: plateNumberRegex.test(cleanedPlateNumber),
  });

  return {
    isValid: plateNumberRegex.test(cleanedPlateNumber),
    formattedPlateNumber: cleanedPlateNumber,
  };
}

const validateDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

//// From here - readable modular functions.

const handlePlateNumberValidation = async (message, phone, phoneNumberId) => {
  const userContext = userContexts.get(phone);
  const messageText = message.text.body.trim().toLowerCase();
  const PLATE_NUMBER_REGEX = /^[a-zA-Z]{3}\s?\d{3}[a-zA-Z]?$/i;

  // Check if we're expecting a plate number
  if (PLATE_NUMBER_REGEX.test(messageText)) {
    const plateNumberInput = message.text.body.trim();
    const { isValid, formattedPlateNumber } =
      validatePlateNumber(plateNumberInput);

    console.log("Plate Number Validation Result:", {
      input: plateNumberInput,
      isValid: isValid,
      formattedPlateNumber: formattedPlateNumber,
    });

    if (isValid) {
      await selectInsurancePeriod(phone, formattedPlateNumber, phoneNumberId);
    } else {
      // Send error message for invalid plate number
      const errorPayload = {
        type: "text",
        text: {
          body: "Invalid plate number format. Please use a valid format like RAC345T or RAC 345 T:",
        },
      };
      await sendWhatsAppMessage(phone, errorPayload, phoneNumberId);

      // Optional: Re-trigger plate number request
      await requestVehiclePlateNumber(phone, phoneNumberId);
    }
  }
};

const handleDateValidation = async (message, phone, phoneNumberId) => {
  const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  const messageText = message.text.body.trim();

  // Validate date format
  if (DATE_REGEX.test(messageText)) {
    try {
      // Additional validation for date validity
      const [day, month, year] = messageText.split("/").map(Number);
      const inputDate = new Date(year, month - 1, day);

      // Check if date is valid and not in the past
      const isValidDate =
        inputDate.getFullYear() === year &&
        inputDate.getMonth() === month - 1 &&
        inputDate.getDate() === day &&
        inputDate >= new Date(); // Ensures date is not in the past

      if (isValidDate) {
        console.log("Date Validation Result:", {
          input: messageText,
          isValid: true,
          formattedDate: messageText,
        });

        // Store the insurance start date in userContext
        const userContext = userContexts.get(phone) || {};
        userContext.insuranceStartDate = inputDate;
        userContexts.set(phone, userContext);

        // Proceed to next step: selecting insurance cover type
        await selectInsuranceCoverType(phone, phoneNumberId);
      } else {
        // Send error message for invalid date
        const errorPayload = {
          type: "text",
          text: {
            body: "Invalid date. Please enter a valid future date in DD/MM/YYYY format. For example: 15/12/2024",
          },
        };
        await sendWhatsAppMessage(phone, errorPayload, phoneNumberId);
      }
    } catch (error) {
      console.error("Date validation error:", error);
      const errorPayload = {
        type: "text",
        text: {
          body: "There was an error processing the date. Please try again with a valid date in DD/MM/YYYY format.",
        },
      };
      await sendWhatsAppMessage(phone, errorPayload, phoneNumberId);
    }
  }
};

// New comprehensive message handling functions
const handleNFMReply = async (message, phone, phoneNumberId) => {
  const userContext = userContexts.get(phone) || {};
    
  try {
    // Safely parse the flow response
    const flowResponse = message.interactive.nfm_reply.response_json;
    const userResponse = JSON.parse(flowResponse);

    // Use optional chaining and provide a default empty array
    const selectedCoverTypes = userResponse.screen_0_question3Checkbox_0 || [];

    // Validate input
    if (!Array.isArray(selectedCoverTypes)) {
      console.warn(
        `Invalid cover types for phone ${phone}:`,
        selectedCoverTypes
      );
      return;
    }

    console.log("User selected cover types:", selectedCoverTypes);

    // Process specific cover type
    if (selectedCoverTypes.includes("0_Third-Party_Cover_")) {
      userContext.thirdPartyComesaCost = 14000;
      await selectToAddPersonalAccidentCover(phone, phoneNumberId);
    }

    // Process specific cover type
    if (selectedCoverTypes.includes("1_COMESA_Cover")) {
      userContext.thirdPartyComesaCost = 10000;
      await selectToAddPersonalAccidentCover(phone, phoneNumberId);
    }

    // Update user context
    //const userContext = userContexts.get(phone) || {};
    userContext.selectedCoverTypes = selectedCoverTypes;
    userContexts.set(phone, userContext);
  } catch (error) {
    console.error(`Error processing NFM reply for phone ${phone}:`, error);
    // Optionally, you might want to handle the error more gracefully
    // For example, send an error message back to the user
  }
};

const handlePaymentTermsReply = async (replyId, phone, userContext, phoneNumberId) => {
  switch (replyId) {
    case "add_yes":
      if (userContext.stage === "PERSONAL_ACCIDENT_COVER") {
        await selectPersonalAccidentCategory(phone);
        console.log("Expecting CAT1.../FULL PAYMENT button reply");
        return;
      }

      break;
    case "add_no":
      // Calculate total cost
      //const coverageCost = userContext.selectedCoverage || 0;
      userContext.selectedCoverage = 0; // Price for CAT 0 None
      const coverageCost = userContext.thirdPartyComesaCost;
      userContext.totalCost = 1 * coverageCost;

      userContext.stage = null;
      //userContext.numberOfCoveredPeople = 1;
      userContexts.set(phone, userContext);

      await selectPaymentPlan(phone, phoneNumberId);
      break;
    case "agree_to_terms":
      console.log("User agreed to the terms. Proceeding with payment.");
      await processPayment(phone, userContext.selectedInstallment, phoneNumberId);
      break;

    case "cancel_payment":
      console.log("User canceled the payment.");
      await sendWhatsAppMessage(phone, {
        type: "text",
        text: {
          body: "Payment has been canceled. Let us know if you need anything else!",
        },
      }, phoneNumberId);
      break;
    case "start_today":
      if (userContext.stage === "EXPECTING_INSURANCE_PERIOD") {
        // Store the insurance start date in userContext
        const today = new Date();
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        userContext.insuranceStartDate = formattedDate;
        userContexts.set(phone, userContext);
        await selectInsuranceCoverType(phone, phoneNumberId);
        console.log("Expecting start_today button reply");
        return;
      }

      break;

    case "custom_date":
      if (userContext.stage === "EXPECTING_INSURANCE_PERIOD") {
        await sendWhatsAppMessage(phone, {
          type: "text",
          text: {
            body: "Please enter your desired start date (DD/MM/YYYY):",
          },
        }, phoneNumberId);
        userContext.stage = "CUSTOM_DATE_INPUT";
        userContexts.set(phone, userContext);
        console.log("Expecting custom_date button reply");
        return;
      }

      break;

    default:
      console.log("Unknown payment response:", replyId);
  }
};

const handleMobileMoneySelection = async (buttonId, phone, phoneNumberId) => {
  const userContext = userContexts.get(phone);
  if (!userContext) {
    console.log("No user context found for phone:", phone);
    return;
  }

  const vendorNumber = userContext.vendorNumber || "+250788767816"; // Default to Rwanda
  const currentCurrency = userContext.currency || "RWF"; // Default to Rwanda
  let callToActionMessage = "";

  if (currentCurrency === "RWF") {
    // Payment messages for Rwanda
    if (buttonId === "mtn_momo") {
      callToActionMessage = `Please pay with\nMTN MoMo to ${vendorNumber}, name Icupa\n____________________\nYour order is being processed and will be delivered soon.`;
    } else if (buttonId === "airtel_mobile_money") {
      callToActionMessage = `Please pay with\nAirtel Money to ${vendorNumber}, name Icupa\n____________________\nYour order is being processed and will be delivered soon.`;
    } else {
      console.log("Unrecognized mobile money option for Rwanda:", buttonId);
      return;
    }
  } else if (currentCurrency === "XOF") {
    // Payment messages for Togo
    if (buttonId === "mtn_momo") {
      callToActionMessage = `Veuillez payer avec\nMTN Mobile Money au ${vendorNumber}, nom Icupa\n____________________\nVotre commande est en cours de traitement et sera livrée sous peu.`;
    } else if (buttonId === "airtel_mobile_money") {
      callToActionMessage = `Veuillez payer avec\nAirtel Money au ${vendorNumber}, nom Icupa\n____________________\nVotre commande est en cours de traitement et sera livrée sous peu.`;
    } else {
      console.log("Unrecognized mobile money option for Togo:", buttonId);
      return;
    }
  } else {
    console.log("Unsupported currency:", currentCurrency);
    return;
  }

  const redirectPayload = {
    type: "text",
    text: { body: callToActionMessage },
  };

  await sendWhatsAppMessage(phone, redirectPayload, phoneNumberId);
};


const handleNumberOfPeople = async (message, phone, phoneNumberId) => {
  const userContext = userContexts.get(phone) || {};

  if (userContext.stage === "EXPECTING_NUMBER_OF_PEOPLE") {
    const messageText = message.text.body.trim();
    const numberOfPeople = parseInt(messageText);

    if (
      !isNaN(numberOfPeople) &&
      numberOfPeople > 0 &&
      numberOfPeople <= 1000
    ) {
      try {
        console.log("Number of Covered People Validation Result:", {
          input: messageText,
          isValid: true,
          numberOfPeople: numberOfPeople,
        });

        // Calculate total cost
        const coverageCost = userContext.selectedCoverage || 0;
        userContext.totalCost = numberOfPeople * coverageCost;

        userContext.stage = null;
        userContext.numberOfCoveredPeople = numberOfPeople;
        userContexts.set(phone, userContext);

        await selectPaymentPlan(phone, phoneNumberId);
      } catch (error) {
        console.error("Processing error:", error);
        await sendWhatsAppMessage(phone, {
          type: "text",
          text: {
            body: "An error occurred. Please try again.",
          },
        }, phoneNumberId);
      }
    } else {
      await sendWhatsAppMessage(phone, {
        type: "text",
        text: {
          body: "Invalid input. Please enter a number between 1 and 1000. For example: 3",
        },
      }, phoneNumberId);
    }
  }
};

const handleOrder = async (message, changes, displayPhoneNumber, phoneNumberId) => {
  const order = message.order;
  const orderId = message.id;
  const customerInfo = {
    phone: changes.value.contacts[0].wa_id,
    receiver: displayPhoneNumber,
  };
  const items = order.product_items;
  const totalAmount = items.reduce(
    (total, item) => total + item.item_price * item.quantity,
    0
  );

  // Save the order details into userContext
  const userContext = userContexts.get(customerInfo.phone) || {};
  userContext.order = {
    orderId,
    customerInfo,
    items,
    totalAmount,
  };
  userContexts.set(customerInfo.phone, userContext);

  try {
    

    // Send location request message
    const locationRequestPayload = {
      type: "interactive",
      interactive: {
        type: "location_request_message",
        body: {
          text: "Share your delivery location",
        },
        action: {
          name: "send_location",
        },
      },
    };

    await sendWhatsAppMessage(customerInfo.phone, locationRequestPayload, phoneNumberId);
    console.log("Order saved successfully.");
  } catch (error) {
    console.error("Error saving order:", error.message);
  }
};




const handleTextMessages = async (message, phone, phoneNumberId) => {
  const messageText = message.text.body.trim().toLowerCase();

  switch (messageText) {
    case "adminclear":
      userContexts.clear();
      console.log("All user contexts reset.");
      break;

    case "clear":
      userContexts.delete(phone);
      console.log("User context reset.");
      break;

    case "menu":
      console.log("User requested the menu.");
      await sendDefaultCatalog(phone, phoneNumberId);
      break;
    case "icupa":
      console.log("User requested the menu.");
      await sendDefaultCatalog(phone, phoneNumberId);
      break;
    case "second-menu":
      console.log("User requested the menu.");
      await sendDefaultCatalog2(phone, phoneNumberId);
      break;

    case "insurance":
      console.log("User requested insurance options.");
      await sendWelcomeMessage(phone, phoneNumberId);
      break;

    default:
      console.log(`Received unrecognized message: ${messageText}`);
  }
};

const handleTextMessages2 = async (message, phone, phoneNumberId) => {
  const messageText = message.text.body.trim().toLowerCase();

  switch (messageText) {
    case "adminclear":
      userContexts.clear();
      console.log("All user contexts reset.");
      break;

    case "clear":
      userContexts.delete(phone);
      console.log("User context reset.");
      break;

    case "icupa":
      console.log("User requested the menu.");
      await sendDefaultCatalog(phone, phoneNumberId);
      break;
    case "menu":
      console.log("User requested the menu.");
      await sendDefaultCatalog2(phone, phoneNumberId);
      break;

    case "insurance":
      console.log("User requested insurance options.");
      await sendWelcomeMessage(phone, phoneNumberId);
      break;

    default:
      console.log(`Received unrecognized message: ${messageText}`);
  }
};

const handleInteractiveMessages = async (message, phone, phoneNumberId) => {
  const interactiveType = message.interactive.type;
  const replyId =
    interactiveType === "list_reply"
      ? message.interactive.list_reply.id
      : message.interactive.button_reply.id;

  const userContext = userContexts.get(phone) || {};

  switch (replyId) {
    case "get_insurance":
      await requestInsuranceDocument(phone, phoneNumberId);
      break;

    case "file_claim":
      await initiateClaimProcess(phone, phoneNumberId);
      break;

    case "cat_1":
      userContext.selectedCoverage = 1000000; // Price for CAT 1
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "cat_2":
      userContext.selectedCoverage = 2000000; // Price for CAT 2
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "cat_3":
      userContext.selectedCoverage = 3000000; // Price for CAT 3
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "cat_4":
      userContext.selectedCoverage = 4000000; // Price for CAT 4
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "cat_5":
      userContext.selectedCoverage = 5000000; // Price for CAT 5
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "risk_taker":
      userContext.selectedCoverage = 0; // No cost for no coverage
      userContexts.set(phone, userContext);
      await numberOfCoveredPeople(phone, phoneNumberId);
      break;

    case "installment_cat1":
      userContext.selectedInstallment = 'i_cat1';
      userContexts.set(phone, userContext); 
      await confirmAndPay(phone, userContext.selectedInstallment, phoneNumberId); 
      break;

    case "installment_cat2":
      userContext.selectedInstallment = 'i_cat2';
      userContexts.set(phone, userContext); 
      await confirmAndPay(phone, userContext.selectedInstallment, phoneNumberId); 
      break; 

    case "installment_cat3":
      userContext.selectedInstallment = 'i_cat3'; 
      userContexts.set(phone, userContext); 
      await confirmAndPay(phone, userContext.selectedInstallment, phoneNumberId); 
      break;

    case "installment_cat4":
      userContext.selectedInstallment = 'i_cat4'; 
      userContexts.set(phone, userContext); 
      await confirmAndPay(phone, userContext.selectedInstallment, phoneNumberId); 
      break; 
      
    case "full_payment":
      userContext.selectedInstallment = 'i_catf'; 
      userContexts.set(phone, userContext);
      await confirmAndPay(phone, userContext.selectedInstallment, phoneNumberId);
      break;

    default:
      console.log("Unrecognized reply ID:", replyId);
  }
};


const handleLocation = async (location, phone, phoneNumberId) => {
  try {
    // Retrieve the order from userContext
    const userContext = userContexts.get(phone);
    
    if (!userContext || !userContext.order) {
      console.log("No order found in user context.");
      await sendWhatsAppMessage(phone, {
        type: "text",
        text: {
          body: "No active order found. Please place an order first.",
        },
      }, phoneNumberId);
      return;
    }

    // Extract order details from userContext
    const { orderIdx, customerInfo, items } = userContext.order;

    // Fetch catalog products for enrichment
    const catalogProducts = await fetchFacebookCatalogProducts();

    // Enrich items with product details
    const enrichedItems = items.map((item) => {
      const productDetails = catalogProducts.find(
        (product) => product.retailer_id === item.product_retailer_id
      );
      return {
        product: item.product_retailer_id,
        quantity: item.quantity,
        price: item.item_price,
        currency: item.currency,
        product_name: productDetails?.name || "Unknown Product",
        product_image: productDetails?.image_url || "defaultImage.jpg",
      };
    });

    // Determine vendor and currency
    const currencies = enrichedItems[0].currency;
    let vendorNumber = "+250788767816"; // Default Rwanda
    let currentCurrency = "RWF";
    let countryCodeText = "RW";
    
    if (currencies === "XOF") {
      vendorNumber = "+22892450808"; // Togo
      currentCurrency = "XOF";
      let countryCodeText = "TG";
    }

    function orderNumber() {
      const randomNum = Math.floor(1 + Math.random() * (10000000 - 1)); // Generates a number between 1 and 9999999
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const formattedNum = randomNum.toString().padStart(6, "0"); // Convert to string and pad with leading zeros if needed

      return `ORD-${dateStr}-${formattedNum}`;
    }

    const orderidd = orderNumber();
    
    // Prepare order data for Firebase
    const orderData = {
      orderId: orderidd,
      phone: customerInfo.phone,
      currency: currentCurrency,
      countryCode: countryCodeText,
      amount: enrichedItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
      products: enrichedItems,
      user: `+${customerInfo.phone}`,
      date: new Date(),
      paid: false,
      rejected: false,
      served: false,
      accepted: false,
      vendor: vendorNumber,
      //deliveryAddress: "xx KG yy Ave",
      deliveryLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
      }
    };

    // Save directly to Firebase
    const docRef = await firestore.collection("whatsappOrders").add(orderData);
    console.log("Order saved successfully to Firebase with ID:", docRef.id);

    // Send the TIN request to the customer
    await sendWhatsAppMessage(phone, {
      type: "text",
      text: {
        body: "Please provide your TIN(e.g., 101589140) or 0 if no TIN:",
      },
    }, phoneNumberId);

    // Update user context to expect TIN input
    userContext.vendorNumber = vendorNumber;
    userContext.currency = currentCurrency;
    userContext.stage = "EXPECTING_TIN";
    userContexts.set(phone, userContext);

    console.log("Location updated and order saved successfully.");
  } catch (error) {
    console.error("Error processing location and saving order:", error.message);
    await sendWhatsAppMessage(phone, {
      type: "text",
      text: {
        body: `Sorry, there was an error processing your location: ${error.message}. Please try again.`,
      },
    }, phoneNumberId);
  }
};

const handleDocumentUpload = async (message, phone, phoneNumberId) => {
  const userContext = userContexts.get(phone) || {};

  // Only process if expecting a document
  if (userContext.stage !== "EXPECTING_DOCUMENT") {
    console.log("Not expecting a document at this stage");
    return;
  }

  const mediaId = message.document?.id || message.image?.id;
  const mediaMimeType = message.document?.mime_type || message.image?.mime_type;

  // Validate file type
  if (
    !mediaId ||
    !(mediaMimeType === "application/pdf" || mediaMimeType.startsWith("image/"))
  ) {
    await sendWhatsAppMessage(phone, {
      type: "text",
      text: {
        body: "Invalid file type. Please upload a clear image or PDF of your insurance certificate.",
      },
    }, phoneNumberId);
    return;
  }

  try {
    console.log("Received a document:", mediaId);

    


    // Store the document ID (or URL if you download it) in the userContext
    userContext.insuranceDocumentId = mediaId;
    userContext.stage = null; // Clear the expecting document stage
    userContexts.set(phone, userContext);

    // Proceed to next step
    await requestVehiclePlateNumber(phone, phoneNumberId);
  } catch (error) {
    console.error("Error processing document:", error);
    await sendWhatsAppMessage(phone, {
      type: "text",
      text: {
        body: "An error occurred while processing your document. Please try again.",
      },
    }, phoneNumberId);
  }
};

const processedMessages = new Set();



// Webhook endpoint for receiving messages
app.post("/webhook", async (req, res) => {
    if (req.body.object === "whatsapp_business_account") {
        const changes = req.body.entry?.[0]?.changes?.[0];
        const messages = changes.value?.messages;
        const phoneNumberId = changes.value?.metadata?.phone_number_id;

        if (!changes || !messages || !phoneNumberId) {
            return res.status(400).send("Invalid payload.");
        }

        // Only process the first message in the array
        const message = messages[0];
        const phone = message.from;
        const uniqueMessageId = `${phoneNumberId}-${message.id}`;

        if (processedMessages.has(uniqueMessageId)) {
            console.log("Duplicate message ignored:", uniqueMessageId);
            return res.sendStatus(200);
        }

        processedMessages.add(uniqueMessageId);
      //if (phoneNumberId === "396791596844039") {
             
        try {
            if (phoneNumberId === "553852214469319") {
                await handlePhoneNumber1Logic(message, phone, changes, phoneNumberId);
            } else if (phoneNumberId === "396791596844039") {
               await handlePhoneNumber2Logic(message, phone, changes, phoneNumberId);
            } else {
                console.warn("Unknown phone number ID:", phoneNumberId);
            }
        } catch (err) {
            console.error("Error processing message:", err.message);
        } finally {
            setTimeout(() => processedMessages.delete(uniqueMessageId), 300000);
        }
    }

    res.sendStatus(200);
});


  
  async function handlePhoneNumber1Logic(message, phone, changes, phoneNumberId) {
    switch (message.type) {
              case "order":
                await handleOrder(
                  message,
                  changes,
                  changes.value.metadata.display_phone_number,
                  phoneNumberId
                );
                break;
  
              case "text":
                await handleTextMessages(message, phone, phoneNumberId);
                await handlePlateNumberValidation(message, phone, phoneNumberId);
                await handleDateValidation(message, phone, phoneNumberId);
                await handleNumberOfPeople(message, phone, phoneNumberId);
                const userContext = userContexts.get(phone) || {};
                if (userContext.stage === "EXPECTING_TIN") {
                  const tin = message.text.body.trim();
                  if (tin) {
                    console.log(`User ${phone} provided TIN: ${tin}`);
                    // Store the TIN or process it as required
                    // Update the context to expect the location
                    //userContext.tin = tin;  // Save the TIN
                    userContext.stage = "EXPECTING_MTN_AIRTEL"; // Move to location stage
                    userContexts.set(phone, userContext);
  
                    await sendWhatsAppMessage(phone, {
                      type: "interactive",
                      interactive: {
                        type: "button",
                        body: {
                          text: "Proceed to payment",
                        },
                        action: {
                          buttons: [
                            { type: "reply", reply: { id: "mtn_momo", title: "MTN MoMo" } },
                            {
                              type: "reply",
                              reply: { id: "airtel_mobile_money", title: "Airtel Money" },
                            },
                          ],
                        },
                      },
                    }, phoneNumberId);
  
                    return;  // Exit early after processing TIN
                  } else {
                    await sendWhatsAppMessage(phone, {
                      type: "text",
                      text: {
                        body: "Invalid TIN. Please provide a valid TIN.",
                      },
                    }, phoneNumberId);
                    return;
                  }
                }
                break;
  
              case "interactive":
                if (message.interactive.type === "nfm_reply") {
                  await handleNFMReply(message, phone, phoneNumberId);
                } else if (message.interactive.type === "button_reply") {
                  const buttonId = message.interactive.button_reply.id;
  
                  // Only process if MENU pay
                  const userContext = userContexts.get(phone) || {};
                  if (
                    userContext.stage === "EXPECTING_CONFIRM_PAY" ||
                    userContext.stage === "PERSONAL_ACCIDENT_COVER" ||
                    userContext.stage === "EXPECTING_INSURANCE_PERIOD"
                  ) {
                    await handlePaymentTermsReply(
                      buttonId,
                      phone,
                      userContexts.get(phone), phoneNumberId
                    );
                    console.log("Expecting AGREE & PAY button reply");
                    return;
                  }
                  if (userContext.stage === "EXPECTING_MTN_AIRTEL") {
                    await handleMobileMoneySelection(buttonId, phone, phoneNumberId);
                    console.log("Expecting MTN & AIRTEL button reply");
                    return;
                  }
                } else {
                  await handleInteractiveMessages(message, phone, phoneNumberId);
                }
                break;
              case "document":
              case "image":
                await handleDocumentUpload(message, phone, phoneNumberId);
                break;
  
              case "location":
                await handleLocation(message.location, phone, phoneNumberId);
                break;
  
              default:
                console.log("Unrecognized message type:", message.type);
            }
  }
  



  async function handlePhoneNumber2Logic(message, phone, changes, phoneNumberId) {
    switch (message.type) {
              case "order":
                await handleOrder(
                  message,
                  changes,
                  changes.value.metadata.display_phone_number,
                  phoneNumberId
                );
                break;
  
              case "text":
                await handleTextMessages(message, phone, phoneNumberId);
                await handlePlateNumberValidation(message, phone, phoneNumberId);
                await handleDateValidation(message, phone, phoneNumberId);
                await handleNumberOfPeople(message, phone, phoneNumberId);
                const userContext = userContexts.get(phone) || {};
                if (userContext.stage === "EXPECTING_TIN") {
                  const tin = message.text.body.trim();
                  if (tin) {
                    console.log(`User ${phone} provided TIN: ${tin}`);
                    // Store the TIN or process it as required
                    // Update the context to expect the location
                    //userContext.tin = tin;  // Save the TIN
                    userContext.stage = "EXPECTING_MTN_AIRTEL"; // Move to location stage
                    userContexts.set(phone, userContext);
  
                    await sendWhatsAppMessage(phone, {
                      type: "interactive",
                      interactive: {
                        type: "button",
                        body: {
                          text: "Proceed to payment",
                        },
                        action: {
                          buttons: [
                            { type: "reply", reply: { id: "mtn_momo", title: "MTN MoMo" } },
                            {
                              type: "reply",
                              reply: { id: "airtel_mobile_money", title: "Airtel Money" },
                            },
                          ],
                        },
                      },
                    }, phoneNumberId);
  
                    return;  // Exit early after processing TIN
                  } else {
                    await sendWhatsAppMessage(phone, {
                      type: "text",
                      text: {
                        body: "Invalid TIN. Please provide a valid TIN.",
                      },
                    }, phoneNumberId);
                    return;
                  }
                }
                break;
  
              case "interactive":
                if (message.interactive.type === "nfm_reply") {
                  await handleNFMReply(message, phone, phoneNumberId);
                } else if (message.interactive.type === "button_reply") {
                  const buttonId = message.interactive.button_reply.id;
  
                  // Only process if MENU pay
                  const userContext = userContexts.get(phone) || {};
                  if (
                    userContext.stage === "EXPECTING_CONFIRM_PAY" ||
                    userContext.stage === "PERSONAL_ACCIDENT_COVER" ||
                    userContext.stage === "EXPECTING_INSURANCE_PERIOD"
                  ) {
                    await handlePaymentTermsReply(
                      buttonId,
                      phone,
                      userContexts.get(phone), phoneNumberId
                    );
                    console.log("Expecting AGREE & PAY button reply");
                    return;
                  }
                  if (userContext.stage === "EXPECTING_MTN_AIRTEL") {
                    await handleMobileMoneySelection(buttonId, phone, phoneNumberId);
                    console.log("Expecting MTN & AIRTEL button reply");
                    return;
                  }
                } else {
                  await handleInteractiveMessages(message, phone, phoneNumberId);
                }
                break;
              case "document":
              case "image":
                await handleDocumentUpload(message, phone, phoneNumberId);
                break;
  
              case "location":
                await handleLocation(message.location, phone, phoneNumberId);
                break;
  
              default:
                console.log("Unrecognized message type:", message.type);
            }
  }
  
  
  
  
  
  



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
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
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
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    console.log("WhatsApp connection test successful:", response.data);
    return true;
  } catch (error) {
    console.error(
      "WhatsApp connection test failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Unified message sending function
async function sendWhatsAppMessage(phone, messagePayload, phoneNumberId) {
  try {
    const url = `https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`;

    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formatPhoneNumber(phone),
        ...messagePayload,
      },
    });

    console.log(`Message sent successfully from ${phoneNumberId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `WhatsApp message sending error from ${phoneNumberId}:`,
      error.response?.data || error.message
    );
    throw error;
  }
}


// new catalog with sections
async function sendDefaultCatalog(phone, phoneNumberId) {
  try {
    const url = `https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive: {
        type: "product_list",
        header: {
          type: "text",  // The header type should be "image" to support both image and text
          text: "ICUPA App"  // You can include text along with the image
        },
        body: { text: "Order drinks directly & get free delivery!" },
        action: {
          catalog_id: "545943538321713",
          sections: [
            {
              title: "Our Products",
              product_items: [
                { product_retailer_id: "lxas8cc342" }, // two latest
                //{ product_retailer_id: "wzz0yoorin" },
                //{ product_retailer_id: "5bn8ew7t9v" },
                { product_retailer_id: "fn92a2u1n0" },
                { product_retailer_id: "4nv3b0a4je" },
                { product_retailer_id: "f1i6w3reo3" },
                { product_retailer_id: "6jx5tp7yqp" }, // carbonated drinks
                { product_retailer_id: "h51qjmskbx" },
                { product_retailer_id: "y1qglajnhv" },
                { product_retailer_id: "pbqnbacxrc" },
                { product_retailer_id: "okaifyloso" },
                { product_retailer_id: "wzvz714ih8" },
                { product_retailer_id: "uxeg0mzdv7" },
                { product_retailer_id: "p8vhimsnat" },
                { product_retailer_id: "6q0k2c823u" },
                { product_retailer_id: "0ixo8tkei5" },
                { product_retailer_id: "ycgvnxm07l" },
                { product_retailer_id: "p76ydylhfa" },
                { product_retailer_id: "qye71mwlt6" },
                { product_retailer_id: "80g014ofpq" },
                { product_retailer_id: "7ylsmqn0mg" },
                { product_retailer_id: "i0ts8ijseh" },
                { product_retailer_id: "qlufbd1r69" },
                { product_retailer_id: "vjvih6bc4b" }, // beers //Amstel
                { product_retailer_id: "08gro8egrt" }, // Heinken
                { product_retailer_id: "boq0hoiq7a" }, // Turbo King
                { product_retailer_id: "fqt5zp6z5k" }, // Legend
                { product_retailer_id: "l4bflbemkw" }, // Mutzig 33 CL 
                { product_retailer_id: "njlmxlf1zp" },
                { product_retailer_id: "k0bsesfzs8" }, // Mutzig 65 CL
                { product_retailer_id: "td55lg0z7v" }, // Primus 50 CL
                { product_retailer_id: "qqbhwrsty8" }, // Primus 70 CL
              ],
            },
          ],
        },
      },
    };

    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    console.log("Default catalog sent successfully to:", phone);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending default catalog:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function sendDefaultCatalog2(phone, phoneNumberId) {
  try {
    const url = `https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive: {
        type: "product_list",
        header: {
          type: "text",  // The header type should be "image" to support both image and text
          text: "ICUPA Togo App"  // You can include text along with the image
        },
        body: { text: "Order drinks directly & get free delivery!" },
        action: {
          catalog_id: "545943538321713",
          sections: [
            {
              title: "Our Products",
              product_items: [
                { product_retailer_id: "1vlsxu9sm1" }, // two latest
                { product_retailer_id: "bmubfoij8r" },
                { product_retailer_id: "nsyh2u4zgp" },
                { product_retailer_id: "orimzz8cum" },
                { product_retailer_id: "y2co4gox62" }, // carbonated drinks
           
              ],
            },
          ],
        },
      },
    };

    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    console.log("Default catalog sent successfully to:", phone);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending default catalog:",
      error.response?.data || error.message
    );
    throw error;
  }
}



// Route to manually trigger a message
app.post("/api/send-message", async (req, res) => {
  try {
    const result = await sendDefaultCatalog(req.body.phone, 888);
    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
      response: result,
    });
  } catch (error) {
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      "An unknown error occurred";

    const statusCode = error?.response?.status || 500;

    res.status(statusCode).json({
      success: false,
      message: "Failed to send message",
      error: errorMessage,
    });
  }
});


app.post("/api/save-order", async (req, res) => {
  console.log("Incoming order data:", req.body);

  const { orderId, customerInfo, items, deliveryLocation } = req.body;

  try {
    // Validate incoming data
    if (!orderId || !customerInfo || !items || items.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Fetch all catalog products to enrich order items
    const catalogProducts = await fetchFacebookCatalogProducts();

    // Enrich items with product details from Facebook Catalog
    const enrichedItems = items.map((item) => {
      const productDetails = catalogProducts.find(
        (product) => product.retailer_id === item.product_retailer_id
      );

      return {
        product: item.product_retailer_id,
        quantity: item.quantity,
        price: item.item_price,
        currency: item.currency,
        product_name: productDetails?.name || "Unknown Product",
        product_image: productDetails?.image_url || "defaultImage.jpg",
      };
    });

    // Determine the vendor number based on currency
    const currencies = enrichedItems[0].currency; //enrichedItems.map((item) => item.currency);
    let vendorNumber = "+250788767816"; // Default to Rwandan number
    let currentCurrency = "RWF";
    // currencies.includes("XOF")
    if (currencies == "XOF") {
      vendorNumber = "+22892450808"; // Togo number
      currentCurrency = "XOF"; // Togo currency
    }

    let currentOrder = 0;
    
   
    
    function orderNumber() {
      
      
      const randomNum = uuidv4().split('-')[0];
      currentOrder += 1;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      //return `ORD-${dateStr}-${randomNum.toString()}`;
      // Format the random number to always be 6 digits
      const formattedNum = randomNum.slice(0, 6).padStart(6, "0");
  
      return `ORD-${dateStr}-${formattedNum}`;
      //randomNum.toString().padStart(6, "0")}
    }

    const orderidd = orderNumber();

    // Prepare Firestore document data
    const orderData = {
      orderId: orderidd,
      phone: customerInfo.phone,
      currency: currentCurrency,
      amount: enrichedItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
      products: enrichedItems,
      user: `+${customerInfo.phone}`,
      date: new Date(),
      paid: false,
      rejected: false,
      served: false,
      accepted: false,
      vendor: vendorNumber,
      deliveryLocation: deliveryLocation || null // Add location data
    };

    // Save order to Firestore
    const docRef = await firestore.collection("whatsappOrders").add(orderData);

    console.log("Order saved successfully with ID:", docRef.id);

    res
      .status(200)
      .json({ message: "Order saved successfully", order: orderData });
  } catch (error) {
    console.error("Error saving order:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred while saving the order" });
  }
});


async function fetchFacebookCatalogProducts() {
  const url = `https://graph.facebook.com/v12.0/545943538321713/products?fields=id,name,description,price,image_url,retailer_id`;
  let products = [];
  let nextPage = url;

  try {
    while (nextPage) {
      const response = await axios.get(nextPage, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      });

      // Append fetched products to the list
      products = products.concat(response.data.data);

      // Update nextPage with the next page link
      nextPage = response.data.paging?.next || null;
    }

    console.log("Fetched products with images:", products);
    return products;
  } catch (error) {
    console.error(
      "Error fetching catalog products:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Insurance services codes + the webhooks above
// Initial welcome message
async function sendWelcomeMessage(phone, phoneNumberId) {
  const userContext = userContexts.get(phone) || {};
  userContext.stage = "WELCOME"; // Stage set to "WELCOME"
  userContexts.set(phone, userContext);

  const payload = {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Welcome to Ikanisa\nInsurance Services!",
      },
      body: {
        text: "What would you like to do today?",
      },
      footer: {
        text: "Select an action to proceed",
      },
      action: {
        button: "View Options",
        sections: [
          {
            title: "Insurance Services",
            rows: [
              {
                id: "get_insurance",
                title: "Get Insurance",
                description: "Apply for a new insurance policy",
              },
              {
                id: "file_claim",
                title: "File Claim",
                description: "Submit a new insurance claim",
              },
            ],
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Claim Filing Process
async function initiateClaimProcess(phone, phoneNumberId) {
  const payload = {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Claim Filing Process",
      },
      body: {
        text: "Gather the following documents for your claim:",
      },
      action: {
        button: "Add Documents",
        sections: [
          {
            title: "Required Documents",
            rows: [
              {
                id: "add_driver_license",
                title: "Driver's License",
                description: "Upload driver license details",
              },
              {
                id: "add_logbook",
                title: "Vehicle Logbook",
                description: "Upload vehicle registration document",
              },
              {
                id: "add_insurance_cert",
                title: "Insurance Certificate",
                description: "Upload current insurance document",
              },
            ],
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Get insurance document
async function requestInsuranceDocument(phone, phoneNumberId) {
  const payload = {
    type: "text",
    text: {
      body: "Please upload a clear image or PDF of your current or old insurance certificate.",
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);

  // Update user context to expect a document
  const userContext = userContexts.get(phone) || {};
  userContext.stage = "EXPECTING_DOCUMENT";
  userContexts.set(phone, userContext);
}

// Vehicle Information Collection
async function requestVehiclePlateNumber(phone, phoneNumberId) {
  const payload = {
    type: "text",
    text: {
      body: "Please provide your vehicle's number plate (e.g., RAD 123A):",
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Insurance Period Selection
async function selectInsurancePeriod(phone, plateNumber, phoneNumberId) {
  const userContext = userContexts.get(phone) || {};
  userContext.plateNumber = plateNumber;
  userContext.stage = "EXPECTING_INSURANCE_PERIOD";
  userContexts.set(phone, userContext);

  const payload = {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Vehicle Plate Number: ${plateNumber}\n\nWhen would you like your insurance to start?`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "start_today",
              title: "Start Today",
            },
          },
          {
            type: "reply",
            reply: {
              id: "custom_date",
              title: "Choose Custom Date",
            },
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Insurance Cover Types
async function selectInsuranceCoverType(phone, phoneNumberId) {
  const payload = {
    //messaging_product: "whatsapp",
    //to: formattedPhone,
    type: "template",
    template: {
      name: "insurancecover", //"welcomeseven",//"welcome_message_icupa", // Replace with your approved template name
      language: {
        code: "en_US", // Replace with the appropriate language code
      },
      components: [
        {
          type: "button",
          sub_type: "flow",
          index: "0",
          parameters: [
            {
              type: "payload",
              payload: "1228521268255511", //"3789913271338518" //"598565352606792" // "889862899961785" //"1532505954094165" //"welcomeone"// "d056b889862899961785" //"889862899961785" //  "d056b889862899961785"
            },
          ],
        },
      ],
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

async function selectToAddPersonalAccidentCover(phone, phoneNumberId) {
  const payload = {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Would you like to add Personal Accident Cover?`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "add_yes",
              title: "Yes",
            },
          },
          {
            type: "reply",
            reply: {
              id: "add_no",
              title: "No",
            },
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);

  const userContext = userContexts.get(phone) || {};
  userContext.stage = "PERSONAL_ACCIDENT_COVER";
  userContexts.set(phone, userContext);
}

// Personal Accident Cover Categories
async function selectPersonalAccidentCategory(phone, phoneNumberId) {
  const payload = {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Personal Accident Cover Categories",
      },
      body: {
        text: "Based on coverage levels:",
      },
      action: {
        button: "Select Category",
        sections: [
          {
            title: "Coverage Categories",
            rows: [
              {
                id: "cat_1",
                title: "CAT 1",
                description:
                  "Death/Disability: FRW 1,000,000 | Medical: FRW 100,000",
              },
              {
                id: "cat_2",
                title: "CAT 2",
                description:
                  "Death/Disability: FRW 2,000,000 | Medical: FRW 200,000",
              },
              {
                id: "cat_3",
                title: "CAT 3",
                description:
                  "Death/Disability: FRW 3,000,000 | Medical: FRW 300,000",
              },
              {
                id: "cat_4",
                title: "CAT 4",
                description:
                  "Death/Disability: FRW 4,000,000 | Medical: FRW 400,000",
              },
              {
                id: "cat_5",
                title: "CAT 5",
                description:
                  "Death/Disability: FRW 5,000,000 | Medical: FRW 500,000",
              },
              // Add more categories...
              {
                id: "risk_taker",
                title: "No Cover",
                description: "I'm a risk taker!",
              },
            ],
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Number of Covered People
async function numberOfCoveredPeople(phone, phoneNumberId) {
  const userContext = userContexts.get(phone) || {};
  // Set the context to expect number of people
  userContext.stage = "EXPECTING_NUMBER_OF_PEOPLE";
  userContexts.set(phone, userContext);
  const payload = {
    type: "text",
    text: {
      body: "How many people to be covered? (e.g., 1, 4, etc):",
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

// Payment Installment Options - added
async function selectPaymentPlan(phone, phoneNumberId) {
  const payload = {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Payment Plans",
      },
      body: {
        text: "Choose how you want to pay for your insurance:",
      },
      action: {
        button: "Select Payment Plan",
        sections: [
          {
            title: "Payment Options",
            rows: [
              {
                id: "installment_cat1",
                title: "CAT 1 Installment",
                description: "1M (25%), 2M (25%), 9M (50%)",
              },
              {
                id: "installment_cat2",
                title: "CAT 2 Installment",
                description: "3M (50%), 9M (50%)",
              },
              {
                id: "installment_cat3",
                title: "CAT 3 Installment",
                description: "6M (75%), 6M (25%)",
              },

              {
                id: "installment_cat4",
                title: "CAT 4 Installment",
                description: "1M (25%) FRW 1.000.000, 3M (35%), 8M (40%)",
              },
              {
                id: "full_payment",
                title: "Full Payment",
                description: "Pay 100% upfront",
              },
            ],
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
}

async function confirmAndPay(phone, selectedInstallmentChoice, phoneNumberId) {
  const userContext = userContexts.get(phone) || {};

  const totalCost = userContext.totalCost || 0;  
  

  let installmentBreakdown = "";

  switch (selectedInstallmentChoice) {
    case "i_cat1":
      installmentBreakdown = `${totalCost * 0.25}`;
      break;
    case "i_cat2":
      installmentBreakdown = `${totalCost * 0.5}`;
      break;
    case "i_cat3":
      installmentBreakdown = `${totalCost * 0.75}`;
      break;
    case "i_cat4":
      installmentBreakdown = `${totalCost * 0.4}`;
      break;
    case "i_catf":
      installmentBreakdown = `${totalCost}`;
      break;
    default:
      installmentBreakdown = "Unknown installment plan.";
  }

  const payload = {
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Confirm and Pay",
      },
      body: {
        text: "Your selected option includes Admin fees, VAT, and SGF. Do you agree to proceed with the payment?",
      },
      footer: {
        text: `Total: FRW ${installmentBreakdown} for this month`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "agree_to_terms",
              title: "Agree and Pay",
            },
          },
          {
            type: "reply",
            reply: {
              id: "cancel_payment",
              title: "Cancel",
            },
          },
        ],
      },
    },
  };

  await sendWhatsAppMessage(phone, payload, phoneNumberId);
  // Set the context to expect number of people
  userContext.stage = "EXPECTING_CONFIRM_PAY";
  userContexts.set(phone, userContext);
}

// Last message - get insurance
async function processPayment(phone, paymentPlan, phoneNumberId) {
    const userContext = userContexts.get(phone) || {};

    userContext.userPhone = phone;
    userContexts.set(phone, userContext); 
  
    const totalCost = userContext.totalCost || 0;
  
    let installmentBreakdown = "";
  
    switch (paymentPlan) {
      case "i_cat1":
        installmentBreakdown = `1M: FRW ${totalCost * 0.25}`;
        break;
      case "i_cat2":
        installmentBreakdown = `3M: FRW ${totalCost * 0.5}`;
        break;
      case "i_cat3":
        installmentBreakdown = `6M: FRW ${totalCost * 0.75}`;
        break;
      case "i_cat4":
        installmentBreakdown = `8M: FRW ${totalCost * 0.4}`;
        break;
      case "i_catf":
        installmentBreakdown = `Full payment: FRW ${totalCost}`;
        break;
      default:
        installmentBreakdown = "Unknown payment plan.";
    }
  
    const paymentPayload = {
    type: "text",
    text: {
      body: `Please pay with \nMoMo/Airtel to ${250788767816}\nName: Ikanisa\n_______________________\nYour purchase for ${installmentBreakdown} is being processed after your payment is received, you will receive a confirmation shortly.`,
    },
  };

  console.log("Processing payment for:", phone, paymentPlan);

  // Simulate Payment
  await sendWhatsAppMessage(phone, paymentPayload, phoneNumberId);

  const todayFirebase = new Date();
  const formattedDateFirebase = `${todayFirebase.getDate().toString().padStart(2, '0')}/${(todayFirebase.getMonth() + 1).toString().padStart(2, '0')}/${todayFirebase.getFullYear()}`;

  // Storing userContext data into the second Firebase project (firestore2)
  const insuranceOrderData = {
    userPhone: userContext.userPhone ? String(userContext.userPhone) : "",
    plateNumber: userContext.plateNumber ? String(userContext.plateNumber) : "",
    insuranceStartDate: userContext.insuranceStartDate ? String(userContext.insuranceStartDate) : "",
    selectedCoverTypes: userContext.selectedCoverTypes ? String(userContext.selectedCoverTypes) : "",
    selectedPersonalAccidentCoverage: userContext.selectedCoverage ? parseFloat(userContext.selectedCoverage) : 0.0,
    totalCost: userContext.totalCost ? parseFloat(userContext.totalCost) : 0.0,
    numberOfCoveredPeople: userContext.numberOfCoveredPeople ? parseFloat(userContext.numberOfCoveredPeople) : 0.0,
    selectedInstallment: userContext.selectedInstallment ? String(userContext.selectedInstallment) : "",
    insuranceDocumentUrl: userContext.insuranceDocumentId ? String(userContext.insuranceDocumentId) : "",
    creationDate: formattedDateFirebase, // admin.firestore.FieldValue.serverTimestamp(),  // Adding a timestamp for the record
  };

  try {
    // Saving the userContext data into Firestore (second Firebase project)
    const docRef = await firestore2.collection("whatsappInsuranceOrders").add(insuranceOrderData);
    console.log("User data successfully saved to firestore2 with ID:", docRef.id);
    console.log(insuranceOrderData); 
  } catch (error) {
    console.error("Error saving user data to firestore2:", error.message);
  }
  
  // Add logic to integrate with payment gateway API if needed.
  console.log("______________________________________");
  console.log("User context after all flows:", userContext);
}

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  testWhatsAppConnection();
});

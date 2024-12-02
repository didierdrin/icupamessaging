// import { fetchVendorGoods } from "./firestoreService.js";
const { fetchVendorGoods } = require("./firestoreService.js");

const testFirestoreFetch = async () => {
  try {
    console.log("Fetching vendor goods...");
    const { goods, lastDoc } = await fetchVendorGoods(5); // Fetch 5 items
    
    console.log("Fetched Goods:");
    console.table(goods);

    console.log("Last Document ID:", lastDoc);
  } catch (error) {
    console.error("Error during fetch test:", error);
  }
};

testFirestoreFetch();

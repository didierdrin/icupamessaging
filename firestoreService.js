const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc,
  where
} = require("firebase/firestore");
const firebaseConfig = require("./firebaseConfig.js");

// Logger utility (you can replace with your preferred logging mechanism)
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
  warn: (message) => console.warn(`[WARN] ${message}`)
};

/**
 * Fetch paginated vendor goods with advanced filtering options
 * @typedef {Object} FetchVendorGoodsOptions
 * @property {number} [limitCount=5] - Number of items to fetch
 * @property {string} [startAfterDocId=null] - Last document ID for pagination
 * @property {string} [vendorId=null] - Filter by specific vendor
 * @property {string} [categoryId=null] - Filter by specific category
 * @property {number} [minPrice=null] - Minimum price filter
 * @property {number} [maxPrice=null] - Maximum price filter
 * @property {boolean} [inStockOnly=false] - Filter for items with stock
 * 
 * @typedef {Object} VendorGoodsResult
 * @property {Array} goods - Array of vendor goods
 * @property {string|null} lastDoc - ID of the last document for next pagination
 * 
 * @param {FetchVendorGoodsOptions} [options={}] - Fetch options
 * @returns {Promise<VendorGoodsResult>} Fetched goods and pagination info
 * @throws {Error} For invalid input or Firestore errors
 */
const fetchVendorGoods = async (options = {}) => {
  // Validate and set default options
  const {
    limitCount = 5,
    startAfterDocId = null,
    vendorId = null,
    categoryId = null,
    minPrice = null,
    maxPrice = null,
    inStockOnly = false
  } = options;

  // Input validation
  if (!Number.isInteger(limitCount) || limitCount <= 0) {
    throw new Error('limitCount must be a positive integer');
  }

  if (startAfterDocId !== null && typeof startAfterDocId !== 'string') {
    throw new Error('startAfterDocId must be a string or null');
  }

  try {
    // Initialize Firebase if not already initialized
    if (!global.firebaseApp) {
      global.firebaseApp = initializeApp(firebaseConfig);
    }

    // Get Firestore instance
    const db = getFirestore();
    
    // Base query with ordering
    let q = query(
      collection(db, "vendorGoods"), 
      limit(limitCount)
    );

    // Apply optional filters
    const filters = [];
    
    if (vendorId) {
      filters.push(where("vendor", "==", vendorId));
    }
    
    if (categoryId) {
      filters.push(where("categories", "array-contains", categoryId));
    }
    
    if (minPrice !== null) {
      filters.push(where("price", ">=", minPrice));
    }
    
    if (maxPrice !== null) {
      filters.push(where("price", "<=", maxPrice));
    }
    
    if (inStockOnly) {
      filters.push(where("stock", ">", 0));
    }

    // Apply filters to query
    filters.forEach(filter => {
      q = query(q, filter);
    });

    // Handle pagination
    if (startAfterDocId) {
      try {
        const lastDocRef = doc(db, "vendorGoods", startAfterDocId);
        const lastDocSnap = await getDoc(lastDocRef);
        
        if (lastDocSnap.exists()) {
          q = query(q, startAfter(lastDocSnap));
        } else {
          logger.warn(`Pagination document ${startAfterDocId} not found`);
        }
      } catch (paginationError) {
        logger.error('Pagination setup error', paginationError);
      }
    }

    // Execute query
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logger.info("No documents found in vendorGoods matching the criteria");
      return { goods: [], lastDoc: null };
    }

    // Process results
    const goods = [];
    let lastDocId = null;

    snapshot.forEach((doc) => {
      const goodsItem = { 
        id: doc.id, 
        ...doc.data(),
        // Optional: transform timestamp to more readable format
        createdAt: new Date(
          doc.data().createdOn.seconds * 1000 + 
          doc.data().createdOn.nanoseconds / 1000000
        )
      };
      goods.push(goodsItem);
      lastDocId = doc.id;
    });

    // Log fetch details
    logger.info(`Fetched ${goods.length} vendor goods`);

    return { 
      goods, 
      lastDoc: lastDocId,
      totalFetched: goods.length
    };

  } catch (error) {
    logger.error('Error in fetchVendorGoods', error);
    throw new Error(`Vendor goods fetch failed: ${error.message}`);
  }
};

// Advanced stats method
const getVendorGoodsStats = async (vendorId) => {
  try {
    const { goods } = await fetchVendorGoods({ 
      vendorId, 
      limitCount: 1000 // Fetch a large number to get comprehensive stats
    });

    if (goods.length === 0) {
      return null;
    }

    return {
      totalProducts: goods.length,
      totalValue: goods.reduce((sum, item) => sum + item.price, 0),
      averagePrice: goods.reduce((sum, item) => sum + item.price, 0) / goods.length,
      priceRange: {
        min: Math.min(...goods.map(item => item.price)),
        max: Math.max(...goods.map(item => item.price))
      },
      categoriesDistribution: goods.reduce((acc, item) => {
        item.categories.forEach(cat => {
          acc[cat] = (acc[cat] || 0) + 1;
        });
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('Error calculating vendor goods stats', error);
    return null;
  }
};

module.exports = { 
  fetchVendorGoods,
  getVendorGoodsStats
};


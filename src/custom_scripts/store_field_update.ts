import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import StoreItemModel from "../models/store/store_item_model";

dns.setServers(["8.8.8.8"]);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Custom script to update all Store Items with a new field and value.
 * @param fieldName - The name of the field to add/update.
 * @param value - The value to set for the field.
 */
async function updateStoreItemsField(fieldName: string, value: any) {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.error("MONGO_URL not found in .env file");
    return;
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUrl, { family: 4 });
    console.log("Connected successfully.");

    console.log(`Updating all items: setting ${fieldName} = ${value}...`);

    // Use updateMany to add the field to all documents
    // { $set: { [fieldName]: value } } adds the field if it doesn't exist
    const result = await StoreItemModel.updateMany(
      {},
      { $set: { [fieldName]: value } },
    );

    console.log(`Update completed!`);
    console.log(`Matched: ${result.matchedCount} documents`);
    console.log(`Modified: ${result.modifiedCount} documents`);
  } catch (error) {
    console.error("Error during update:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Execution block
// You can change these values as needed
const fieldToUpdate = "canUserBuyThis";
const defaultValue = true;

updateStoreItemsField(fieldToUpdate, defaultValue);

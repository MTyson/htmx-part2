import { Elysia } from "elysia";
import { staticPlugin } from '@elysiajs/static';
const { MongoClient, ObjectId } = require('mongodb');
import pug from 'pug';

// Database connection details
const url = "mongodb://127.0.0.1:27017/quote?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.8.0";
const dbName = "quote";
const collectionName = "quotes";
let client = new MongoClient(url, { useUnifiedTopology: true });

// Connect to the database (called only once)
async function connectToDatabase() {
  try {
    await client.connect();
  } catch (error) {
    console.error(error);
    throw error; // Re-throw the error to indicate connection failure
  }
  return { client, collection: client.db(dbName).collection(collectionName) };
}

// Close the database connection
async function closeDatabaseConnection(client) {
  await client.close();
}

async function getAllQuotes(collection) {
  try {
    const quotes = await collection.find().toArray();
    console.log("quotes: " + JSON.stringify(quotes));

    // Render the Pug template with the fetched quotes
    const html = pug.compileFile('views/quotes.pug')({ quotes });

    return html;
  } catch (error) {
    console.error("Error fetching quotes", error);
    throw error; // Re-throw the error for proper handling
  }
}
async function deleteQuote(collection, quoteId) {
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(quoteId) });
    if (result.deletedCount === 1) {
      return "";
    } else {
      throw new Error( "Quote not found");
    }
  } catch (error) {
    console.error("Error deleting quote", error);
    throw error; // Re-throw the error for proper handling
  }
}
async function addQuote(collection, quote, author) {
  try {
    await collection.insertOne({ quote, author });

    // Build the new row for the table
    const newRow = `<tr><td>${quote}</td><td>${author}</td></tr>`;

    return newRow;
  } catch (error) {
    console.error("Error adding quote", error);
    throw error; // Re-throw the error for proper handling
  }
}

// Main application logic
const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/quotes", async () => {
    try {
      const { client, collection } = await connectToDatabase();
      const quotes = await getAllQuotes(collection);
      await closeDatabaseConnection(client);
      return quotes;
    } catch (error) {
      console.error(error);
      return "Error fetching quotes";
    }
  })
  .post("/add-quote", async (req) => {
    try {
      const { client, collection } = await connectToDatabase();
      const quote = req.body.quote;
      console.log("add quote: " + req.body.quote);
      const author = req.body.author;
      const newRow = await addQuote(collection, quote, author);
      await closeDatabaseConnection(client);
      return newRow;
    } catch (error) {
      console.error(error);
      return "Error adding quote";
    }
  })
  .delete("/quotes/:id", async (req) => {
    console.log("BEGIN delete: " + req.params.id);
    try {
      const { client, collection } = await connectToDatabase();
      const quoteId = req.params.id;
      const message = await deleteQuote(collection, quoteId);
      await closeDatabaseConnection(client);
      return message;
    } catch (error) {
      console.error(error);
      res.status(500).send("Error deleting quote");
    }
  })
  .use(staticPlugin())
  .listen(3000);

console.log(
  ` Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);


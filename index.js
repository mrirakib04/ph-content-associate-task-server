import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3030;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://mrirakib-ph-content-associate-task-web.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_ACCESS}@cluster0.bfqzn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Connections
    const database = client.db(process.env.DB_NAME);
    const usersCollection = database.collection("users");
    const newsCollection = database.collection("news");
    const districtsCollection = database.collection("districts");

    app.get("/news", async (req, res) => {
      try {
        const { category, page = 1, limit = 9 } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        let query = {};
        if (category && category !== "all") {
          query.category = { $regex: category, $options: "i" };
        }

        const totalCount = await newsCollection.countDocuments(query);
        const result = await newsCollection
          .find(query)
          .sort({ date: -1 })
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
          .toArray();

        res.send({
          data: result,
          totalCount,
        });
      } catch (error) {
        res.status(500).send({ message: "Error fetching news" });
      }
    });
    // Get category news (Pagination & Sorting)
    app.get("/category-news/:category", async (req, res) => {
      try {
        const category = req.params.category;
        const { sort, page = 1, limit = 9 } = req.query;

        let query = { category: { $regex: category, $options: "i" } };

        let sortQuery = { date: -1 };
        if (sort === "popularity") {
          sortQuery = { popularity: -1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const result = await newsCollection
          .find(query)
          .sort(sortQuery)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await newsCollection.countDocuments(query);

        res.send({ result, total });
      } catch (error) {
        res.status(500).send({ message: "Error fetching category news" });
      }
    });
    // Get single news details by ID
    app.get("/news-details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        // Increment popularity count by 1 every time details are viewed
        await newsCollection.updateOne(query, { $inc: { popularity: 1 } });

        const result = await newsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching news details" });
      }
    });
    // Get all districts for the dropdown
    app.get("/districts", async (req, res) => {
      try {
        const result = await districtsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching districts" });
      }
    });
    // Get news by district
    app.get("/district-news", async (req, res) => {
      try {
        const { district } = req.query;
        let query = {};
        if (district) {
          query.district = { $regex: district, $options: "i" };
        }
        const result = await newsCollection
          .find(query)
          .sort({ date: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching district news" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BookWorm server");
});

app.listen(port, () => {
  console.log(`BookWorm server listening on port ${port}`);
});

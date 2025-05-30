const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.plgxbak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// career_Admin
// bBH2zCHFsp0Circl

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const jobCollection = client.db("careerCode").collection("jobs");
        const applicationCollection = client
            .db("careerCode")
            .collection("applications");

        //* jwt token related api
        app.post("/jwt", async (req, res) => {
            const { email } = req.body;
            const user = { email };
            const token = jwt.sign(user, "secret", { expiresIn: "1h" });
            res.send({ token });
        });

        //* job related api
        app.get("/jobs", async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.hr_email = email;
            }
            const result = await jobCollection.find(query).toArray();
            res.send(result);
        });

        app.get("/jobs/applications", async (req, res) => {
            const email = req.query.email;
            const query = { hr_email: email };
            const jobs = await jobCollection.find(query).toArray();

            for (const job of jobs) {
                const applicationQuery = { jobId: job._id.toString() };
                const applicationsCount =
                    await applicationCollection.countDocuments(
                        applicationQuery
                    );
                job.applicationsCount = applicationsCount;
            }
            res.send(jobs);
        });

        app.get("/jobs/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobCollection.findOne(query);
            res.send(result);
        });

        // get the posted jobs by a specific user
        app.get("/applications", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await applicationCollection.find(query).toArray();
            for (const application of result) {
                const jobId = application.jobId;
                const query = { _id: new ObjectId(jobId) };
                const job = await jobCollection.findOne(query);
                application.company = job.company;
                application.title = job.title;
                application.company_logo = job.company_logo;
                application.location = job.location;
            }
            res.send(result);
        });

        app.post("/jobs", async (req, res) => {
            const job = req.body;
            console.log(job);
            const result = await jobCollection.insertOne(job);
            res.send(result);
        });

        //

        // application post data
        app.post("/applications", async (req, res) => {
            const application = req.body;
            console.log(req.body);
            const result = await applicationCollection.insertOne(application);
            res.send(result);
        });

        app.patch("/applications/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            console.log(req.body);
            const updatedDoc = {
                $set: {
                    status: req.body.status,
                },
            };
            const result = await applicationCollection.updateOne(
                query,
                updatedDoc
            );
            res.send(result);
        });

        app.get("/applications/job/:job_id", async (req, res) => {
            const jobId = req.params.job_id;
            const query = { jobId: jobId };
            const result = await applicationCollection.find(query).toArray();
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Career Code Cooking........");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(
    cors({
        origin: ["https://career-code-6092a.web.app", "http://localhost:5173"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// const verifyToken = (req, res, next) => {
//     const token = req?.cookies?.token;

//     if(!token){
//         res.status(401).send({ error: "কিরে বাঙ্গির নাতি টোকেন জেনারেট করে আয়"})
//     }

//     jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
//         if (err) {
//             return res.status(401).send({ error: "কিরে বাঙ্গির নাতি ভুল টোকেন দিচোস কেন!"})
//         }

//         req.decoded = decoded;
//         next();
//     })
// }

// !firebase admin initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const verifyFirebaseToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if( !authHeader || !authHeader.startsWith("Bearer ") ){
        return res.status(401).send({ error: "Unauthorized access" });
    }
    const token = authHeader.split(" ")[1];

    try{
        const decoded = await admin.auth().verifyIdToken(token);
        console.log("decoded Token", decoded);
        req.decoded = decoded;
        next();
    }
    catch (error) {
        return res.status(401).send({ error: "Unauthorized Access" })
    }
}

const verifyTokenEmail = (req, res, next) => {
    // we are checking that who is requesting and who is logged in is same person or not? If not then we are sending response "Unauthorized Access".
    if(req.query.email !== req.decoded.email){
        return res.status(403).send({ error: "Unauthorized access" });
    }
    // if user is authentic then process to the next()
    next();
}

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
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
                expiresIn: "1d",
            });
            // Set the token in a cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: false,
            });
            res.send({ success: true });
        });

        //* job related api
        app.get("/jobs", async (req, res) => {
            const email = req.query.email;
            console.log(email);
            // console.log("cookies from jobs api", req.cookies);

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
        app.get("/applications", verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            // console.log("req headers", req.headers);
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
        // await client.db("admin").command({ ping: 1 });
        // console.log(
        //     "Pinged your deployment. You successfully connected to MongoDB!"
        // );
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

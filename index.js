const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");

const port = process.env.PORT || 5000;


const serviceAccount = require("./serviceKeyAccount.json");
// console.log(serviceAccount)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
// app.use(bodyParser.json());

app.use(bodyParser.json({
  limit: '50mb'
}));

app.use(bodyParser.urlencoded({
  limit: '50mb',
  parameterLimit: 100000,
  extended: true 
}));

app.use(express.static('house'));
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3xzol.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function run() {
  try {

    await client.connect()
    const productsCollection = client.db(`${process.env.DB_NAME}`).collection("products");
    const servicesCollection = client.db(`${process.env.DB_NAME}`).collection("services");
    const projectCollection = client.db(`${process.env.DB_NAME}`).collection("project");
    const appointmentCollection = client.db(`${process.env.DB_NAME}`).collection("appointment");
    const orderCollection = client.db(`${process.env.DB_NAME}`).collection("order");
    const contactMsgCollection = client.db(`${process.env.DB_NAME}`).collection("ContactMsg");
    const usersCollection = client.db(`${process.env.DB_NAME}`).collection("users");


    async function verifyToken(req, res, next) {
      if (req.headers?.authorization?.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
        }
        catch {

        }
      }
      next();
    }

    // post method
    app.post('/addProduct', async (req, res) => {
      const imageFile = req.files.image
      const body = req.body;
      // const filePath = `${__dirname}/house/${imageFile.name}`
      // imageFile.mv(filePath, err => {
      //   if (err) {
      //     console.log(err);
      //   }
      //   const newImg = fs.readFileSync(filePath);
      //   const encImg = newImg.toString('base64');
      //   var image = {
      //     contentType: req.files.image.mimetype,
      //     size: req.files.image.size,
      //     img: Buffer(encImg, 'base64')
      //   }
      const picData = imageFile.data;
      const encImg = picData.toString('base64');
      const image = Buffer.from(encImg, "base64");

      const result = await productsCollection.insertOne({ body, image })
      res.send(!!result.insertedId)
      // .then(result => {
      //   fs.remove(filePath, error => {
      //     if (error) {
      //       console.log(error);
      //       res.status(500).send({ msg: "Failed to upload image" });
      //     }
      //     res.send(!!result.insertedId);
      //   });
      // })

    })

    // try {
    // imageFile.mv(filePath)
    // const newImg = fs.readFileSync(filePath);
    // const encImg = newImg.toString('base64');
    // var image = {
    //   contentType: req.files.image.mimetype,
    //   size: req.files.image.size,
    //   img: Buffer(encImg, 'base64')
    // }
    // productsCollection.insertOne({ body, image })
    //   .then(result => {
    //     fs.remove(filePath, error => {
    //       if (error) {
    //         console.log(error);
    //         res.status(500).send({ msg: "Failed to upload image" });
    //       }
    //       res.send(!!result.insertedId);
    //     });

    //   });
    // } catch (e) {
    //   res.status(500).send(e)
    // }



    app.post("/appointment", async (req, res) => {
      const result = await appointmentCollection.insertOne(req.body)
      res.send(!!result.insertedId)
    })

    app.post("/contact", async (req, res) => {
      const result = await contactMsgCollection.insertOne(req.body)
      res.send(!!result.insertedId)
    })

    app.post("/checkout", async (req, res) => {
      const result = await orderCollection.insertOne(req.body)
      res.send(!!result.insertedId)
    })

    app.post("/users", async (req, res) => {
      const result = await usersCollection.insertOne(req.body)
      res.send(!!result.insertedId)
    })


    
    // put mehotd
    
    app.put('/orderStatusUpdate', async (req, res) => {
      const updateResult = await orderCollection.updateOne({ _id: ObjectId(req.body.id) }, { $set: { status: req.body.status } })
      res.json(!!updateResult.acknowledged);
    })

    app.put('/users', async (req, res) => {
      const result = await usersCollection.updateOne({ email: req.body.email }, { $set: req.body }, { upsert: true })
      res.send(result)
    })

    app.put('/users/admin', verifyToken, async (req, res) => {
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester })
        console.log(requesterAccount.email)
        if (requesterAccount.email === ("yeasinhowladeremon2@gmail.com" && 'emonibnsalim@gmail.com')) {
          const filter = { email: req.body.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(!!result.modifiedCount)
        }
        else {
          res.status(404).json({ message: 'you do not have access admin' })
        }
      }
      else {
        res.status(404).json({ message: 'you do not have access admin' })
      }
    })



    //delete method
    app.delete('/deleteProduct/:id', async (req, res) => {
      const result = await productsCollection.deleteOne({ _id: ObjectId(req.params.id) })
      res.send(!!result.deletedCount)
    })



    // get method
    app.get('/products', async (req, res) => {
      const items = await productsCollection.find({}).toArray()
      res.json(items)
    })

    app.get('/services', async (req, res) => {
      const items = await servicesCollection.find({}).toArray()
      res.json(items)
    })

    app.get('/projects', async (req, res) => {
      const items = await projectCollection.find({}).toArray()
      res.json(items)
    })

    app.get('/orderList', async (req, res) => {

      const user = await usersCollection.findOne({ email: req.query.email })

      if (user?.role === "admin") {

        const adminAccessOrder = await orderCollection.find({}).toArray()
        res.json(adminAccessOrder)
      } else {
        const items = await orderCollection.find({ email: req.query.email }).toArray()
        res.json(items)
      }
    })

    app.get("/usersAdmin", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.query.email });
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    })



  }
  catch {
    console.log("error");
  }

}
run().catch(err => console.log(err))

app.get('/', (req, res) => {
  res.send("hello world")
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

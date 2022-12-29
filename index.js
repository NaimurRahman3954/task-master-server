const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 8000
require('dotenv').config()

const app = express()

// middleware

const corsConfig = {
   origin: '*',
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE'],
}
app.use(cors(corsConfig))
app.use(express.json())


// mongoDB-----------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wkg8w5m.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

async function run() {
   try {
     const tasksCollection = client.db('task-master').collection('tasks')
 
     app.get('/tasks', async (req, res) => {
       const cursor = tasksCollection.find({})
       const tasks = await cursor.toArray()
       res.send(tasks)
     })
 
     app.get('/tasks/:id', async (req, res) => {
       const id = req.params.id
       const query = { _id: ObjectId(id) }
       const task = await tasksCollection.findOne(query)
       res.send(task)
     })
 
     app.get('/bookings', verifyJWT, async (req, res) => {
       const email = req.query.email
       const decodedEmail = req.decoded.email
 
       if (email !== decodedEmail) {
         return res
           .status(403)
           .send({ message: 'forbidden access', decodedEmail })
       }
 
       const query = { email: email }
       const cursor = bookingsCollection.find(query)
       const bookings = await cursor.toArray()
       res.send(bookings)
     })
 
     app.post('/bookings', async (req, res) => {
       const booking = req.body
 
       const query = {
         email: booking.email,
         product: booking.product,
       }
 
       const alreadyBooked = await bookingsCollection.find(query).toArray()
 
       if (alreadyBooked.length) {
         const message = `You have already booked ${booking.product}`
         return res.send({ acknowledged: false, message })
       }
 
       const result = await bookingsCollection.insertOne(booking)
       res.send(result)
     })
 
     app.get('/bookings/:id', async (req, res) => {
       const id = req.params.id
       const query = { _id: ObjectId(id) }
       const booking = await bookingsCollection.findOne(query)
       res.send(booking)
     })
 
     app.get('/wishlists', async (req, res) => {
       const email = req.query.email
       const query = { email: email }
       const cursor = wishlistsCollection.find(query)
       const wishlists = await cursor.toArray()
       res.send(wishlists)
     })
 
     app.post('/wishlists', async (req, res) => {
       const wishlist = req.body
       const query = {
         email: wishlist.email,
         product: wishlist.product,
       }
       const alreadyAdded = await wishlistsCollection.find(query).toArray()
       if (alreadyAdded.length) {
         const message = `You have already added ${wishlist.product} to your wishlist`
         return res.send({ acknowledged: false, message })
       }
       const result = await wishlistsCollection.insertOne(wishlist)
       res.send(result)
     })
 
     app.post('/create-payment-intent', async (req, res) => {
       const booking = req.body
       const price = booking.price
       const amount = price * 100
 
       const paymentIntent = await stripe.paymentIntents.create({
         currency: 'bdt',
         amount: amount,
         payment_method_types: ['card'],
       })
       res.send({
         clientSecret: paymentIntent.client_secret,
       })
     })
 
     // payment API
     app.post('/payments', async (req, res) => {
       const payment = req.body
       const result = await paymentsCollection.insertOne(payment)
       const id = payment.bookingId
       const filter = { _id: ObjectId(id) }
       const updatedDoc = {
         $set: {
           paid: true,
           transactionId: payment.transactionId,
         },
       }
       const updatedResult = await bookingsCollection.updateOne(
         filter,
         updatedDoc
       )
       res.send(result)
     })
 
     // Token API
     app.get('/jwt', async (req, res) => {
       const email = req.query.email
       const query = { email: email }
       const user = await usersCollection.findOne(query)
       console.log(user)
       if (user) {
         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
           expiresIn: '1d',
         })
         return res.send({ accessToken: token })
       }
       res.status(403).send({ accessToken: '' })
     })
 
     app.get('/users', async (req, res) => {
       const query = {}
       const users = await usersCollection.find(query).toArray()
       res.send(users)
     })
 
     // save users in database
     app.post('/users', async (req, res) => {
       const user = req.body
       console.log(user)
       const result = await usersCollection.insertOne(user)
       res.send(result)
     })
 
     app.get('/users/admin/:email', async (req, res) => {
       const email = req.params.email
       const query = { email }
       const user = await usersCollection.findOne(query)
       res.send({ isAdmin: user?.role === 'admin' })
     })
 
     // make admin
     app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
       const decodedEmail = req.decoded.email
       const query = { email: decodedEmail }
       console.log(query)
       const user = await usersCollection.findOne(query)
 
       if (user?.role !== 'admin') {
         return res.status(403).send({ message: 'forbidden access' })
       }
 
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
       const options = { upsert: true }
       const updatedDoc = {
         $set: {
           role: 'admin',
         },
       }
       const result = await usersCollection.updateOne(
         filter,
         updatedDoc,
         options
       )
       res.send(result)
     })
 
     // verify seller
     app.put('/users/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
       const decodedEmail = req.decoded.email
       const query = { email: decodedEmail }
       console.log(query)
       const user = await usersCollection.findOne(query)
 
       if (user?.role !== 'admin') {
         return res.status(403).send({ message: 'forbidden access' })
       }
 
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
       const options = { upsert: true }
       const updatedDoc = {
         $set: {
           verified: true,
         },
       }
       const result = await usersCollection.updateOne(
         filter,
         updatedDoc,
         options
       )
       res.send(result)
     })
 
     app.get('/products', verifyJWT, verifyAdmin, async (req, res) => {
       const query = {}
       const products = await productsCollection.find(query).toArray()
       res.send(products)
     })
 
     app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
       const product = req.body
       const result = await productsCollection.insertOne(product)
       res.send(result)
     })
 
     app.put('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
 
       const options = { upsert: true }
       const updatedDoc = {
         $set: {
           advertised: true,
         },
       }
       const result = await productsCollection.updateOne(
         filter,
         updatedDoc,
         options
       )
       res.send(result)
     })
 
     app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
       const result = await productsCollection.deleteOne(filter)
       res.send(result)
     })
   } finally {
   }
 }
 run().catch((err) => console.error(err))


// ------------------

// const users = [
//   { id: 1, name: 'Masha', email: 'mashaislam@gmail.com' },
//   { id: 2, name: 'Minar', email: 'minarrahman@gmail.com' },
//   { id: 3, name: 'Pritom', email: 'pritomhasan@gmail.com' },
// ]

// app.get('/users', (req, res) => {
//   res.send(users)
// })

app.get('/', async (req, res) => {
   res.send('Task Master Node Server is running')
})

app.listen(port, () => {
  console.log(`Simple node server is running on port ${port}`)
})
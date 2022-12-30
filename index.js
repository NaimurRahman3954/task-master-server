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
 
     app.post('/tasks', async (req, res) => {
       const task = req.body
       const result = await tasksCollection.insertOne(task)
       res.send(result)
     })

     app.get('/tasks/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const task = await tasksCollection.findOne(query)
      res.send(task)
     })
 
     app.put('/tasks/:id' async (req, res) => {
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
 
       const options = { upsert: true }
       const updatedDoc = {
         $set: {
           completed: {
            // toggles the value of completed key using bitwise operation
            $bit: { and: [1, { $not: "$isActive" }] }
          }
         },
       }
       const result = await tasksCollection.updateOne(
         filter,
         updatedDoc,
         options
       )
       res.send(result)
     })
 
     app.delete('/tasks/:id', async (req, res) => {
       const id = req.params.id
       const filter = { _id: ObjectId(id) }
       const result = await tasksCollection.deleteOne(filter)
       res.send(result)
     })
   } finally {
   }
 }
 run().catch((err) => console.error(err))


// ------------------

app.get('/', async (req, res) => {
   res.send('Task Master Node Server is running')
})

app.listen(port, () => {
  console.log(`Simple node server is running on port ${port}`)
})
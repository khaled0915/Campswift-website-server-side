const express = require('express') ;
const app = express();

const jwt = require('jsonwebtoken');

const cors = require('cors');

require('dotenv').config()

const port = process.env.PORT || 5000 ;


// middleware 

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jwxnn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // camp collection

    const campCollection =  client.db('medicalCampDb').collection('camp');


    // review collection 

    const reviewsCollection = client.db('medicalCampDb').collection("feedbacks");

    // user collection 

    const userCollection = client.db('medicalCampDb').collection("users");

    // reg collection 

    const regCollection = client.db('medicalCampDb').collection('reg')




    // jwt related 

    app.post('/jwt' , async(req ,res)=>{
      const user= req.body;

      const token = jwt.sign( user , process.env.ACCESS_TOKEN_SECRET , {
        expiresIn : '2h',

      } )

      res.send({token});
    })


    // middleware 

    const verifyToken  = (req, res ,next) =>{

      console.log('inside VT' , req.headers.authorization);

      if(!req.headers.authorization){
        return res.status( 401 ).send({message : 'unauthorized access'})
      }

      const token  = req.headers.authorization.split(' ')[1];

      jwt.verify(token , process.env.ACCESS_TOKEN_SECRET , (err , decoded )=>{

        if(err){
          return res.status(401).send({message : 'unauthorized access' });


        }

        req.decoded = decoded ;
        next();

      })



    }


    // verify organizer

    const verifyOrganizer = async(req,res , next)=>{
      const email  = req.decoded.email ;

      const query = { email : email  };

      const user = await userCollection.findOne(query);

      const isOrganizer = user?.role === 'organizer';

      if(!isOrganizer){

        return res.status(403).send({ message : 'forbidden access' })

      }

      next();
    }










    // get the popular camp 

    app.get('/camp' , async(req , res)=>{
        const result = await campCollection.find().toArray();

        res.send(result);
    })

    app.post('/camp' , verifyToken , verifyOrganizer,  async(req,  res)=>{

      const item = req.body ;

      const result = await campCollection.insertOne(item);

      res.send(result);

    })

    app.get('/camp/camp-details/:id' , async(req, res)=>{
        const result = await campCollection.findOne();
        res.send(result);
    })


    // get all the feedbacks

    app.get('/feedbacks' , async(req,res)=>{
        const result = await reviewsCollection.find().toArray();
        res.send(result);
    })


    // user related api 


    app.get('/users' , verifyToken , verifyOrganizer ,  async(req,res)=>{
      console.log(req.headers);
      const result = await userCollection.find().toArray();

      res.send(result);
    })

    app.post('/users' , async(req,res)=>{
      const user = req.body;

      const query = { email : user.email  }

      const existingUser = await userCollection.findOne(query);

      if(existingUser){
        return res.send({ message : 'user already exists' , insertedId : null })
      }


      const result = await userCollection.insertOne(user);

      res.send(result);
    })


    app.delete( '/users/:id'  , verifyToken , verifyOrganizer , async(req ,res) =>{
      const id = req.params.id ;

      const query = { _id  : new ObjectId(id)} ;

      const result = await userCollection.deleteOne(query);

      res.send(result);
    } )


    app.patch( '/users/organizer/:id' , verifyToken , verifyOrganizer , async(req, res)=>{

      const id = req.params.id ;
      const filter = { _id : new ObjectId(id) };

      const updatedDoc = {
        $set : {
          role : 'organizer'
        }

      }


      const result = await userCollection.updateOne(filter , updatedDoc);

      res.send(result)
    } )


    // organizer check 

    app.get('/users/organizer/:email' , verifyToken ,async(req , res)=>{

      const email = req.params.email ;

      if(email !== req.decoded.email ){
        return res.status(403).send({message : 'forbidden access'});


      }

      const query = { email : email } ;

      const user = await userCollection.findOne(query);

      let organizer = false ;

      if(user){
        organizer = user?.role === 'organizer'
      }


      res.send({organizer});


    })


    // delete camp as organizer

    app.delete( '/camp/:id' , verifyToken , verifyOrganizer,  async(req,res ) =>{
      const id = req.params.id ;

      const query = { _id : new ObjectId(id) };

      const result = await campCollection.deleteOne(query);

      res.send(result)
    }  )





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/' , (req,res)=>{
    res.send('server is is runnig')
})

app.listen(port , ()=>{
    console.log(`server is runnig in port : ${port}`);
})
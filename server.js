const Clarifai =  require('clarifai');

const appClarifai = new Clarifai.App({
  apiKey: '46a5259fa69e45449c1dadfc5b1cc9db'
});

const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const { response } = require('express');

const app = express();

app.use(express.json());
app.use(cors());

const db  = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : '123',
    database : 'smartbrain'
  }
});


app.get('/', (req, res)=> {
  res.send('it is working');
})

app.post('/signin', (req, res)=>{
  const {email, password} = req.body;
  if(!email || !password){
    return res.status(400).json('incorrect from submission');
  }
  db.select('email', 'hash') .from('login')
    .where('email', '=', req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if(isValid){
        return db.select('*').from('users')
              .where('email', '=', req.body.email)
              .then(user => {
                res.json(user[0])
              })
              .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) =>{
  const {email, name, password} = req.body;
  if(!email || !name || !password){
    return res.status(400).json('incorrect from submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {                // transaction is a keyword, learn more at trex.js
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')  
          .insert({
            email: loginEmail[0].email, //trex breaking update https://knexjs.org/#Builder-returning
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })

  .catch(err => res.status(400).json('unable to register'))

})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({
    id: id
  })
    .then(user => {
      if(user.length)
        res.json(user[0])
      else {
        res.status(400).json('Not Found')
      }
    })
    .catch(err => res.status(400).json('Not Found'))
})

app.put('/img', (req, res) => {
  const { id } = req.body;
  db('users')
  .where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0].entries);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

app.post('/imageUrl', (req, res) => {
    appClarifai.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => {
      res.json(data);
    })
    .catch(err => res.status(400).json('unable to work with API'))
})

app.listen(process.env.PORT || 3000, (req, res) => {
  console.log(`app is running on port ${process.env.PORT}`);
})
var express    = require('express')
var bodyParser = require('body-parser')
var Database   = require('../db/database')
var session    = require('client-sessions')

var app = express()
app.use(express.static("../../client-side/src"))
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(session({
    cookieName: 'session', // sha256 of 'bookswap'
    secret: '7303cf3fdd688c1901d7a5dd3eb7f9bddbb8a16cdf14346e57d3d1eb1ad24cac', 
    duration: 30*60*1000, 
    activeDuration: 5*60*1000, 
  })
)

var sql = new Database()

app.use(function(req,res,next){ 
    res.setHeader('Access-Control-Allow-Origin', 
                  'http://localhost:8080')
    res.setHeader('Access-Control-Allow-Methods', 
                  'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 
                  'X-Requested-With,content-type')
    res.setHeader('Access-Control-Allow-Credentials', 
                   true)
    res.setHeader('X-Content-Type-Options', 
                  'nosniff')
    next(); 
})

app.post('/getID', function(req,res){
  var id = req.session.userid;
  if(id == undefined) res.send(id);
  else res.send(id.toString());
})//end getID

app.post('/getStatus', function(req,res){
  var sessionID = req.session.userid;
  var urlID = req.body.id;
  console.log('sessionID',sessionID,'+ urlID',urlID);

  if(sessionID == undefined || sessionID == 0)
    { status = "guest"; } //no valid session id
  else if(sessionID != urlID)
    { status = "registered"; } //valid session id, not matching profile
  else
    { status = "admin"; } //valid session id matches profile's id

  res.send(status);
})//end getStatus


app.get('/search',function(req,res){
  sql.once('search',function(html){
    res.send(html)
  })

  sql.getBooks(req)
})

app.post('/signuppage', function(req, res){
  var url
  var ID = req.session.userid
  if (ID == undefined)
    url = '/signup.html'
  else if (ID == 0)
    url = '/signup.html'
  else
    url = '/profile.html?id=' + ID

  res.send(url)
})

app.post('/loginpage', function(req, res){
  var url
  var ID = req.session.userid
  if (ID == undefined)
    url = '/login.html'
  else if (ID == 0)
    url = '/login.html'
  else
    url = '/profile.html?id=' + ID

  res.send(url)
})

app.post('/login',function(req,res){
  sql.once('loggedin',function(msg){
    if (msg < 0){
      req.session.msg = "Invalid login"
      return res.send('/login.html')
    }
    else{
      console.log('here: ' + req.body.email)
      req.session.userid = msg
      return res.redirect('/getUser')
    }
  })
  sql.login(req.body.email, req.body.pword)
})

app.post('/logout',function(req,res){
  req.session.reset()
  req.session.msg = 'Logged out'
  return res.send('/')
})


app.post('/signup',function(req,res){
  sql.once('duplicate', function(msg){
    if(msg == 0){
      res.send('/login.html')
    }
    else{
      req.session.userid = msg;
      url = '/profile.html?id=' + msg
      res.send(url)
    }
  })
  sql.signup(req.body.uname, req.body.email, req.body.pword)
})

app.get('/getUser',function(req,res){
  if(!req.session.userid){
    req.session.msg='No userid, no access'
    return res.redirect('/')
  }

  var url = '/profile.html?id=' + req.session.userid
  console.log(url)
  return res.send(url)
})

app.get('/personal',function(req,res){
  var Id = req.session.userid
  sql.once('user_profile',function(user){
    res.json(user)
  })
  sql.getUser(Id)
})

// populate the user page
app.post('/User',function(req,res){
  var ID = req.body.id
  sql.once('user_profile',function(user){
    res.json(user)
  })
  sql.getUser(ID)
})

app.post('/profile', function(req, res){
  console.log('request to profile')
  var ID = req.session.userid
  if (ID == undefined)
    ID = 0
  var url = '/profile.html?id=' + ID
  res.send(url)
})

app.post('/booksWant',function(req,res){
  var ID = req.body.id
  sql.once('books_want',function(html){
    res.send(html)
  })
  sql.booksWant(ID)
})

app.post('/booksHave',function(req,res){
  var ID = req.body.id
  sql.once('books_have',function(html){
    res.send(html)
  })
  sql.booksHave(ID)
})

app.post('/addBook', function(req, res){
  console.log('addbook called:',req.body.title);

  var ID = req.body.id
  var URL = '/profile.html?id=' + ID

  if (req.session.userid != ID){
    res.send(URL)
    return
  }

  var sts
  if (req.body.trx == 'have')
    sts = 1
  else if (req.body.trx == 'want')
    sts = 0
  else{
    res.send(URL)
    return
  }

  sql.once('add_book', function(){
    console.log('got add_book emit');
    res.send(URL)
  })
  sql.addBook(ID, req.body.title, req.body.author, req.body.isbn, sts)
})

app.post('/rmBook', function(req, res){
  var ID = req.body.id
  var URL = '/profile.html?id=' + ID

  if (req.session.userid != ID){
    res.send(URL)
    return
  }

  var sts
  if (req.body.trx == 'have')
    sts = 1
  else if (req.body.trx == 'want')
    sts = 0
  else{
    res.send(URL)
    return
  }

  sql.once('rm_book', function(){
    res.send(URL)
  })
  sql.rmBooks(ID, sts, req.body.books)
})

app.post('/wantSearch',function(req,res){
    var ID = req.body.id;
    console.log(ID);
    sql.once('auto_want',function(html){
        console.log(html);
        res.send(html);
    })
    console.log("want search");
    sql.wantSearch(ID);
});

app.post('/haveSearch',function(req,res){
    var ID = req.body.id;
    sql.once('auto_have',function(html){
        console.log(html);
        res.send(html);
    })
    sql.haveSearch(ID);
})

app.listen(8080,function(){
  console.log('listening on port 8080')
})

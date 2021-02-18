//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose=require("mongoose");
const app = express();
const _ = require("lodash");
const session = require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');



app.set('view engine', 'ejs');



app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false,
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb+srv://Sahil:'+process.env.PASSWORD+'@secretdiary.nnpk3.mongodb.net/todolistDB?retryWrites=true&w=majority',{ useNewUrlParser: true, useUnifiedTopology: true  });
mongoose.set("useCreateIndex",true);
mongoose.set("useFindAndModify",false);

const itemsSchema= new mongoose.Schema({
  name:{
    type:String
  }
});

const Item= mongoose.model("Item",itemsSchema);





const listSchema=new mongoose.Schema({
  name:{
    type:String
  },
  id:{type:String},
  items:[itemsSchema]

});

const List=mongoose.model("List",listSchema);






const userSchema=new mongoose.Schema({
  username: {type:String,unique:true},
  password:{type:String},
  listarray:[listSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});






const item1=new Item({
  name:"Welcome!"
});

const item2=new Item({
  name:"Hit the + button to add."
});

const item3=new Item({
  name:"<-- Hit this to delete."
});

const defaultItems=[item1,item2,item3];




var defaultlist=new List({
  name: "Favicon.io",
  items: [defaultItems]
});




app.get("/",function(req,res){
  //res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  //console.log(req.isAuthenticated());
  if(req.isAuthenticated()){
    //console.log("1");
    res.redirect("/"+req.user.username+"/today");
  }else{
    //console.log("2");
    res.redirect("/start");
  }
});

app.get("/start",function(req,res){
  //res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.isAuthenticated()){
    //console.log("1");
    res.redirect("/"+req.user.username+"/today");
  }else{
    //console.log("2");
    res.render("start",{userpresent:false,nouser:false});
  }
  
})

app.get("/login",function(req,res){
  if(req.isAuthenticated()){
    //console.log("1");
    res.redirect("/"+req.user.username+"/today");
  }else{
    //console.log("2");
    res.render("start",{userpresent:false,nouser:true});
  }
})


app.get("/:customUserName/:customListName", function(req,res){
  //res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.isAuthenticated()){
  const customListName=_.capitalize(req.params.customListName);
  const customUserName=req.params.customUserName; 
  //console.log(customListName+"1");
  //console.log(customUserName+"2");
  User.findOne({username:customUserName},function(err, founduser){
    if(err){
      console.log(err);
    }else{
      List.findOne({name:customListName,id:customUserName},function(err,foundlist){
        if(!err){
          if(!foundlist){
            const list=new List({
              name:customListName,
              id:customUserName,
              items:defaultItems
            });
            list.save();
            //console.log("User:"+ founduser);
            founduser.listarray.push(list);
            founduser.save();
            res.redirect("/"+customUserName+"/"+customListName); 
          }else{
            res.render("list", {listTitle:foundlist.name , newListItems: foundlist.items, madedLists:founduser.listarray, username:founduser.username , userid:founduser._id});

          }
        }
      })
    }

  })
}else{
  res.redirect("/start");
}
  
});



app.post("/", function(req, res){
  const itemName= req.body.newItem;
  const listName=req.body.list;
  const userid=req.body.username;

  const item=new Item({
    name: itemName
  });

  List.findOne({name:listName,id:userid},function(err,foundlist){
    foundlist.items.push(item);
    foundlist.save();
    res.redirect("/"+userid+"/"+listName); 
  });
  
});





app.post("/register",function(req,res){

  User.register({username:req.body.username,listarray:defaultlist}, req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.render("start", {userpresent:true,nouser:false}); 
    }else{
      //console.log(user);
      passport.authenticate("local")(req,res,function(){
        res.redirect("/"+user.username+"/today");
      });
    }
  });    
})




app.post("/login",function(req,res){
  const user= new User({
    username: req.body.username,
    password: req.body.password 
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err); 
    }else{
      passport.authenticate("local",{failureRedirect:"/login"})(req,res,function(){
        res.redirect("/"+req.user.username+"/today");
      });
    }
  });
})




app.post("/delete",function(req,res){
  const checkedID=req.body.checkbox;
  const listName=req.body.listName;
  const userid=req.body.username;
  const user_id=req.body.userid;
  
  List.findOneAndUpdate({name:listName,id:userid},{$pull:{items:{_id:checkedID}}},function(err,foundlist){
    if(!err){
      res.redirect("/"+userid+"/"+listName);

    }
  })
  
})




app.post("/newpage", function(req, res){
  const listName= req.body.newList;
  const userid=req.body.username;
  const user_id=req.body.userid;
  
  res.redirect("/"+userid+"/"+listName);
  

});





app.post("/deletepage",function(req,res){
  const listid=req.body.deleteListid;
  const userid=req.body.username;
  const user_id=req.body.userid;
  const listTitle=req.body.listpage;
  
  User.findOneAndUpdate({username:userid},{$pull:{listarray:{_id:listid}}},function(err,founduser){
    if (!err) {

      res.redirect("/"+userid+"/"+listTitle);

    }
  })
  
})




app.post("/logout",function(req,res){
  req.logout();
  res.redirect('/');
})

let port=process.env.PORT;

if(port==null || port==""){
  port=3000;
}


app.listen(port, function() {
  console.log("Server started successfully");
});




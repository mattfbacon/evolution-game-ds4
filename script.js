var state = null;
window.onpopstate = () => {
  switch(history.state) {
    case null:
      if (state=="hosting") {
        document.getElementById("hostbtn").blur();
        var main = document.getElementById("main");
        main.classList.add("int-a");
        main.style.transitionDuration="0s";
        main.classList.remove("closed");
        document.getElementById("host").classList.add("closed");
        setTimeout(()=>{main.classList.remove("int-a");main.style.transitionDuration="";document.getElementById("host").classList.remove("closed");},310);
      } else {
        document.getElementById("main").className = "";
        document.getElementById("host").className = "";
        document.getElementById("join").className = "";
      }
      state=null;
      break;
    case "hosting":
      document.getElementById("main").classList.add("closed");
      state="hosting";
  }
};

var wassubmitted = false;
const repl = {
  "<":"&lt;",
  ">":"&gt;",
  "&":"&amp;"
};
const questions = [
  {
    qtype:0, //0 = env -> survival, 1 = individual -> best/worst env
    q:["The environment's temperature changes from mild to cold.","Which Furfoof is most likely to survive?"],
    ansset:0, // within the /assets folder there are folders with numeric names starting with 0 that have four images each. This number specifies which folder to fetch the images from.
    caps:["Medium Fur","Low Fur","Low Fur","Much Fur"], //captions from left to right
    expl:"Having more fur keeps the Furfoofs warm, which makes them less likely to die from hypothermia and therefore more likely to survive." //explanation
  },
  {
    qtype:0,
    q:["The population has a predator and the environment changes from green to teal.","Which Furfoof is most likely to survive?"],
    ansset:0,
    caps:["Green","Green","Teal","Purple"],
    expl:"A teal Furfoof in a teal environment is most likely to survive because it can't be seen as easily by the predator."
  },
  {
    qtype:0,
    q:["The population's prey becomes larger.","Which Furfoof is least likely to survive?"],
    ansset:1,
    caps:["Small Mouth","Medium Mouth","Medium Mouth","Large Mouth"],
    expl:"A Furfoof with a small mouth will have more trouble eating the prey, which would cause it to possibly starve and be less likely to survive."
  },
  {
    qtype:0,
    q:["The environment's temperature changes from mild to hot.","Which Furfoof is most likely to survive?"],
    ansset:1,
    caps:["Medium Fur","Medium Fur","Medium Fur","Low Fur"],
    expl:"Having less fur prevents the Furfoofs from dying from hyperthermia (overheating), and therefore more likely to survive."
  },
  {
    qtype:1, //for this type of question the q array is in the format [question, number for image set, number for accompanying image within set]
    q:["Which environment best suits this Furfoof, assuming that there is a predator?",2,3],
    ansset:4,
    caps:["Green Deciduous Forest","Golden Plains","Gray Stone Mountains","Blue Wildflower Patch"],
    expl:"A gray Furfoof is camouflaged in a gray environment."
  },
  {
    qtype:0,
    q:["The environment changes from cold to very hot.","Which Furfoof is most likely to survive?"],
    ansset:2,
    caps:["Much Fur","Medium Fur","Low Fur","Very Low Fur"],
    expl:"The Furfoof with the least fur is most likely to survive since it is the least likely to overheat."
  },
  {
    qtype:0,
    q:["The environment's temperature is cold.","Which Furfoof would most likely be found in that environment?"],
    ansset:2,
    caps:["Much Fur","Medium Fur","Low Fur","Very Low Fur"],
    expl:"A Furfoof with much fur is most suited to a cold environment, so it is most likely to be found in that environment."
  }
];
const replrepl = (n) => n.split("").map(item=>{if (Object.keys(repl).includes(item)) return repl[item]; else return item;}).join(""); //the actual function to do replacing with the "repl" dictionary

var code = null;
var codewasinvalid = false;
var socket = io();
var plist = []; //list of player names (only used if client becomes host)
socket.on('connect',()=>{
  document.getElementById("hostbtn").addEventListener("click",()=>{
    state="hosting";
    console.log("getting host code");
    socket.emit("host",(msg)=>{ // the code in here runs when the socket is confirmed as a host by the server
      console.log("received host code "+msg);
      code=parseInt(msg);
      document.getElementById("hostcode").innerHTML=msg;
      document.getElementById("main").classList.add("closed");
      history.pushState("hosting","Host a Game");
      socket.on("cname",(msg,res)=>{
        console.log(`checking name "${msg}", and it's ${plist.includes(msg)?"not ":""} valid.`);
        res(plist.includes(msg)); 
      }) //check if client's name is already present.
      socket.on("cjoin",(msg)=>{ //add name to roster. Should have been verified to be unique by the host.
        console.log(`client with name "${msg}" joined`);
        plist.push(msg);
        document.getElementById("playerlist").innerHTML="<p>"+plist.map(n=>replrepl(n)).join("</p><p>")+"</p>";
        document.getElementById("playercountisplural").innerText=(plist.length==1)?"":"s";
        document.getElementById("playercount").innerText=plist.length;
        setTimeout(()=>document.querySelectorAll("#playerlist p").forEach(e=>e.style.opacity=1),10);
        if(document.getElementById("playerlist").childElementCount>0) document.getElementById("startgame").removeAttribute("disabled");
      });
      socket.on("cleave",(msg)=>{
        console.log(`client with name "${msg}" left`);
        if (plist.includes(msg)) {plist.splice(plist.indexOf(msg),1);}
        Array.from(document.getElementById("playerlist").children).filter(e=>e.innerText==replrepl(msg)).forEach(e=>{
          e.style.opacity=0;
          setTimeout(()=>e.remove(),200);
        }); // instead of replacing the whole player list, just remove the element
        document.getElementById("playercountisplural").innerText=(plist.length==1)?"":"s";
        document.getElementById("playercount").innerText=plist.length;
        if(document.getElementById("playerlist").childElementCount) document.getElementById("startgame").setAttribute("disabled","");
      });
      document.getElementById("startgame").addEventListener("click",()=>{
        socket.emit("gstart"); //start game
        document.getElementById("startgame").setAttribute("disabled","");
        document.getElementById("hostcontentcont").classList.add("closed");
        setTimeout(()=>document.getElementById("hostcontentcont").classList.add("closed-final"),300);
        socket.on("qdata",([qnum,corrans])=>{
          [document.getElementById("currentq").innerText,document.getElementById("currentq2").innerText]=questions[qnum].q; //double assignment
          document.getElementById("corrans").innerText=questions[qnum].caps[corrans];
        });
      });
    });
  });
  document.getElementById("backtohome").addEventListener("click",()=>{
    code=null;
    if(document.getElementById("main").classList.contains("closed")){
      var main = document.getElementById("main");
      main.classList.add("int-a");
      main.style.transitionDuration="0s";
      main.classList.remove("closed");
      document.getElementById("host").classList.add("closed");
      socket.off("cleave");socket.off("cjoin");socket.off("cname");
      setTimeout(()=>{main.classList.remove("int-a");main.style.transitionDuration="";document.getElementById("host").classList.remove("closed");},310);
      document.getElementById("playerlist").innerHTML="";
      document.getElementById("startgame").setAttribute("disabled","");
      document.getElementById("playercount").innerText="0";
      document.getElementBtId("startgame").removeEventListener("click");
      plist=[];
    } else {
      console.log("Can't close unopened view @ \'Host a Game\'");
    }
    state=null;
    history.pushState(null,"");
  });
  document.getElementById("gamecode").addEventListener("input",()=>{
    const btn = document.getElementById("joingame");
    if(document.getElementById("gamecode").value.toString().length==6){
      if (btn.hasAttribute("disabled")) btn.removeAttribute("disabled");
    } else {
      if (!btn.hasAttribute("disabled")) btn.setAttribute("disabled","");
    }
    if(codewasinvalid) {codewasinvalid=false;document.getElementById("invalidcode").classList.remove("shown");}
  });
  const gamejoiner = () => {
    console.log("joining game");
    const ourcode = parseInt(document.getElementById("gamecode").value);
    console.log("our code is " + ourcode);
    socket.emit('rmval', ourcode, (validcode) => {
      console.log("it is " + (validcode ? "" : "not ") + "valid");
      if (validcode) {
        window.location = "/play?id=" + ourcode;
      }
      else {
        codewasinvalid = true;
        document.getElementById("invalidcode").classList.add("shown");
      }
    });
  };
  document.getElementById("gamecode").addEventListener("keydown",(e)=>{
    if (!wassubmitted && e.key=="Enter" && !document.getElementById("joingame").getAttributeNames().includes("disabled")) {gamejoiner();wassubmitted=true;setTimeout(()=>{wassubmitted=false;},600);}
  });
  document.getElementById("joingame").addEventListener("click",gamejoiner);
});
document.getElementById("joinbtn").addEventListener('click',()=>{document.getElementById("joincontainer").classList.add("open");document.getElementById("joinbtn").blur();});
document.getElementById("closejoin").addEventListener('click',()=>{
  document.getElementById("joincontainer").classList.add("int-b")
  document.getElementById("joincontainer").classList.remove("open");
  setTimeout(()=>{
    document.getElementById("joincontainer").classList.remove("int-b");
    document.getElementById("gamecode").value="";
    document.getElementById("invalidcode").classList.remove("shown");
    codewasinvalid=false;
    document.getElementById("joingame").setAttribute("disabled","");
  },300);
});
document.getElementById("joincontainer").addEventListener('click',(e)=>{
  if(e.path[0].classList.contains("open")) {
    document.getElementById("joincontainer").classList.add("int-b")
    document.getElementById("joincontainer").classList.remove("open");
    setTimeout(()=>{
      document.getElementById("joincontainer").classList.remove("int-b");
      document.getElementById("gamecode").value="";
      document.getElementById("invalidcode").classList.remove("shown");
      codewasinvalid=false;
      document.getElementById("joingame").setAttribute("disabled","");
    },300);
  }
});
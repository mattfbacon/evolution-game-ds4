/*var config = {
  type: Phaser.AUTO,
  width: 960,
  height: 720,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
var game = new Phaser.Game(config);

function preload() {
  this.load.image('background', 'assets/background.png');
  this.load.image('whitemoth', 'assets/whitemoth.png');
  this.load.image('blackmoth', 'assets/blackmoth.png');
}
function create() {
  this.add.image(960/2,720/2,"background");
}
function update() {
}*/

setTimeout(()=>document.getElementById("nickname").select(),100);
var name = null;
var namewasinvalid = false;
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

var ee = setInterval(()=>{
  if(document.getElementById("ellipsiseffect").innerText.length==3) document.getElementById("ellipsiseffect").innerText="."; else document.getElementById("ellipsiseffect").innerText+=".";
},400);

const randint = (min, max) => {
  return Math.floor(Math.random() * (max - min) ) + min;
}

var xhr = new XMLHttpRequest();
xhr.onreadystatechange = () => {
  if(xhr.readyState == 4 && xhr.status == 200) {
    document.getElementById("nickname").value = (((a)=>{return a[randint(0,a.length-1)];})(JSON.parse(xhr.responseText)));
  }
};
xhr.open("GET","pseudonyms.json",true);
xhr.send();

const gameid = parseInt(new URLSearchParams(window.location.search).get('id'));
var tmp = io();
tmp.emit('rmval',gameid,(valid)=>{
  if(!valid) {
    document.getElementById("connecting").style.zIndex=20;
  }
});
var wassubmitted=false;
delete tmp;
var socket = io('/play'+gameid);
socket.on('connect',() => {
  console.log("connected to namespace");
  const submitname = (e) => {
    console.log("submitted name");
    name = document.getElementById("nickname").value.toString();
    console.log("attempting join");
    socket.emit("join", name, gameid, (validname) => {
      if (validname==0) { // if name is valid
        document.getElementById("namecontainer").classList.add("int-b");
        document.getElementById("namecontainer").classList.remove("open");
        setTimeout(() => document.getElementById("namecontainer").classList.remove("int-b"), 310);
      }
      else { // if name is somehow invalid or there is another problem joining
        if(validname==1) { //name taken
          document.getElementById("invalidname").innerText="Name already taken."; // in case the text was changed
          document.getElementById("invalidname").classList.add("shown");
          e.path[0].setAttribute("disabled", "");
          namewasinvalid = true;
        }
        if(validname==2) { //game already started
          document.getElementById("invalidname").innerText="Game with that ID already started.";
          document.getElementById("invalidname").classList.add("shown");
          e.path[0].setAttribute("disabled","");
          namewasinvalid = true;
        }
      }
    });
  };
  document.getElementById("nickname").addEventListener("keydown",(e)=>{
    if (e.key=="Enter" && !wassubmitted && !document.getElementById("submitname").getAttributeNames().includes("disabled")) {
      submitname({path:[document.getElementById("submitname")]});
      wassubmitted=true;
      setTimeout(()=>wassubmitted=false,600);
    }
  });
  document.getElementById("submitname").addEventListener("click",submitname);
});
socket.on('jsucc',()=>{
  console.log('connected successfully');
  document.getElementById("namecontainer").classList.add("open");
  //socket.emit('join',)
});
socket.on('nserr',()=>{
  console.error("server doesn't recognize game id");
  document.getElementById("connecting").style.zIndex=20;
});

let question = document.getElementById("question");
let question2 = document.getElementById("question2");
let questionimg = document.getElementById("questionimg");
let answers = [document.getElementById("answer1"),document.getElementById("answer2"),document.getElementById("answer3"),document.getElementById("answer4")];
let ingame = false;
let currentq = -1;
for(var i = 0; i<=3; i++) {
  answers[i].addEventListener("click",(e)=>{
    let j = 0;
    while(!((/answer/).test(e.path[j].id))) {
      j++;
    }
    e.path[j].classList.add('chosen');
    if(!e.path[j].classList.contains("disabled")) {socket.emit("answer",currentq,parseInt(e.path[j].id.substr(-1)));answers.forEach((e)=>e.classList.add('disabled'));}
  });
}
socket.on('nextq',(qnum)=>{
  answers.forEach((e)=>e.classList.remove("disabled","chosen"));
  if (!ingame) {
    ingame=true;
    document.getElementById("main").classList.add("closed");
  }
  console.log("question delivered");
  currentq = qnum;
  const q = questions[qnum];
  if (q.qtype == 0) {
    document.getElementById('game').classList.add("type0");
    document.getElementById('game').classList.remove("type1");
    [question.innerText,question2.innerText]=q.q;
    questionimg.removeAttribute("src");
  } else {
    document.getElementById('game').classList.add("type1");
    document.getElementById('game').classList.remove("type0");
    question.innerText=q.q[0];
    question2.innerText="";
    questionimg.setAttribute("src",`/assets/${q.q[1]}/${q.q[2]}.png`);
  }
  for(var i = 0; i <= 3; i++) {
    let ans = answers[i];
    ans.children[0].setAttribute("src",`/assets/${q.ansset}/${i}.png`);
    ans.children[1].innerText=q.caps[i];
  }
  var container = document.getElementById("answers");
  for (var i = container.children.length; i >= 0; i--) {
    container.appendChild(container.children[Math.random() * i | 0]);
  }
});

document.getElementById("nickname").addEventListener("input",(e)=>{
  if(e.path[0].value.toString().length>0) document.getElementById("submitname").removeAttribute("disabled"); else document.getElementById("submitname").setAttribute("disabled","");
  if(namewasinvalid) {
    document.getElementById("nameinvalid").classList.remove("shown");
    document.getElementById("submitname").removeAttribute("disabled");
    namewasinvalid=false;
  }
});
window.onbeforeunload = () => {
  socket.emit('pleave',name); //player is leaving
};
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var json2string = require('json-stringify-safe');
const colors = require('colors');

app.get('/', (req, res) => {
  res.sendFile(__dirname+"/index.html");
});

app.get('/assets/*', (req,res) => {
  res.sendFile(__dirname+req.originalUrl);
});

app.get(['/styles.css','/script.js','/favicon.png','/play.js','/pseudonyms.json'], (req,res) => {
  res.sendFile(__dirname+req.originalUrl);
});

app.get('/play', (req,res) => {
  res.sendFile(__dirname+"/play.html");
});

const hms = () => (new Date()).toTimeString().split(' ')[0];

const rlog = (msg) => { //responsible log: includes timestamp with message.
  console.log(`(${hms()}): `.blue.bold+msg);
};

const zeropad = (n,l) => {
  return "0".repeat(l - n.toString().length) + n.toString();
};

const questions = [3,2,0,3,2,3,0]; //just the 0-indexed correct answer from left to right for each question.

function shuffle(arr) {
  var array = arr;
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    [array[m],array[i]] = [array[i],array[m]];
  }

  return array;
}

var currentcode = 1;
class Game {
  constructor(skt) {
    //for now, nothing except the game's entry code. In the future it will store unique game data.
    this.code = zeropad(currentcode,6);
    this.codenum = currentcode;
    this.host = skt;
    this.hostid=skt.id;
    this.qindices = shuffle(((a)=>{let d=[];for(let i=0;i<a;i++){d.push(i);}return d;})(questions.length));
    this.nextqindex = 0;
    currentcode++;
    this.inprogress = false;
    this.gamestats={};
    this.players={}; //object with format -> {<id>:{name:<given name>,etc+},+}
    this.io = io.of("/play"+this.codenum);
    this.io.on('connection', (socket)=>{
      io.clients((err,clients)=>{
        if (err) throw err;
        rlog("client list: "+clients.toString()+", host id: "+this.hostid);
        if (!clients.includes(this.hostid)) {
          socket.emit('nserr'); //no such <object/socket/namespace/etc> error
          rlog("host id not in client list");
          glist[this.codenum] = null;
        } else {
          socket.emit('jsucc'); //join successful
          rlog("host id in client list");
        }
      }); //checks if host is still present
      rlog(`a player joined lobby for game id #${this.codenum}, making ${Object.keys(this.io.connected).length} players waiting.`);
      socket.on('disconnection',()=>rlog(`player left lobby for game id #${this.codenum}, leaving ${Object.keys(this.io.connected).length} players waiting.`));
      socket.on('join',(name,joincode,res) => {
        rlog("trying to join");
        if (parseInt(joincode) !== this.codenum) {
          rlog(`Client is very confused. (name: \"${name}\")`);
        } else {
          rlog("checking name with host id #"+this.codenum);
          this.host.emit("cname",name,(invalid)=>{
            if (invalid) {res(1);rlog("name was invalid");} else { if (this.inprogress==true) {res(2);rlog("client tried to join started game.");} else {
              this.players[socket.id] = {name:name,socket:socket};
              io.to(this.hostid).emit("cjoin",name); //tell host client joined
              res(0);
              rlog(`name was valid: ${name}. They are joining game #`+this.codenum);
            }}
          });
        }
      });
      socket.on('pleave',(name)=>{
        setTimeout(()=>{if (name !== null) rlog(`not just any user, player with name ${name} disconnected.`)},200);
        delete this.players[socket.id];
        this.host.emit("cleave",name);
      });
    });
    this.start = () => {
      this.inprogress=true;
      this.emitq();
    };
    this.emitq = () => {
      let currentq = this.qindices[this.nextqindex];

      this.host.emit("qdata",[currentq,questions[currentq]]); // tell the host the question # and what the correct answer is
      Object.entries(this.players).forEach(([id,player])=>{
        player.socket.emit("nextq",currentq,(ansi)=>{
          player.qans = ansi;
          player.qcorrect = (ansi == questions[currentq]);
          this.host.emit("answered",player.name,ansi);
        });
      });
      this.nextqindex+=1;
    };
  }
};

glist = [];

io.on('connection', (socket) => {
  rlog('a user connected');
  socket.on('disconnect', () => {
    rlog('a user disconnected');
  });
  // BEGIN home page
  socket.on('host',(msg) => {
    rlog('a user is becoming a host');
    const n = currentcode-1;
    glist[n] = new Game(socket);
    rlog(`their code is ${glist[n].code}`);
    socket.on('disconnect',()=>{
      rlog(`host of game id #${n+1} left. Destroying Game instance.`);
    });
    msg(glist[n].code);
    socket.on('gstart',()=>glist[n].start());
    socket.on('nextq',()=>glist[n].emitq())
  });
  socket.on('rmval',(msg,res) => {
    res(parseInt(msg)<currentcode && glist[parseInt(msg)-1] !== null);
  });
  // END home page || BEGIN play page
});

http.listen(3000, () => {
  rlog('listening on *:3000');
});

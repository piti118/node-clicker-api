const express = require('express');
const router = express.Router();
const uuid = require('uuid/v1');
const randomstring = require('randomstring');

const rooms = {};

class Room {
  constructor(id, owner) {
    this.id = id;
    this.owner = owner;
    this.votes = {};
    this.lastTally = Room.defaultTally();
    this.dirty = false;
  }

  isOwner(token) {
    return token === this.owner;
  }

  reset() {
    this.votes = {};
    this.dirty = true;
  }


  vote(token, answer) {
    if (Room.validAnswer(answer)) {
      this.votes[token] = answer;
      this.dirty = true;
    }
  }

  getMyAnswer(token) {
    if (token in this.votes) {
      return this.votes[token];
    }
    return null;
  }

  calculateTally() {
    const ret = Room.defaultTally();
    // should have done this in reverse...meh
    Object.keys(this.votes).forEach((key) => {
      const answer = this.votes[key];
      if (answer in ret) {
        ret[answer] += 1;
      } else {
        ret[answer] = 0;
      }
    });
    return ret;
  }

  // this gets polled so cache if needed
  tally() {
    if (this.dirty) {
      this.lastTally = this.calculateTally();
      this.dirty = false;
    }
    return this.lastTally;
  }
}


Room.createRandomRoom = (token) => {
  const roomid = randomstring.generate({ length: 6, capitalization: 'uppercase' });
  const room = new Room(roomid, token);
  return room;
};

Room.validAnswer = answer => (new Set(['1', '2', '3', '4'])).has(answer);

Room.defaultTally = () => ({ 1: 0, 2: 0, 3: 0, 4: 0 });

rooms.SJRAZS = Room.createRandomRoom('aaaa');


/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});


router.get('/v1/create-token', (req, res) => {
  res.json({
    token: uuid(),
  });
});


router.post('/v1/create-room', (req, res) => {
  const token = req.body.token;
  const room = Room.createRandomRoom(token);
  rooms[room.id] = room;
  res.json({
    roomId: room.id,
  });
});

router.post('/v1/vote/:roomid', (req, res) => {
  const token = req.body.token;
  const answer = req.body.answer;
  const roomid = req.params.roomid;
  // console.log('answer', answer)
  if (Room.validAnswer(answer)) {
    rooms[roomid].vote(token, answer);
    res.json({ status: 'OK' });
  } else {
    res.status(400).json({ status: 'Bad Answer' });
  }
});

router.post('/v1/my-answer/:roomid', (req, res) => {
  const token = req.body.token;
  const roomid = req.params.roomid;
  const room = rooms[roomid];
  res.json({
    answer: room.getMyAnswer(token),
  });
});

router.post('/v1/reset/:roomid', (req, res) => {
  const token = req.body.token;
  const roomid = req.params.roomid;
  const room = rooms[roomid];
  if (room.isOwner(token)) {
    room.reset();
    res.json({
      status: 'OK',
    });
  } else {
    res.status(401).json({
      status: 'Cannot reset if you are not the owner',
    });
  }
});

router.get('/v1/tally/:roomid', (req, res) => {
  const roomid = req.params.roomid;
  const room = rooms[roomid];
  res.json({
    counts: room.tally(),
  });
});

router.get('*', function(req, res){
  res.sendFile('index.html', {root:'./public'});
});

module.exports = router;

;(function() {
  var Game = function() {
	var screen = document.getElementById("screen").getContext('2d');
	this.size = { x: screen.canvas.width, y: screen.canvas.height };

	this.shootSound = document.getElementById('shoot-sound');
	this.shootSound.load();

	this.state = 'TITLE';
	this.keyboarder = new Keyboarder();

	this.bodies = [];
	this.score = 0;
	this.totalInvaders = 0;
	this.player = null;

	this.reset();

	var self = this;
	var tick = function() {
	  self.update();
	  self.draw(screen);
	  requestAnimationFrame(tick);
	};

	tick();
  };

Game.prototype = {

	reset: function() {
		this.score = 0;
		this.player = new Player(this);
		this.bodies = createInvaders(this).concat(this.player);
		this.totalInvaders = 24;
	},

	update: function() {

		switch( this.state ) {
			case 'TITLE':
				if( this.keyboarder.isDown(this.keyboarder.KEYS.S) ) {
					this.state = 'GAME';
				}
				break;
			case 'DEAD':
				if( this.keyboarder.isDown(this.keyboarder.KEYS.D) ) {
					this.state = 'RESETGAME';
				}
				break;
			case 'RESETGAME':
				// reset the game, only want to do this once
				this.reset();
				this.state = 'TITLE';
				break;
			case 'GAME':
				reportCollisions(this.bodies);

				for (var i = 0; i < this.bodies.length; i++) {
					if (this.bodies[i].update !== undefined) {
						this.bodies[i].update();
					}
				}
				break;
		}
	},

	draw: function(screen) {
		screen.clearRect(0, 0, this.size.x, this.size.y);

		switch( this.state ) {
			case 'TITLE':
					screen.fillStyle = 'black';
					screen.textAlign = 'center';
					screen.font = "14pt Arial";
					screen.fillText('Space Invaders Example', this.size.x / 2, 50 );

					screen.font = "12pt Arial";
					screen.fillText('Based on code by', this.size.x / 2, 90 );
					screen.fillText('Mary Rose Cook', this.size.x / 2, 110 );

					screen.font = "10pt Arial";
					screen.fillText('Controls:', this.size.x / 2, 200 );
					screen.fillText('Arrow keys to move, space bar to fire', this.size.x / 2, 212 );

					screen.font = "12pt Arial";
					screen.fillText('Press s to start', this.size.x / 2, 250 );
				break;
			case 'DEAD':
				screen.fillStyle = 'black';
				screen.textAlign = 'center';

				screen.font = "14pt Arial";
				screen.fillText('G A M E   O V E R', this.size.x / 2, 50 );

				screen.font = "12pt Arial";
				screen.fillText('Your score: ' + this.score, this.size.x / 2, 100 );
				screen.fillText('Press d to continue', this.size.x / 2, 250 );
				break;
			case 'GAME':
				for (var i = 0; i < this.bodies.length; i++) {
					if (this.bodies[i].draw !== undefined) {
					  this.bodies[i].draw(screen);
					}
				}
				screen.fillStyle = 'black';
				screen.font = "12pt Arial";
				screen.textAlign = 'left';
				screen.fillText(this.score, 10, 20 );
			break;
		}
	},

	// don't shoot if there is an invader below
	invadersBelow: function(invader) {
	  return this.bodies.filter(function(b) {
		return b instanceof Invader &&
		  Math.abs(invader.center.x - b.center.x) < b.size.x &&
		  b.center.y > invader.center.y;
	  }).length > 0;
	},

	addBody: function(body) {
	  this.bodies.push(body);
	},

	removeBody: function(body) {
	  var bodyIndex = this.bodies.indexOf(body);
	  if (bodyIndex !== -1) {
		this.bodies.splice(bodyIndex, 1);
	  }
	},

	// check that there are no invaders left
	// this is a bit clumsy, but it will do
	checkIfNoInvadersLeft: function() {

		var count = 0;
		for(var i = 0, l = this.bodies.length; i < l; i++ ) {
			if ( this.bodies[i].isInvader ) {
				count++;
				// we can stop right away here, only want to create a new wave if there are absolutely no invaders left
				break;
			}
		}
		if ( count < 1) {
			// No invaders left, create a new wave
			this.bodies = this.bodies.concat( createInvaders(this) );
		}
	}
  };

  var Invader = function(game, center) {
	this.game = game;
	this.center = center;
	this.size = { x: 15, y: 15 };
	this.patrolX = 0;
	this.speedX = 0.3;
	this.isInvader = true;
  };

  Invader.prototype = {
	update: function() {
		if (this.patrolX < 0 || this.patrolX > 30) {
			this.speedX = -this.speedX;
			// advance on the player
			this.center.y += 10;
		}

		// invaders get to shoot too
		if (Math.random() > 0.995 && !this.game.invadersBelow(this)) {
			var bullet = new Bullet(this.game,
									{ x: this.center.x, y: this.center.y + this.size.y / 2 },
									{ x: Math.random() - 0.5, y: 2 });
			this.game.addBody(bullet);
		}

		this.center.x += this.speedX;
		this.patrolX += this.speedX;

		// has the invader managed to get past the player?
		if ( this.center.y > this.game.player.center.y ) {
			this.game.state = 'DEAD';
		}
	},

	draw: function(screen) {
		drawRect(screen, this, 'darkgreen');
	},

	collision: function() {
		this.game.removeBody(this);

		// it is possible for multiple bullets to hit an invader, so this can double count.
		this.game.score++;

		// check if only the player and the bullets remain
		this.game.checkIfNoInvadersLeft();
	}
  };

  var createInvaders = function(game) {
	var invaders = [];
	for (var i = 0; i < 24; i++) {
	  var x = 35 + (i % 8) * 30;
	  var y = 0 + (i % 3) * 30;
	  invaders.push(new Invader(game, { x: x, y: y}));
	}

	return invaders;
  };

  var Player = function(game) {
	this.game = game;
	this.size = { x: 15, y: 15 };
	this.center = { x: this.game.size.x / 2, y: this.game.size.y - 35 };
	this.keyboarder = this.game.keyboarder;
	this.isInvader = false;
  };

  Player.prototype = {
	update: function() {
		if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
			this.center.x -= 2;
			} else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
			this.center.x += 2;
		}

		// ensure player stays on the screen
		if ( this.center.x < 0 ) {
			this.center.x = 0;
		}
		if ( this.center.x > this.game.size.x ) {
			this.center.x = this.game.size.x;
		}

		// fire a bullet
		if (this.keyboarder.isPressed(this.keyboarder.KEYS.SPACE)) {
			var bullet = new Bullet(this.game,
									{ x: this.center.x, y: this.center.y - this.size.y - 10 },
									{ x: 0, y: -7 });
			this.game.addBody(bullet);
			// we don't need to load the sound everytime we want to play it
			// this.game.shootSound.load();
			this.game.shootSound.play();
		}
	},

	draw: function(screen) {
	  drawRect(screen, this, 'darkblue');
	},

	collision: function() {
	  this.game.removeBody(this);
	  this.game.state = 'DEAD';
	}
  };

  var Bullet = function(game, center, velocity) {
	this.game = game;
	this.center = center;
	this.size = { x: 3, y: 3 };
	this.velocity = velocity;
	this.isInvader = false;
  };

  Bullet.prototype = {
	update: function() {
	  this.center.x += this.velocity.x;
	  this.center.y += this.velocity.y;

	  var screenRect = {
		center: { x: this.game.size.x / 2, y: this.game.size.y / 2 },
		size: this.game.size
	  };

	  if (!isColliding(this, screenRect)) {
		this.game.removeBody(this);
	  }
	},

	draw: function(screen) {
	  drawRect(screen, this, 'black');
	},

	collision: function() {
	  this.game.removeBody(this);
	}
  };

  var Keyboarder = function() {
	var keyState = {};
	var self = this;
	window.addEventListener('keydown', function(e) {
	  keyState[e.keyCode] = true;
		// stop window scrolling when using arrow keys
		// space can make a page jump as well
		if( e.keyCode === self.KEYS.LEFT || e.keyCode === self.KEYS.RIGHT || e.keyCode === self.KEYS.SPACE ) {
			e.preventDefault();
		}
	});

	window.addEventListener('keyup', function(e) {
	  keyState[e.keyCode] = false;
	});
	
	window.addEventListener('keypress', function(e) {
		keyState[e.keyCode] = true;
		if( e.keyCode === self.KEYS.LEFT || e.keyCode === self.KEYS.RIGHT || e.keyCode === self.KEYS.SPACE ) {
			e.preventDefault();
		}
	});

	this.isDown = function(keyCode) {
	  return keyState[keyCode] === true;
	};
	
	this.isPressed = function(keyCode) {
	  return keyState[keyCode] === true;
	};

	this.KEYS = { LEFT: 37, RIGHT: 39, SPACE: 32, S: 83, D: 68 };
  };

  var drawRect = function(screen, body, colour) {
	screen.fillStyle = colour;
	screen.fillRect(body.center.x - body.size.x / 2,
					body.center.y - body.size.y / 2,
					body.size.x,
					body.size.y);
  };

  var isColliding = function(b1, b2) {
	return !(
	  b1 === b2 ||
		b1.center.x + b1.size.x / 2 <= b2.center.x - b2.size.x / 2 ||
		b1.center.y + b1.size.y / 2 <= b2.center.y - b2.size.y / 2 ||
		b1.center.x - b1.size.x / 2 >= b2.center.x + b2.size.x / 2 ||
		b1.center.y - b1.size.y / 2 >= b2.center.y + b2.size.y / 2
	);
  };

  var reportCollisions = function(bodies) {
	var bodyPairs = [];
	for (var i = 0; i < bodies.length; i++) {
	  for (var j = i + 1; j < bodies.length; j++) {
		if (isColliding(bodies[i], bodies[j])) {
		  bodyPairs.push([bodies[i], bodies[j]]);
		}
	  }
	}

	for (var i = 0; i < bodyPairs.length; i++) {
	  if (bodyPairs[i][0].collision !== undefined) {
		bodyPairs[i][0].collision(bodyPairs[i][1]);
	  }

	  if (bodyPairs[i][1].collision !== undefined) {
		bodyPairs[i][1].collision(bodyPairs[i][0]);
	  }
	}
  };

  window.addEventListener('load', function() {
	new Game();
  });
})();

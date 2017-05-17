const onePlayerGame = document.querySelector("button#onePlayerGame");
const twoPlayerGame = document.querySelector("button#twoPlayerGame");
const xOption = document.querySelector("button#xOption");
const oOption = document.querySelector("button#oOption");
const gameType = document.querySelector("div#gameType");
const markSelect = document.querySelector("div#markSelect");
const tileList = document.querySelectorAll("li.tile");
const gameAnnouncement = document.querySelector("div#gameAnnouncement");
const gameAnnouncementText = document.querySelector("div#gameAnnouncementText");
const okButton = document.querySelector("button#okButton");
const wrapper = document.querySelector("div#wrapper");

//Hook up eventlistener
onePlayerGame.addEventListener('click', gameOption);
twoPlayerGame.addEventListener('click', gameOption);
oOption.addEventListener('click', gameMark);
xOption.addEventListener('click', gameMark);
okButton.addEventListener('click', confirm);
tileList.forEach(function(tile) {
	tile.addEventListener('click', makeMove);
});

//pubsub
const events = {
  events: {},
  on: function (eventName, fn) {
    this.events[eventName] = this.events[eventName] || [];
    this.events[eventName].push(fn);
  },
  off: function(eventName, fn) {
    if (this.events[eventName]) {
      for (let i = 0; i < this.events[eventName].length; i++) {
        if (this.events[eventName][i] === fn) {
          this.events[eventName].splice(i, 1);
          break;
        }
      };
    }
  },
  emit: function (eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(function(fn) {
        fn(data);
      });
    }
  }
};

//Ok button, Restart game once game is over
function confirm(event){
	events.emit("RestartGame", "");
}

//Store choosen game mode 1/2 player in data attr gametype. 
function gameOption(event) {	
	if (event.target.id === "onePlayerGame") gameType.dataset.gametype = '1';
	if (event.target.id === "twoPlayerGame") gameType.dataset.gametype = '2';
	gameType.classList.add('hidden');
}

//Create new game based on choosen game mode (1/2player) and who goes first X/O
function gameMark(event) {	
	let marking, player1, player2;	
	let gameOption = gameType.dataset.gametype;
	markSelect.classList.add('hidden');
	wrapper.classList.add('hidden');

	if (event.target.id === "xOption") marking = 'X';
	if (event.target.id === "oOption") marking = 'O';	
	if (gameOption === '1')	{		
		if (marking === 'X') {
			player1 = new Player('player1', 'X');
		    player2 = new Player('player2', 'O', 'bot');
		}
		else {		
			player1 = new Player('player1', 'X', 'bot');
		    player2 = new Player('player2', 'O');
		}		 
	}
	if (gameOption === '2')	{	
		player1 = new Player('player1', 'X');
		player2 = new Player('player2', 'O');			 
	}
	const board = new TicTacBoard();
	const newgame = new Game([player1, player2], board, player1);
	newgame.init();
}

//Handle user move. Inform the game user have done a move.
function makeMove(event) {		
	events.emit("PlayerHasMoved", event.target.className.split(" ")[1]);
}

////Player
function Player(name, marking, type) {
	this.name = name;
	this.marking = marking;	 
	this.type = type || "human";	
}

////Tic tac board
function TicTacBoard() {
	this.currentBoardState = [] ; 
}

//Update board state with the latest move, then render to html
TicTacBoard.prototype.updateBoard = function(move, marking) {
	this.currentBoardState[move] = marking;
	this.render();
}

//Clear board, remove any marked slot with X/O, empty slot are marked as e. 
TicTacBoard.prototype.clearBoard = function() { 
	for (let i = 0; i <= 8; i++) {
		this.currentBoardState[i] = 'e';
	}
	this.render();
}

//Render current board state to html. Only X and O will be shown on html board
TicTacBoard.prototype.render = function() {
	for (let i in tileList) {
		tileList[i].innerHTML = (this.currentBoardState[i] === 'X' || this.currentBoardState[i] === 'O') ? this.currentBoardState[i]:''; 
	}
}

////Game 
function Game(players, board, currentplayer) {	
	this.players = players;
	this.board = board;
	this.currentplayer = currentplayer;	

	//for minmax calculation
	this.human;
	this.bot;
	this.bestcalcMove;
}

//Handle when a move have been made. (both player and bot)
Game.prototype.playerHasMoved = function(move) {
	//check if move is valid, ie move is made on an empty slot on gameboard.
	if (this.validateMove(move)) {
		//Update board with the latest move using the marking of current active player		
		this.board.updateBoard(move, this.currentplayer.marking);
		//Check if game is over		
		let gameOver = this.haveGameEnded(this.board.currentBoardState, this.currentplayer.marking);		
		if (gameOver) {
			//Show message if game is over as draw
			if (gameOver === 2) gameAnnouncementText.innerHTML = "Draw!";
			//Show message if game is over with the winner announced			
			if (gameOver === 1) gameAnnouncementText.innerHTML = `Player ${this.currentplayer.marking} have won!`;			
			wrapper.classList.remove('hidden');
			gameAnnouncement.classList.remove('hidden');
			return;
		}
		//If game is not over get next player/bot move	
		this.setNextPlayer();
	}
}

//Make sure new move is only made on an empty board slot
Game.prototype.validateMove = function(move) {
	return (this.board.currentBoardState[move] === 'e' && this.board.currentBoardState[move] !== 'X' && this.board.currentBoardState[move] !== 'O');
}

Game.prototype.setNextPlayer = function() {
	//Alternate between players
	this.currentplayer = (this.players[0] === this.currentplayer) ? this.players[1] : this.players[0];
	//Handle move if current active player is a bot
	if (this.currentplayer.type !== "human") {	
		//Get next move for bot using minmax
		this.minmax([...this.board.currentBoardState], 0, this.bot);
		this.playerHasMoved(this.bestcalcMove);		
	}
}

Game.prototype.init = function() {
	//Info to be used in minmax
	for (let i in this.players) {
		if (this.players[i].type === 'bot') {
			this.bot = this.players[i];
		}
		else {
			this.human = this.players[i];
		}
	}	
	
	this.board.clearBoard();
	//Hook up eventlistener for player moves
	events.on("PlayerHasMoved", this.playerHasMoved.bind(this));
	//Hook up eventlistener for ok button when game is over	
	events.on("RestartGame", this.restartGame.bind(this));
	//If first move player is a bot get move for bot using minmax
	if (this.currentplayer.type !== "human") {		
		this.minmax([...this.board.currentBoardState], 0, this.bot);
		this.playerHasMoved(this.bestcalcMove);	
	}
}

Game.prototype.restartGame = function() {
	this.board.clearBoard();
	gameAnnouncement.classList.add('hidden');
	wrapper.classList.add('hidden');
	this.currentplayer = this.players[0];	
	if (this.currentplayer.type !== "human") {		
		this.minmax([...this.board.currentBoardState], 0, this.bot);
		this.playerHasMoved(this.bestcalcMove);	
	}
}

// Check for a winner returns:
//   0 if no winner or tie yet
//   1 someone with marking won
//   2 if it's a tie
Game.prototype.haveGameEnded = function(board, marking) {
	//check win by row [0 1 2], [3 4 5], [6 7 8]
	for (let i = 0; i <= 6; i+=3) {
		if ((board[i] === board[i+1]) 
			&& (board[i] === board[i+2]) 
			&& (board[i] === marking)) {			
			return 1;
		} 
	}
	//Check win by columns [0 3 6], [1 4 7], [2 5 8]
	for (let i = 0; i <= 3; i++) {
		if ((board[i] === board[i+3]) 
			&& (board[i] === board[i+6]) 
			&& (board[i] === marking)) {			
			return 1;
		} 
	}
	//Check win by diagonal [0 4 8]
	if ((board[0] === board[4]) 
			&& (board[0] === board[8]) 
			&& (board[0] === marking)) {			
			return 1;
	}
	//Check win by diagonal [2 4 6]
	if ((board[2] === board[4]) 
			&& (board[2] === board[6]) 
			&& (board[2] === marking)) {			
			return 1;
	}	
	//Check for draw 
	let draw = true;
	for (let i = 0; i < board.length; i++) {
		if (board[i] === 'e') draw = false;				
	}
	if (draw) return 2;
	
	return 0;	
}

//Used to calculate bot moves
Game.prototype.minmax = function(board, depth, maxPlayer) {		
	let tempBoard = board;
	let bestScore;	
	//Check if recursive minmax have reached terminal condition
	//Terminal conditions are player/bot have won or game ended in a draw
	if (this.haveGameEnded(tempBoard, maxPlayer.marking) !== 0) {
		//Return score based on how the game ended. Needed to choose the best next move.  
		return this.score(tempBoard, depth, maxPlayer);
	}
	else {
		//Depth is used to calculate the best move or if the game is in a lose state prolong as much as possible
		depth++;
		const scores = new Array();
		const moves = new Array();
		let move, possibleBoard, nextPlayer, score, maxScore, maxScoreIndex, minScore, minScoreIndex;
		//Get all possible move options for current player. Generate a new board for each move.
		let possibleMoves = this.getPossibleMoves(tempBoard);		
		for (let i = 0; i < possibleMoves.length; i++) {
			move = possibleMoves[i];
			//PossibleBoard is a new board with current player next move added			
			possibleBoard = this.getNewState([...tempBoard], move, maxPlayer.marking); 				
			//Switch current player recursive call with minmax on the new board
			//If current player is maxplayer swicth to minplayer
			nextPlayer = this.changePlayer(maxPlayer);
			score = this.minmax(possibleBoard, depth, nextPlayer);
			scores.push(score);
			moves.push(move);
			//Calculate best move on current depth and score. Depending on if current player is max/minplayer get best score based on that.
			//maxplayer strive to get highest possible score while minplayer the reverse.
			//All score return from childnodes are stored in scores array, all moves made on that depth is stored on moves array
			//Best move is attained by getting the best score from scores array in that depth and using its array index to get 
			//best move from moves array.
			//Get best score and move if current is maxplayer			
			if (maxPlayer.marking === this.bot.marking) {
				maxScore = Math.max.apply(Math, scores);
	       		maxScoreIndex = scores.indexOf(maxScore);
	        	this.bestcalcMove = moves[maxScoreIndex];
	        	bestScore = scores[maxScoreIndex];
			}//Get best score and move if current is minplayer
			else {
		        minScore = Math.min.apply(Math, scores);
		        minScoreIndex = scores.indexOf(minScore);
		        this.bestcalcMove = moves[minScoreIndex];
		        bestScore = scores[minScoreIndex];
			}
		}	
		return bestScore;
	}
}

//Calculate score needed to choose the best next move
Game.prototype.score = function(board, depth, maxPlayer) {	
	//maxplayer check
	if (maxPlayer.marking === this.bot.marking) {
		//maxplayer won
		if (this.haveGameEnded(board, this.bot.marking)) return 10-depth;		
	}
	//minplayer check		
	else if ((maxPlayer.marking  === this.human.marking)) {	
		//minplayer won	 
		if (this.haveGameEnded(board, this.human.marking)) return depth-10;			
	}
	//if no winner 
	else return 0;
}

//Get every possible new moves, ie every empty slot on the current game board
Game.prototype.getPossibleMoves = function(board) {	
	const tempMoves = [];	
	for (let i = 0; i < board.length; i++) {
		if (board[i] === 'e') tempMoves.push(i);
	}		
	return tempMoves;
}

Game.prototype.changePlayer = function(maxPlayer) {
	return maxPlayer === this.bot ? this.human : this.bot;
}

//Get new board with a new move made on it
Game.prototype.getNewState = function (gameBoard, move , marking) {    
    gameBoard[move] = marking;
    return gameBoard;
}


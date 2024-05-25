let board = null
const game = new Chess()
let gameDat = {}
let id = 0
const $status = $('#status')
const $fen = $('#fen')
const $pgn = $('#pgn')
const modeBtn = document.getElementById("mode_btn");
isMultiplayer = window.location.href.includes('/multiplayer')


if (isMultiplayer) {
    var socket = io();
    var roomName = prompt('Enter a room name:');
    console.log(socket.emit('join_game', { room: roomName}))

    socket.on('player_joined', function(data) {
        console.log('Player joined:', data);
    });

    socket.on('joined_match', function(data) {
        roomName = data['game']['room'];
        gameDat = data['game']
        id = data['user_id']
        console.log(gameDat)
        const fen = gameDat['game']['board'];
        
        // Slight redundancy here as the same lines are repeated for singleplayer config below, but I may clean this up with promises later
        const config = {
            draggable: true,
            position: gameDat['game']['board'],
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            onMouseoutSquare: onMouseoutSquare,
            onMouseoverSquare: onMouseoverSquare,
        }
        
        board = Chessboard('myBoard', config)
             
        // Update the status display
        $status.html(data['game']['status']);

        // Update the chessboard position
        game.load(fen);
        board.position(fen);
        board.orientation(gameDat['white'] == id ? 'white' : 'black')
        $fen.html(board)
    })

    socket.on('connect', function() {
        socket.emit('message', { message:'I\'m connected!'});
    });

    socket.on('game_update', function(data) {
        gameDat['game'] = data
        const status = gameDat['game']['status'];
        const fen = gameDat['game']['board'];
        console.log(status, board)
    
        // Update the status display
        $status.html(status);
        // Update the chessboard position
        game.load(fen);
        board.position(fen);
        $fen.html(board)
    });
}

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }

    document.body.style.cursor = "grabbing";
}

function onDrop(source, target) {
    // see if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    // illegal move
    if (move === null) {
        document.body.style.cursor = "default";
        removeGreySquares()
        return 'snapback'
    }
    
    // Note to add temporary move functionality in the future
    // Check if it's the player's turn
    if (isMultiplayer) {
        const isPlayerTurn =
            (gameDat['game']['status'] == 'White to move' && id == gameDat['white']) ||
            (gameDat['game']['status'] == 'Black to move' && id != gameDat['white']);
        if (!isPlayerTurn) {
            document.body.style.cursor = "default";
            removeGreySquares()
            return 'snapback'
        }
        // If not the player's turn, redden the board
        //if (!isPlayerTurn) { reddenBoard(); }
    }

    document.body.style.cursor = "default";
    updateStatus()
    removeGreySquares()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    removeGreySquares()
    board.position(game.fen())
    document.body.style.cursor = "default";
}

function updateStatus() {
    let status = ''

    let moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
    }

    // game still on
    else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }
    }
    $status.html(status)
    $fen.html(game.fen())
    $pgn.html(game.pgn())
    if (isMultiplayer) {
        socket.emit('make_move', { status: status, board: game.fen() }, room=roomName)
        console.log(status, game.pgn())}
}

const whiteSquareGrey = '#bbccff'
const blackSquareGrey = '#5c6580'

function removeGreySquares() {
    $('#myBoard .square-55d63').css('background', '')
}

function greySquare(square) {
    const $square = $('#myBoard .square-' + square)

    let background = whiteSquareGrey
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey
    }

    $square.css('background', background)
}

function onMouseoverSquare(square, piece) {
    // get list of possible moves for this square
    const moves = game.moves({
        square: square,
        verbose: true
    })

    // exit if there are no moves available for this square
    if (moves.length === 0) return

    // highlight the square they moused over
    greySquare(square)
    document.body.style.cursor = "grab";

    // highlight the possible squares for this piece
    for (let i = 0; i < moves.length; i++) {
        greySquare(moves[i].to)
    }
}

function onMouseoutSquare(square, piece) {
    removeGreySquares()
    document.body.style.cursor = "default";
}

const config = {
    draggable: true,
    position: isMultiplayer ? gameDat['game']['board'] : 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
}

board = Chessboard('myBoard', config)

updateStatus()

//Help Button and modal
const helpButton = document.getElementById('help_btn');
const modal = document.getElementById('help-modal');
const span = document.getElementsByClassName("close")[0];

helpButton.onclick = function () {
    modal.style.display = "block";
    setTimeout(() => {
        modal.style.opacity = 1;
    }, 1);
}

span.onclick = function () {
    modal.style.opacity = 0;
    setTimeout(() => {
        modal.style.display = "none";
    }, 500);
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.opacity = 0;
        setTimeout(() => {
            modal.style.display = "none";
        }, 500);
    }
}

modeBtn.onclick = () => {
  const currentUrl = window.location.href;
  // Index into the opposite page
  const newUrl = currentUrl.includes('/multiplayer') ? '/' : '/multiplayer';
  window.location = newUrl;
};


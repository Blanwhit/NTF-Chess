import { updateAltruismScore } from "./altruism.js";

let board = null
const game = new Chess()
let altruism_score = 0
let gameDat = {}
let socket = null
let roomName = ""
var id = 0
const $status = $( "#status" )
const $fen = $( "#fen" )
const $pgn = $( "#pgn" )
const modeBtn = document.getElementById( "mode_btn" );
const altruismLightning = document.getElementById( "lightning" )
const gameOverSubheading = document.getElementById( "game-over-subheading" )
const darken_board = document.getElementById( "darken_board" )
var isMultiplayer = window.location.href.includes( "/multiplayer" )


try
{
    if (isMultiplayer) { initializeMultiplayer() }
    else { initializeBoard(); }
}
catch ( err ) { console.log( err ) }

function initializeMultiplayer() {
    socket = io();
    roomName = prompt("Enter a room name:");
    socket.emit("join_game", { room: roomName });

    socket.on("player_joined", (data) => updateGame(data));
    socket.on("joined_match", (data) => updateGame(data, true));
    socket.on("connect", () => socket.emit("message", { message: "I'm connected!" }));
    socket.on("game_update", (data) => updateGame(data, false, true));
}

function updateGame(data, existingMatch = false, update = false) {
    console.log("Game update:", data);
    roomName = existingMatch ? data["game"]["room"] : roomName;
    if (!update) { gameDat = existingMatch ? data["game"] : data; }
    else { gameDat["game"] = data }

    id = existingMatch ? data["user_id"] : id;

    if (gameDat && gameDat[ "game" ])
    {
        const fen = gameDat["game"]["board"]; 
        const orientation = (gameDat["white"] === id) ? "white" : "black";
        if (!update) { 
            initializeBoard();
            board.orientation(orientation);
        }
        game.load(fen);
        board.position(fen);
        $status.html(gameDat["game"]["status"]);
        $fen.html(board);
    }
}

function onDragStart ( source, piece, position, orientation )
{
    // do not pick up pieces if the game is over
    if ( game.game_over() ) return false

    // only pick up pieces for the side to move
    if ( ( game.turn() === "w" && piece.search( /^b/ ) !== -1 ) ||
        ( game.turn() === "b" && piece.search( /^w/ ) !== -1 ) )
    {
        return false
    }

    document.body.style.cursor = "grabbing";
}

function onDrop ( source, target )
{
    // see if the move is legal
    const move = game.move( {
        from: source,
        to: target,
        promotion: "q" // NOTE/TODO: always promote to a queen for simplicity, need to add other piece promotions
    } )

    // illegal move
    if ( move === null )
    {
        document.body.style.cursor = "default";
        removeGreySquares()
        return "snapback"
    }
    console.log( move ) 

    // Note to add temporary move functionality in the future
    // Check if it"s the player"s turn
    if ( isMultiplayer )
    {
        const isPlayerTurn =
            ( gameDat[ "game" ][ "status" ].includes("White to move") && id == gameDat[ "white" ] ) ||
            ( gameDat[ "game" ][ "status" ].includes("Black to move") && id != gameDat[ "white" ] );
        if ( !isPlayerTurn )
        {
            document.body.style.cursor = "default";
            removeGreySquares()
            return "snapback"
        }
        // If not the player"s turn, redden the board
        //if (!isPlayerTurn) { reddenBoard(); }
    }

    document.body.style.cursor = "default";
    removeGreySquares()
    
    altruism_score = updateAltruismScore( move, game, altruism_score )
    updateAltruismDisplay(altruism_score)
    updateStatus( altruism_score )
    console.log( altruism_score )
    // TODO: Show exact score upon hovering over lightning

    // TODO: The piece of code above should be run at the beginning of a game to initialize the position of the lightning.
    // For now, the score is always 0 so it is redundant, but once the odds system is implemented this should be run at the beginning of every game.
}

function updateAltruismDisplay(altruism_score) 
{
    let adjustment = altruism_score;
    adjustment = Math.max(-10, Math.min(10, adjustment));
    altruismLightning.style.left = `calc(50% - ${adjustment * 3.6} * min(1vh , 1vw))`;
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd ()
{
    removeGreySquares()
    board.position( game.fen() )
    document.body.style.cursor = "default";
}

function handleGameOver ( result, loser, altruism_score )
{
    // Result:
    // c - Checkmate
    // a - Win by altruism
    // dr - Draw by repetition
    // d50 - Draw by 50-move rule
    // dim - Draw by insufficient material
    // ds - Draw by stalemate
    // TODO: Add a draw offering and a resign button

    var winner = [ "Black", "White" ][ +( loser === "b" ) ]

    const gameOverMessages = {
        "c": `${winner} wins by checkmate with an altruism score of ${altruism_score.toFixed(2)}.`,
        "a": `${winner} wins by altruism.`,
        "dr": `Draw by threefold repetition with an altruism score of ${altruism_score.toFixed(2)}.`,
        "d50": `Draw by the 50-move rule with an altruism score of ${altruism_score.toFixed(2)}.`,
        "dim": `Draw by insufficient material with an altruism score of ${altruism_score.toFixed(2)}.`,
        "ds": `Draw by stalemate with an altruism score of ${altruism_score.toFixed(2)}.`
    };
    console.log(gameOverMessages[result])
    try
    {
        gameOverSubheading.innerHTML = gameOverMessages[result]

    darken_board.style.display = "block";
    setTimeout( () =>
    {
        darken_board.style.opacity = 1;
    }, 10 );
    }
    catch { console.error("gameOverSubheading element not found in the DOM.")}
    // TODO: Update player ratings here
}

function getStatusMessage(altruism_score) 
{
    var status = ""
    let moveColor = ( game.turn() === "b" ) ? "Black" : "White";

    // checkmate?
    if ( game.in_checkmate() )
    {
        status = `Game over, ${moveColor} is in checkmate.`;
        handleGameOver( "c", game.turn(), altruism_score )
    }

    // draw?
    else if ( game.in_draw() )
    {
        status = "Game over, drawn position"

        // Handle draw with correct condition
        if ( game.isStalemate() )
        {
            handleGameOver( "ds", 0, altruism_score )
        }
        else if ( game.isInsufficientMaterial() )
        {
            handleGameOver( "dim", 0, altruism_score )
        }
        else if ( game.isThreefoldRepetition() )
        {
            handleGameOver( "dr", 0, altruism_score )
        }
        else
        {
            handleGameOver( "d50", 0, altruism_score )
        }
    }

    // win by altruism?
    else if ( 10 <= altruism_score || -10 >= altruism_score ) 
    {
        console.log( 'test' )
        if ( altruism_score >= 10 )
        {
            status = "Game over, white won by altruism"
            handleGameOver( "a", "b", altruism_score )
        }
        else
        {
            status = "Game over, black won by altruism"
            handleGameOver( "a", "w", altruism_score )
        }
    }

    // game still on
    else
    {
        status = moveColor + " to move"

        // check?
        if ( game.in_check() )
        {
            status += ", " + moveColor + " is in check"
        }
    }
    return status
}


function updateStatus ( altruism_score )
{
    let status = getStatusMessage(altruism_score)

    $status.html( status )
    $fen.html( game.fen() )
    $pgn.html( game.pgn() )
    if ( isMultiplayer )
    {
        socket.emit( "make_move", { status: status, board: game.fen() }, roomName)
        console.log( status, game.pgn() )
    }
}

const whiteSquareGrey = "#bbccff"
const blackSquareGrey = "#5c6580"

function removeGreySquares ()
{
    $( "#myBoard .square-55d63" ).css( "background", "" )
}

function greySquare ( square )
{
    const $square = $( "#myBoard .square-" + square )

    let background = whiteSquareGrey
    if ( $square.hasClass( "black-3c85d" ) )
    {
        background = blackSquareGrey
    }

    $square.css( "background", background )
}

function onMouseoverSquare ( square, piece )
{
    // get list of possible moves for this square
    const moves = game.moves( {
        square: square,
        verbose: true
    } )

    // exit if there are no moves available for this square
    if ( moves.length === 0 ) return

    // highlight the square they moused over
    greySquare( square )
    document.body.style.cursor = "grab";

    // highlight the possible squares for this piece
    for ( let i = 0; i < moves.length; i++ )
    {
        greySquare( moves[ i ].to )
    }
}

function onMouseoutSquare ( square, piece )
{
    removeGreySquares()
    document.body.style.cursor = "default";
}

function initializeBoard() {
    const config = getConfig(gameDat?.game?.board || "start", gameDat?.white == id ? "white" : "black");
    board = Chessboard("myBoard", config);
    updateStatus();
}

function getConfig(position, orientation) {
    return {
        draggable: true,
        position: position,
        orientation: orientation,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
    };
}

//Help Button and modal
const helpButton = document.getElementById( "help_btn" );
const modal = document.getElementById( "help-modal" );
const span = document.getElementsByClassName( "close" )[ 0 ];

helpButton.onclick = function ()
{
    modal.style.display = "block";
    setTimeout( () =>
    {
        modal.style.opacity = 1;
    }, 1 );
}

span.onclick = function ()
{
    modal.style.opacity = 0;
    setTimeout( () =>
    {
        modal.style.display = "none";
    }, 500 );
}

window.onclick = function ( event )
{
    if ( event.target == modal )
    {
        modal.style.opacity = 0;
        setTimeout( () =>
        {
            modal.style.display = "none";
        }, 500 );
    }
}

modeBtn.onclick = () =>
{
    // Index into the opposite page
    console.log
    const newUrl = isMultiplayer ? "/" : "/multiplayer";
    window.location = newUrl;
};

document.getElementById('login_btn').onclick = function() {
    window.location.href = "/auth/login"
}

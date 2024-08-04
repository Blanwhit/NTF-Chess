let board = null
const game = new Chess()
let altruism_score = 0
let gameDat = {}
var id = 0
const $status = $( "#status" )
const $fen = $( "#fen" )
const $pgn = $( "#pgn" )
const modeBtn = document.getElementById( "mode_btn" );
const altruismLightning = document.getElementById( "lightning" )
const gameOverSubheading = document.getElementById( "game-over-subheading" )
const darken_board = document.getElementById( "darken_board" )
isMultiplayer = window.location.href.includes( "/multiplayer" )

try
{
    if ( isMultiplayer )
    {
        var socket = io();
        var roomName = prompt( "Enter a room name:" );
        console.log( socket.emit( "join_game", { room: roomName } ) )

        socket.on( "player_joined", function ( data )
        {
            console.log( "Player joined:", data );
            gameDat = data
            if ( gameDat && gameDat[ "game" ] )
            {
                var fen = gameDat[ "game" ][ "board" ];
                // A lot redundancy here as the same lines are repeated for singleplayer and join game config below,
                // because I can"t figure out how to force board updates otherwise but I may clean this up with promises later
                const config = {
                    draggable: true,
                    position: fen,
                    onDragStart: onDragStart,
                    onDrop: onDrop,
                    onSnapEnd: onSnapEnd,
                    onMouseoutSquare: onMouseoutSquare,
                    onMouseoverSquare: onMouseoverSquare,
                }

                board = Chessboard( "myBoard", config )

                // Update the status display
                $status.html( data[ "game" ][ "status" ] );
                board.orientation( gameDat[ "white" ] == id ? "white" : "black" )
                // Update the chessboard position
                game.load( fen );
                board.position( fen );
                $fen.html( board )
            }
        } );

        socket.on( "joined_match", function ( data )
        {
            roomName = data[ "game" ][ "room" ];
            gameDat = data[ "game" ]
            id = data[ "user_id" ]
            console.log( data )
            console.log( gameDat[ "game" ][ "board" ] )
            if ( gameDat && gameDat[ "game" ] )
            {
                var fen = gameDat[ "game" ][ "board" ]
                console.log( fen )

                // Slight redundancy here as the same lines are repeated for singleplayer config below, but I may clean this up with promises later
                const config = {
                    draggable: true,
                    position: fen,
                    onDragStart: onDragStart,
                    onDrop: onDrop,
                    onSnapEnd: onSnapEnd,
                    onMouseoutSquare: onMouseoutSquare,
                    onMouseoverSquare: onMouseoverSquare,
                }

                board = Chessboard( "myBoard", config )

                // Update the status display
                $status.html( data[ "game" ][ "status" ] );

                // Update the chessboard position
                game.load( fen );
                board.position( fen );
                board.orientation( gameDat[ "white" ] == id ? "white" : "black" )
                $fen.html( board )
            }
        } )

        socket.on( "connect", function ()
        {
            socket.emit( "message", { message: "I\"m connected!" } );
        } );

        socket.on( "game_update", function ( data )
        {
            gameDat[ "game" ] = data
            const status = gameDat[ "game" ][ "status" ];
            const fen = gameDat[ "game" ][ "board" ];
            console.log( status, board )

            // Update the status display
            $status.html( status );
            // Update the chessboard position
            game.load( fen );
            board.position( fen );
            $fen.html( board )
        } );
    }
}
catch ( err ) { console.log( err ) }

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
            ( gameDat[ "game" ][ "status" ] == "White to move" && id == gameDat[ "white" ] ) ||
            ( gameDat[ "game" ][ "status" ] == "Black to move" && id != gameDat[ "white" ] );
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
    altruism_adjustment = altruism_score
    if ( altruism_score <= -10 )
    {
        altruism_adjustment = -10
    } else if ( altruism_score >= 10 )
    {
        altruism_adjustment = 10
    }
    altruismLightning.style.left = `calc( 50% - ${ altruism_adjustment } * 3.6 * min( 1vh , 1vw ) )`
    updateStatus( altruism_score )
    console.log( altruism_score )
    // TODO: Show exact score upon hovering over lightning

    // TODO: The piece of code above should be run at the beginning of a game to initialize the position of the lightning.
    // For now, the score is always 0 so it is redundant, but once the odds system is implemented this should be run at the beginning of every game.
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd ()
{
    removeGreySquares()
    board.position( game.fen() )
    document.body.style.cursor = "default";
}


function updateAltruismScore ( move, game, altruism_score )
{
    new_score = 0 // The score that gets added to the altruism bar

    // Adds altruism points to the player who just made their turn
    // Positive altruism is better for white, negative altruism is better for black
    function addAltruismPoints ( points )
    {
        if ( game.turn() == "b" )
        {
            new_score += points
        }
        else
        {
            new_score -= points
        }
    }

    // Giving a check harms your opponent and removes 0.1 altruism points from you as a result
    if ( game.in_check() )
    {
        addAltruismPoints( -0.1 )
    }


    // Promotions give 3 altruism points
    if ( move.flags.includes( "p" ) )
    {
        // Big bonus for promoting to a queen
        addAltruismPoints( 3 )
    }

    // Capturing an opponent"s piece gives your opponent half of the value of the piece in altruism points
    if ( move.flags.includes( "c" ) )
    {
        switch ( move.captured )
        {
            case "q":
                addAltruismPoints( -4.0 );
                break;
            case "r":
                addAltruismPoints( -2.5 );
                break;
            case "n":
                addAltruismPoints( -1.5 );
                break
            case "b":
                addAltruismPoints( -1.5 );
                break;
            case "p":
                addAltruismPoints( -0.5 );
        }
    }

    // Castling short gives 1 altruism point since it is safer
    if ( move.flags.includes( "k" ) )
    {
        addAltruismPoints( 1 );
    }

    // Castling long gives -1 altruism points since it is more agressive
    if ( move.flags.includes( "q" ) )
    {
        addAltruismPoints( -1 )
    }


    // Multiply new score by a random number between 0.75 and 1.25
    // This adjusts for realistic altruism sometimes being less or more effective than planned
    new_score = new_score * ( 0.75 + Math.random() / 2 )

    // Return new altruism bar score
    return ( altruism_score + new_score )
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

    winner = [ "Black", "White" ][ +( loser === "b" ) ]

    gameOverMessage = ""
    switch ( result )
    {
        case "c":
            gameOverMessage = `${ winner } wins by checkmate with an altruism score of ${ altruism_score.toFixed( 2 ) }.`
            break
        case "a":
            gameOverMessage = `${ winner } wins by altruism.`
            break
        case "dr":
            gameOverMessage = `Draw by threefold repetition with an altruism score of ${ altruism_score.toFixed( 2 ) }.`
            break
        case "d50":
            gameOverMessage = `Draw by the 50-move rule with an altruism score of ${ altruism_score.toFixed( 2 ) }.`
            break
        case "dim":
            gameOverMessage = `Draw by insufficient material with an altruism score of ${ altruism_score.toFixed( 2 ) }.`
            break
        case "ds":
            gameOverMessage = `Draw by stalemate with an altruism score of ${ altruism_score.toFixed( 2 ) }.`
            break
    }
    gameOverSubheading.innerHTML = gameOverMessage
    darken_board.style.display = "block";
    setTimeout( () =>
    {
        darken_board.style.opacity = 1;
    }, 10 );
    // TODO: Update player ratings here
}
function updateStatus ( altruism_score )
{
    let status = ""

    let moveColor = "White"
    if ( game.turn() === "b" )
    {
        moveColor = "Black"
    }

    // checkmate?
    if ( game.in_checkmate() )
    {

        status = "Game over, " + moveColor + " is in checkmate."
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
    $status.html( status )
    $fen.html( game.fen() )
    $pgn.html( game.pgn() )
    if ( isMultiplayer )
    {
        socket.emit( "make_move", { status: status, board: game.fen() }, room = roomName )
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

const config = {
    draggable: true,
    position: isMultiplayer && ( gameDat && gameDat[ "game" ] ) ? gameDat[ "game" ][ "board" ] : "start",
    orientation: gameDat[ "white" ] == id ? "white" : "black",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
}

board = Chessboard( "myBoard", config )

updateStatus()

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

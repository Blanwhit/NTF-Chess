var board = null
var game = new Chess()
var $status = $( '#status' )
var $fen = $( '#fen' )
var $pgn = $( '#pgn' )

function onDragStart ( source, piece, position, orientation )
{
    // do not pick up pieces if the game is over
    if ( game.game_over() ) return false

    // only pick up pieces for the side to move
    if ( ( game.turn() === 'w' && piece.search( /^b/ ) !== -1 ) ||
        ( game.turn() === 'b' && piece.search( /^w/ ) !== -1 ) )
    {
        return false
    }

    document.body.style.cursor = "grabbing";
}

function onDrop ( source, target )
{
    // see if the move is legal
    var move = game.move( {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    } )

    // illegal move
    if ( move === null )
    {
        document.body.style.cursor = "default";
        removeGreySquares()
        return 'snapback'
    }
    document.body.style.cursor = "default";
    updateStatus()
    removeGreySquares()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd ()
{
    removeGreySquares()
    board.position( game.fen() )
    document.body.style.cursor = "default";
}

function updateStatus ()
{
    var status = ''

    var moveColor = 'White'
    if ( game.turn() === 'b' )
    {
        moveColor = 'Black'
    }

    // checkmate?
    if ( game.in_checkmate() )
    {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if ( game.in_draw() )
    {
        status = 'Game over, drawn position'
    }

    // game still on
    else
    {
        status = moveColor + ' to move'

        // check?
        if ( game.in_check() )
        {
            status += ', ' + moveColor + ' is in check'
        }
    }

    $status.html( status )
    $fen.html( game.fen() )
    $pgn.html( game.pgn() )
}

var whiteSquareGrey = '#bbccff'
var blackSquareGrey = '#5c6580'

function removeGreySquares ()
{
    $( '#myBoard .square-55d63' ).css( 'background', '' )
}

function greySquare ( square )
{
    var $square = $( '#myBoard .square-' + square )

    var background = whiteSquareGrey
    if ( $square.hasClass( 'black-3c85d' ) )
    {
        background = blackSquareGrey
    }

    $square.css( 'background', background )
}

function onMouseoverSquare ( square, piece )
{
    // get list of possible moves for this square
    var moves = game.moves( {
        square: square,
        verbose: true
    } )

    // exit if there are no moves available for this square
    if ( moves.length === 0 ) return

    // highlight the square they moused over
    greySquare( square )
    document.body.style.cursor = "grab";

    // highlight the possible squares for this piece
    for ( var i = 0; i < moves.length; i++ )
    {
        greySquare( moves[ i ].to )
    }
}

function onMouseoutSquare ( square, piece )
{
    removeGreySquares()
    document.body.style.cursor = "default";
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
}

board = Chessboard( 'myBoard', config )

updateStatus()

//Help Button and modal
var helpButton = document.getElementById( 'help_btn' );
var modal = document.getElementById( 'help-modal' );
var span = document.getElementsByClassName( "close" )[ 0 ];

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

loginBtn = document.getElementById( "login_btn" )

loginBtn.onclick = () =>
{
    window.location = '/auth/login';
} 
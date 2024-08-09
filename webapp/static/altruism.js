// Contains singleplayer altruism score logic

export function updateAltruismScore ( move, game, altruism_score )
{
    var new_score = 0 // The score that gets added to the altruism bar

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
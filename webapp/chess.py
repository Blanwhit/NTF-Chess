from random import choices, choice
from string import ascii_uppercase

from flask import (Blueprint, flash, g, redirect, render_template, request,
                   session, url_for)
from flask_socketio import SocketIO, emit, join_room, leave_room, send
from werkzeug.exceptions import abort

from . import games, socketio
from .auth import login_required
from .db import get_db

bp = Blueprint('chess', __name__)
@bp.route('/', methods=('GET', 'POST'))
@login_required
def index():
    return render_template('/index.html')


@bp.route('/multiplayer')
@login_required
def multiplayer():
    return render_template('/multiplayer.html')

'''@socketio.on('message')
def handle_message(data):
    print('received message: ', session['username'])'''



def get_game(room, user_id):
    matches = []
    create = False

    # Looks to join available room if none specified, or if there are no open rooms, it creates a new randomly named one
    if room == "":
        # Look for currently open rooms to join and store
        matches = [game for game in games if (len(game['players']) < 2 or user_id in game['players'])]

        # If no available matches create a new room
        if not matches:
            room = ''.join(choices(ascii_uppercase, k=10))
            matches.append({'room': room,
                            'players': [],
                            'game': {'status': 'White to move',
                                'board': 'start'},
                            'gameStarted': False})
            create = True
    else:
        # Check if the specified room already exists, else create a room
        matches = [game for game in games if game['room'] == room]
        if not matches:
            matches.append({'room': room,
                            'players': [],
                            'game': {'status': 'White to move',
                                'board': 'start'},
                            'gameStarted': False})
            create = True

    game = matches[0]
    #print(game)
    if create:
        games.append(game)
        game = games[-1]
    return game



# Room joining logic for games
@socketio.on('join_game')
def handle_join_game(data):
    user_id = session.get('user_id')
    if not user_id:
        return "User not authenticated"
    room = data.get('room')
    game = get_game(room, user_id)

    # Check if not in game and game already is full
    if user_id not in game['players'] and len(game['players']) == 2:
        emit('player_joined', "Game is already full, please try join another room")

    # Else add the user to the game
    else:
        join_room(game['room'])

        # If already in game, notify the player and rejoin the connection
        if user_id in game['players']:
            emit('player_joined', f"You are already in the game '{ game['room'] }'")

        # Else add the player to the match
        else:
            game['players'].append(user_id)
            emit('player_joined', f"You joined the game '{game['room']}'")
            
            # If game now full, start the game 
            if len(game['players']) == 2:
                game['gameStarted'] = True
                # Assign players
                game['white'] = choice(game['players'])
                emit('game_started', room=game['room'])

        emit('joined_match', {'game': game, 'user_id': user_id})

        emit('player_joined', game, room=game['room'])
    print(games)


# Room joining logic for games
@socketio.on('make_move')
def handle_move(data, room):
    user_id = session.get('user_id')
    status = data.get('status')
    board = data.get('board')
    

    matches = [game for game in games if game['room'] == room]
    if not matches or not (user_id in matches[0]['players']):
        return
    match = matches[0]
    
    if not match['gameStarted']:
        return
    # Ensures the right player is moving 
    if ((match['game']['status'] == 'White to move' and user_id == match['white']) or 
        (match['game']['status'] == 'Black to move' and user_id != match['white'])):
        # Update board on server
        match['game'] = {'status': status, 'board': board}
        print(data, match)
        # Emit the updated game state to all players in the room
        emit('game_update', match['game'], room=room)
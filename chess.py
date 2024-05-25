from random import choices
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

# Room joining logic for games
@socketio.on('join_game')
def handle_join_game(data):
    user_id = session.get('user_id')
    if not user_id:
        return "User not authenticated"

    room = data.get('room')
    matches = []
    create = False

    # Looks to join available room if none specified, or if there are no open rooms, it creates a new randomly named one
    if not room:
        # Look for currently open rooms to join and store
        matches = [game for game in games if len(game['room']['players']) < 2]

        # If no available matches create a new room
        if not matches:
            room = ''.join(choices(ascii_uppercase, k=10))
            matches.append({'room': room, 'players': []})
            create = True
    else:
        # Check if the specified room already exists, else create a room
        matches = [game for game in games if game['room'] == room]
        if not matches:
            matches.append({'room': room, 'players': []})
            create = True

    print(matches)

    game = matches[0]
    if create:
        games.append(game)

    # Else check if room is already full
    if len(game['players']) == 2:
        emit('player_joined', "Game is already full, please try join another room")

    # Else if room add the user to the existing game
    else:
        join_room(game['room'])
        # If already in game, notify the player and add to list
        if user_id in game['players']:
            emit('player_joined', f"You are already in the game '{ room }'")
        else:
            game['players'].append(user_id)
            emit('player_joined', f"You joined the game '{room}'")

        emit('joined_match', game)
        emit('player_joined', game, room=game['room'])
    print(game)


# Room joining logic for games
@socketio.on('make_move')
def handle_move(data, room):
    status = data.get('status')
    board = data.get('board')
    print(data, room)

    # Emit the updated game state to all players in the room
    emit('game_update', {
        'status': status,
        'board': board
    }, room=room)